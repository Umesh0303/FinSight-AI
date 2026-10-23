# FinSight AI — Database Migration Safe Recovery, Backup & Staging Runbook

## Core Principle: Non-Destructive Recovery & Zero Data Loss
In production and staging environments, generic rollbacks using `DROP TABLE ... CASCADE` or `DROP TRIGGER ... CASCADE` are strictly prohibited. 
Dropping tables, columns, or triggers destroys active user accounts, permanently erases compliance audit logs (`login_history`), breaks foreign key integrity, and immediately halts application user registration.

All database operations must follow **safe forward-fix migrations**, transactional execution, verified pre-migration backups, and scoped, non-destructive recovery recipes.

---

## 1. Pre-Migration Backup Strategy & Scope Verification

### CRITICAL DISTINCTION: Backup Coverage Matrix
> **CRITICAL RELIABILITY PRINCIPLE**: Running `supabase db dump -f backup.sql` produces a **SCHEMA-ONLY (DDL)** snapshot. It contains **ZERO ROWS OF DATA**. Describing a schema-only dump as a complete backup is a severe reliability failure.

The table below details exactly what is captured and what is omitted by each backup method:

| Backup Method | Coverage: What Is Included | Omissions: Schemas & External Resources Not Captured | Operational Role |
| :--- | :--- | :--- | :--- |
| **`supabase db dump -f schema.sql`** (Schema-Only DDL) | DDL for `public` schema tables, views, functions, triggers, custom enums (`app_user_role`, `app_account_status`), and RLS policies. | • **Zero table rows / user data**<br>• Supabase-managed schemas (`auth`, `storage`, `vault`, `realtime`, `graphql_public`)<br>• External S3 storage blobs, Edge Functions, Platform configuration. | Code migration baseline only. **Not a recovery backup**. |
| **`supabase db dump --data-only -f data.sql`** (Data-Only DML) | Table row records (COPY / INSERT) in `public` schema (`profiles`, `login_history`). | • All table schemas, constraints, indexes, triggers, RLS policies<br>• `auth.users`, `storage.objects`<br>• External S3 blobs, Edge Functions, Platform configuration. | Row data archival. Cannot restore schema structure. |
| **`pg_dump "$DATABASE_URL" -F c -f full.dump`** (Full Postgres Dump) | **Complete schema and data** for all database schemas accessible by the `postgres` role (`public`, `storage`, `vault`, `graphql_public`, extensions, and `auth` if granted). | • **Storage Bucket File Blobs** (S3/GCS)<br>• **Edge Functions Source Code** (Deno)<br>• **Platform Project & Auth Settings** (SMTP, OAuth secrets, redirect URLs, JWT secret). | **Enterprise Standard Pre-Migration Backup**. |

### External Resources & Supabase-Managed Schemas Not in PostgreSQL Dumps
Operators must understand that database dumps do NOT contain the following external infrastructure:
1. **Supabase Storage File Payloads (S3 / GCS)**:
   The `storage.objects` database table contains only file metadata (file paths, mime types, sizes, bucket IDs). The actual binary file blobs reside in AWS S3 or Google Cloud Storage buckets. To back up files, use the Supabase CLI storage sync or cloud provider bucket replication.
2. **Supabase Edge Functions Source Code**:
   TypeScript functions deployed to the Supabase Edge Runtime are hosted on Supabase's global edge infrastructure. Source code must be maintained and backed up in version control (`supabase/functions/*`).
3. **Supabase Dashboard & Auth Platform Configurations**:
   Platform configurations configured in the Supabase management console are stored in Supabase's internal control plane, not in PostgreSQL tables:
   - Custom SMTP mail server credentials and email templates
   - Third-Party OAuth Provider Client IDs & Client Secrets (e.g. Google OAuth)
   - Site URL, Allowed Callback / Redirect URLs
   - Project JWT Secret, token lifetimes, refresh token rotation policies
   - Project API Keys (`anon` public key, `service_role` private key)
   - Database connection pooler settings (Supavisor / PgBouncer port 6543 vs direct port 5432)
   - Webhook subscriptions and custom HTTP endpoints

---

## 2. Backup Execution Procedures (Secure & Cross-Platform)

> **Security Note**: Never hardcode credentials, passwords, or connection strings in command line history or scripts. Export the connection string to an environment variable (`DATABASE_URL`) or use a secure `.pgpass` credential file.

