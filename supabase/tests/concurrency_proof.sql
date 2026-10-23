-- ==============================================================================
-- FinSight AI: Isolated PostgreSQL Concurrency & Last-Admin Invariant Test
-- Target: Demonstrates real PostgreSQL engine locking & race condition prevention
-- Serialization Gate: pg_advisory_xact_lock(hashtext('finsight_admin_invariant_gate'))
-- Prevents deadlocks mathematically across concurrent operations on different rows.
-- ==============================================================================
-- INSTRUCTIONS FOR OPERATOR EXECUTION ON ISOLATED TEST POSTGRESQL INSTANCE:
-- Prerequisites: Local PostgreSQL instance or isolated sandbox.
-- DO NOT EXECUTE ON PRODUCTION.
--
-- Open TWO terminal windows / psql sessions connected to the isolated database:
-- TERMINAL 1 (Session A) & TERMINAL 2 (Session B)
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- SETUP (Execute once in Session A before test suite):
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS test_profiles (
    id UUID PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    role TEXT NOT NULL DEFAULT 'unassigned',
    account_status TEXT NOT NULL DEFAULT 'pending_approval'
);

CREATE TABLE IF NOT EXISTS test_auth_users (
    id UUID PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    email_confirmed_at TIMESTAMPTZ DEFAULT now()
);

-- ==============================================================================
-- SUITE 1: CONCURRENT ROLE DEMOTION INVARIANT TEST (Serialization Gate)
-- ==============================================================================
-- Reset data: exactly 2 active administrators
TRUNCATE test_profiles, test_auth_users;

INSERT INTO test_auth_users (id, email, email_confirmed_at) VALUES
('11111111-1111-1111-1111-111111111111', 'admin1@example.com', now()),
('22222222-2222-2222-2222-222222222222', 'admin2@example.com', now());

INSERT INTO test_profiles (id, email, role, account_status) VALUES
('11111111-1111-1111-1111-111111111111', 'admin1@example.com', 'admin', 'active'),
('22222222-2222-2222-2222-222222222222', 'admin2@example.com', 'admin', 'active');

-- Verify setup: exactly 2 active admins
SELECT id, email, role, account_status FROM test_profiles WHERE role = 'admin' AND account_status = 'active';

-- [SESSION A — Terminal 1]: Demote Admin 1 (Pause before commit)
BEGIN;
DO $$
DECLARE
    v_target_id UUID := '11111111-1111-1111-1111-111111111111'::UUID;
    v_expected_email TEXT := 'admin1@example.com';
    v_auth_count INT;
    v_current_role TEXT;
    v_current_status TEXT;
    v_other_admins INT;
    v_rows_affected INT;
BEGIN
    SELECT COUNT(*) INTO v_auth_count FROM test_auth_users WHERE id = v_target_id AND email = v_expected_email;
    IF v_auth_count <> 1 THEN RAISE EXCEPTION 'Auth check failed'; END IF;

    -- Global serialization gate eliminates deadlocks when concurrent transactions target different admin rows
    PERFORM pg_advisory_xact_lock(hashtext('finsight_admin_invariant_gate'));

    SELECT role, account_status INTO v_current_role, v_current_status
    FROM test_profiles WHERE id = v_target_id AND email = v_expected_email;

    SELECT COUNT(*) INTO v_other_admins
    FROM test_profiles WHERE role = 'admin' AND account_status = 'active' AND id <> v_target_id;

    IF v_other_admins = 0 AND v_current_role = 'admin' AND v_current_status = 'active' THEN
        RAISE EXCEPTION 'Cannot demote last remaining admin';
    END IF;

    UPDATE test_profiles SET role = 'unassigned', account_status = 'pending_approval' WHERE id = v_target_id;
    GET DIAGNOSTICS v_rows_affected = ROW_COUNT;
    IF v_rows_affected <> 1 THEN RAISE EXCEPTION 'Assertion failed'; END IF;
    RAISE NOTICE 'Session A: Demoted Admin 1 (Transaction still open, locks held)...';
