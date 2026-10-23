-- ==============================================================================
-- FinSight AI: Supabase Production Schema & Row Level Security (RLS)
-- Fully Audited, Repaired & Validated Production Migration (Second-Pass Revision)
-- File: 20251010_user_profiles_and_login_history.sql
-- ==============================================================================
-- Architecture & Invariants Enforced:
-- 1. App user roles: 'admin', 'business_analyst', 'risk_analyst', 'customer', 'unassigned'
-- 2. App account statuses: 'active', 'pending_approval', 'suspended'
-- 3. Core tables: public.profiles, public.login_history
-- 4. Canonical compatibility view: public.user_profiles (security_invoker = true)
-- 5. Helper authorization functions: is_service_role(), is_admin(), is_active_user(),
--    get_caller_role(), is_admin_or_service() — all strictly fail-closed.
-- 6. Dedicated RPC for administrator management: admin_manage_user_profile()
-- 7. Last-active-administrator protection via deterministic lock order:
--    Step A: Transactional Advisory Lock gate
--    Step B: Row-level FOR UPDATE lock
--    Step C: Active administrator count verification
-- 8. Status consistency invariant: public.profiles.status = public.profiles.account_status::text
--    enforced via CHECK constraint and database triggers.
-- 9. Append-only login audit table accessible only via verified identities / service_role
-- 10. Automatic profile creation trigger on auth.users (defaulting to unassigned/pending_approval)
-- 11. Email sync trigger on auth.users for confirmed email changes
-- 12. Trusted initial promotion & demotion procedures: promote_to_admin(), demote_admin()
-- ==============================================================================

-- ==============================================================================
-- STEP 1: INITIALIZE OR RECONCILE ENUM TYPES (ISOLATED TRANSACTION)
-- ==============================================================================
BEGIN;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_type t 
        JOIN pg_namespace n ON n.oid = t.typnamespace 
        WHERE n.nspname = 'public' AND t.typname = 'app_user_role'
    ) THEN
        CREATE TYPE public.app_user_role AS ENUM (
            'admin',
            'business_analyst',
            'risk_analyst',
            'customer',
            'unassigned'
        );
    END IF;

    IF NOT EXISTS (
        SELECT 1 
        FROM pg_type t 
        JOIN pg_namespace n ON n.oid = t.typnamespace 
        WHERE n.nspname = 'public' AND t.typname = 'app_account_status'
    ) THEN
        CREATE TYPE public.app_account_status AS ENUM (
            'active',
            'pending_approval',
            'suspended'
        );
    END IF;
END $$;

COMMIT;

-- Ensure all enum labels exist if types were pre-created (must run outside multi-statement tx)
ALTER TYPE public.app_user_role ADD VALUE IF NOT EXISTS 'admin';
ALTER TYPE public.app_user_role ADD VALUE IF NOT EXISTS 'business_analyst';
ALTER TYPE public.app_user_role ADD VALUE IF NOT EXISTS 'risk_analyst';
ALTER TYPE public.app_user_role ADD VALUE IF NOT EXISTS 'customer';
ALTER TYPE public.app_user_role ADD VALUE IF NOT EXISTS 'unassigned';

ALTER TYPE public.app_account_status ADD VALUE IF NOT EXISTS 'active';
ALTER TYPE public.app_account_status ADD VALUE IF NOT EXISTS 'pending_approval';
ALTER TYPE public.app_account_status ADD VALUE IF NOT EXISTS 'suspended';

-- ==============================================================================
-- STEP 2: CORE TABLES, COMPATIBILITY VIEW, INDICES & SCHEMA RECONCILIATION
-- ==============================================================================
BEGIN;

-- ------------------------------------------------------------------------------
-- 2.1 Profiles Table (public.profiles)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name TEXT NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    email TEXT NOT NULL UNIQUE,
    role public.app_user_role NOT NULL DEFAULT 'unassigned'::public.app_user_role,
    account_status public.app_account_status NOT NULL DEFAULT 'pending_approval'::public.app_account_status,
    status TEXT NOT NULL DEFAULT 'pending_approval',
    auth_provider TEXT NOT NULL DEFAULT 'email',
    customer_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    last_login_at TIMESTAMPTZ DEFAULT NULL
);

-- Comprehensive Column Reconciliation for Existing Schema (Repair missing columns)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS display_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role public.app_user_role NOT NULL DEFAULT 'unassigned'::public.app_user_role;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS account_status public.app_account_status NOT NULL DEFAULT 'pending_approval'::public.app_account_status;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending_approval';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS auth_provider TEXT NOT NULL DEFAULT 'email';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS customer_id TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now());
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now());
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ DEFAULT NULL;

