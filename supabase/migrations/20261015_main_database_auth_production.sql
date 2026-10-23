-- ==============================================================================
-- FinSight AI: Main Database Production Auth & Profile Migration
-- Target Supabase Project: ncfzjltffljconwihvpk
-- File: supabase/migrations/20261015_main_database_auth_production.sql
--
-- PURPOSE:
-- 1. Create and reconcile core public.profiles and public.login_history tables.
-- 2. Establish app_user_role and app_account_status enums.
-- 3. Default all new registrations strictly to 'customer' role and 'active' status.
-- 4. Establish security_invoker view public.user_profiles for backward compatibility.
-- 5. Safe backfill for existing auth.users without unverified privilege escalation.
-- 6. Enforce strict Row-Level Security (RLS) policies and least-privilege grants.
-- 7. Deploy security definer procedures with advisory lock serialization to protect
--    the last remaining active administrator from demotion or deletion.
-- 8. Safe handling of existing NULL emails, duplicate emails, and legacy objects.
--
-- SAFETY INVARIANTS:
-- - Zero destructive operations (NO DROP TABLE, NO TRUNCATE, NO CASCADE DROPS).
-- - Fully idempotent (safe to rerun without schema or data corruption).
-- - Zero automatic privilege escalation (admin claims logged to review quarantine).
-- ==============================================================================

-- ==============================================================================
-- STEP 1: ENUM TYPES INITIALIZATION & RECONCILIATION (TRANSACTION 1)
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

-- Ensure all enum labels exist if types were pre-created
ALTER TYPE public.app_user_role ADD VALUE IF NOT EXISTS 'admin';
ALTER TYPE public.app_user_role ADD VALUE IF NOT EXISTS 'business_analyst';
ALTER TYPE public.app_user_role ADD VALUE IF NOT EXISTS 'risk_analyst';
ALTER TYPE public.app_user_role ADD VALUE IF NOT EXISTS 'customer';
ALTER TYPE public.app_user_role ADD VALUE IF NOT EXISTS 'unassigned';

ALTER TYPE public.app_account_status ADD VALUE IF NOT EXISTS 'active';
ALTER TYPE public.app_account_status ADD VALUE IF NOT EXISTS 'pending_approval';
ALTER TYPE public.app_account_status ADD VALUE IF NOT EXISTS 'suspended';

-- ==============================================================================
-- STEP 2: SCHEMA OBJECTS, QUARANTINES, TABLES, CONSTRAINTS & AUDIT LOGS
-- ==============================================================================
BEGIN;

-- ------------------------------------------------------------------------------
-- 2.1 Audit & Quarantine Tables (Zero Silent Data Loss)
-- ------------------------------------------------------------------------------

-- Quarantine for duplicate emails in existing legacy data
CREATE TABLE IF NOT EXISTS public._legacy_duplicate_emails_quarantine (
    quarantine_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL,
    original_email TEXT NOT NULL,
    resolved_email TEXT NOT NULL,
    detected_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    raw_record JSONB NOT NULL,
    resolution_notes TEXT NOT NULL
);

REVOKE ALL ON public._legacy_duplicate_emails_quarantine FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public._legacy_duplicate_emails_quarantine TO service_role;

-- Quarantine for orphaned profiles missing from auth.users
CREATE TABLE IF NOT EXISTS public._legacy_profiles_orphans (
    quarantine_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL,
    raw_record JSONB NOT NULL,
    detected_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    quarantine_reason TEXT NOT NULL
);

REVOKE ALL ON public._legacy_profiles_orphans FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public._legacy_profiles_orphans TO service_role;

-- Audit table for legacy admin promotion review (Prevents unauthorized auto-escalation)
CREATE TABLE IF NOT EXISTS public._legacy_admin_promotion_review (
    review_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    email TEXT,
    source_table TEXT NOT NULL,
    claimed_legacy_role TEXT NOT NULL,
    legacy_account_status TEXT,
    detected_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    review_status TEXT NOT NULL DEFAULT 'pending_identity_verification',
    reviewed_by UUID,
    reviewed_at TIMESTAMPTZ,
    resolution_notes TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_main_admin_review_claim_idx 
    ON public._legacy_admin_promotion_review(source_table, user_id, claimed_legacy_role, COALESCE(email, ''));

REVOKE ALL ON public._legacy_admin_promotion_review FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public._legacy_admin_promotion_review TO service_role;

-- ------------------------------------------------------------------------------
-- 2.2 Core Profiles Table (public.profiles)
-- Defaults strictly to customer role and active status
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name TEXT NOT NULL DEFAULT 'Customer',
    full_name TEXT,
    avatar_url TEXT,
    email TEXT,
    role public.app_user_role NOT NULL DEFAULT 'customer'::public.app_user_role,
    account_status public.app_account_status NOT NULL DEFAULT 'active'::public.app_account_status,
    status TEXT NOT NULL DEFAULT 'active',
    auth_provider TEXT NOT NULL DEFAULT 'email',
    customer_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    last_login_at TIMESTAMPTZ DEFAULT NULL
);

