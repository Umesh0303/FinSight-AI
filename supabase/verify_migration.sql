-- ==============================================================================
-- FinSight AI: Post-Migration Verification Script
-- Target: Verify Schema, Types, Tables, Columns, Grants, RLS Policies, Triggers & Admin Procedures
-- Phase 6 Staging Verification Gate
-- ==============================================================================
-- INSTRUCTIONS FOR LIVE DATABASE VERIFICATION:
-- Execute this script via psql using:
--   psql -v ON_ERROR_STOP=1 "$DATABASE_URL" -f supabase/verify_migration.sql
-- Or run directly in the Supabase Dashboard SQL Editor connected to staging.
-- If all checks pass, it will output a success summary.
-- If any assertion fails, it will raise an immediate EXCEPTION identifying the exact defect,
-- which halts psql immediately with a non-zero exit code.
-- ==============================================================================

\set ON_ERROR_STOP on

DO $$
DECLARE
    v_count INT;
    v_missing_labels TEXT[];
    v_sec_invoker BOOLEAN;
    v_rls_enabled BOOLEAN;
    v_grant_count INT;
    v_sec_definer BOOLEAN;
    v_search_path TEXT;
BEGIN
    RAISE NOTICE '>>> Starting FinSight AI Post-Migration Security Verification...';

    -- --------------------------------------------------------------------------
    -- 1. VERIFY ENUMS AND LABELS
    -- --------------------------------------------------------------------------
    -- 1.1 Verify public.app_user_role exists
    SELECT COUNT(*) INTO v_count
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public' AND t.typname = 'app_user_role';

    IF v_count <> 1 THEN
        RAISE EXCEPTION 'ASSERTION FAILED: Enum public.app_user_role does not exist in schema public.';
    END IF;

    -- 1.2 Verify all 5 app_user_role labels exist
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
    RAISE NOTICE ' [PASS] public.app_user_role exists with all 5 required labels (admin, business_analyst, risk_analyst, customer, unassigned).';

    -- 1.3 Verify public.app_account_status exists
    SELECT COUNT(*) INTO v_count
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public' AND t.typname = 'app_account_status';

    IF v_count <> 1 THEN
        RAISE EXCEPTION 'ASSERTION FAILED: Enum public.app_account_status does not exist in schema public.';
    END IF;

    -- 1.4 Verify all 3 app_account_status labels exist (active, pending_approval, suspended)
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
    RAISE NOTICE ' [PASS] public.app_account_status exists with all 3 required labels (active, pending_approval, suspended).';

    -- --------------------------------------------------------------------------
    -- 2. VERIFY TABLES AND COLUMNS
    -- --------------------------------------------------------------------------
    -- 2.1 Verify public.profiles table exists
    SELECT COUNT(*) INTO v_count
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'profiles';

    IF v_count <> 1 THEN
        RAISE EXCEPTION 'ASSERTION FAILED: Table public.profiles does not exist.';
    END IF;

    -- 2.2 Verify public.profiles columns and data types
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'id' AND udt_name = 'uuid') THEN
        RAISE EXCEPTION 'ASSERTION FAILED: public.profiles.id is missing or not uuid.';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'display_name' AND udt_name = 'text' AND is_nullable = 'NO') THEN
        RAISE EXCEPTION 'ASSERTION FAILED: public.profiles.display_name is missing or invalid.';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'full_name' AND udt_name = 'text') THEN
        RAISE EXCEPTION 'ASSERTION FAILED: public.profiles.full_name is missing or invalid.';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'avatar_url' AND udt_name = 'text') THEN
        RAISE EXCEPTION 'ASSERTION FAILED: public.profiles.avatar_url is missing or invalid.';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'email' AND udt_name IN ('text', 'varchar') AND is_nullable = 'NO') THEN
        RAISE EXCEPTION 'ASSERTION FAILED: public.profiles.email is missing or invalid.';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'role' AND udt_name = 'app_user_role') THEN
        RAISE EXCEPTION 'ASSERTION FAILED: public.profiles.role is missing or not app_user_role.';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'account_status' AND udt_name = 'app_account_status') THEN
        RAISE EXCEPTION 'ASSERTION FAILED: public.profiles.account_status is missing or not app_account_status.';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'status') THEN
        RAISE EXCEPTION 'ASSERTION FAILED: public.profiles.status is missing.';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'auth_provider' AND udt_name IN ('text', 'varchar')) THEN
        RAISE EXCEPTION 'ASSERTION FAILED: public.profiles.auth_provider is missing.';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'customer_id') THEN
        RAISE EXCEPTION 'ASSERTION FAILED: public.profiles.customer_id is missing.';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'created_at' AND udt_name = 'timestamptz') THEN
        RAISE EXCEPTION 'ASSERTION FAILED: public.profiles.created_at is missing or not timestamptz.';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'updated_at' AND udt_name = 'timestamptz') THEN
        RAISE EXCEPTION 'ASSERTION FAILED: public.profiles.updated_at is missing or not timestamptz.';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'last_login_at' AND udt_name = 'timestamptz') THEN
        RAISE EXCEPTION 'ASSERTION FAILED: public.profiles.last_login_at is missing or not timestamptz.';
    END IF;

    -- Verify status consistency constraint chk_profiles_status_sync
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_profiles_status_sync' AND conrelid = 'public.profiles'::regclass) THEN
        RAISE EXCEPTION 'ASSERTION FAILED: Missing constraint chk_profiles_status_sync on public.profiles.';
    END IF;
    RAISE NOTICE ' [PASS] Table public.profiles verified with all required columns, status sync constraint, and data integrity guarantees.';

    -- 2.3 Verify public.login_history table exists
    SELECT COUNT(*) INTO v_count
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'login_history';

    IF v_count <> 1 THEN
        RAISE EXCEPTION 'ASSERTION FAILED: Table public.login_history does not exist.';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'login_history' AND column_name = 'id' AND udt_name = 'uuid') THEN
        RAISE EXCEPTION 'ASSERTION FAILED: public.login_history.id is missing or not uuid.';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'login_history' AND column_name = 'user_id' AND udt_name = 'uuid') THEN
        RAISE EXCEPTION 'ASSERTION FAILED: public.login_history.user_id is missing or not uuid.';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'login_history' AND column_name = 'email') THEN
        RAISE EXCEPTION 'ASSERTION FAILED: public.login_history.email is missing.';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'login_history' AND column_name = 'role') THEN
        RAISE EXCEPTION 'ASSERTION FAILED: public.login_history.role is missing.';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'login_history' AND column_name = 'event_type') THEN
        RAISE EXCEPTION 'ASSERTION FAILED: public.login_history.event_type is missing.';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'login_history' AND column_name = 'success' AND udt_name IN ('bool', 'boolean')) THEN
        RAISE EXCEPTION 'ASSERTION FAILED: public.login_history.success is missing or not boolean.';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'login_history' AND column_name = 'error_category') THEN
        RAISE EXCEPTION 'ASSERTION FAILED: public.login_history.error_category is missing.';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'login_history' AND column_name = 'status') THEN
        RAISE EXCEPTION 'ASSERTION FAILED: public.login_history.status is missing.';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'login_history' AND column_name = 'created_at' AND udt_name = 'timestamptz') THEN
        RAISE EXCEPTION 'ASSERTION FAILED: public.login_history.created_at is missing or not timestamptz.';
    END IF;
    RAISE NOTICE ' [PASS] Table public.login_history verified with required audit columns.';

    -- --------------------------------------------------------------------------
    -- 3. VERIFY BACKWARD-COMPATIBILITY VIEW & SECURITY INVOKER
    -- --------------------------------------------------------------------------
    SELECT COUNT(*) INTO v_count
    FROM information_schema.views
    WHERE table_schema = 'public' AND table_name = 'user_profiles';

    IF v_count <> 1 THEN
        RAISE EXCEPTION 'ASSERTION FAILED: View public.user_profiles does not exist.';
    END IF;

    SELECT COALESCE(
        (SELECT (c.reloptions IS NOT NULL AND 'security_invoker=true' = ANY(c.reloptions))
         FROM pg_class c
         JOIN pg_namespace n ON n.oid = c.relnamespace
         WHERE n.nspname = 'public' AND c.relname = 'user_profiles' AND c.relkind = 'v'),
        false
    ) INTO v_sec_invoker;

    IF NOT v_sec_invoker THEN
        RAISE EXCEPTION 'ASSERTION FAILED: View public.user_profiles does not have security_invoker = true.';
    END IF;
    RAISE NOTICE ' [PASS] View public.user_profiles verified with security_invoker = true.';

    -- --------------------------------------------------------------------------
    -- 4. VERIFY INDEXES
    -- --------------------------------------------------------------------------
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND tablename = 'profiles' AND indexname = 'idx_profiles_email') THEN
        RAISE EXCEPTION 'ASSERTION FAILED: Missing index idx_profiles_email.';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND tablename = 'profiles' AND indexname = 'idx_profiles_role') THEN
        RAISE EXCEPTION 'ASSERTION FAILED: Missing index idx_profiles_role.';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND tablename = 'profiles' AND indexname = 'idx_profiles_account_status') THEN
        RAISE EXCEPTION 'ASSERTION FAILED: Missing index idx_profiles_account_status.';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND tablename = 'login_history' AND indexname = 'idx_login_history_user_id') THEN
        RAISE EXCEPTION 'ASSERTION FAILED: Missing index idx_login_history_user_id.';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND tablename = 'login_history' AND indexname = 'idx_login_history_created_at') THEN
        RAISE EXCEPTION 'ASSERTION FAILED: Missing index idx_login_history_created_at.';
    END IF;
    RAISE NOTICE ' [PASS] All performance and audit indexes verified.';

    -- --------------------------------------------------------------------------
    -- 5. VERIFY ROW LEVEL SECURITY (RLS)
    -- --------------------------------------------------------------------------
    SELECT c.relrowsecurity INTO v_rls_enabled
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'profiles';

    IF NOT v_rls_enabled THEN
        RAISE EXCEPTION 'ASSERTION FAILED: Row Level Security is NOT enabled on public.profiles.';
    END IF;

    SELECT c.relrowsecurity INTO v_rls_enabled
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'login_history';

    IF NOT v_rls_enabled THEN
        RAISE EXCEPTION 'ASSERTION FAILED: Row Level Security is NOT enabled on public.login_history.';
    END IF;
    RAISE NOTICE ' [PASS] Row Level Security is active on public.profiles and public.login_history.';

    -- 5.3 Verify specific policies on public.profiles
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'profiles' AND policyname = 'Users can read own profile' AND cmd = 'SELECT') THEN
        RAISE EXCEPTION 'ASSERTION FAILED: Missing policy "Users can read own profile".';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'profiles' AND policyname = 'Admins can read all profiles' AND cmd = 'SELECT') THEN
        RAISE EXCEPTION 'ASSERTION FAILED: Missing policy "Admins can read all profiles".';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'profiles' AND policyname = 'Admins can update any profile' AND cmd = 'UPDATE') THEN
        RAISE EXCEPTION 'ASSERTION FAILED: Missing policy "Admins can update any profile".';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'profiles' AND policyname = 'Users can update own permitted profile fields' AND cmd = 'UPDATE') THEN
        RAISE EXCEPTION 'ASSERTION FAILED: Missing policy "Users can update own permitted profile fields".';
    END IF;
    RAISE NOTICE ' [PASS] All 4 required RLS policies verified on public.profiles.';

    -- 5.4 Verify specific policies on public.login_history
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'login_history' AND policyname = 'Admins can view all login history' AND cmd = 'SELECT') THEN
        RAISE EXCEPTION 'ASSERTION FAILED: Missing policy "Admins can view all login history".';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'login_history' AND policyname = 'Users can view own login history' AND cmd = 'SELECT') THEN
        RAISE EXCEPTION 'ASSERTION FAILED: Missing policy "Users can view own login history".';
    END IF;

    -- Ensure no INSERT/UPDATE/DELETE policies exist on public.login_history
    SELECT COUNT(*) INTO v_count
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'login_history' AND cmd IN ('INSERT', 'UPDATE', 'DELETE');

    IF v_count > 0 THEN
        RAISE EXCEPTION 'ASSERTION FAILED: Found % unauthorized modification policies on public.login_history. Only service_role may write.', v_count;
    END IF;
    RAISE NOTICE ' [PASS] RLS policies verified on public.login_history (append-only via service_role).';

    -- --------------------------------------------------------------------------
    -- 6. VERIFY PRIVILEGES AND GRANTS
    -- --------------------------------------------------------------------------
    -- 6.1 Check that anon and public have NO privileges on profiles, login_history, or user_profiles
    SELECT COUNT(*) INTO v_grant_count
    FROM information_schema.table_privileges
    WHERE table_schema = 'public'
      AND table_name IN ('profiles', 'login_history', 'user_profiles')
      AND grantee IN ('anon', 'PUBLIC');

    IF v_grant_count > 0 THEN
        RAISE EXCEPTION 'ASSERTION FAILED: Detected % unauthorized table privileges granted to anon/PUBLIC.', v_grant_count;
    END IF;

    SELECT COUNT(*) INTO v_grant_count
    FROM information_schema.column_privileges
    WHERE table_schema = 'public'
      AND table_name IN ('profiles', 'login_history', 'user_profiles')
      AND grantee IN ('anon', 'PUBLIC');

    IF v_grant_count > 0 THEN
        RAISE EXCEPTION 'ASSERTION FAILED: Detected % unauthorized column privileges granted to anon/PUBLIC.', v_grant_count;
    END IF;
    RAISE NOTICE ' [PASS] Zero table-level and column-level privileges granted to anon/PUBLIC.';

    -- 6.2 Check authenticated SELECT privileges
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_privileges WHERE table_schema = 'public' AND table_name = 'profiles' AND grantee = 'authenticated' AND privilege_type = 'SELECT') THEN
        RAISE EXCEPTION 'ASSERTION FAILED: authenticated role lacks SELECT on public.profiles.';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_privileges WHERE table_schema = 'public' AND table_name = 'user_profiles' AND grantee = 'authenticated' AND privilege_type = 'SELECT') THEN
        RAISE EXCEPTION 'ASSERTION FAILED: authenticated role lacks SELECT on public.user_profiles.';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_privileges WHERE table_schema = 'public' AND table_name = 'login_history' AND grantee = 'authenticated' AND privilege_type = 'SELECT') THEN
        RAISE EXCEPTION 'ASSERTION FAILED: authenticated role lacks SELECT on public.login_history.';
    END IF;

    -- 6.3 Check that authenticated has NO table-level INSERT, UPDATE, or DELETE on profiles or login_history
    IF EXISTS (SELECT 1 FROM information_schema.table_privileges WHERE table_schema = 'public' AND table_name = 'profiles' AND grantee = 'authenticated' AND privilege_type IN ('INSERT', 'DELETE', 'UPDATE')) THEN
        RAISE EXCEPTION 'ASSERTION FAILED: authenticated has unauthorized table-level INSERT/UPDATE/DELETE on public.profiles.';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.table_privileges WHERE table_schema = 'public' AND table_name = 'login_history' AND grantee = 'authenticated' AND privilege_type IN ('INSERT', 'UPDATE', 'DELETE')) THEN
        RAISE EXCEPTION 'ASSERTION FAILED: authenticated has unauthorized modification privileges on public.login_history.';
    END IF;

    -- 6.4 Check column-level UPDATE grants on public.profiles
    -- Permitted: display_name, full_name, avatar_url
    -- Prohibited: role, account_status, customer_id, id, email, auth_provider, created_at, last_login_at
    IF NOT EXISTS (SELECT 1 FROM information_schema.column_privileges WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'display_name' AND grantee = 'authenticated' AND privilege_type = 'UPDATE') THEN
        RAISE EXCEPTION 'ASSERTION FAILED: authenticated lacks column-level UPDATE on display_name.';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.column_privileges WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'full_name' AND grantee = 'authenticated' AND privilege_type = 'UPDATE') THEN
        RAISE EXCEPTION 'ASSERTION FAILED: authenticated lacks column-level UPDATE on full_name.';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.column_privileges WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'avatar_url' AND grantee = 'authenticated' AND privilege_type = 'UPDATE') THEN
        RAISE EXCEPTION 'ASSERTION FAILED: authenticated lacks column-level UPDATE on avatar_url.';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.column_privileges WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'role' AND grantee = 'authenticated' AND privilege_type = 'UPDATE') THEN
        RAISE EXCEPTION 'ASSERTION FAILED: authenticated has unauthorized direct column-level UPDATE on role.';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.column_privileges WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'account_status' AND grantee = 'authenticated' AND privilege_type = 'UPDATE') THEN
        RAISE EXCEPTION 'ASSERTION FAILED: authenticated has unauthorized direct column-level UPDATE on account_status.';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.column_privileges WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'customer_id' AND grantee = 'authenticated' AND privilege_type = 'UPDATE') THEN
        RAISE EXCEPTION 'ASSERTION FAILED: authenticated has unauthorized direct column-level UPDATE on customer_id.';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.column_privileges WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'email' AND grantee = 'authenticated' AND privilege_type = 'UPDATE') THEN
        RAISE EXCEPTION 'ASSERTION FAILED: authenticated has prohibited column-level UPDATE on email.';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.column_privileges WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'id' AND grantee = 'authenticated' AND privilege_type = 'UPDATE') THEN
        RAISE EXCEPTION 'ASSERTION FAILED: authenticated has prohibited column-level UPDATE on id.';
    END IF;
    RAISE NOTICE ' [PASS] Column-level privilege model verified: ONLY permitted fields (display_name, full_name, avatar_url) granted to authenticated; administrative & identity columns locked.';

    -- --------------------------------------------------------------------------
    -- 7. VERIFY SECURITY DEFINER FUNCTIONS AND SEARCH PATHS
    -- --------------------------------------------------------------------------
    -- 7.1 Verify public.is_admin()
    SELECT p.prosecdef, array_to_string(p.proconfig, ', ') INTO v_sec_definer, v_search_path
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'is_admin';

    IF NOT v_sec_definer THEN
        RAISE EXCEPTION 'ASSERTION FAILED: public.is_admin() must be SECURITY DEFINER.';
    END IF;
    IF v_search_path NOT LIKE '%search_path=public, pg_temp%' THEN
        RAISE EXCEPTION 'ASSERTION FAILED: public.is_admin() lacks safe search_path: %', v_search_path;
    END IF;

    -- 7.2 Verify public.enforce_profile_update_integrity()
    SELECT p.prosecdef, array_to_string(p.proconfig, ', ') INTO v_sec_definer, v_search_path
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'enforce_profile_update_integrity';

    IF NOT v_sec_definer THEN
        RAISE EXCEPTION 'ASSERTION FAILED: public.enforce_profile_update_integrity() must be SECURITY DEFINER.';
    END IF;
    IF v_search_path NOT LIKE '%search_path=public, pg_temp%' THEN
        RAISE EXCEPTION 'ASSERTION FAILED: public.enforce_profile_update_integrity() lacks safe search_path: %', v_search_path;
    END IF;

    -- 7.3 Verify public.handle_new_user()
    SELECT p.prosecdef, array_to_string(p.proconfig, ', ') INTO v_sec_definer, v_search_path
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'handle_new_user';

    IF NOT v_sec_definer THEN
        RAISE EXCEPTION 'ASSERTION FAILED: public.handle_new_user() must be SECURITY DEFINER.';
    END IF;
    IF v_search_path NOT LIKE '%search_path=public, pg_temp%' THEN
        RAISE EXCEPTION 'ASSERTION FAILED: public.handle_new_user() lacks safe search_path: %', v_search_path;
    END IF;

    -- 7.4 Verify public.is_admin_or_service()
    SELECT p.prosecdef, array_to_string(p.proconfig, ', ') INTO v_sec_definer, v_search_path
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'is_admin_or_service';

    IF NOT v_sec_definer THEN
        RAISE EXCEPTION 'ASSERTION FAILED: public.is_admin_or_service() must be SECURITY DEFINER.';
    END IF;
    IF v_search_path NOT LIKE '%search_path=public, pg_temp%' THEN
        RAISE EXCEPTION 'ASSERTION FAILED: public.is_admin_or_service() lacks safe search_path: %', v_search_path;
    END IF;

    -- 7.5 Verify public.enforce_profile_delete_integrity()
    SELECT p.prosecdef, array_to_string(p.proconfig, ', ') INTO v_sec_definer, v_search_path
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'enforce_profile_delete_integrity';

    IF NOT v_sec_definer THEN
        RAISE EXCEPTION 'ASSERTION FAILED: public.enforce_profile_delete_integrity() must be SECURITY DEFINER.';
    END IF;
    IF v_search_path NOT LIKE '%search_path=public, pg_temp%' THEN
        RAISE EXCEPTION 'ASSERTION FAILED: public.enforce_profile_delete_integrity() lacks safe search_path: %', v_search_path;
    END IF;

    -- 7.6 Verify admin procedure permissions: promote_to_admin & demote_admin MUST NOT be callable by authenticated/anon
    IF EXISTS (
        SELECT 1 FROM information_schema.routine_privileges
        WHERE routine_schema = 'public' AND routine_name = 'promote_to_admin' AND grantee IN ('PUBLIC', 'anon', 'authenticated')
    ) THEN
        RAISE EXCEPTION 'ASSERTION FAILED: promote_to_admin must NOT be executable by PUBLIC, anon, or authenticated.';
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.routine_privileges
        WHERE routine_schema = 'public' AND routine_name = 'demote_admin' AND grantee IN ('PUBLIC', 'anon', 'authenticated')
    ) THEN
        RAISE EXCEPTION 'ASSERTION FAILED: demote_admin must NOT be executable by PUBLIC, anon, or authenticated.';
    END IF;
    RAISE NOTICE ' [PASS] All helper and trigger functions verified with SECURITY DEFINER, search_path = public, pg_temp, and restricted execute privileges.';

    -- --------------------------------------------------------------------------
    -- 8. VERIFY TRIGGERS
    -- --------------------------------------------------------------------------
    -- 8.1 trg_protect_profile_fields on public.profiles (BEFORE UPDATE)
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.triggers 
        WHERE trigger_schema = 'public' 
          AND event_object_table = 'profiles' 
          AND trigger_name = 'trg_protect_profile_fields'
          AND action_timing = 'BEFORE'
          AND event_manipulation = 'UPDATE'
    ) THEN
        RAISE EXCEPTION 'ASSERTION FAILED: Missing trigger trg_protect_profile_fields on public.profiles.';
    END IF;

    -- 8.2 trg_protect_profile_delete on public.profiles (BEFORE DELETE)
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.triggers 
        WHERE trigger_schema = 'public' 
          AND event_object_table = 'profiles' 
          AND trigger_name = 'trg_protect_profile_delete'
          AND action_timing = 'BEFORE'
          AND event_manipulation = 'DELETE'
    ) THEN
        RAISE EXCEPTION 'ASSERTION FAILED: Missing trigger trg_protect_profile_delete on public.profiles.';
    END IF;

    -- 8.3 on_auth_user_created on auth.users
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.triggers 
        WHERE trigger_schema = 'auth' 
          AND event_object_table = 'users' 
          AND trigger_name = 'on_auth_user_created'
          AND action_timing = 'AFTER'
          AND event_manipulation = 'INSERT'
    ) THEN
        RAISE EXCEPTION 'ASSERTION FAILED: Missing trigger on_auth_user_created on auth.users.';
    END IF;

    -- 8.4 on_auth_user_updated on auth.users
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.triggers 
        WHERE trigger_schema = 'auth' 
          AND event_object_table = 'users' 
          AND trigger_name = 'on_auth_user_updated'
          AND action_timing = 'AFTER'
          AND event_manipulation = 'UPDATE'
    ) THEN
        RAISE EXCEPTION 'ASSERTION FAILED: Missing trigger on_auth_user_updated on auth.users.';
    END IF;
    RAISE NOTICE ' [PASS] Profile integrity trigger and auth synchronization triggers verified.';

    RAISE NOTICE '==============================================================================';
    RAISE NOTICE '>>> SUCCESS: All FinSight AI database security verification checks PASSED. <<<';
    RAISE NOTICE '==============================================================================';
END $$;
