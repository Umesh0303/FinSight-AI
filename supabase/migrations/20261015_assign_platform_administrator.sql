-- ==============================================================================
-- FinSight AI: Assign Platform Administrator Migration
-- Target Supabase Project: ncfzjltffljconwihvpk (https://ncfzjltffljconwihvpk.supabase.co)
-- Target Account Email: admindashboard5@gmail.com
-- Verified Supabase Auth User ID: 2a303ad4-1352-423a-b8d8-eccdde87de77
-- File: supabase/migrations/20261015_assign_platform_administrator.sql
-- Status: PREPARED FOR REVIEW (DO NOT EXECUTE WITHOUT EXPLICIT APPROVAL)
-- ==============================================================================
--
-- PREREQUISITE ASSESSMENT & EXPLANATION:
-- ------------------------------------------------------------------------------
-- Live database inspection of Supabase project 'ncfzjltffljconwihvpk' confirms:
-- 1. The target Auth user exists in auth.users:
--    - ID: 2a303ad4-1352-423a-b8d8-eccdde87de77
--    - Email: admindashboard5@gmail.com
--    - Email Confirmed At: 2026-10-13 16:58:46.51596+00 (VERIFIED)
--    - Built-in Supabase Role: 'authenticated' (MUST REMAIN UNCHANGED)
--
-- 2. The 'public.profiles' table does NOT currently exist in the main database
--    schema (PostgREST code: PGRST205 - 'Could not find the table public.profiles
--    in the schema cache').
--
-- 3. Required Prerequisite:
--    Before this assignment can be persisted in the database, the public.profiles
--    schema must be initialized using the comprehensive production migration
--    'supabase/migrations/20261015_main_database_auth_production.sql', which
--    provisions:
--      a) Enums: public.app_user_role ('admin', 'business_analyst', 'risk_analyst',
--                'customer', 'unassigned') and public.app_account_status ('active',
--                'pending_approval', 'suspended').
--      b) Table: public.profiles with columns:
--           - id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE
--           - email TEXT NOT NULL UNIQUE
--           - display_name TEXT
--           - role public.app_user_role NOT NULL DEFAULT 'customer'
--           - account_status public.app_account_status NOT NULL DEFAULT 'active'
--           - status TEXT NOT NULL DEFAULT 'active'
--           - created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
--           - updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
--           - last_login_at TIMESTAMPTZ
--      c) Row Level Security (RLS) policies and security triggers:
--           - handle_new_user() on auth.users (defaults signups to 'customer')
--           - enforce_profile_update_integrity() on public.profiles (protects
--             last-active-admin invariant and prevents self-elevation)
--           - promote_to_admin(UUID, TEXT) SECURITY DEFINER procedure restricted
--             to service_role.
--
-- ------------------------------------------------------------------------------
-- ASSIGNMENT SCRIPT (Idempotent, Transactional, and Verification-Guarded)
-- ------------------------------------------------------------------------------

BEGIN;

-- 1. Safety Assertion: Verify target user exists in auth.users with verified email
DO $$
DECLARE
    v_target_id UUID := '2a303ad4-1352-423a-b8d8-eccdde87de77'::UUID;
    v_target_email TEXT := 'admindashboard5@gmail.com';
    v_auth_record RECORD;
    v_profile_exists BOOLEAN;
BEGIN
    SELECT id, email, email_confirmed_at, role
    INTO v_auth_record
    FROM auth.users
    WHERE id = v_target_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'CRITICAL: Target user % does not exist in auth.users. Migration aborted.', v_target_id;
    END IF;

    IF lower(trim(v_auth_record.email)) <> lower(trim(v_target_email)) THEN
        RAISE EXCEPTION 'CRITICAL: Email mismatch for user %. Expected %, found %. Migration aborted.',
            v_target_id, v_target_email, v_auth_record.email;
    END IF;

    IF v_auth_record.email_confirmed_at IS NULL THEN
        RAISE EXCEPTION 'CRITICAL: Target user % (%) has not verified their email. Administrative promotion requires email verification. Migration aborted.',
            v_target_id, v_target_email;
    END IF;

    -- Ensure Supabase's built-in role is 'authenticated' and remains unchanged
    IF v_auth_record.role <> 'authenticated' THEN
        RAISE NOTICE 'Notice: auth.users.role is %; Supabase built-in role is preserved without modification.', v_auth_record.role;
    END IF;

    -- Check if public.profiles exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'profiles'
    ) INTO v_profile_exists;

    IF NOT v_profile_exists THEN
        RAISE EXCEPTION 'PREREQUISITE MISSING: Table public.profiles does not exist. Apply the production auth migration (20261015_main_database_auth_production.sql) first.';
    END IF;

    -- 2. Upsert Platform Administrator Profile into public.profiles
    -- Keep auth.users.role strictly as 'authenticated' (Supabase built-in role)
    -- Assign application role 'admin' in public.profiles
    INSERT INTO public.profiles (
        id,
        email,
        display_name,
        role,
        account_status,
        status,
        auth_provider,
        created_at,
        updated_at
    ) VALUES (
        v_target_id,
        v_target_email,
        'Admin Dashboard',
        'admin'::public.app_user_role,
        'active'::public.app_account_status,
        'active',
        'email',
        timezone('utc'::text, now()),
        timezone('utc'::text, now())
    )
    ON CONFLICT (id) DO UPDATE SET
        role = 'admin'::public.app_user_role,
        account_status = 'active'::public.app_account_status,
        status = 'active',
        email = EXCLUDED.email,
        display_name = COALESCE(public.profiles.display_name, EXCLUDED.display_name),
        updated_at = timezone('utc'::text, now());

    -- 3. If promote_to_admin review tracking table exists, record promotion audit
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = '_legacy_admin_promotion_review'
    ) THEN
        INSERT INTO public._legacy_admin_promotion_review (
            user_id,
            email,
            original_role,
            review_status,
            resolution_notes,
            reviewed_at
        ) VALUES (
            v_target_id,
            v_target_email,
            'admin',
            'promoted_via_platform_admin_assignment',
            'Designated Platform Administrator for FinSight AI verified and assigned',
            timezone('utc'::text, now())
        )
        ON CONFLICT (user_id) DO UPDATE SET
            review_status = 'promoted_via_platform_admin_assignment',
            reviewed_at = timezone('utc'::text, now()),
            resolution_notes = 'Designated Platform Administrator for FinSight AI verified and assigned';
    END IF;

    RAISE NOTICE 'SUCCESS: User % (%) successfully designated as Platform Administrator (role=admin, account_status=active).',
        v_target_id, v_target_email;
END $$;

COMMIT;

-- ==============================================================================
-- POST-ASSIGNMENT READ-ONLY VERIFICATION QUERIES
-- ==============================================================================
-- Run these queries after applying the migration to independently confirm status:
--
-- 1. Verify Auth user identity, email confirmation, and unchanged 'authenticated' role:
--    SELECT id, email, email_confirmed_at, role, raw_app_meta_data 
--    FROM auth.users 
--    WHERE email = 'admindashboard5@gmail.com';
--
-- 2. Verify Application Profile assignment in public.profiles:
--    SELECT id, email, display_name, role, account_status, status, updated_at 
--    FROM public.profiles 
--    WHERE id = '2a303ad4-1352-423a-b8d8-eccdde87de77';
--
-- 3. Verify Active Administrator Count invariant:
--    SELECT count(*) AS active_admins 
--    FROM public.profiles 
--    WHERE role = 'admin' AND account_status = 'active';