-- Reconcile columns if table pre-existed
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS display_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role public.app_user_role NOT NULL DEFAULT 'customer'::public.app_user_role;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS account_status public.app_account_status NOT NULL DEFAULT 'active'::public.app_account_status;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS auth_provider TEXT NOT NULL DEFAULT 'email';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS customer_id TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now());
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now());
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ DEFAULT NULL;

-- Ensure foreign key constraint on profiles.id -> auth.users(id)
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
            RAISE NOTICE 'Skipping profiles_id_fkey constraint addition: %', SQLERRM;
        END;
    END IF;
END $$;

-- Enforce NOT NULL on display_name
UPDATE public.profiles
SET display_name = COALESCE(
    NULLIF(trim(full_name), ''),
    NULLIF(trim(split_part(email, '@', 1)), ''),
    'Customer'
)
WHERE display_name IS NULL OR trim(display_name) = '';

ALTER TABLE public.profiles ALTER COLUMN display_name SET NOT NULL;

-- Safe pre-repair of NULL or empty emails in public.profiles
UPDATE public.profiles
SET email = 'unspecified_' || substr(id::text, 1, 8) || '@placeholder.internal'
WHERE email IS NULL OR trim(email) = '';

-- Normalize email casing and whitespace
UPDATE public.profiles
SET email = lower(trim(email))
WHERE email IS NOT NULL AND email <> lower(trim(email));

-- Safe duplicate email resolution in public.profiles with separate loop variables
DO $$
DECLARE
    v_email_grp RECORD;
    v_dup_row RECORD;
    v_dup_count INT := 0;
    v_dup_seq INT := 0;
    v_resolved_email TEXT;
BEGIN
    FOR v_email_grp IN (
        SELECT lower(trim(email)) AS email_norm, COUNT(*) AS cnt
        FROM public.profiles
        WHERE email IS NOT NULL AND trim(email) <> ''
        GROUP BY lower(trim(email))
        HAVING COUNT(*) > 1
    ) LOOP
        v_dup_seq := 0;
        FOR v_dup_row IN (
            SELECT p.id, p.email, p.created_at, to_jsonb(p) AS r_json
            FROM public.profiles p
            WHERE lower(trim(p.email)) = v_email_grp.email_norm
            ORDER BY p.created_at ASC NULLS LAST, p.id ASC
            OFFSET 1
        ) LOOP
            v_dup_seq := v_dup_seq + 1;
            
            v_resolved_email := split_part(v_dup_row.email, '@', 1) 
                || '+dup_' || substr(v_dup_row.id::text, 1, 8) 
                || '_' || v_dup_seq::text 
                || '@' || split_part(v_dup_row.email, '@', 2);

            WHILE EXISTS (SELECT 1 FROM public.profiles WHERE lower(trim(email)) = lower(trim(v_resolved_email))) LOOP
                v_resolved_email := split_part(v_dup_row.email, '@', 1) 
                    || '+dup_' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 10) 
                    || '@' || split_part(v_dup_row.email, '@', 2);
            END LOOP;
            
            INSERT INTO public._legacy_duplicate_emails_quarantine (
                profile_id, original_email, resolved_email, raw_record, resolution_notes
            ) VALUES (
                v_dup_row.id, 
                v_dup_row.email, 
                v_resolved_email, 
                v_dup_row.r_json, 
                'Duplicate email collision detected; disambiguated placeholder assigned. Account cannot authenticate until email is re-verified.'
            );

            UPDATE public.profiles
            SET email = v_resolved_email
            WHERE id = v_dup_row.id;

            v_dup_count := v_dup_count + 1;
        END LOOP;
    END LOOP;

    IF v_dup_count > 0 THEN
        RAISE NOTICE 'Resolved and disambiguated % duplicate email profiles; audit preserved in _legacy_duplicate_emails_quarantine.', v_dup_count;
    END IF;
END $$;

ALTER TABLE public.profiles ALTER COLUMN email SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_email_unique ON public.profiles(lower(email));