END $$;
-- NOTE: DO NOT COMMIT YET IN SESSION A!

-- [SESSION B — Terminal 2]: Simultaneously attempt to demote Admin 2
-- Paste while Session A is still uncommitted:
BEGIN;
DO $$
DECLARE
    v_target_id UUID := '22222222-2222-2222-2222-222222222222'::UUID;
    v_expected_email TEXT := 'admin2@example.com';
    v_auth_count INT;
    v_current_role TEXT;
    v_current_status TEXT;
    v_other_admins INT;
BEGIN
    SELECT COUNT(*) INTO v_auth_count FROM test_auth_users WHERE id = v_target_id AND email = v_expected_email;
    IF v_auth_count <> 1 THEN RAISE EXCEPTION 'Auth check failed'; END IF;

    -- Global serialization gate eliminates deadlocks:
    -- OBSERVE: Session B immediately blocks here waiting for Session A's advisory lock!
    PERFORM pg_advisory_xact_lock(hashtext('finsight_admin_invariant_gate'));

    SELECT role, account_status INTO v_current_role, v_current_status
    FROM test_profiles WHERE id = v_target_id AND email = v_expected_email;

    SELECT COUNT(*) INTO v_other_admins
    FROM test_profiles WHERE role = 'admin' AND account_status = 'active' AND id <> v_target_id;

    IF v_other_admins = 0 AND v_current_role = 'admin' AND v_current_status = 'active' THEN
        RAISE EXCEPTION 'Cannot demote user %: this is the last remaining active administrator in the system. Demotion aborted.', v_target_id;
    END IF;

    UPDATE test_profiles SET role = 'unassigned', account_status = 'pending_approval' WHERE id = v_target_id;
    RAISE NOTICE 'Session B: Demoted Admin 2';
END $$;

-- [SESSION A — Terminal 1]: Commit transaction
COMMIT;

-- [SESSION B — Terminal 2]: Observe exception and clean up
-- Result in Terminal 2:
-- ERROR: Cannot demote user 22222222-2222-2222-2222-222222222222: this is the last remaining active administrator in the system. Demotion aborted.
ROLLBACK;

-- Verify Invariant: Exactly 1 active administrator remains
SELECT id, email, role, account_status FROM test_profiles WHERE role = 'admin' AND account_status = 'active';


-- ==============================================================================
-- SUITE 2: CONCURRENT ACCOUNT STATUS DEACTIVATION / SUSPENSION TEST
-- ==============================================================================
-- Re-seed exactly 2 active administrators
TRUNCATE test_profiles;
INSERT INTO test_profiles (id, email, role, account_status) VALUES
('11111111-1111-1111-1111-111111111111', 'admin1@example.com', 'admin', 'active'),
('22222222-2222-2222-2222-222222222222', 'admin2@example.com', 'admin', 'active');

-- [SESSION A — Terminal 1]: Suspend Admin 1 (Pause before commit)
BEGIN;
DO $$
DECLARE
    v_target_id UUID := '11111111-1111-1111-1111-111111111111'::UUID;
    v_other_admins INT;
BEGIN
    PERFORM pg_advisory_xact_lock(hashtext('finsight_admin_invariant_gate'));

    SELECT COUNT(*) INTO v_other_admins
    FROM test_profiles WHERE role = 'admin' AND account_status = 'active' AND id <> v_target_id;

    IF v_other_admins = 0 THEN
        RAISE EXCEPTION 'Cannot suspend last remaining active admin';
    END IF;

    UPDATE test_profiles SET account_status = 'suspended' WHERE id = v_target_id;
    RAISE NOTICE 'Session A: Suspended Admin 1 (Transaction still open, locks held)...';
END $$;

-- [SESSION B — Terminal 2]: Simultaneously attempt to suspend Admin 2
BEGIN;
DO $$
DECLARE
    v_target_id UUID := '22222222-2222-2222-2222-222222222222'::UUID;
    v_other_admins INT;