-- Ensure foreign key constraint on profiles.id -> auth.users(id) exists with ON DELETE CASCADE
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'profiles_id_fkey' AND conrelid = 'public.profiles'::regclass
    ) THEN
        BEGIN
            ALTER TABLE public.profiles
                ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Skipping profiles_id_fkey: %', SQLERRM;
        END;
    END IF;
END $$;

-- Populate missing or blank display_name in existing records before NOT NULL enforcement
UPDATE public.profiles
SET display_name = COALESCE(
    NULLIF(trim(full_name), ''),
    NULLIF(trim(split_part(email, '@', 1)), ''),
    'User'
)
WHERE display_name IS NULL OR trim(display_name) = '';

ALTER TABLE public.profiles ALTER COLUMN display_name SET NOT NULL;

-- Email normalization & NOT NULL enforcement
UPDATE public.profiles
SET email = lower(trim(email))
WHERE email IS NOT NULL AND email <> lower(trim(email));

ALTER TABLE public.profiles ALTER COLUMN email SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_email_unique ON public.profiles(lower(email));

-- Safe Enum Type Reconciliation for Pre-existing Text/Varchar Columns in Profiles
-- Handles NULLs, casing variants, spaces, and preserves valid existing permissions
DO $$
BEGIN
    -- 1. Reconcile 'role' column type
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'role'
          AND udt_name <> 'app_user_role'
    ) THEN
        -- Drop pre-existing default so type alteration can proceed cleanly
        ALTER TABLE public.profiles ALTER COLUMN role DROP DEFAULT;

        -- Clean and normalize data preserving valid user roles and known aliases
        UPDATE public.profiles 
        SET role = (
            CASE 
                WHEN lower(trim(role::text)) IN ('admin', 'administrator') THEN 'admin'
                WHEN lower(trim(role::text)) IN ('business_analyst', 'business analyst', 'analyst') THEN 'business_analyst'
                WHEN lower(trim(role::text)) IN ('risk_analyst', 'risk analyst', 'risk') THEN 'risk_analyst'
                WHEN lower(trim(role::text)) IN ('customer', 'client', 'user') THEN 'customer'
                ELSE 'unassigned'
            END
        )::public.app_user_role;

        ALTER TABLE public.profiles 
            ALTER COLUMN role TYPE public.app_user_role 
            USING role::public.app_user_role;
    END IF;

    -- 2. Reconcile 'account_status' column type
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'account_status'
          AND udt_name <> 'app_account_status'
    ) THEN
        -- Drop pre-existing default so type alteration can proceed cleanly
        ALTER TABLE public.profiles ALTER COLUMN account_status DROP DEFAULT;

        -- Reconcile existing account status: respect pre-existing 'status' column if account_status was NULL
        UPDATE public.profiles 
        SET account_status = (
            CASE 
                WHEN lower(trim(account_status::text)) IN ('active', 'approved', 'verified') THEN 'active'
                WHEN lower(trim(account_status::text)) IN ('suspended', 'disabled', 'banned', 'blocked') THEN 'suspended'
                WHEN lower(trim(account_status::text)) IN ('pending', 'pending_approval', 'requested') THEN 'pending_approval'
                -- Check fallback status column
                WHEN lower(trim(COALESCE(status, ''))) IN ('active', 'approved') THEN 'active'
                WHEN lower(trim(COALESCE(status, ''))) IN ('suspended', 'disabled') THEN 'suspended'
                ELSE 'pending_approval'
            END
        )::public.app_account_status;

        ALTER TABLE public.profiles 
            ALTER COLUMN account_status TYPE public.app_account_status 
            USING account_status::public.app_account_status;
    END IF;
END $$;

-- Fail-closed default enforcement on public.profiles
ALTER TABLE public.profiles ALTER COLUMN role SET DEFAULT 'unassigned'::public.app_user_role;
ALTER TABLE public.profiles ALTER COLUMN role SET NOT NULL;
ALTER TABLE public.profiles ALTER COLUMN account_status SET DEFAULT 'pending_approval'::public.app_account_status;
ALTER TABLE public.profiles ALTER COLUMN account_status SET NOT NULL;
ALTER TABLE public.profiles ALTER COLUMN status SET DEFAULT 'pending_approval';
ALTER TABLE public.profiles ALTER COLUMN status SET NOT NULL;
ALTER TABLE public.profiles ALTER COLUMN auth_provider SET DEFAULT 'email';
ALTER TABLE public.profiles ALTER COLUMN auth_provider SET NOT NULL;