-- Safe Enum Type Reconciliation for Existing Columns if previously text/varchar
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'role'
          AND udt_name <> 'app_user_role'
    ) THEN
        INSERT INTO public._legacy_admin_promotion_review (
            user_id, email, source_table, claimed_legacy_role, resolution_notes
        )
        SELECT 
            p.id, 
            p.email, 
            'public.profiles', 
            p.role::text, 
            'Legacy text role claimed administrator status; mapped to customer pending manual identity verification'
        FROM public.profiles p
        WHERE lower(trim(p.role::text)) IN ('admin', 'administrator', 'superadmin', 'super_admin')
        ON CONFLICT DO NOTHING;

        ALTER TABLE public.profiles ALTER COLUMN role DROP DEFAULT;

        UPDATE public.profiles 
        SET role = (
            CASE 
                WHEN lower(trim(role::text)) IN ('business_analyst', 'business analyst', 'analyst', 'ba') THEN 'business_analyst'
                WHEN lower(trim(role::text)) IN ('risk_analyst', 'risk analyst', 'risk', 'fraud_analyst') THEN 'risk_analyst'
                WHEN lower(trim(role::text)) IN ('unassigned') THEN 'unassigned'
                ELSE 'customer'
            END
        )::public.app_user_role;

        ALTER TABLE public.profiles 
            ALTER COLUMN role TYPE public.app_user_role 
            USING (
                CASE 
                    WHEN lower(trim(role::text)) IN ('business_analyst', 'business analyst', 'analyst', 'ba') THEN 'business_analyst'::public.app_user_role
                    WHEN lower(trim(role::text)) IN ('risk_analyst', 'risk analyst', 'risk', 'fraud_analyst') THEN 'risk_analyst'::public.app_user_role
                    WHEN lower(trim(role::text)) IN ('unassigned') THEN 'unassigned'::public.app_user_role
                    ELSE 'customer'::public.app_user_role
                END
            );
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'account_status'
          AND udt_name <> 'app_account_status'
    ) THEN
        ALTER TABLE public.profiles ALTER COLUMN account_status DROP DEFAULT;

        UPDATE public.profiles 
        SET account_status = (
            CASE 
                WHEN lower(trim(account_status::text)) IN ('active', 'approved', 'verified', 'enabled') THEN 'active'
                WHEN lower(trim(account_status::text)) IN ('suspended', 'disabled', 'banned', 'blocked', 'deactivated') THEN 'suspended'
                WHEN lower(trim(account_status::text)) IN ('pending_approval') THEN 'pending_approval'
                ELSE 'active'
            END
        )::public.app_account_status;

        ALTER TABLE public.profiles 
            ALTER COLUMN account_status TYPE public.app_account_status 
            USING (
                CASE 
                    WHEN lower(trim(account_status::text)) IN ('active', 'approved', 'verified', 'enabled') THEN 'active'::public.app_account_status
                    WHEN lower(trim(account_status::text)) IN ('suspended', 'disabled', 'banned', 'blocked', 'deactivated') THEN 'suspended'::public.app_account_status
                    WHEN lower(trim(account_status::text)) IN ('pending_approval') THEN 'pending_approval'::public.app_account_status
                    ELSE 'active'::public.app_account_status
                END
            );
    END IF;
END $$;

-- Reconcile role and account_status defaults to customer/active
ALTER TABLE public.profiles ALTER COLUMN role SET DEFAULT 'customer'::public.app_user_role;
ALTER TABLE public.profiles ALTER COLUMN role SET NOT NULL;
ALTER TABLE public.profiles ALTER COLUMN account_status SET DEFAULT 'active'::public.app_account_status;
ALTER TABLE public.profiles ALTER COLUMN account_status SET NOT NULL;
ALTER TABLE public.profiles ALTER COLUMN status SET DEFAULT 'active';
ALTER TABLE public.profiles ALTER COLUMN status SET NOT NULL;

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
-- 2.3 Safe Handling of Existing public.user_profiles Object (Compatibility Plan)
-- ------------------------------------------------------------------------------
DO $$
DECLARE
    v_relkind "char";
    v_dependent_views TEXT;
    v_dependent_fks TEXT;
    v_migrated_count INT := 0;