### Primary Backup Method: Native PostgreSQL `pg_dump` (Full Binary Archive)
Creates a single compressed archive (`.dump`) containing both full schema definitions and table records.

#### 1. Custom Binary Archive (`-F c`)
- **Linux/macOS (Bash)**:
  ```bash
  export DATABASE_URL="postgresql://postgres:[PASSWORD]@[HOST]:[PORT]/postgres"
  BACKUP_FILE="pre_staging_full_$(date +%Y%m%d_%H%M%S).dump"
  pg_dump "$DATABASE_URL" --format=custom --blobs --verbose -f "$BACKUP_FILE"
  echo "Exit Code: $?"
  ls -lh "$BACKUP_FILE"
  ```
- **Windows (PowerShell)**:
  ```powershell
  $env:DATABASE_URL="postgresql://postgres:[PASSWORD]@[HOST]:[PORT]/postgres"
  $BACKUP_FILE="pre_staging_full_$(Get-Date -Format 'yyyyMMdd_HHmmss').dump"
  pg_dump "$env:DATABASE_URL" --format=custom --blobs --verbose -f "$BACKUP_FILE"
  Write-Host "Exit Code: $LASTEXITCODE"
  Get-Item "$BACKUP_FILE" | Select-Object Name, Length
  ```
- **Windows (CMD)**:
  ```cmd
  set DATABASE_URL=postgresql://postgres:[PASSWORD]@[HOST]:[PORT]/postgres
  pg_dump "%DATABASE_URL%" --format=custom --blobs --verbose -f pre_staging_full_backup.dump
  echo Exit Code: %ERRORLEVEL%
  dir pre_staging_full_backup.dump
  ```

---

## 3. Isolated Backup Restoration Validation

> **STRICT SAFETY RULE**: **NEVER OVERWRITE OR RESTORE INTO A LIVE STAGING OR PRODUCTION DATABASE DURING VALIDATION.**
> Archive inspection (`pg_restore --list`) verifies file readability only. **A backup is NOT classified as recoverable until Step 2 (Isolated Sandbox Restoration Test) succeeds completely on a disposable database.**

### Step 1: Inspect Archive Integrity (Zero Risk to Live DB)
Verify the dump archive is uncorrupted and contains expected tables without restoring anything:
- **Linux/macOS (Bash)**:
  ```bash
  pg_restore --list "$BACKUP_FILE" | grep -E "(profiles|login_history|users|role)"
  ```
- **Windows (PowerShell)**:
  ```powershell
  pg_restore --list "$BACKUP_FILE" | Select-String -Pattern "profiles","login_history","users","role"
  ```
**Expected Evidence**: Archive table of contents displays `TABLE profiles`, `TABLE login_history`, `TYPE app_user_role`, etc.

### Step 2: Isolated Sandbox Restoration Test (Mandatory for Recoverability)
To prove that the dump can be restored in an emergency without affecting the running environment:
```bash
# 1. Create a local temporary disposable validation database
createdb finsight_restore_validation

# 2. Restore into the disposable sandbox
pg_restore --dbname=finsight_restore_validation --no-owner --no-privileges "$BACKUP_FILE"

# 3. Assert row count integrity and user counts
psql -d finsight_restore_validation -c "SELECT 'profiles' AS tbl, count(*) FROM public.profiles UNION ALL SELECT 'login_history', count(*) FROM public.login_history;"

# 4. Destroy the temporary disposable sandbox
dropdb finsight_restore_validation
```
**Success Criteria**: `pg_restore` exits with code 0 (or warnings without fatal errors); row counts match the source database; disposable database is cleanly dropped.

---

## 4. Reversible vs. Forward-Fix Actions

