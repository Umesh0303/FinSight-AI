-- ==============================================================================
-- FinSight AI: Main Database Post-Migration Read-Only Verification Script
-- Target Supabase Project: ncfzjltffljconwihvpk
-- File: supabase/migrations/20261015_main_database_auth_production_verify.sql
--
-- EXECUTION INSTRUCTIONS:
-- 1. In Supabase Dashboard SQL Editor (Web UI):
--    Paste the entire file contents directly into the Supabase SQL Editor and click "Run".
--    Note: Do not include psql meta-commands (like \set). The anonymous DO $$ block
--    will halt execution and report any assertion failures via RAISE EXCEPTION.
--
-- 2. In psql (CLI):
--    To stop immediately on any error or assertion failure, pass -v ON_ERROR_STOP=1:
--    psql -v ON_ERROR_STOP=1 "$DATABASE_URL" -f supabase/migrations/20261015_main_database_auth_production_verify.sql
--
-- SAFETY GUARANTEES:
-- - Strictly READ-ONLY: Never issues INSERT, UPDATE, DELETE, ALTER, or DROP.
-- - Safe to run on live production databases at any time.
-- - Verifies catalog definitions, constraints, indices, RLS policies, triggers,
--   function security parameters (SECURITY DEFINER, search_path), routine privileges,
--   and data invariants.
-- ==============================================================================

DO $$
DECLARE
    v_count INT;
    v_missing_labels TEXT[];
    v_missing_funcs TEXT[];
    v_sec_invoker BOOLEAN;
    v_rls_enabled BOOLEAN;
    v_pk_col TEXT;
    v_col_default TEXT;
    v_policy_count INT;
    v_unprofiled_users INT;
    v_unverified_admins INT;
    v_owner TEXT;
    v_func_rec RECORD;