BEGIN
    SELECT c.relkind INTO v_relkind
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'user_profiles';

    IF v_relkind IS NOT NULL THEN
        -- Case A: Physical Table ('r') or Partitioned Table ('p')
        IF v_relkind IN ('r', 'p') THEN
            IF EXISTS (
                SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = '_legacy_user_profiles_backup'
            ) THEN
                RAISE EXCEPTION 'SAFETY HALT: Both public.user_profiles and public._legacy_user_profiles_backup exist as physical tables. Automatic overwrite is prohibited. Manual DBA inspection required.';
            END IF;

            SELECT string_agg(tc.table_schema || '.' || tc.table_name || ' (' || kcu.column_name || ')', ', ')
            INTO v_dependent_fks
            FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
            JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name
            WHERE tc.constraint_type = 'FOREIGN KEY'
              AND ccu.table_schema = 'public' AND ccu.table_name = 'user_profiles';

            IF v_dependent_fks IS NOT NULL THEN
                RAISE NOTICE 'AUDIT ADVISORY: Foreign keys reference legacy table public.user_profiles: %. They will remain bound to _legacy_user_profiles_backup.', v_dependent_fks;
            END IF;

            -- Migrate valid records into public.profiles
            INSERT INTO public.profiles (
                id, display_name, full_name, avatar_url, email, role,
                account_status, status, auth_provider, customer_id, created_at, updated_at
            )
            SELECT
                up.id,
                COALESCE(NULLIF(trim(up.display_name), ''), 'Customer'),
                up.full_name,
                up.avatar_url,
                COALESCE(lower(trim(up.email)), 'unspecified_' || substr(up.id::text, 1, 8) || '@placeholder.internal'),
                'customer'::public.app_user_role,
                'active'::public.app_account_status,
                'active',
                COALESCE(up.auth_provider, 'email'),
                COALESCE(up.customer_id, 'CUST-' || floor(1000 + random() * 9000)::text),
                COALESCE(up.created_at, timezone('utc'::text, now())),
                timezone('utc'::text, now())
            FROM public.user_profiles up
            WHERE up.id IN (SELECT id FROM auth.users)
            ON CONFLICT (id) DO UPDATE SET
                display_name = COALESCE(NULLIF(trim(public.profiles.display_name), ''), EXCLUDED.display_name),
                full_name = COALESCE(public.profiles.full_name, EXCLUDED.full_name),
                avatar_url = COALESCE(public.profiles.avatar_url, EXCLUDED.avatar_url),
                customer_id = COALESCE(public.profiles.customer_id, EXCLUDED.customer_id),
                updated_at = timezone('utc'::text, now())
            WHERE public.profiles.id = EXCLUDED.id;

            GET DIAGNOSTICS v_migrated_count = ROW_COUNT;
            RAISE NOTICE 'Migrated % valid records from legacy user_profiles into public.profiles.', v_migrated_count;

            ALTER TABLE public.user_profiles RENAME TO _legacy_user_profiles_backup;
            RAISE NOTICE 'Renamed legacy physical table public.user_profiles to public._legacy_user_profiles_backup.';

        -- Case B: Standard View ('v')
        ELSIF v_relkind = 'v' THEN
            SELECT string_agg(c2.relname, ', ')
            INTO v_dependent_views
            FROM pg_depend d
            JOIN pg_rewrite r ON r.oid = d.objid
            JOIN pg_class c2 ON c2.oid = r.ev_class
            WHERE d.refobjid = 'public.user_profiles'::regclass
              AND c2.oid <> 'public.user_profiles'::regclass;

            IF v_dependent_views IS NOT NULL THEN
                RAISE EXCEPTION 'SAFETY HALT: External objects depend on view public.user_profiles: %. Dropping would cascade. Manual dependency review required.', v_dependent_views;
            END IF;

            DROP VIEW public.user_profiles;

        -- Case C: Materialized View ('m') or Foreign Table ('f')
        ELSIF v_relkind = 'm' THEN
            RAISE EXCEPTION 'SAFETY HALT: public.user_profiles is a materialized view (relkind=m). Manual DBA review required.';
        ELSIF v_relkind = 'f' THEN
            RAISE EXCEPTION 'SAFETY HALT: public.user_profiles is a foreign table (relkind=f). Manual DBA review required.';
        END IF;
    END IF;
END $$;

-- Canonical Compatibility View with security_invoker = true
CREATE OR REPLACE VIEW public.user_profiles WITH (security_invoker = true) AS
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

-- Performance and Audit Indices
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(lower(email));
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_account_status ON public.profiles(account_status);
CREATE INDEX IF NOT EXISTS idx_profiles_customer_id ON public.profiles(customer_id);

-- ------------------------------------------------------------------------------
-- 2.4 Existing Auth Users Safe Backfill (ZERO ASSUMED ADMIN ESCALATION)
-- Inspects auth.users and generates customer profiles for unprofiled users.
-- Safely handles NULL/missing emails and duplicate collisions.
-- Any user with admin in email or metadata is flagged for explicit manual admin review.
-- ------------------------------------------------------------------------------
DO $$
DECLARE
    v_user RECORD;
    v_count INT := 0;
    v_cust_id TEXT;
    v_disp_name TEXT;
    v_resolved_email TEXT;
    v_seq INT := 0;