| Database Object | Safe Action on Failure / Correction | Dangerous / Prohibited Action |
| :--- | :--- | :--- |
| **`public.profiles` Table** | Forward-fix (`ALTER TABLE profiles ADD/ALTER COLUMN ...`). Never drop table. | `DROP TABLE public.profiles CASCADE;` (Destroys user records & foreign keys) |
| **`public.login_history` Table** | Forward-fix column definitions or indexes. Audit history is append-only. | `DROP TABLE public.login_history CASCADE;` (Destroys compliance audit trail) |
| **Enum Types (`app_user_role`, `app_account_status`)** | Forward-fix by appending new values (`ALTER TYPE app_user_role ADD VALUE IF NOT EXISTS ...`). | Dropping enum types referenced by table columns |
| **RLS Policies** | Safe to drop and recreate in-place (`DROP POLICY IF EXISTS ... ON ...; CREATE POLICY ...`). | Disabling RLS on tables (`ALTER TABLE ... DISABLE ROW LEVEL SECURITY;`) |
| **Functions (`is_admin()`, `handle_new_user()`)** | Safe to update in-place (`CREATE OR REPLACE FUNCTION ...`). | `DROP FUNCTION ... CASCADE;` (Breaks triggers and dependent policies) |
| **Triggers (`on_auth_user_created`)** | Safe to recreate (`DROP TRIGGER IF EXISTS ...; CREATE TRIGGER ...`). | Leaving `auth.users` without a profile creation trigger |
| **Grants** | Reversible via explicit `REVOKE` and `GRANT` statements. | Broad blanket grants (`GRANT ALL ON ALL TABLES TO PUBLIC;`) |

---

## 5. Supervised Administrator Provisioning & Demotion

### Safe Admin Promotion Procedure (Controlled Operator Execution)
1. Query `auth.users` to verify the account identity and obtain the exact confirmed UUID:
   ```sql
   SELECT id, email, email_confirmed_at, created_at 
   FROM auth.users 
   WHERE lower(trim(email)) = lower(trim('admindashboard5@gmail.com'));
   ```
   **Verification Check**: Exactly 1 row must be returned with `email_confirmed_at IS NOT NULL`. Copy the exact UUID. Never guess or invent an account UUID.

2. Replace `<VERIFIED_ADMIN_UUID>` and execute the locked, assert-protected block:
   ```sql
   BEGIN;
   DO $$
   DECLARE
       v_target_id UUID := '<VERIFIED_ADMIN_UUID>'::UUID;
       v_expected_email TEXT := 'admindashboard5@gmail.com';
       v_auth_count INT;
       v_profile_count INT;
       v_current_role public.app_user_role;
       v_current_status public.app_account_status;
       v_rows_affected INT;
   BEGIN
       -- Guard A: Ensure exactly one matching user exists in auth.users with matching confirmed email
       SELECT COUNT(*) INTO v_auth_count
       FROM auth.users
       WHERE id = v_target_id
         AND lower(trim(email)) = lower(trim(v_expected_email))
         AND email_confirmed_at IS NOT NULL;

       IF v_auth_count <> 1 THEN
           RAISE EXCEPTION 'Target user (%) does not exist in auth.users, email mismatch with %, or email is not confirmed (found % rows). Promotion aborted.',
               v_target_id, v_expected_email, v_auth_count;
       END IF;

       -- Guard B: Ensure exactly one matching profile exists in public.profiles with matching email
       -- Uses FOR UPDATE row-level lock to prevent concurrent modifications/race conditions
       SELECT role, account_status INTO v_current_role, v_current_status
       FROM public.profiles
       WHERE id = v_target_id
         AND lower(trim(email)) = lower(trim(v_expected_email))
       FOR UPDATE;

       GET DIAGNOSTICS v_profile_count = ROW_COUNT;
       IF v_profile_count <> 1 THEN
           RAISE EXCEPTION 'Profile record does not exist or email does not match for user % in public.profiles (found % rows). User must complete first login/trigger creation.',
               v_target_id, v_profile_count;
       END IF;

       -- Guard C: Repeat-execution handling (safe idempotent re-execution)
       IF v_current_role = 'admin' AND v_current_status = 'active' THEN
           RAISE NOTICE 'Notice: User % (%) is already an active administrator. Re-affirming admin status.',
               v_target_id, v_expected_email;
       END IF;

       -- Guard D: Elevate strictly one account and assert exact row update
       UPDATE public.profiles
       SET role = 'admin',
           account_status = 'active'
       WHERE id = v_target_id;

       GET DIAGNOSTICS v_rows_affected = ROW_COUNT;
       IF v_rows_affected <> 1 THEN
           RAISE EXCEPTION 'Assertion failed: expected exactly 1 profile to be updated, but affected % rows. Rollback triggered.',
               v_rows_affected;
       END IF;

       RAISE NOTICE 'Successfully promoted user % (%) to admin role with active status (exactly 1 row updated).', v_target_id, v_expected_email;
   END $$;
   COMMIT;
   ```