-- Status Consistency Invariant: Reconcile existing records so status matches account_status
UPDATE public.profiles
SET status = account_status::text
WHERE status IS DISTINCT FROM account_status::text;

-- Enforce Status Consistency CHECK constraint
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_profiles_status_sync'
    ) THEN
        ALTER TABLE public.profiles ADD CONSTRAINT chk_profiles_status_sync CHECK (status = account_status::text);
    END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 2.2 Canonical Compatibility View (public.user_profiles)
-- Recreates view safely without breaking dependencies or hiding schema drift
-- ------------------------------------------------------------------------------
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_views WHERE schemaname = 'public' AND viewname = 'user_profiles'
    ) THEN
        DROP VIEW public.user_profiles;
    ELSIF EXISTS (
        SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'user_profiles'
    ) THEN
        -- If user_profiles was previously created as a standalone table, migrate records safely
        INSERT INTO public.profiles (
            id, display_name, full_name, avatar_url, email, role, account_status, status, auth_provider, customer_id, created_at, updated_at, last_login_at
        )
        SELECT 
            up.id,
            COALESCE(up.display_name, 'User'),
            up.full_name,
            up.avatar_url,
            up.email,
            COALESCE(up.role::text::public.app_user_role, 'unassigned'::public.app_user_role),
            COALESCE(up.account_status::text::public.app_account_status, 'pending_approval'::public.app_account_status),
            COALESCE(up.status, 'pending_approval'),
            COALESCE(up.auth_provider, 'email'),
            up.customer_id,
            COALESCE(up.created_at, timezone('utc'::text, now())),
            COALESCE(up.updated_at, timezone('utc'::text, now())),
            up.last_login_at
        FROM public.user_profiles up
        ON CONFLICT (id) DO NOTHING;

        DROP TABLE public.user_profiles;
    END IF;
END $$;

CREATE VIEW public.user_profiles WITH (security_invoker = true) AS
    SELECT
        id,
        display_name,
        full_name,
        avatar_url,
        email,
        role,
        account_status,
        status,
        auth_provider,
        customer_id,
        created_at,
        updated_at,
        last_login_at
    FROM public.profiles;

ALTER VIEW public.user_profiles SET (security_invoker = true);

-- Performance and Audit Indices on Profiles
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(lower(email));
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_account_status ON public.profiles(account_status);

-- ------------------------------------------------------------------------------
-- 2.3 Login History Table (public.login_history)
-- Append-only audit table with nullable user_id to record unauthenticated attempts
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.login_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    email TEXT NOT NULL,
    display_name TEXT,
    role TEXT NOT NULL DEFAULT 'unassigned',
    provider TEXT NOT NULL DEFAULT 'email',
    event_type TEXT NOT NULL DEFAULT 'login_success',
    success BOOLEAN NOT NULL DEFAULT true,
    error_category TEXT DEFAULT NULL,
    ip_address TEXT,
    user_agent TEXT,
    status TEXT NOT NULL DEFAULT 'success',
    correlation_id TEXT DEFAULT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Comprehensive Column Reconciliation for Existing login_history Table
ALTER TABLE public.login_history ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.login_history ADD COLUMN IF NOT EXISTS display_name TEXT DEFAULT NULL;
ALTER TABLE public.login_history ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'unassigned';
ALTER TABLE public.login_history ADD COLUMN IF NOT EXISTS provider TEXT NOT NULL DEFAULT 'email';
ALTER TABLE public.login_history ADD COLUMN IF NOT EXISTS event_type TEXT NOT NULL DEFAULT 'login_success';
ALTER TABLE public.login_history ADD COLUMN IF NOT EXISTS success BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE public.login_history ADD COLUMN IF NOT EXISTS error_category TEXT DEFAULT NULL;
ALTER TABLE public.login_history ADD COLUMN IF NOT EXISTS ip_address TEXT DEFAULT NULL;
ALTER TABLE public.login_history ADD COLUMN IF NOT EXISTS user_agent TEXT DEFAULT NULL;
ALTER TABLE public.login_history ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'success';
ALTER TABLE public.login_history ADD COLUMN IF NOT EXISTS correlation_id TEXT DEFAULT NULL;
ALTER TABLE public.login_history ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now());