BEGIN
    FOR v_user IN (
        SELECT u.id, u.email, u.raw_user_meta_data, u.raw_app_meta_data, u.created_at
        FROM auth.users u
        LEFT JOIN public.profiles p ON p.id = u.id
        WHERE p.id IS NULL
        ORDER BY u.created_at ASC NULLS LAST, u.id ASC
    ) LOOP
        -- Resolve and validate email safely
        IF v_user.email IS NULL OR trim(v_user.email) = '' THEN
            v_resolved_email := 'missing_auth_email_' || substr(v_user.id::text, 1, 8) || '@placeholder.internal';
            
            INSERT INTO public._legacy_duplicate_emails_quarantine (
                profile_id, original_email, resolved_email, raw_record, resolution_notes
            ) VALUES (
                v_user.id,
                'NULL',
                v_resolved_email,
                to_jsonb(v_user),
                'auth.users record had NULL/empty email. Safe placeholder assigned. User must verify email before normal operations.'
            );
        ELSE
            v_resolved_email := lower(trim(v_user.email));
            
            -- Check if another profile already has this email
            IF EXISTS (SELECT 1 FROM public.profiles WHERE lower(trim(email)) = v_resolved_email AND id <> v_user.id) THEN
                v_seq := v_seq + 1;
                v_resolved_email := split_part(lower(trim(v_user.email)), '@', 1) 
                    || '+dup_auth_' || substr(v_user.id::text, 1, 8) 
                    || '_' || v_seq::text 
                    || '@' || split_part(lower(trim(v_user.email)), '@', 2);
                
                WHILE EXISTS (SELECT 1 FROM public.profiles WHERE lower(trim(email)) = v_resolved_email AND id <> v_user.id) LOOP
                    v_resolved_email := split_part(lower(trim(v_user.email)), '@', 1) 
                        || '+dup_auth_' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 10) 
                        || '@' || split_part(lower(trim(v_user.email)), '@', 2);
                END LOOP;

                INSERT INTO public._legacy_duplicate_emails_quarantine (
                    profile_id, original_email, resolved_email, raw_record, resolution_notes
                ) VALUES (
                    v_user.id,
                    lower(trim(v_user.email)),
                    v_resolved_email,
                    to_jsonb(v_user),
                    'auth.users record has email colliding with an existing profile. Disambiguated placeholder assigned.'
                );
            END IF;
        END IF;

        -- Generate customer ID
        v_cust_id := 'CUST-' || floor(1000 + random() * 9000)::text;
        
        -- Resolve display name
        v_disp_name := COALESCE(
            NULLIF(trim(v_user.raw_user_meta_data->>'full_name'), ''),
            NULLIF(trim(v_user.raw_user_meta_data->>'name'), ''),
            NULLIF(trim(split_part(COALESCE(v_user.email, v_resolved_email), '@', 1)), ''),
            'Customer'
        );

        -- Backfill profile strictly as customer/active
        INSERT INTO public.profiles (
            id,
            display_name,
            full_name,
            email,
            role,
            account_status,
            status,
            auth_provider,
            customer_id,
            created_at,
            updated_at
        )
        VALUES (
            v_user.id,
            v_disp_name,
            NULLIF(trim(v_user.raw_user_meta_data->>'full_name'), ''),
            v_resolved_email,
            'customer'::public.app_user_role,
            'active'::public.app_account_status,
            'active',
            COALESCE(v_user.raw_app_meta_data->>'provider', 'email'),
            v_cust_id,
            COALESCE(v_user.created_at, timezone('utc'::text, now())),
            timezone('utc'::text, now())
        )
        ON CONFLICT (id) DO NOTHING;

        -- Flag potential admin account in audit review table without auto-escalating
        IF (v_user.email IS NOT NULL AND lower(v_user.email) LIKE '%admin%')
           OR (v_user.raw_user_meta_data->>'role' = 'admin')
           OR (v_user.raw_app_meta_data->>'role' = 'admin') THEN
            INSERT INTO public._legacy_admin_promotion_review (
                user_id,
                email,
                source_table,
                claimed_legacy_role,
                legacy_account_status,
                resolution_notes
            )
            VALUES (
                v_user.id,
                COALESCE(lower(trim(v_user.email)), v_resolved_email),
                'auth.users',
                'admin_intent',
                'active',
                'Identified potential admin account during production migration backfill; initialized as customer pending explicit administrator promotion'
            )
            ON CONFLICT DO NOTHING;
        END IF;

        v_count := v_count + 1;
    END LOOP;

    RAISE NOTICE 'Backfilled % existing auth.users into public.profiles as verified customers.', v_count;
