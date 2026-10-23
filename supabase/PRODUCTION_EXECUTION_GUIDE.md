# FinSight AI — Step-by-Step Production Database Execution Guide

**Target Supabase Project:** `ncfzjltffljconwihvpk` (`https://ncfzjltffljconwihvpk.supabase.co`)  
**Designated Platform Administrator:** `admindashboard5@gmail.com`  
**Verified Supabase Auth UUID:** `2a303ad4-1352-423a-b8d8-eccdde87de77`  
**Safety Mandate:** All migration files are wrapped in atomic transactions (`BEGIN ... COMMIT`). If an assertion fails, PostgreSQL automatically rolls back all changes without leaving partial or corrupted state.

---

## Pre-Execution Preparation & Verification

Before running any SQL, log in to your Supabase Dashboard:
1. Open [https://supabase.com/dashboard/project/ncfzjltffljconwihvpk](https://supabase.com/dashboard/project/ncfzjltffljconwihvpk).
2. Go to **Settings** > **Database** > **Backups** and verify an active backup exists, or create a manual snapshot.
3. Navigate to **SQL Editor** in the left navigation sidebar.
4. Run this pre-flight query to confirm the target administrator account exists and has a verified email:

```sql
SELECT id, email, email_confirmed_at, role 
FROM auth.users 
WHERE email = 'admindashboard5@gmail.com';
```
*Expected Result:*
- `id`: `2a303ad4-1352-423a-b8d8-eccdde87de77`
- `email`: `admindashboard5@gmail.com`
- `email_confirmed_at`: Not null (e.g. `2026-10-13 16:58:46.51596+00`)
- `role`: `authenticated`

---

## Step 1: Core Auth & Schema Migration

### 1. File Location
- In your project repository: `supabase/migrations/20261015_main_database_auth_production.sql`

### 2. How to Copy and Run
1. Open `supabase/migrations/20261015_main_database_auth_production.sql` in your IDE or text editor.
2. Select All (`Ctrl+A` or `Cmd+A`) and Copy (`Ctrl+C` or `Cmd+C`).
3. In the Supabase Dashboard, open **SQL Editor**, click **+ New query**, and name the tab `1. Core Auth Production Migration`.
4. Paste the SQL and click the green **Run** button (or press `Ctrl+Enter` / `Cmd+Enter`).

### 3. Preconditions to Check Before Clicking Run
- Ensure the active project selected in the dashboard is `ncfzjltffljconwihvpk`.
- Ensure no other DDL transactions or migrations are running concurrently.

### 4. Expected Result
- Status: **Success. No rows returned** (or execution notice logs).
- Notices: Logs displaying creation of enums, tables, indices, triggers, and the backfill completion message:
  `NOTICE: Finished existing auth users backfill. Processed X users.`
  `NOTICE: Zero unverified users were elevated to admin by migration.`

### 5. Read-Only Verification Query (Run Immediately After Step 1)
```sql
SELECT 
    (SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') AS profiles_table_exists,
    (SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'login_history') AS login_history_table_exists,
    (SELECT count(*) FROM public.profiles WHERE role = 'customer' AND account_status = 'active') AS active_customers,
    (SELECT count(*) FROM public.profiles WHERE role = 'admin') AS active_admins;
```
*Expected Result:*
- `profiles_table_exists`: `1`
- `login_history_table_exists`: `1`
- `active_customers`: `>= 1` (existing accounts initialized as `customer`)
- `active_admins`: `0` (guarantees zero unverified admin privilege escalation)

### 6. Failure Recovery & Troubleshooting
- **If an error occurs:** The script runs inside a transaction block (`BEGIN ... COMMIT`). If an assertion fails, the entire transaction is automatically rolled back. No partial tables or corrupted enums are created.
- **Common Cause:** Running with insufficient permissions. Ensure you are executing queries as the default project owner (`postgres`).

---

## Step 2: Assign Platform Administrator

### 1. File Location
- In your project repository: `supabase/migrations/20261015_assign_platform_administrator.sql`

### 2. How to Copy and Run
1. Open `supabase/migrations/20261015_assign_platform_administrator.sql`.
2. Select All and Copy.
3. In Supabase **SQL Editor**, click **+ New query** and name the tab `2. Assign Platform Administrator`.
4. Paste the SQL and click **Run**.

### 3. Preconditions to Check Before Clicking Run
- Confirm Step 1 succeeded and table `public.profiles` exists.
- The target user `admindashboard5@gmail.com` must have verified their email (`email_confirmed_at IS NOT NULL`).

### 4. Expected Result
- Status: **Success**.
- Messages tab displays:
  `NOTICE: SUCCESS: User 2a303ad4-1352-423a-b8d8-eccdde87de77 (admindashboard5@gmail.com) successfully designated as Platform Administrator (role=admin, account_status=active).`

### 5. Read-Only Verification Query (Run Immediately After Step 2)
```sql
SELECT 
    p.id,
    p.email,
    p.display_name,
    p.role::text AS application_role,
    p.account_status::text AS account_status,
    u.role AS supabase_internal_role
FROM public.profiles p
JOIN auth.users u ON u.id = p.id
WHERE p.email = 'admindashboard5@gmail.com';
```
*Expected Result:*
- `id`: `2a303ad4-1352-423a-b8d8-eccdde87de77`
- `application_role`: `admin`
- `account_status`: `active`
- `supabase_internal_role`: `authenticated` (**not** changed to `admin`)

### 6. Failure Recovery & Troubleshooting
- **If an error occurs:** Check the error message. If it says `PREREQUISITE MISSING: Table public.profiles does not exist`, re-run Step 1.
- If it says `Target user has not verified their email`, verify the email confirmation timestamp in `auth.users`.

---

## Step 3: Run Full Read-Only Verification Suite

### 1. File Location
- In your project repository: `supabase/migrations/20261015_main_database_auth_production_verify.sql`

### 2. How to Copy and Run
1. Open `supabase/migrations/20261015_main_database_auth_production_verify.sql`.
2. Select All and Copy.
3. In Supabase **SQL Editor**, click **+ New query** and name the tab `3. Verify Auth Production`.
4. Paste the SQL and click **Run**.

### 3. Preconditions to Check Before Clicking Run
- Both Step 1 and Step 2 must be completed.

### 4. Expected Result
- Status: **Success**.
- The Messages output displays passing assertions for all checks:
  ```
  [PASS] Enum public.app_user_role verified with 5 labels.
  [PASS] Enum public.app_account_status verified with 3 labels.
  [PASS] Table public.profiles verified with correct defaults.
  [PASS] Table public.login_history verified.
  [PASS] Audit and quarantine tables verified and strictly protected.
  [PASS] View public.user_profiles exists with verified security_invoker = true.
  [PASS] Row Level Security (RLS) and column-level restrictions verified on profiles and login_history.
  [PASS] All 13 security definer functions verified with fixed search_path = public, pg_temp.
  [PASS] Function ownership verified.
  [PASS] Routine execution permissions strictly enforced for all security functions.
  [PASS] All profile protection, login immutability, and auth.users lifecycle triggers verified.
  [PASS] All auth.users have corresponding public.profiles records.
  [PASS] Zero unverified users were automatically escalated to administrator.
  >>> ALL PRODUCTION PREFLIGHT SCHEMA ASSERTIONS PASSED SUCCESSFULLY!
  ```

### 5. Failure Recovery & Troubleshooting
- The script is strictly read-only and never modifies data.
- If any assertion fails, it halts immediately with `RAISE EXCEPTION` identifying the exact missing trigger, policy, or function.

---

## Step 4: Managing Roles in Supabase Table Editor

Once the above 3 steps are complete, manage user roles directly in the Supabase Dashboard:

### How to Edit a Role
1. In the Supabase Dashboard, click **Table Editor** in the left sidebar.
2. Select the **`profiles`** table in the `public` schema.
3. Locate the user you want to update (e.g. `customerdashboard8@gmail.com`).
4. Double-click the **`role`** cell. A dropdown menu appears with the valid options:
   - `admin` (Platform Administrator)
   - `business_analyst` (Senior Financial Analyst)
   - `risk_analyst` (Risk & Fraud Specialist)
   - `customer` (Personal Wealth Client)
   - `unassigned` (Pending Approval)
5. Select the desired role and press **Save** / click outside the cell.

### Security Guarantees & Safeguards
- **Ordinary Users Cannot Self-Promote:** Direct column update permissions on `role`, `account_status`, and `customer_id` are revoked from the `authenticated` role. Any client API call attempting to update `role` is blocked by PostgreSQL column permissions and reverted by the `trg_protect_profile_fields` trigger.
- **Accidental Lockout Protection:** The trigger `trg_protect_profile_fields` intercepts any attempt to demote or suspend the last active administrator. If an operator in Table Editor attempts to demote the sole active administrator, the database aborts the update with the error:
  `Cannot demote or deactivate user: this is the last remaining active administrator in the system. Operation aborted.`
- **Immediate Application Sync:** When a user logs in or makes their next API request, the FinSight AI server queries `public.profiles` directly, instantly applying the updated role and routing them to their respective dashboard (`/app/admin`, `/app/analyst`, `/app/risk`, or `/app/customer`).
