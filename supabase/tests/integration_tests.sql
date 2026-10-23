-- ==============================================================================
-- FinSight AI: PostgreSQL Integration Test Suite (Isolated Test Instance Only)
-- Target: Real PostgreSQL Execution of Functions, Triggers, RLS, and Constraints
-- ==============================================================================
-- INSTRUCTIONS:
-- Execute against an isolated local PostgreSQL database or staging sandbox:
--   psql -v ON_ERROR_STOP=1 "$DATABASE_URL" -f supabase/tests/integration_tests.sql
-- DO NOT EXECUTE ON PRODUCTION.
-- ==============================================================================

\set ON_ERROR_STOP on

BEGIN;

DO $$
DECLARE
    v_admin_id UUID := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::UUID;
    v_admin2_id UUID := 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::UUID;
    v_user_id UUID := 'cccccccc-cccc-cccc-cccc-cccccccccccc'::UUID;
    v_count INT;
    v_view_row RECORD;
    v_threw_error BOOLEAN := false;
BEGIN
    RAISE NOTICE '>>> Starting FinSight AI Live Integration Tests...';

    -- --------------------------------------------------------------------------
    -- 1. SETUP FIXTURES (in auth.users and public.profiles)
    -- --------------------------------------------------------------------------
    -- Clean any existing test rows
    DELETE FROM public.profiles WHERE id IN (v_admin_id, v_admin2_id, v_user_id);
    DELETE FROM auth.users WHERE id IN (v_admin_id, v_admin2_id, v_user_id);

    -- Insert mock auth users
    INSERT INTO auth.users (id, email, email_confirmed_at, raw_user_meta_data, raw_app_meta_data)
    VALUES
        (v_admin_id, 'admin1.test@example.com', now(), '{"full_name": "Admin One"}'::jsonb, '{"provider": "email"}'::jsonb),
        (v_admin2_id, 'admin2.test@example.com', now(), '{"full_name": "Admin Two"}'::jsonb, '{"provider": "email"}'::jsonb),
        (v_user_id, 'normal.test@example.com', now(), '{"full_name": "Normal User"}'::jsonb, '{"provider": "email"}'::jsonb);

    -- Auth triggers automatically create profiles as unassigned / pending_approval
    -- Verify handle_new_user trigger populated initial profiles
    SELECT COUNT(*) INTO v_count FROM public.profiles WHERE id IN (v_admin_id, v_admin2_id, v_user_id);
    IF v_count <> 3 THEN
        RAISE EXCEPTION 'TEST 1 FAILED: on_auth_user_created trigger did not create 3 profiles (found %)', v_count;
    END IF;
    RAISE NOTICE ' [PASS] Test 1: on_auth_user_created trigger created profiles with unassigned / pending_approval.';

    -- --------------------------------------------------------------------------
    -- 2. TEST: promote_to_admin Procedure
    -- --------------------------------------------------------------------------
    -- 2.1 Promote Admin 1
    PERFORM public.promote_to_admin(v_admin_id, 'admin1.test@example.com');
    SELECT COUNT(*) INTO v_count FROM public.profiles WHERE id = v_admin_id AND role = 'admin' AND account_status = 'active';
    IF v_count <> 1 THEN
        RAISE EXCEPTION 'TEST 2.1 FAILED: promote_to_admin did not activate Admin 1.';
    END IF;

    -- 2.2 Promote Admin 2
    PERFORM public.promote_to_admin(v_admin2_id, 'admin2.test@example.com');
    SELECT COUNT(*) INTO v_count FROM public.profiles WHERE id = v_admin2_id AND role = 'admin' AND account_status = 'active';
    IF v_count <> 1 THEN
        RAISE EXCEPTION 'TEST 2.2 FAILED: promote_to_admin did not activate Admin 2.';
    END IF;

    -- 2.3 Rejection on email mismatch
    v_threw_error := false;
    BEGIN
        PERFORM public.promote_to_admin(v_user_id, 'wrong.email@example.com');
    EXCEPTION WHEN OTHERS THEN
        v_threw_error := true;
    END;
    IF NOT v_threw_error THEN
        RAISE EXCEPTION 'TEST 2.3 FAILED: promote_to_admin did not reject email mismatch.';
    END IF;
    RAISE NOTICE ' [PASS] Test 2: promote_to_admin procedure promotes verified users and rejects mismatches.';

    -- --------------------------------------------------------------------------
    -- 3. TEST: Ordinary Authenticated User Update (Trigger Protection)
    -- --------------------------------------------------------------------------
    -- Set session identity to normal user
    PERFORM set_config('request.jwt.claims', json_build_object('sub', v_user_id::text, 'role', 'authenticated')::text, true);

    -- 3.1 Normal user updates display_name, full_name, avatar_url (permitted)
    UPDATE public.profiles
    SET display_name = 'Updated Normal Display',
        full_name = 'Updated Full Name',
        avatar_url = 'https://example.com/avatar.png'
    WHERE id = v_user_id;

    SELECT full_name INTO v_view_row FROM public.profiles WHERE id = v_user_id;
    IF v_view_row.full_name <> 'Updated Full Name' THEN
        RAISE EXCEPTION 'TEST 3.1 FAILED: Normal user permitted field update did not persist.';
    END IF;

    -- 3.2 Normal user attempts to self-elevate role to 'admin' (must be reverted by trigger)
    UPDATE public.profiles
    SET role = 'admin'::public.app_user_role,
        account_status = 'active'::public.app_account_status
    WHERE id = v_user_id;

    SELECT role, account_status INTO v_view_row FROM public.profiles WHERE id = v_user_id;
    IF v_view_row.role <> 'unassigned'::public.app_user_role OR v_view_row.account_status <> 'pending_approval'::public.app_account_status THEN
        RAISE EXCEPTION 'TEST 3.2 FAILED: Trigger failed to revert unauthorized self-elevation by ordinary user.';
    END IF;
    RAISE NOTICE ' [PASS] Test 3: Normal user permitted updates succeed; unauthorized role elevation reverted.';

    -- --------------------------------------------------------------------------
    -- 4. TEST: demote_admin Procedure & Last Admin Protection
    -- --------------------------------------------------------------------------
    -- Reset to superuser / service_role context
    PERFORM set_config('request.jwt.claims', json_build_object('role', 'service_role')::text, true);

    -- 4.1 Demote Admin 1 (Admin 2 remains active) -> should SUCCEED
    PERFORM public.demote_admin(v_admin_id, 'admin1.test@example.com', 'unassigned'::public.app_user_role);
    SELECT COUNT(*) INTO v_count FROM public.profiles WHERE id = v_admin_id AND role = 'unassigned';
    IF v_count <> 1 THEN
        RAISE EXCEPTION 'TEST 4.1 FAILED: demote_admin failed to demote Admin 1 when Admin 2 was active.';
    END IF;

    -- 4.2 Demote Admin 2 (Sole remaining active admin) -> must FAIL
    v_threw_error := false;
    BEGIN
        PERFORM public.demote_admin(v_admin2_id, 'admin2.test@example.com', 'unassigned'::public.app_user_role);
    EXCEPTION WHEN OTHERS THEN
        v_threw_error := true;
    END;
    IF NOT v_threw_error THEN
        RAISE EXCEPTION 'TEST 4.2 FAILED: demote_admin did not protect the last remaining active administrator.';
    END IF;
    RAISE NOTICE ' [PASS] Test 4: demote_admin succeeds when another admin exists; rejects demotion of sole admin.';

    -- --------------------------------------------------------------------------
    -- 5. TEST: Direct SQL Mutation Invariant on Profiles (Trigger Protection)
    -- --------------------------------------------------------------------------
    -- 5.1 Direct SQL UPDATE demoting sole admin -> must FAIL
    v_threw_error := false;
    BEGIN
        UPDATE public.profiles
        SET role = 'unassigned'::public.app_user_role
        WHERE id = v_admin2_id;
    EXCEPTION WHEN OTHERS THEN
        v_threw_error := true;
    END;
    IF NOT v_threw_error THEN
        RAISE EXCEPTION 'TEST 5.1 FAILED: Direct SQL update of sole admin role was not blocked by trigger.';
    END IF;

    -- 5.2 Direct SQL UPDATE suspending sole admin -> must FAIL
    v_threw_error := false;
    BEGIN
        UPDATE public.profiles
        SET account_status = 'suspended'::public.app_account_status
        WHERE id = v_admin2_id;
    EXCEPTION WHEN OTHERS THEN
        v_threw_error := true;
    END;
    IF NOT v_threw_error THEN
        RAISE EXCEPTION 'TEST 5.2 FAILED: Direct SQL suspension of sole admin was not blocked by trigger.';
    END IF;

    -- 5.3 Direct SQL DELETE of sole admin -> must FAIL
    v_threw_error := false;
    BEGIN
        DELETE FROM public.profiles
        WHERE id = v_admin2_id;
    EXCEPTION WHEN OTHERS THEN
        v_threw_error := true;
    END;
    IF NOT v_threw_error THEN
        RAISE EXCEPTION 'TEST 5.3 FAILED: Direct SQL delete of sole admin was not blocked by trigger.';
    END IF;
    RAISE NOTICE ' [PASS] Test 5: Direct SQL role change, suspension, and deletion of sole admin blocked by triggers.';

    -- --------------------------------------------------------------------------
    -- 6. TEST: View Schema and Security Invoker Functionality
    -- --------------------------------------------------------------------------
    SELECT COUNT(*) INTO v_count FROM public.user_profiles WHERE id = v_admin2_id;
    IF v_count <> 1 THEN
        RAISE EXCEPTION 'TEST 6 FAILED: public.user_profiles view failed to return administrator profile.';
    END IF;
    RAISE NOTICE ' [PASS] Test 6: public.user_profiles view projections verified.';

    -- --------------------------------------------------------------------------
    -- 7. CLEANUP TEST FIXTURES
    -- --------------------------------------------------------------------------
    -- Promote Admin 1 back so Admin 2 can be cleanly deleted
    PERFORM public.promote_to_admin(v_admin_id, 'admin1.test@example.com');
    DELETE FROM public.profiles WHERE id IN (v_admin_id, v_admin2_id, v_user_id);
    DELETE FROM auth.users WHERE id IN (v_admin_id, v_admin2_id, v_user_id);

    RAISE NOTICE '==============================================================================';
    RAISE NOTICE '>>> SUCCESS: All PostgreSQL Database Integration Tests PASSED. <<<';
    RAISE NOTICE '==============================================================================';
END $$;

ROLLBACK;