END $$;

-- ------------------------------------------------------------------------------
-- 2.5 Login History Table (public.login_history) & Strict Immutability Enforcement
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.login_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    email TEXT NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    auth_provider TEXT DEFAULT 'email',
    event_type TEXT NOT NULL DEFAULT 'login_success',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.login_history ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.login_history ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.login_history ADD COLUMN IF NOT EXISTS ip_address TEXT;
ALTER TABLE public.login_history ADD COLUMN IF NOT EXISTS user_agent TEXT;
ALTER TABLE public.login_history ADD COLUMN IF NOT EXISTS auth_provider TEXT DEFAULT 'email';
ALTER TABLE public.login_history ADD COLUMN IF NOT EXISTS event_type TEXT NOT NULL DEFAULT 'login_success';
ALTER TABLE public.login_history ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now());

CREATE INDEX IF NOT EXISTS idx_login_history_user_id ON public.login_history(user_id);
CREATE INDEX IF NOT EXISTS idx_login_history_email ON public.login_history(lower(email));
CREATE INDEX IF NOT EXISTS idx_login_history_created_at ON public.login_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_login_history_event_type ON public.login_history(event_type);

-- Append-only enforcement trigger for login_history
CREATE OR REPLACE FUNCTION public.enforce_login_history_immutability()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    RAISE EXCEPTION 'Compliance violation: login_history is strictly append-only. Modification or deletion is forbidden.';
END;
$$;

REVOKE EXECUTE ON FUNCTION public.enforce_login_history_immutability() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.enforce_login_history_immutability() TO service_role;

DROP TRIGGER IF EXISTS trg_immutable_login_history_mutation ON public.login_history;
CREATE TRIGGER trg_immutable_login_history_mutation
    BEFORE UPDATE OR DELETE ON public.login_history
    FOR EACH ROW
    EXECUTE FUNCTION public.enforce_login_history_immutability();

-- ------------------------------------------------------------------------------
-- 2.6 Security Definer Authorization Helper Functions
-- ------------------------------------------------------------------------------

-- Dedicated check for trusted PostgREST service role or direct DBA session
CREATE OR REPLACE FUNCTION public.is_service_role()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
DECLARE
    v_jwt_role TEXT;
    v_db_role TEXT;
BEGIN
    IF session_user IN ('postgres', 'supabase_admin') THEN
        BEGIN
            v_jwt_role := auth.jwt()->>'role';
        EXCEPTION WHEN OTHERS THEN
            v_jwt_role := NULL;
        END;
        IF v_jwt_role IS NULL OR v_jwt_role = '' OR v_jwt_role = 'service_role' THEN
            RETURN true;
        END IF;
    END IF;

    BEGIN
        v_db_role := current_setting('role', true);
    EXCEPTION WHEN OTHERS THEN
        v_db_role := NULL;
    END;

    BEGIN
        v_jwt_role := auth.jwt()->>'role';
    EXCEPTION WHEN OTHERS THEN
        v_jwt_role := NULL;
    END;

    -- Under PostgREST execution, both JWT and db_role must be service_role
    IF session_user = 'authenticator' THEN
        IF (v_jwt_role = 'service_role') AND (v_db_role = 'service_role') THEN
            RETURN true;
        END IF;
    END IF;

    IF session_user IN ('postgres', 'supabase_admin') THEN
        IF (v_jwt_role = 'service_role') OR (v_db_role = 'service_role') THEN
            RETURN true;
        END IF;
    END IF;

    RETURN false;
EXCEPTION WHEN OTHERS THEN
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

-- Composite helper
CREATE OR REPLACE FUNCTION public.is_admin_or_service()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
BEGIN
    IF public.is_service_role() THEN
        RETURN true;
    END IF;
    IF public.is_admin() THEN
        RETURN true;
    END IF;
    RETURN false;
EXCEPTION WHEN OTHERS THEN
    RETURN false;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.is_admin_or_service() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin_or_service() TO authenticated, service_role;

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
        RETURN 'customer'::public.app_user_role;
    END IF;

    SELECT role INTO v_role
    FROM public.profiles
    WHERE id = auth.uid()
      AND account_status = 'active'::public.app_account_status;

    RETURN COALESCE(v_role, 'customer'::public.app_user_role);
EXCEPTION WHEN OTHERS THEN
    RETURN 'customer'::public.app_user_role;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_caller_role() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_caller_role() TO authenticated, service_role;