### Safe Demotion Procedure (With Full Concurrency Invariant Lock)
Guarantees that two concurrent demotion transactions cannot race to demote all active administrators simultaneously:
```sql
BEGIN;
DO $$
DECLARE
    v_target_id UUID := '<VERIFIED_ADMIN_UUID>'::UUID;
    v_expected_email TEXT := 'admindashboard5@gmail.com';
    v_auth_count INT;
    v_profile_count INT;
    v_current_role public.app_user_role;
    v_current_status public.app_account_status;
    v_other_admins INT;
    v_rows_affected INT;
BEGIN
    -- Guard A: Ensure the UUID exists in auth.users with expected email
    SELECT COUNT(*) INTO v_auth_count
    FROM auth.users
    WHERE id = v_target_id
      AND lower(trim(email)) = lower(trim(v_expected_email));

    IF v_auth_count <> 1 THEN
        RAISE EXCEPTION 'Target user (%) does not exist in auth.users or email does not match % (found % rows). Demotion aborted.',
            v_target_id, v_expected_email, v_auth_count;
    END IF;

    -- Guard B: Concurrency Lock & Invariant Protection
    -- Lock all active administrator profile rows AND target in deterministic order (ORDER BY id).
    -- Deterministic ordering prevents PostgreSQL deadlocks.
    -- Locking all active admins serializes concurrent demotions and guarantees
    -- that two simultaneous demotions cannot race to remove the last active administrators.
    PERFORM id
    FROM public.profiles
    WHERE (role = 'admin' AND account_status = 'active') OR id = v_target_id
    ORDER BY id
    FOR UPDATE;

    -- Verify target profile exists with matching email
    SELECT role, account_status INTO v_current_role, v_current_status
    FROM public.profiles
    WHERE id = v_target_id
      AND lower(trim(email)) = lower(trim(v_expected_email));

    GET DIAGNOSTICS v_profile_count = ROW_COUNT;
    IF v_profile_count <> 1 THEN
        RAISE EXCEPTION 'Target profile does not exist in public.profiles for user % with email % (found % rows). Demotion aborted.',
            v_target_id, v_expected_email, v_profile_count;
    END IF;

    -- Guard C: Invariant Validation (Prevent demoting the last active administrator)
    SELECT COUNT(*) INTO v_other_admins
    FROM public.profiles
    WHERE role = 'admin'
      AND account_status = 'active'
      AND id <> v_target_id;

    IF v_other_admins = 0 AND v_current_role = 'admin' AND v_current_status = 'active' THEN
        RAISE EXCEPTION 'Cannot demote user % (%): this is the last remaining active administrator in the system. Demotion aborted.',
            v_target_id, v_expected_email;
    END IF;

    -- Guard D: Repeat-execution handling (safe idempotent re-execution)
    IF v_current_role = 'unassigned' AND v_current_status = 'pending_approval' THEN
        RAISE NOTICE 'Notice: User % (%) is already unassigned with pending approval status. Re-affirming status.',
            v_target_id, v_expected_email;
    END IF;

    -- Guard E: Demote strictly one account and assert exact row update
    UPDATE public.profiles
    SET role = 'unassigned',
        account_status = 'pending_approval'
    WHERE id = v_target_id;

    GET DIAGNOSTICS v_rows_affected = ROW_COUNT;
    IF v_rows_affected <> 1 THEN
        RAISE EXCEPTION 'Assertion failed: expected exactly 1 profile to be demoted, but affected % rows. Rollback triggered.',
            v_rows_affected;
    END IF;

    RAISE NOTICE 'Successfully demoted user % (%) to unassigned role with pending approval status.', v_target_id, v_expected_email;
END $$;
COMMIT;
```

### Break-Glass Emergency Operator Recovery Path
If all administrators are ever accidentally demoted or locked out, an operator with database administrative access (`postgres` superuser/admin role via Supabase SQL Editor or `psql`) can execute the Safe Admin Promotion Procedure (Section 9) using the verified UUID of `admindashboard5@gmail.com`.
The promotion procedure does NOT require an existing active administrator to execute; it operates directly against `auth.users` and `public.profiles` to restore the designated administrator safely.

---

## 6. Two-Session Concurrency Test Procedure (`supabase/tests/concurrency_proof.sql`)