-- Ensure user_id is nullable (required for failed login attempts where user is unknown)
ALTER TABLE public.login_history ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.login_history ALTER COLUMN role SET DEFAULT 'unassigned';

-- Safe reconciliation of Foreign Key on login_history.user_id
DO $$
BEGIN
    -- Set orphaned user_ids to NULL before applying constraint
    UPDATE public.login_history
    SET user_id = NULL
    WHERE user_id IS NOT NULL AND user_id NOT IN (SELECT id FROM public.profiles);

    IF EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'login_history_user_id_fkey' AND conrelid = 'public.login_history'::regclass
    ) THEN
        ALTER TABLE public.login_history DROP CONSTRAINT login_history_user_id_fkey;
    END IF;

    ALTER TABLE public.login_history
        ADD CONSTRAINT login_history_user_id_fkey
        FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Skipping login_history_user_id_fkey: %', SQLERRM;
END $$;

CREATE INDEX IF NOT EXISTS idx_login_history_user_id ON public.login_history(user_id);
CREATE INDEX IF NOT EXISTS idx_login_history_email ON public.login_history(lower(email));
CREATE INDEX IF NOT EXISTS idx_login_history_created_at ON public.login_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_login_history_event_type ON public.login_history(event_type);

-- ------------------------------------------------------------------------------
-- 2.4 Security Definer Helper Functions (Strictly Fail-Closed & Separated)
-- ------------------------------------------------------------------------------

-- Dedicated check for trusted PostgREST service role or direct DBA session.
-- CRITICAL SECURITY ENFORCEMENT: Never trust current_user in a SECURITY DEFINER function!
-- In PostgreSQL, current_user evaluates to the function owner (postgres), NOT the caller.
CREATE OR REPLACE FUNCTION public.is_service_role()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
DECLARE
    v_raw_claims TEXT;
    v_jwt_role TEXT;
BEGIN
    -- 1. Extract PostgREST JWT claim safely
    BEGIN
        v_jwt_role := auth.jwt()->>'role';
    EXCEPTION WHEN OTHERS THEN
        v_jwt_role := NULL;
    END;

    IF v_jwt_role IS NULL THEN
        BEGIN
            v_raw_claims := current_setting('request.jwt.claims', true);
            IF v_raw_claims IS NOT NULL AND v_raw_claims <> '' THEN
                v_jwt_role := (v_raw_claims::jsonb)->>'role';
            END IF;
        EXCEPTION WHEN OTHERS THEN
            v_jwt_role := NULL;
        END;
    END IF;

    -- Caller is verified service_role if the JWT role claim is strictly 'service_role'
    IF v_jwt_role = 'service_role' THEN
        RETURN true;
    END IF;

    -- 2. Direct Interactive Administration Path (SQL Editor / Direct psql):
    -- In PostgREST, session_user is ALWAYS 'authenticator'.
    -- Only direct superuser/DBA sessions have session_user IN ('postgres', 'supabase_admin')
    -- AND have no Web API JWT claims attached.
    IF session_user IN ('postgres', 'supabase_admin') AND (v_jwt_role IS NULL OR v_jwt_role = '') THEN
        RETURN true;
    END IF;

    -- Fail closed by default
    RETURN false;
EXCEPTION WHEN OTHERS THEN
    -- Fail closed on any unexpected error or malformed input
    RETURN false;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.is_service_role() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_service_role() TO authenticated, service_role;

-- Dedicated check for authenticated active administrator
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
DECLARE
    v_is_adm BOOLEAN := false;
BEGIN
    IF auth.uid() IS NULL THEN
        RETURN false;
    END IF;

    SELECT EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE id = auth.uid()
          AND role = 'admin'::public.app_user_role
          AND account_status = 'active'::public.app_account_status
    ) INTO v_is_adm;

    RETURN COALESCE(v_is_adm, false);
EXCEPTION WHEN OTHERS THEN
    -- Fail-closed: Never grant access on exception
    RETURN false;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.is_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, service_role;

-- Dedicated check for authenticated active account
CREATE OR REPLACE FUNCTION public.is_active_user()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
DECLARE
    v_is_act BOOLEAN := false;
BEGIN
    IF auth.uid() IS NULL THEN
        RETURN false;
    END IF;

    SELECT EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE id = auth.uid()
          AND account_status = 'active'::public.app_account_status
    ) INTO v_is_act;

    RETURN COALESCE(v_is_act, false);