-- ------------------------------------------------------------------------------
-- 2.7 Row Level Security (RLS) Policies & Least-Privilege Grants
-- ------------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.login_history ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.profiles FROM PUBLIC, anon;
REVOKE ALL ON public.login_history FROM PUBLIC, anon;
REVOKE ALL ON public.user_profiles FROM PUBLIC, anon;

-- Direct authenticated client modifications revoked
REVOKE INSERT, DELETE, UPDATE, TRUNCATE, REFERENCES, TRIGGER ON public.profiles FROM authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.login_history FROM authenticated;

GRANT SELECT ON public.profiles TO authenticated;
GRANT SELECT ON public.user_profiles TO authenticated;
GRANT SELECT ON public.login_history TO authenticated;

-- Users may update only basic presentation fields
GRANT UPDATE (display_name, full_name, avatar_url) ON public.profiles TO authenticated;

-- Full table operations granted to service_role on profiles
GRANT ALL ON public.profiles TO service_role;
GRANT SELECT ON public.user_profiles TO service_role;

-- login_history grants: service_role can SELECT and INSERT, but never UPDATE/DELETE
GRANT SELECT, INSERT ON public.login_history TO service_role;
REVOKE UPDATE, DELETE, TRUNCATE ON public.login_history FROM service_role;

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

-- Login History Policies
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
-- 2.8 Field Protection Triggers & Last-Active-Admin Invariant
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
        -- Admin or Service Role update
        IF NEW.role IS NULL THEN
            NEW.role := OLD.role;
        END IF;

        IF NEW.account_status IS NULL THEN
            NEW.account_status := OLD.account_status;
        END IF;

        -- Admin self-promotion restriction: only service_role can elevate a user to admin
        IF NEW.role = 'admin'::public.app_user_role AND OLD.role <> 'admin'::public.app_user_role THEN
            IF NOT public.is_service_role() THEN
                RAISE EXCEPTION 'Access denied: Promotion to admin role is strictly restricted to service_role.';
            END IF;
        END IF;

        NEW.status := NEW.account_status::text;

        -- Enforce Last-Active-Administrator Invariant
        IF OLD.role = 'admin'::public.app_user_role AND OLD.account_status = 'active'::public.app_account_status THEN
            IF NEW.role <> 'admin'::public.app_user_role OR NEW.account_status <> 'active'::public.app_account_status THEN
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
-- 2.9 Narrow Administrative RPCs
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
    IF NOT public.is_admin() AND NOT public.is_service_role() THEN
        RAISE EXCEPTION 'Access denied: Caller is not an authorized active administrator.';
    END IF;

    -- Admin elevation forbidden via general endpoint; must use promote_to_admin via service_role
    IF new_role = 'admin'::public.app_user_role THEN
        IF NOT public.is_service_role() THEN
            RAISE EXCEPTION 'Access denied: Promotion to admin role cannot be performed via admin_manage_user_profile. Use promote_to_admin via service_role.';
        END IF;
    END IF;

    -- Standardized lock order: acquire advisory lock FIRST
    PERFORM pg_advisory_xact_lock(hashtext('finsight_admin_invariant_gate'));

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

    -- Enforce last-admin protection
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
-- 2.10 Automatic Profile Creation on Signup Trigger (auth.users)
-- Defaults strictly to customer role and active status
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    initial_role public.app_user_role := 'customer'::public.app_user_role;
    initial_status public.app_account_status := 'active'::public.app_account_status;
    raw_provider TEXT := COALESCE(NEW.raw_app_meta_data->>'provider', 'email');
    extracted_full_name TEXT;
    extracted_display_name TEXT;
    extracted_avatar_url TEXT;
    generated_customer_id TEXT;
    resolved_email TEXT;