> **Location & Safety**: Execute strictly on an isolated sandbox database or local PostgreSQL instance. **DO NOT run on production.**

### Test Scenario
1. **Setup**: Seed 2 active administrators: Admin 1 (`11111111-1111-1111-1111-111111111111`) and Admin 2 (`22222222-2222-2222-2222-222222222222`).
2. **Terminal 1 (Session A)**:
   - Begin transaction and execute demotion DO block for Admin 1.
   - Row-locks on both admin profiles are acquired (`ORDER BY id FOR UPDATE`).
   - Leave transaction **OPEN** (do NOT commit yet).
3. **Terminal 2 (Session B)**:
   - Begin transaction and attempt demotion DO block for Admin 2.
   - **Observed Behavior**: Terminal 2 immediately **BLOCKS** waiting for row-locks held by Session A. No deadlock occurs.
4. **Terminal 1 (Session A)**:
   - Execute `COMMIT;`.
5. **Terminal 2 (Session B)**:
   - **Observed Behavior**: Immediately unblocks upon Session A's commit.
   - Session B re-evaluates `v_other_admins = 0` under held lock.
   - Immediately aborts with:
     ```text
     ERROR: Cannot demote user 22222222-2222-2222-2222-222222222222: this is the last remaining active administrator in the system. Demotion aborted.
     ```
   - Execute `ROLLBACK;`.
6. **Assertion**: Query `test_profiles`. Exactly 1 active administrator (Admin 2) remains. The invariant is proven.

---

## 7. Login Audit Edge Function Security Verification

### Independent JWT Validation
When deployed with `--no-verify-jwt`:
```bash
supabase functions deploy record-login --no-verify-jwt
```
The Edge Function (`supabase/functions/record-login/index.ts`) enforces security independently inside the function body:
1. Validates presence of `Authorization: Bearer <token>` header (returns 401 if missing).
2. Initializes an unprivileged caller client using `SUPABASE_ANON_KEY` and calls `callerClient.auth.getUser()`. If the token is forged, expired, or invalid, Supabase Auth rejects it with 401.
3. Retrieves caller's profile via elevated `adminClient` and enforces fail-closed status:
   - If `account_status == 'suspended'`, returns 403.
   - If `account_status == 'pending_approval'` or `!= 'active'`, returns 403.
4. Derives provider exclusively from trusted `user.app_metadata.provider` or `identities` (client payload provider overrides are ignored).
5. Deduplicates rapid consecutive logins within a 15-second window.
6. The service-role key (`SUPABASE_SERVICE_ROLE_KEY`) is stored exclusively in Edge Function environment secrets and server backend environment. It is **NEVER** exposed to client browsers or returned in API responses.

---

## 8. Hardened Database Execution Runbook & Operator Evidence Table

Every step must be executed in order with prerequisites confirmed, exit codes captured, and success criteria met before proceeding.