EXCEPTION WHEN OTHERS THEN
    RETURN false;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.is_active_user() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_active_user() TO authenticated, service_role;

-- Helper to retrieve caller's verified active role
CREATE OR REPLACE FUNCTION public.get_caller_role()
RETURNS public.app_user_role
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
DECLARE
    v_role public.app_user_role;
BEGIN
    IF auth.uid() IS NULL THEN
        RETURN 'unassigned'::public.app_user_role;
    END IF;

    SELECT role INTO v_role
    FROM public.profiles
    WHERE id = auth.uid()
      AND account_status = 'active'::public.app_account_status;

    RETURN COALESCE(v_role, 'unassigned'::public.app_user_role);
EXCEPTION WHEN OTHERS THEN
    RETURN 'unassigned'::public.app_user_role;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_caller_role() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_caller_role() TO authenticated, service_role;

-- Composite helper: strictly fail-closed, does not mask errors or delegate on failure
CREATE OR REPLACE FUNCTION public.is_admin_or_service()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
BEGIN
    -- Check trusted engine / service_role first
    IF public.is_service_role() THEN
        RETURN true;
    END IF;

    -- Check authenticated active administrator
    IF public.is_admin() THEN
        RETURN true;
    END IF;

    RETURN false;
EXCEPTION WHEN OTHERS THEN
    -- Fail-closed: Do NOT fall through or delegate to alternate paths on exception
    RETURN false;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.is_admin_or_service() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin_or_service() TO authenticated, service_role;

-- ------------------------------------------------------------------------------
-- 2.5 Least-Privilege Grants and Row Level Security (RLS) Policies
-- ------------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.login_history ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.profiles FROM PUBLIC, anon;
REVOKE ALL ON public.login_history FROM PUBLIC, anon;
REVOKE ALL ON public.user_profiles FROM PUBLIC, anon;

-- Direct client modifications revoked
REVOKE INSERT, DELETE, UPDATE, TRUNCATE, REFERENCES, TRIGGER ON public.profiles FROM authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.login_history FROM authenticated;

GRANT SELECT ON public.profiles TO authenticated;
GRANT SELECT ON public.user_profiles TO authenticated;
GRANT SELECT ON public.login_history TO authenticated;

-- Users may only update their display name, full name, or avatar url
GRANT UPDATE (display_name, full_name, avatar_url) ON public.profiles TO authenticated;

-- Full table operations granted to service_role
GRANT ALL ON public.profiles TO service_role;
GRANT ALL ON public.login_history TO service_role;
GRANT SELECT ON public.user_profiles TO service_role;

-- Profiles Policies
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
CREATE POLICY "Users can read own profile"
    ON public.profiles
    FOR SELECT
    USING (auth.uid() = id);

DROP POLICY IF EXISTS "Admins can read all profiles" ON public.profiles;
CREATE POLICY "Admins can read all profiles"
    ON public.profiles
    FOR SELECT
    USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;
CREATE POLICY "Admins can update any profile"
    ON public.profiles
    FOR UPDATE
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Users can update own permitted profile fields" ON public.profiles;
CREATE POLICY "Users can update own permitted profile fields"
    ON public.profiles
    FOR UPDATE
    USING (auth.uid() = id AND public.is_active_user())
    WITH CHECK (auth.uid() = id AND public.is_active_user());

-- Login History Policies (Audit log is immutable and viewable only by admins or the owner)
DROP POLICY IF EXISTS "Admins can view all login history" ON public.login_history;
CREATE POLICY "Admins can view all login history"
    ON public.login_history
    FOR SELECT
    USING (public.is_admin());

DROP POLICY IF EXISTS "Users can view own login history" ON public.login_history;
CREATE POLICY "Users can view own login history"
    ON public.login_history
    FOR SELECT
    USING (auth.uid() = user_id);