BEGIN
    -- Blocks waiting for Session A's advisory lock
    PERFORM pg_advisory_xact_lock(hashtext('finsight_admin_invariant_gate'));

    SELECT COUNT(*) INTO v_other_admins
    FROM test_profiles WHERE role = 'admin' AND account_status = 'active' AND id <> v_target_id;

    IF v_other_admins = 0 THEN
        RAISE EXCEPTION 'Cannot suspend user %: this is the last remaining active administrator in the system. Suspension aborted.', v_target_id;
    END IF;

    UPDATE test_profiles SET account_status = 'suspended' WHERE id = v_target_id;
END $$;

-- [SESSION A — Terminal 1]: Commit transaction
COMMIT;

-- [SESSION B — Terminal 2]: Observe exception and clean up
-- Result in Terminal 2:
-- ERROR: Cannot suspend user 22222222-2222-2222-2222-222222222222: this is the last remaining active administrator in the system. Suspension aborted.
ROLLBACK;

-- Verify Invariant: Exactly 1 active administrator remains
SELECT id, email, role, account_status FROM test_profiles WHERE role = 'admin' AND account_status = 'active';


-- ==============================================================================
-- SUITE 3: CONCURRENT DELETION RACE INVARIANT TEST
-- ==============================================================================
-- Re-seed exactly 2 active administrators
TRUNCATE test_profiles;
INSERT INTO test_profiles (id, email, role, account_status) VALUES
('11111111-1111-1111-1111-111111111111', 'admin1@example.com', 'admin', 'active'),
('22222222-2222-2222-2222-222222222222', 'admin2@example.com', 'admin', 'active');

-- [SESSION A — Terminal 1]: Delete Admin 1 (Pause before commit)
BEGIN;
DO $$
DECLARE
    v_target_id UUID := '11111111-1111-1111-1111-111111111111'::UUID;
    v_other_admins INT;
BEGIN
    PERFORM pg_advisory_xact_lock(hashtext('finsight_admin_invariant_gate'));

    SELECT COUNT(*) INTO v_other_admins
    FROM test_profiles WHERE role = 'admin' AND account_status = 'active' AND id <> v_target_id;

    IF v_other_admins = 0 THEN
        RAISE EXCEPTION 'Cannot delete last remaining active admin';
    END IF;

    DELETE FROM test_profiles WHERE id = v_target_id;
    RAISE NOTICE 'Session A: Deleted Admin 1 (Transaction still open, locks held)...';
END $$;

-- [SESSION B — Terminal 2]: Simultaneously attempt to delete Admin 2
BEGIN;
DO $$
DECLARE
    v_target_id UUID := '22222222-2222-2222-2222-222222222222'::UUID;
    v_other_admins INT;
BEGIN
    -- Blocks waiting for Session A's advisory lock
    PERFORM pg_advisory_xact_lock(hashtext('finsight_admin_invariant_gate'));

    SELECT COUNT(*) INTO v_other_admins
    FROM test_profiles WHERE role = 'admin' AND account_status = 'active' AND id <> v_target_id;

    IF v_other_admins = 0 THEN
        RAISE EXCEPTION 'Cannot delete user %: this is the last remaining active administrator in the system. Deletion aborted.', v_target_id;
    END IF;

    DELETE FROM test_profiles WHERE id = v_target_id;
END $$;

-- [SESSION A — Terminal 1]: Commit transaction
COMMIT;

-- [SESSION B — Terminal 2]: Observe exception and clean up
-- Result in Terminal 2:
-- ERROR: Cannot delete user 22222222-2222-2222-2222-222222222222: this is the last remaining active administrator in the system. Deletion aborted.
ROLLBACK;

-- Final Invariant Proof: Exactly 1 active administrator remains
SELECT id, email, role, account_status FROM test_profiles WHERE role = 'admin' AND account_status = 'active';

-- Cleanup test fixtures:
DROP TABLE test_profiles, test_auth_users;