| Step ID | Phase / Action | Prerequisite Check | Exact Command / Query | Success Criteria | Abort Condition | Required Evidence to Record | Recovery Action on Failure | Environment |
| :---: | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :---: |
| **DB-01** | **Pre-Migration Backup** | `$DATABASE_URL` set; disk space > 500MB | `pg_dump "$DATABASE_URL" --format=custom --blobs --verbose -f "pre_migration_backup_$(date +%Y%m%d_%H%M%S).dump"` | Exit code 0; file size > 0 bytes | Nonzero exit code; file size = 0 | Dump filename, file size, command exit code | Re-check credentials, verify disk space, retry | Target Database ($DATABASE_URL) |
| **DB-02** | **Archive Integrity List** | Dump file exists | `pg_restore --list pre_migration_backup_*.dump \| grep -E "(profiles\|login_history\|users\|role)"` | Table and type definitions listed in TOC | Missing table/enum entries | Grep match output listing entries | Re-run backup; do not proceed with migration | Local / Operator Host |
| **DB-03** | **Isolated Sandbox Restore Test** | Dump file passed DB-02 | `createdb finsight_restore_validation && pg_restore --dbname=finsight_restore_validation --no-owner pre_migration_backup_*.dump && psql -d finsight_restore_validation -c "SELECT count(*) FROM public.profiles;" && dropdb finsight_restore_validation` | Exit code 0; row counts match source; sandbox dropped | Restoration errors or table absence | Row counts reported; zero restore errors | Mark backup non-recoverable; resolve DB dump permissions | Isolated PostgreSQL Sandbox |
| **DB-04** | **Apply Migration SQL** | DB-01 through DB-03 passed | `psql -v ON_ERROR_STOP=1 "$DATABASE_URL" -f supabase/migrations/20251010_user_profiles_and_login_history.sql` | Output ends with `COMMIT`; exit code 0; zero errors | Exit code != 0; transaction rolls back | Sanitized stdout ending with COMMIT; exit code 0 | Fix offending SQL via forward-fix script; live DB unchanged due to transaction | Target Database ($DATABASE_URL) |
| **DB-05** | **Post-Migration Verification** | DB-04 committed successfully | `psql -v ON_ERROR_STOP=1 "$DATABASE_URL" -f supabase/verify_migration.sql` | All 8 groups output `[PASS]`; ends with `>>> SUCCESS...`; exit code 0 | `ASSERTION FAILED`; exit code != 0 | Full output showing 8 `[PASS]` notices; exit code 0 | Review specific failed assertion; forward-fix migration; re-run verification | Target Database ($DATABASE_URL) |
| **DB-06** | **Query Target Admin Account** | Target admin account created via signup | `SELECT id, email, email_confirmed_at FROM auth.users WHERE lower(trim(email)) = 'admindashboard5@gmail.com';` | Exactly 1 row returned; `email_confirmed_at IS NOT NULL` | 0 rows, multiple rows, or email unconfirmed | Copy exact UUID; record confirmed timestamp | Instruct user to register / confirm email via Supabase Auth | Target Database ($DATABASE_URL) |
| **DB-07** | **Promote Admin via Section 9** | Verified UUID from DB-06 | Execute Section 9 DO block with verified UUID in psql or SQL Editor | Output: `Successfully promoted user ... (exactly 1 row updated)` | Aborts with exception; affected rows != 1 | Notice text confirming promotion and 1 row updated | Check error message; verify profile exists; do NOT guess UUID | Target Database ($DATABASE_URL) |
| **DB-08** | **Deploy Edge Function** | Supabase CLI linked to target project | `supabase functions deploy record-login --no-verify-jwt` | Command outputs deployment success URL | Deployment error / auth failure | Function deployment URL & version ID | Check Supabase CLI login; verify project link; retry | Target Supabase Project |
| **DB-09** | **Live UI & Smoke Validation** | DB-07 and DB-08 completed | Log in as admin via UI; log in as standard user; attempt role update | Admin can access `/app/admin`; non-admin blocked (403/RLS); audit event recorded in `login_history` | Admin locked out; non-admin can elevate role | Screenshots / HTTP status codes for admin and non-admin flows | Review RLS policies; verify `is_admin()` function | Browser / Web Client |

---

## 9. Environment Separation Summary

| Capability / Check | Environment | Execution Authority |
| :--- | :--- | :--- |
| TypeScript Type Checking (`tsc --noEmit`) | Local Build Container | Automated (`npm run lint`) |
| App Compilation (`npm run build`) | Local Build Container | Automated (`compile_applet`) |
| Local Security & Logic Suite (`tests/security.test.ts`) | Local Build Container | Automated (`npx tsx tests/security.test.ts`) |
| Isolated Concurrency Proof (`supabase/tests/concurrency_proof.sql`) | Isolated Sandbox PostgreSQL | Operator via dual `psql` terminals |
| Disposable Sandbox Restore Test | Isolated Sandbox PostgreSQL | Operator via `createdb` / `pg_restore` |
| Live Pre-Migration Full Backup (`pg_dump`) | Main Database Host | Operator via terminal with `$DATABASE_URL` |
| Live Migration Execution (`psql -v ON_ERROR_STOP=1`) | Main Database Host | Operator via terminal with `$DATABASE_URL` |
| Live Verification Script (`verify_migration.sql`) | Main Database Host | Operator via terminal with `$DATABASE_URL` |
| Live Admin Promotion Procedure | Main Database Host | Operator via `psql` or Supabase SQL Editor |
| Edge Function Deployment (`record-login`) | Main Supabase Project | Operator via Supabase CLI |
| End-to-End Browser & API Smoke Testing | Main Web Client | Operator via Web Browser & DevTools |