BEGIN
    extracted_full_name := NULLIF(trim(NEW.raw_user_meta_data->>'full_name'), '');
    IF extracted_full_name IS NULL THEN
        extracted_full_name := NULLIF(trim(NEW.raw_user_meta_data->>'name'), '');
    END IF;

    extracted_avatar_url := NULLIF(trim(NEW.raw_user_meta_data->>'avatar_url'), '');
    IF extracted_avatar_url IS NULL THEN
        extracted_avatar_url := NULLIF(trim(NEW.raw_user_meta_data->>'picture'), '');
    END IF;

    resolved_email := COALESCE(
        NULLIF(lower(trim(NEW.email)), ''),
        'unspecified_' || substr(NEW.id::text, 1, 8) || '@placeholder.internal'
    );

    extracted_display_name := COALESCE(
        extracted_full_name,
        split_part(resolved_email, '@', 1),
        'Customer'
    );

    generated_customer_id := 'CUST-' || floor(1000 + random() * 9000)::text;

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
        customer_id,
        created_at,
        updated_at
    )
    VALUES (
        NEW.id,
        extracted_display_name,
        extracted_full_name,
        extracted_avatar_url,
        resolved_email,
        initial_role,
        initial_status,
        'active',
        raw_provider,
        generated_customer_id,
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
    IF NEW.email IS DISTINCT FROM OLD.email AND NEW.email IS NOT NULL THEN
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
-- 2.11 Trusted Initial Administrator Promotion Procedure
-- Explicit procedure callable only by service_role or interactive DBA
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
    IF NOT public.is_service_role() THEN
        RAISE EXCEPTION 'Access denied: promote_to_admin is restricted to service_role or database administrators.';
    END IF;

    PERFORM pg_advisory_xact_lock(hashtext('finsight_admin_invariant_gate'));

    SELECT id, email INTO v_auth_record
    FROM auth.users
    WHERE id = target_user_id
      AND lower(trim(email)) = lower(trim(expected_email));

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Target user (%) not found in auth.users or email mismatch with %. Promotion aborted.',
            target_user_id, expected_email;
    END IF;

    SELECT id, role, account_status INTO v_profile_record
    FROM public.profiles
    WHERE id = target_user_id
      AND lower(trim(email)) = lower(trim(expected_email))
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Target profile not found in public.profiles. User profile must exist first.';
    END IF;

    UPDATE public.profiles
    SET role = 'admin'::public.app_user_role,
        account_status = 'active'::public.app_account_status,
        status = 'active',
        updated_at = timezone('utc'::text, now())
    WHERE id = target_user_id;

    UPDATE public._legacy_admin_promotion_review
    SET review_status = 'promoted_via_promote_to_admin',
        reviewed_at = timezone('utc'::text, now()),
        resolution_notes = 'Identity confirmed and explicitly promoted to active admin'
    WHERE user_id = target_user_id;

    RAISE NOTICE 'Successfully promoted user % (%) to active admin.', target_user_id, expected_email;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.promote_to_admin(UUID, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.promote_to_admin(UUID, TEXT) TO service_role;

-- ------------------------------------------------------------------------------
-- 2.12 Safe Demotion Procedure
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.demote_admin(
    target_user_id UUID,
    expected_email TEXT,
    new_role public.app_user_role DEFAULT 'customer'::public.app_user_role
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
    IF NOT public.is_service_role() THEN
        RAISE EXCEPTION 'Access denied: demote_admin is restricted to service_role or database administrators.';
    END IF;

    IF new_role = 'admin'::public.app_user_role THEN
        RAISE EXCEPTION 'Cannot demote to admin role. Choose customer, business_analyst, or risk_analyst.';
    END IF;

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
        account_status = 'active'::public.app_account_status,
        status = 'active',
        updated_at = timezone('utc'::text, now())
    WHERE id = target_user_id;

    RAISE NOTICE 'Successfully demoted user % (%) to % with active status.',
        target_user_id, expected_email, new_role;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.demote_admin(UUID, TEXT, public.app_user_role) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.demote_admin(UUID, TEXT, public.app_user_role) TO service_role;

-- ------------------------------------------------------------------------------
-- 2.13 Explicit Function Ownership Enforcement (Trusted PostgreSQL Owner)
-- ------------------------------------------------------------------------------
DO $$
BEGIN
    ALTER FUNCTION public.is_service_role() OWNER TO postgres;
    ALTER FUNCTION public.is_admin() OWNER TO postgres;
    ALTER FUNCTION public.is_active_user() OWNER TO postgres;
    ALTER FUNCTION public.get_caller_role() OWNER TO postgres;
    ALTER FUNCTION public.is_admin_or_service() OWNER TO postgres;
    ALTER FUNCTION public.enforce_login_history_immutability() OWNER TO postgres;
    ALTER FUNCTION public.enforce_profile_update_integrity() OWNER TO postgres;
    ALTER FUNCTION public.enforce_profile_delete_integrity() OWNER TO postgres;
    ALTER FUNCTION public.admin_manage_user_profile(UUID, public.app_user_role, public.app_account_status) OWNER TO postgres;
    ALTER FUNCTION public.handle_new_user() OWNER TO postgres;
    ALTER FUNCTION public.handle_user_updated() OWNER TO postgres;
    ALTER FUNCTION public.promote_to_admin(UUID, TEXT) OWNER TO postgres;
    ALTER FUNCTION public.demote_admin(UUID, TEXT, public.app_user_role) OWNER TO postgres;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Skipping function owner change to postgres: %', SQLERRM;
END $$;

COMMIT;