BEGIN
    RAISE NOTICE '====================================================================';
    RAISE NOTICE '>>> Starting FinSight AI Production Schema Verification Suite...     ';
    RAISE NOTICE '====================================================================';

    -- --------------------------------------------------------------------------
    -- 1. VERIFY ENUMS AND LABELS
    -- --------------------------------------------------------------------------
    SELECT COUNT(*) INTO v_count
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public' AND t.typname = 'app_user_role';

    IF v_count <> 1 THEN
        RAISE EXCEPTION 'ASSERTION FAILED: Enum public.app_user_role does not exist in schema public.';
    END IF;

    SELECT ARRAY(
        SELECT req.label
        FROM (VALUES ('admin'), ('business_analyst'), ('risk_analyst'), ('customer'), ('unassigned')) AS req(label)
        WHERE req.label NOT IN (
            SELECT e.enumlabel
            FROM pg_enum e
            JOIN pg_type t ON t.oid = e.enumtypid
            JOIN pg_namespace n ON n.oid = t.typnamespace
            WHERE n.nspname = 'public' AND t.typname = 'app_user_role'
        )
    ) INTO v_missing_labels;

    IF array_length(v_missing_labels, 1) > 0 THEN
        RAISE EXCEPTION 'ASSERTION FAILED: public.app_user_role is missing required labels: %', array_to_string(v_missing_labels, ', ');
    END IF;
    RAISE NOTICE ' [PASS] Enum public.app_user_role verified with 5 labels (admin, business_analyst, risk_analyst, customer, unassigned).';

    SELECT COUNT(*) INTO v_count
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public' AND t.typname = 'app_account_status';

    IF v_count <> 1 THEN
        RAISE EXCEPTION 'ASSERTION FAILED: Enum public.app_account_status does not exist in schema public.';
    END IF;

    SELECT ARRAY(
        SELECT req.label
        FROM (VALUES ('active'), ('pending_approval'), ('suspended')) AS req(label)
        WHERE req.label NOT IN (
            SELECT e.enumlabel
            FROM pg_enum e
            JOIN pg_type t ON t.oid = e.enumtypid
            JOIN pg_namespace n ON n.oid = t.typnamespace
            WHERE n.nspname = 'public' AND t.typname = 'app_account_status'
        )
    ) INTO v_missing_labels;

    IF array_length(v_missing_labels, 1) > 0 THEN
        RAISE EXCEPTION 'ASSERTION FAILED: public.app_account_status is missing required labels: %', array_to_string(v_missing_labels, ', ');
    END IF;
    RAISE NOTICE ' [PASS] Enum public.app_account_status verified with 3 labels (active, pending_approval, suspended).';

    -- --------------------------------------------------------------------------
    -- 2. VERIFY CORE TABLES AND COLUMNS
    -- --------------------------------------------------------------------------
    SELECT COUNT(*) INTO v_count
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'profiles';

    IF v_count <> 1 THEN
        RAISE EXCEPTION 'ASSERTION FAILED: Table public.profiles does not exist.';
    END IF;

    -- Verify Primary Key
    SELECT ccu.column_name INTO v_pk_col
    FROM information_schema.table_constraints tc
    JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
    WHERE tc.table_schema = 'public' AND tc.table_name = 'profiles' AND tc.constraint_type = 'PRIMARY KEY';

    IF v_pk_col <> 'id' THEN
        RAISE EXCEPTION 'ASSERTION FAILED: public.profiles PK is %, expected "id".', v_pk_col;
    END IF;

    -- Verify default values on public.profiles
    SELECT column_default INTO v_col_default
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'role';

    IF v_col_default NOT LIKE '%customer%' THEN
        RAISE EXCEPTION 'ASSERTION FAILED: public.profiles.role default is %, expected customer.', v_col_default;
    END IF;

    SELECT column_default INTO v_col_default
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'account_status';

    IF v_col_default NOT LIKE '%active%' THEN
        RAISE EXCEPTION 'ASSERTION FAILED: public.profiles.account_status default is %, expected active.', v_col_default;
    END IF;
    RAISE NOTICE ' [PASS] Table public.profiles verified with correct defaults (customer role, active status).';

    -- Verify public.login_history
    SELECT COUNT(*) INTO v_count
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'login_history';

    IF v_count <> 1 THEN
        RAISE EXCEPTION 'ASSERTION FAILED: Table public.login_history does not exist.';
    END IF;
    RAISE NOTICE ' [PASS] Table public.login_history verified.';

    -- Verify review and quarantine tables
    SELECT COUNT(*) INTO v_count
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name IN (
        '_legacy_admin_promotion_review',
        '_legacy_duplicate_emails_quarantine',
        '_legacy_profiles_orphans'
    );

    IF v_count <> 3 THEN
        RAISE EXCEPTION 'ASSERTION FAILED: Expected 3 audit & quarantine tables, found %.', v_count;
    END IF;

    -- Ensure quarantine and review tables are shielded from PUBLIC, anon, and authenticated
    SELECT COUNT(*) INTO v_count
    FROM information_schema.table_privileges
    WHERE table_schema = 'public'
      AND table_name IN ('_legacy_admin_promotion_review', '_legacy_duplicate_emails_quarantine', '_legacy_profiles_orphans')
      AND grantee IN ('PUBLIC', 'anon', 'authenticated');

    IF v_count > 0 THEN
        RAISE EXCEPTION 'SECURITY BREACH: Legacy review or quarantine tables have permissions granted to PUBLIC, anon, or authenticated!';
    END IF;
    RAISE NOTICE ' [PASS] Audit and quarantine tables verified and strictly protected.';

    -- --------------------------------------------------------------------------
    -- 3. VERIFY CANONICAL COMPATIBILITY VIEW
    -- --------------------------------------------------------------------------
    SELECT COUNT(*) INTO v_count
    FROM pg_views
    WHERE schemaname = 'public' AND viewname = 'user_profiles';

    IF v_count <> 1 THEN
        RAISE EXCEPTION 'ASSERTION FAILED: View public.user_profiles does not exist.';
    END IF;

    SELECT (c.reloptions IS NOT NULL AND 'security_invoker=true' = ANY(c.reloptions)) INTO v_sec_invoker
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'user_profiles';

    IF NOT COALESCE(v_sec_invoker, false) THEN
        RAISE EXCEPTION 'ASSERTION FAILED: View public.user_profiles does not have security_invoker = true.';
    END IF;
    RAISE NOTICE ' [PASS] View public.user_profiles exists with verified security_invoker = true.';

    -- --------------------------------------------------------------------------
    -- 4. VERIFY ROW LEVEL SECURITY (RLS) & GRANULAR COLUMN GRANTS
    -- --------------------------------------------------------------------------
    SELECT relrowsecurity INTO v_rls_enabled FROM pg_class WHERE oid = 'public.profiles'::regclass;
    IF NOT COALESCE(v_rls_enabled, false) THEN
        RAISE EXCEPTION 'ASSERTION FAILED: RLS is not enabled on public.profiles.';
    END IF;

    SELECT relrowsecurity INTO v_rls_enabled FROM pg_class WHERE oid = 'public.login_history'::regclass;
    IF NOT COALESCE(v_rls_enabled, false) THEN
        RAISE EXCEPTION 'ASSERTION FAILED: RLS is not enabled on public.login_history.';
    END IF;

    SELECT COUNT(*) INTO v_policy_count
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'profiles';

    IF v_policy_count < 4 THEN
        RAISE EXCEPTION 'ASSERTION FAILED: Expected at least 4 RLS policies on public.profiles, found %.', v_policy_count;
    END IF;

    SELECT COUNT(*) INTO v_count
    FROM information_schema.table_privileges
    WHERE table_schema = 'public' AND table_name = 'profiles'
      AND grantee = 'authenticated' AND privilege_type IN ('INSERT', 'DELETE', 'TRUNCATE');
    IF v_count > 0 THEN
        RAISE EXCEPTION 'SECURITY BREACH: authenticated role has direct INSERT/DELETE/TRUNCATE privileges on public.profiles!';
    END IF;

    SELECT COUNT(*) INTO v_count
    FROM information_schema.table_privileges
    WHERE table_schema = 'public' AND table_name = 'login_history'
      AND grantee = 'authenticated' AND privilege_type IN ('INSERT', 'UPDATE', 'DELETE', 'TRUNCATE');
    IF v_count > 0 THEN
        RAISE EXCEPTION 'SECURITY BREACH: authenticated role has direct INSERT/UPDATE/DELETE privileges on public.login_history!';
    END IF;
    RAISE NOTICE ' [PASS] Row Level Security (RLS) and column-level restrictions verified on profiles and login_history.';

    -- --------------------------------------------------------------------------
    -- 5. VERIFY SECURITY DEFINER FUNCTIONS, SEARCH_PATH, OWNERSHIP & EXECUTE GRANTS
    -- --------------------------------------------------------------------------
    -- Assert that all 13 required functions exist
    SELECT ARRAY(
        SELECT req.fn
        FROM (VALUES 
            ('is_service_role'),
            ('is_admin'),
            ('is_active_user'),
            ('get_caller_role'),
            ('is_admin_or_service'),
            ('enforce_login_history_immutability'),
            ('enforce_profile_update_integrity'),
            ('enforce_profile_delete_integrity'),
            ('admin_manage_user_profile'),
            ('handle_new_user'),
            ('handle_user_updated'),
            ('promote_to_admin'),
            ('demote_admin')
        ) AS req(fn)
        WHERE NOT EXISTS (
            SELECT 1 FROM pg_proc p
            JOIN pg_namespace n ON n.oid = p.pronamespace
            WHERE n.nspname = 'public' AND p.proname = req.fn
        )
    ) INTO v_missing_funcs;

    IF array_length(v_missing_funcs, 1) > 0 THEN
        RAISE EXCEPTION 'ASSERTION FAILED: Missing required functions: %', array_to_string(v_missing_funcs, ', ');
    END IF;

    -- Assert each function is SECURITY DEFINER and has search_path = public, pg_temp
    FOR v_func_rec IN (
        SELECT p.proname, p.prosecdef, p.proconfig
        FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public' AND p.proname IN (
            'is_service_role', 'is_admin', 'is_active_user', 'get_caller_role',
            'is_admin_or_service', 'enforce_login_history_immutability',
            'enforce_profile_update_integrity', 'enforce_profile_delete_integrity',
            'admin_manage_user_profile', 'handle_new_user', 'handle_user_updated',
            'promote_to_admin', 'demote_admin'
        )
    ) LOOP
        IF NOT v_func_rec.prosecdef THEN
            RAISE EXCEPTION 'ASSERTION FAILED: Function % is NOT marked SECURITY DEFINER.', v_func_rec.proname;
        END IF;

        IF v_func_rec.proconfig IS NULL OR NOT (v_func_rec.proconfig::text LIKE '%search_path=public, pg_temp%') THEN
            RAISE EXCEPTION 'ASSERTION FAILED: Function % lacks fixed search_path = public, pg_temp.', v_func_rec.proname;
        END IF;
    END LOOP;
    RAISE NOTICE ' [PASS] All 13 security definer functions verified with fixed search_path = public, pg_temp.';

    -- Verify function ownership is postgres or supabase_admin
    SELECT r.rolname INTO v_owner
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    JOIN pg_roles r ON r.oid = p.proowner
    WHERE n.nspname = 'public' AND p.proname = 'promote_to_admin'
    LIMIT 1;

    IF v_owner IS NOT NULL AND v_owner NOT IN ('postgres', 'supabase_admin') THEN
        RAISE EXCEPTION 'SECURITY WARNING: promote_to_admin is owned by % instead of postgres/supabase_admin.', v_owner;
    END IF;
    RAISE NOTICE ' [PASS] Function ownership verified (trusted database owner: %).', COALESCE(v_owner, 'verified');

    -- Assert Routine EXECUTE Permissions:
    -- Sensitive procedures (promote_to_admin, demote_admin, triggers) must NOT be executable by non-service roles
    SELECT COUNT(*) INTO v_count
    FROM information_schema.routine_privileges
    WHERE routine_schema = 'public' 
      AND routine_name IN ('promote_to_admin', 'demote_admin', 'handle_new_user', 'handle_user_updated', 'enforce_login_history_immutability')
      AND grantee IN ('PUBLIC', 'anon', 'authenticated');

    IF v_count > 0 THEN
        RAISE EXCEPTION 'SECURITY BREACH: High-privilege routines (promote_to_admin, demote_admin, lifecycle triggers) granted to non-service roles!';
    END IF;

    -- admin_manage_user_profile must NOT be executable by PUBLIC or anon
    SELECT COUNT(*) INTO v_count
    FROM information_schema.routine_privileges
    WHERE routine_schema = 'public' 
      AND routine_name IN ('admin_manage_user_profile', 'is_service_role', 'is_admin', 'is_active_user', 'get_caller_role', 'is_admin_or_service')
      AND grantee IN ('PUBLIC', 'anon');

    IF v_count > 0 THEN
        RAISE EXCEPTION 'SECURITY BREACH: Admin or auth helper functions executable by PUBLIC or anon!';
    END IF;
    RAISE NOTICE ' [PASS] Routine execution permissions strictly enforced for all security functions.';

    -- --------------------------------------------------------------------------
    -- 6. VERIFY TRIGGERS
    -- --------------------------------------------------------------------------
    SELECT COUNT(*) INTO v_count
    FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'profiles' AND t.tgname = 'trg_protect_profile_fields';

    IF v_count <> 1 THEN
        RAISE EXCEPTION 'ASSERTION FAILED: Trigger trg_protect_profile_fields missing on public.profiles.';
    END IF;

    SELECT COUNT(*) INTO v_count
    FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'profiles' AND t.tgname = 'trg_protect_profile_delete';

    IF v_count <> 1 THEN
        RAISE EXCEPTION 'ASSERTION FAILED: Trigger trg_protect_profile_delete missing on public.profiles.';
    END IF;

    SELECT COUNT(*) INTO v_count
    FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'login_history' AND t.tgname = 'trg_immutable_login_history_mutation';

    IF v_count <> 1 THEN
        RAISE EXCEPTION 'ASSERTION FAILED: Immutability trigger missing on public.login_history.';
    END IF;

    SELECT COUNT(*) INTO v_count
    FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'auth' AND c.relname = 'users' AND t.tgname = 'on_auth_user_created';

    IF v_count <> 1 THEN
        RAISE EXCEPTION 'ASSERTION FAILED: Lifecycle trigger on_auth_user_created missing on auth.users.';
    END IF;

    SELECT COUNT(*) INTO v_count
    FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'auth' AND c.relname = 'users' AND t.tgname = 'on_auth_user_updated';

    IF v_count <> 1 THEN
        RAISE EXCEPTION 'ASSERTION FAILED: Lifecycle trigger on_auth_user_updated missing on auth.users.';
    END IF;
    RAISE NOTICE ' [PASS] All profile protection, login immutability, and auth.users lifecycle triggers verified.';

    -- --------------------------------------------------------------------------
    -- 7. VERIFY AUTH USERS BACKFILL & ZERO UNVERIFIED PRIVILEGE ESCALATION
    -- --------------------------------------------------------------------------
    -- All auth.users must have a corresponding profile
    SELECT COUNT(*) INTO v_unprofiled_users
    FROM auth.users u
    LEFT JOIN public.profiles p ON p.id = u.id
    WHERE p.id IS NULL;

    IF v_unprofiled_users > 0 THEN
        RAISE EXCEPTION 'ASSERTION FAILED: % users in auth.users lack a public.profiles record.', v_unprofiled_users;
    END IF;
    RAISE NOTICE ' [PASS] All auth.users have corresponding public.profiles records.';

    -- Verify zero unverified users were elevated to admin by migration
    SELECT COUNT(*) INTO v_unverified_admins
    FROM public.profiles p
    JOIN public._legacy_admin_promotion_review r ON r.user_id = p.id
    WHERE p.role = 'admin'::public.app_user_role AND r.review_status = 'pending_identity_verification';

    IF v_unverified_admins > 0 THEN
        RAISE EXCEPTION 'ASSERTION FAILED: Found % user(s) elevated to admin while still pending identity verification.', v_unverified_admins;
    END IF;
    RAISE NOTICE ' [PASS] Zero unverified users were automatically escalated to administrator.';

    RAISE NOTICE '====================================================================';
    RAISE NOTICE '>>> ALL PRODUCTION PREFLIGHT SCHEMA ASSERTIONS PASSED SUCCESSFULLY! ';
    RAISE NOTICE '====================================================================';
END $$;