-- ------------------------------------------------------------------------------
-- 2.6 Field Protection Triggers & Last-Active-Admin Invariant
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.enforce_profile_update_integrity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_other_admins INT;
BEGIN
    NEW.id := OLD.id;
    NEW.created_at := OLD.created_at;
    NEW.updated_at := timezone('utc'::text, now());

    IF NOT public.is_admin_or_service() THEN
        -- Non-admins cannot alter role, status, email, customer_id, or audit timestamps
        NEW.role := OLD.role;
        NEW.account_status := OLD.account_status;
        NEW.status := OLD.account_status::text;
        NEW.email := OLD.email;
        NEW.auth_provider := OLD.auth_provider;
        NEW.customer_id := OLD.customer_id;
        NEW.last_login_at := OLD.last_login_at;
    ELSE
        -- Admin / Service update
        IF NEW.role IS NULL THEN
            NEW.role := OLD.role;
        END IF;

        IF NEW.account_status IS NULL THEN
            NEW.account_status := OLD.account_status;
        END IF;

        -- Keep status in absolute lockstep with account_status
        NEW.status := NEW.account_status::text;

        -- Enforce Last-Active-Administrator Invariant
        IF OLD.role = 'admin'::public.app_user_role AND OLD.account_status = 'active'::public.app_account_status THEN
            IF NEW.role <> 'admin'::public.app_user_role OR NEW.account_status <> 'active'::public.app_account_status THEN
                -- Advisory lock serializes concurrent transactions targeting admin rows
                PERFORM pg_advisory_xact_lock(hashtext('finsight_admin_invariant_gate'));

                SELECT COUNT(*) INTO v_other_admins
                FROM public.profiles
                WHERE role = 'admin'::public.app_user_role 
                  AND account_status = 'active'::public.app_account_status 
                  AND id <> OLD.id;

                IF v_other_admins = 0 THEN
                    RAISE EXCEPTION 'Cannot demote or deactivate user % (%): this is the last remaining active administrator in the system. Operation aborted.',
                        OLD.id, OLD.email;
                END IF;
            END IF;
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.enforce_profile_update_integrity() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.enforce_profile_update_integrity() TO authenticated, service_role;

DROP TRIGGER IF EXISTS trg_protect_profile_fields ON public.profiles;
CREATE TRIGGER trg_protect_profile_fields
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.enforce_profile_update_integrity();

CREATE OR REPLACE FUNCTION public.enforce_profile_delete_integrity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_other_admins INT;
BEGIN
    IF OLD.role = 'admin'::public.app_user_role AND OLD.account_status = 'active'::public.app_account_status THEN
        -- Standardized lock order: Advisory lock first
        PERFORM pg_advisory_xact_lock(hashtext('finsight_admin_invariant_gate'));

        SELECT COUNT(*) INTO v_other_admins
        FROM public.profiles
        WHERE role = 'admin'::public.app_user_role 
          AND account_status = 'active'::public.app_account_status 
          AND id <> OLD.id;

        IF v_other_admins = 0 THEN
            RAISE EXCEPTION 'Cannot delete user % (%): this is the last remaining active administrator in the system. Operation aborted.',
                OLD.id, OLD.email;
        END IF;
    END IF;
    RETURN OLD;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.enforce_profile_delete_integrity() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.enforce_profile_delete_integrity() TO authenticated, service_role;

DROP TRIGGER IF EXISTS trg_protect_profile_delete ON public.profiles;
CREATE TRIGGER trg_protect_profile_delete
    BEFORE DELETE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.enforce_profile_delete_integrity();

-- ------------------------------------------------------------------------------
-- 2.7 Dedicated Narrowly Authorized Admin Management Operation
-- Explicitly handles admin approval, role assignment, suspension, and reactivation
-- Consistent lock ordering: pg_advisory_xact_lock FIRST, then row lock FOR UPDATE
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_manage_user_profile(
    target_user_id UUID,
    new_role public.app_user_role DEFAULT NULL,
    new_status public.app_account_status DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_target RECORD;
    v_other_admins INT;
    v_updated_role public.app_user_role;
    v_updated_status public.app_account_status;
BEGIN
    -- 1. Strictly verify caller is an active administrator or service role
    IF NOT public.is_admin() AND NOT public.is_service_role() THEN
        RAISE EXCEPTION 'Access denied: Caller is not an authorized active administrator.';
    END IF;

    -- 2. STANDARDIZED LOCK ORDER: Acquire transactional advisory lock FIRST
    -- This guarantees zero deadlocks between concurrent admin updates and demotions
    PERFORM pg_advisory_xact_lock(hashtext('finsight_admin_invariant_gate'));

    -- 3. Lock target user row for update
    SELECT id, email, role, account_status
    INTO v_target
    FROM public.profiles
    WHERE id = target_user_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Target user profile not found for id: %', target_user_id;
    END IF;

    v_updated_role := COALESCE(new_role, v_target.role);
    v_updated_status := COALESCE(new_status, v_target.account_status);

    -- 4. Enforce Last-Active-Administrator Invariant
    IF v_target.role = 'admin'::public.app_user_role AND v_target.account_status = 'active'::public.app_account_status THEN
        IF v_updated_role <> 'admin'::public.app_user_role OR v_updated_status <> 'active'::public.app_account_status THEN
            SELECT COUNT(*) INTO v_other_admins
            FROM public.profiles
            WHERE role = 'admin'::public.app_user_role
              AND account_status = 'active'::public.app_account_status
              AND id <> target_user_id;

            IF v_other_admins = 0 THEN
                RAISE EXCEPTION 'Cannot demote or deactivate user % (%): this is the last remaining active administrator in the system. Operation aborted.',
                    v_target.id, v_target.email;
            END IF;
        END IF;
    END IF;

    -- 5. Apply update
    UPDATE public.profiles
    SET role = v_updated_role,
        account_status = v_updated_status,
        status = v_updated_status::text,
        updated_at = timezone('utc'::text, now())
    WHERE id = target_user_id;

    RETURN jsonb_build_object(
        'success', true,
        'id', target_user_id,
        'role', v_updated_role,
        'account_status', v_updated_status,
        'message', 'User account updated successfully by administrator.'
    );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_manage_user_profile(UUID, public.app_user_role, public.app_account_status) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_manage_user_profile(UUID, public.app_user_role, public.app_account_status) TO authenticated, service_role;

-- ------------------------------------------------------------------------------
-- 2.8 Automatic Profile Creation on Signup (auth.users Trigger)
-- Guarantees new signups default strictly to 'unassigned' and 'pending_approval'
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    initial_role public.app_user_role := 'unassigned'::public.app_user_role;
    initial_status public.app_account_status := 'pending_approval'::public.app_account_status;
    raw_provider TEXT := COALESCE(NEW.raw_app_meta_data->>'provider', 'email');
    extracted_full_name TEXT;
    extracted_display_name TEXT;
    extracted_avatar_url TEXT;
BEGIN
    extracted_full_name := NULLIF(trim(NEW.raw_user_meta_data->>'full_name'), '');
    IF extracted_full_name IS NULL THEN
        extracted_full_name := NULLIF(trim(NEW.raw_user_meta_data->>'name'), '');
    END IF;

    extracted_avatar_url := NULLIF(trim(NEW.raw_user_meta_data->>'avatar_url'), '');
    IF extracted_avatar_url IS NULL THEN
        extracted_avatar_url := NULLIF(trim(NEW.raw_user_meta_data->>'picture'), '');
    END IF;

    extracted_display_name := COALESCE(
        extracted_full_name,
        split_part(NEW.email, '@', 1)
    );

    INSERT INTO public.profiles (
        id,
        display_name,
        full_name,
        avatar_url,
        email,
        role,
        account_status,
        status,
        auth_provider,
        created_at,
        updated_at
    )
    VALUES (
        NEW.id,
        extracted_display_name,
        extracted_full_name,
        extracted_avatar_url,
        lower(trim(NEW.email)),
        initial_role,
        initial_status,
        'pending_approval',
        raw_provider,
        timezone('utc'::text, now()),
        timezone('utc'::text, now())
    )
    ON CONFLICT (id) DO UPDATE
    SET
        display_name = CASE
            WHEN public.profiles.display_name IS NULL OR trim(public.profiles.display_name) = ''
            THEN EXCLUDED.display_name
            ELSE public.profiles.display_name
        END,
        full_name = CASE
            WHEN public.profiles.full_name IS NULL OR trim(public.profiles.full_name) = ''
            THEN EXCLUDED.full_name
            ELSE public.profiles.full_name
        END,
        updated_at = timezone('utc'::text, now())
    WHERE public.profiles.id = EXCLUDED.id;

    RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- Synchronize email when auth.users email is updated
CREATE OR REPLACE FUNCTION public.handle_user_updated()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    IF NEW.email IS DISTINCT FROM OLD.email THEN
        UPDATE public.profiles
        SET email = lower(trim(NEW.email)),
            updated_at = timezone('utc'::text, now())
        WHERE id = NEW.id;
    END IF;
    RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.handle_user_updated() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
CREATE TRIGGER on_auth_user_updated
    AFTER UPDATE OF email ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_user_updated();

-- ------------------------------------------------------------------------------
-- 2.9 Trusted Initial Administrator Promotion Procedure
-- Non-aggregate row locking with FOR UPDATE; requires confirmed email and service_role
-- Consistent lock ordering: pg_advisory_xact_lock FIRST, then row lock FOR UPDATE
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.promote_to_admin(
    target_user_id UUID,
    expected_email TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_auth_record RECORD;
    v_profile_record RECORD;
BEGIN
    -- Defense-in-depth: Verify caller is service_role or database administrator
    IF NOT public.is_service_role() THEN
        RAISE EXCEPTION 'Access denied: promote_to_admin is restricted to service_role or database administrators.';
    END IF;

    -- STANDARDIZED LOCK ORDER: Acquire advisory lock FIRST
    PERFORM pg_advisory_xact_lock(hashtext('finsight_admin_invariant_gate'));

    -- Verify target user in auth.users
    SELECT id, email, email_confirmed_at INTO v_auth_record
    FROM auth.users
    WHERE id = target_user_id
      AND lower(trim(email)) = lower(trim(expected_email));

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Target user (%) not found in auth.users or email mismatch with %. Promotion aborted.',
            target_user_id, expected_email;
    END IF;

    IF v_auth_record.email_confirmed_at IS NULL THEN
        RAISE EXCEPTION 'User email % is not confirmed. Email confirmation required before admin promotion.',
            expected_email;
    END IF;

    -- Lock the specific target profile row safely (NO aggregate FOR UPDATE)
    SELECT id, role, account_status INTO v_profile_record
    FROM public.profiles
    WHERE id = target_user_id
      AND lower(trim(email)) = lower(trim(expected_email))
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Target profile not found in public.profiles. User must complete signup first.';
    END IF;

    UPDATE public.profiles
    SET role = 'admin'::public.app_user_role,
        account_status = 'active'::public.app_account_status,
        status = 'active',
        updated_at = timezone('utc'::text, now())
    WHERE id = target_user_id;

    RAISE NOTICE 'Successfully promoted user % (%) to active admin.', target_user_id, expected_email;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.promote_to_admin(UUID, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.promote_to_admin(UUID, TEXT) TO service_role;

-- ------------------------------------------------------------------------------
-- 2.10 Safe Demotion Procedure
-- Standardized lock ordering: pg_advisory_xact_lock FIRST, then row lock FOR UPDATE
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.demote_admin(
    target_user_id UUID,
    expected_email TEXT,
    new_role public.app_user_role DEFAULT 'unassigned'::public.app_user_role
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_profile_record RECORD;
    v_other_admins INT;
BEGIN
    -- Defense-in-depth: Verify caller is service_role or database administrator
    IF NOT public.is_service_role() THEN
        RAISE EXCEPTION 'Access denied: demote_admin is restricted to service_role or database administrators.';
    END IF;

    IF new_role = 'admin'::public.app_user_role THEN
        RAISE EXCEPTION 'Cannot demote to admin role. Choose unassigned, customer, business_analyst, or risk_analyst.';
    END IF;

    -- STANDARDIZED LOCK ORDER: Acquire advisory lock FIRST
    PERFORM pg_advisory_xact_lock(hashtext('finsight_admin_invariant_gate'));

    SELECT id, role, account_status INTO v_profile_record
    FROM public.profiles
    WHERE id = target_user_id
      AND lower(trim(email)) = lower(trim(expected_email))
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Target profile not found in public.profiles for user % with email %. Demotion aborted.',
            target_user_id, expected_email;
    END IF;

    SELECT COUNT(*) INTO v_other_admins
    FROM public.profiles
    WHERE role = 'admin'::public.app_user_role
      AND account_status = 'active'::public.app_account_status
      AND id <> target_user_id;

    IF v_other_admins = 0 AND v_profile_record.role = 'admin'::public.app_user_role AND v_profile_record.account_status = 'active'::public.app_account_status THEN
        RAISE EXCEPTION 'Cannot demote user % (%): this is the last remaining active administrator in the system. Demotion aborted.',
            target_user_id, expected_email;
    END IF;

    UPDATE public.profiles
    SET role = new_role,
        account_status = 'pending_approval'::public.app_account_status,
        status = 'pending_approval',
        updated_at = timezone('utc'::text, now())
    WHERE id = target_user_id;

    RAISE NOTICE 'Successfully demoted user % (%) to % with pending_approval status.',
        target_user_id, expected_email, new_role;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.demote_admin(UUID, TEXT, public.app_user_role) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.demote_admin(UUID, TEXT, public.app_user_role) TO service_role;

COMMIT;

-- ==============================================================================
-- END OF MIGRATION SCRIPT
-- ==============================================================================
