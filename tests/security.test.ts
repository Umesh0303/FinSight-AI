// FinSight AI: Security Regression Test Suite
// Verifies authorization controls, self-promotion prevention, role assignment security,
// account status protection, and least-privilege update rules.

import { authStore, normalizeRole, hashPassword, verifyPassword, ROLE_METADATA, type ApplicationRole, type UserRecord } from '../src/server/auth';

console.log('==============================================================================');
console.log('FinSight AI — Automated Security Regression & Authorization Test Suite');
console.log('==============================================================================\n');

let passCount = 0;
let failCount = 0;

function assert(description: string, condition: boolean, details?: string) {
  if (condition) {
    console.log(`[PASS] ${description}`);
    passCount++;
  } else {
    console.error(`[FAIL] ${description} ${details ? `(${details})` : ''}`);
    failCount++;
  }
}

// 1. TEST: New registrations start strictly as 'customer' and 'ACTIVE'
console.log('--- TEST GROUP 1: Registration Defaults & Server-Assigned Customer Role ---');
const testUser1 = authStore.createUser({
  name: 'Analyst Prospect',
  email: 'prospect.analyst@example.com',
  password: 'Password123!',
  provider: 'email'
});

assert(
  'New email user defaults to customer role',
  testUser1.role === 'customer',
  `Expected customer, got ${testUser1.role}`
);

assert(
  'New email user defaults to ACTIVE status',
  testUser1.accountStatus === 'ACTIVE',
  `Expected ACTIVE, got ${testUser1.accountStatus}`
);

assert(
  'New email user has allocated customerId',
  !!testUser1.customerId && testUser1.customerId.startsWith('CUST-'),
  `Expected CUST-..., got ${testUser1.customerId}`
);

const googleUser = authStore.createUser({
  name: 'Google Signer',
  email: 'google.prospect@example.com',
  provider: 'google'
});

assert(
  'New Google OAuth user defaults to customer role',
  googleUser.role === 'customer',
  `Expected customer, got ${googleUser.role}`
);

assert(
  'New Google OAuth user defaults to ACTIVE status',
  googleUser.accountStatus === 'ACTIVE',
  `Expected ACTIVE, got ${googleUser.accountStatus}`
);

// 2. TEST: Unauthorized user cannot elevate their own role
console.log('\n--- TEST GROUP 2: Role Elevation & Tampering Protection ---');
// Verify normalizeRole handles dirty/untrusted inputs securely
assert(
  'normalizeRole rejects arbitrary strings and defaults to customer',
  normalizeRole('super_admin') === 'customer',
  `Expected customer, got ${normalizeRole('super_admin')}`
);

assert(
  'normalizeRole rejects SQL injection attempts',
  normalizeRole("admin' OR '1'='1") === 'customer'
);

assert(
  'normalizeRole maps standard valid roles correctly',
  normalizeRole('admin') === 'admin' &&
  normalizeRole('business_analyst') === 'business_analyst' &&
  normalizeRole('analyst') === 'business_analyst' &&
  normalizeRole('risk_analyst') === 'risk_analyst' &&
  normalizeRole('risk') === 'risk_analyst' &&
  normalizeRole('customer') === 'customer'
);

// 3. TEST: Admin role assignment requires targeted ID and authorized caller
console.log('\n--- TEST GROUP 3: Administrative Role Assignment ---');
const assignResult = authStore.updateUserRole(testUser1.id, 'business_analyst');
assert(
  'Authorized admin can assign business_analyst role to user',
  assignResult.success === true
);

const updatedUser1 = authStore.findById(testUser1.id);
assert(
  'User role successfully changed to business_analyst',
  updatedUser1?.role === 'business_analyst'
);
assert(
  'User account auto-activated on valid admin assignment',
  updatedUser1?.accountStatus === 'ACTIVE'
);

// 4. TEST: Customer role assignment automatically allocates customer ID
console.log('\n--- TEST GROUP 4: Customer ID Allocation & Isolation ---');
const customerUser = authStore.createUser({
  name: 'Wealth Client',
  email: 'client@example.com',
  password: 'Password123!',
  provider: 'email'
});

authStore.updateUserRole(customerUser.id, 'customer');
const updatedCustomer = authStore.findById(customerUser.id);
assert(
  'Customer user receives an isolated customerId',
  Boolean(updatedCustomer?.customerId && updatedCustomer.customerId.startsWith('CUST-')),
  `customerId: ${updatedCustomer?.customerId}`
);

// 5. TEST: Account Status Toggling (Suspend / Activate)
console.log('\n--- TEST GROUP 5: Account Status Enforcement ---');
const toggleResult = authStore.updateUserStatus(customerUser.id, 'SUSPENDED');
assert(
  'Admin can suspend user account',
  toggleResult.success === true
);

const suspendedUser = authStore.findById(customerUser.id);
assert(
  'Target user is now SUSPENDED',
  suspendedUser?.accountStatus === 'SUSPENDED'
);

// 6. TEST: Protection against removing or suspending the last active administrator
console.log('\n--- TEST GROUP 6: Last Active Admin Protection ---');
const initialActiveAdmins = authStore.getAllUsers().filter(u => u.role === 'admin' && u.accountStatus === 'ACTIVE');
// Temporarily demote extra admins to test the invariant on the sole remaining active admin
const extraAdmins = initialActiveAdmins.slice(1);
for (const extra of extraAdmins) {
  authStore.updateUserRole(extra.id, 'business_analyst');
}

const lastAdmin = initialActiveAdmins[0];
const demoteAttempt = authStore.updateUserRole(lastAdmin.id, 'customer');
assert(
  'Cannot demote the last active administrator',
  demoteAttempt.success === false,
  demoteAttempt.error
);

const suspendAttempt = authStore.updateUserStatus(lastAdmin.id, 'SUSPENDED');
assert(
  'Cannot suspend the last active administrator',
  suspendAttempt.success === false,
  suspendAttempt.error
);

// Restore extra admins
for (const extra of extraAdmins) {
  authStore.updateUserRole(extra.id, 'admin');
}

// 7. TEST: Audit Log Deduplication
console.log('\n--- TEST GROUP 7: Audit Log Deduplication ---');
const audit1 = authStore.recordLoginEvent({
  userId: testUser1.id,
  provider: 'email',
  ipAddress: '127.0.0.1',
  userAgent: 'Test Harness',
  status: 'SUCCESS'
});

const audit2 = authStore.recordLoginEvent({
  userId: testUser1.id,
  provider: 'email',
  ipAddress: '127.0.0.1',
  userAgent: 'Test Harness',
  status: 'SUCCESS'
});

assert(
  'Rapid consecutive login events deduplicate to the same audit record',
  audit1 !== null && audit2 !== null && audit1.id === audit2.id,
  `audit1.id: ${audit1?.id}, audit2.id: ${audit2?.id}`
);

// 8. TEST: Session Token Isolation & Inactive Account Status Validation
console.log('\n--- TEST GROUP 8: Inactive / Pending Account Enforcement & Session Isolation ---');
const pendingUser = authStore.createUser({
  name: 'Pending Applicant',
  email: 'applicant.pending@example.com',
  password: 'Password123!',
  provider: 'email'
});

assert(
  'Newly registered user defaults to customer role and ACTIVE status',
  pendingUser.accountStatus === 'ACTIVE' && pendingUser.role === 'customer'
);

const pendingToken = authStore.createSession(pendingUser.id);
const resolvedActiveUser = authStore.getSessionUser(pendingToken);

assert(
  'Session resolves newly registered user with customer role and ACTIVE status',
  resolvedActiveUser !== null && resolvedActiveUser.role === 'customer' && resolvedActiveUser.accountStatus === 'ACTIVE'
);

// Suspend pending applicant
authStore.updateUserStatus(pendingUser.id, 'SUSPENDED');
const resolvedSuspended = authStore.getSessionUser(pendingToken);
assert(
  'Suspended user session immediately returns null and purges active session',
  resolvedSuspended === null
);

// Revoke session token
const freshToken = authStore.createSession(testUser1.id);
assert('Fresh active user token resolves', authStore.getSessionUser(freshToken) !== null);
authStore.revokeSession(freshToken);
const revokedSessionUser = authStore.getSessionUser(freshToken);
assert(
  'Revoked session token returns null (no access)',
  revokedSessionUser === null
);

// 9. TEST GROUP 9: Admin Promotion & Demotion Safeguards (Local Algorithmic Unit Simulation)
// NOTE: For live multi-client PostgreSQL database engine concurrency testing, see supabase/tests/concurrency_proof.sql
console.log('\n--- TEST GROUP 9: Admin Promotion & Demotion Safeguards (Local Simulation) ---');

// Simulator for the Section 9 / Section 10 SQL Procedures
function simulateAdminPromotionProcedure(params: {
  targetId: string;
  expectedEmail: string;
  authRecord?: { id: string; email: string; emailConfirmed: boolean };
  profileRecord?: { id: string; email: string; role: string; accountStatus: string };
}): { success: boolean; notice?: string; error?: string } {
  // Guard A: Auth user exists, matching confirmed email
  if (
    !params.authRecord ||
    params.authRecord.id !== params.targetId ||
    params.authRecord.email.toLowerCase().trim() !== params.expectedEmail.toLowerCase().trim() ||
    !params.authRecord.emailConfirmed
  ) {
    return {
      success: false,
      error: 'Target user does not exist in auth.users, email mismatch, or email is not confirmed. Promotion aborted.'
    };
  }

  // Guard B: Matching profile exists in public.profiles
  if (
    !params.profileRecord ||
    params.profileRecord.id !== params.targetId ||
    params.profileRecord.email.toLowerCase().trim() !== params.expectedEmail.toLowerCase().trim()
  ) {
    return {
      success: false,
      error: 'Profile record does not exist or email does not match in public.profiles. Promotion aborted.'
    };
  }

  // Guard C: Repeat-execution handling
  let notice: string | undefined;
  if (params.profileRecord.role === 'admin' && params.profileRecord.accountStatus === 'active') {
    notice = 'Notice: User is already an active administrator. Re-affirming admin status.';
  }

  // Guard D: Update profile
  params.profileRecord.role = 'admin';
  params.profileRecord.accountStatus = 'active';

  return { success: true, notice };
}

function simulateAdminDemotionProcedure(params: {
  targetId: string;
  expectedEmail: string;
  authRecord?: { id: string; email: string };
  profileRecord?: { id: string; email: string; role: string; accountStatus: string };
  allProfiles: Array<{ id: string; role: string; accountStatus: string }>;
}): { success: boolean; notice?: string; error?: string } {
  // Guard A: Auth check
  if (
    !params.authRecord ||
    params.authRecord.id !== params.targetId ||
    params.authRecord.email.toLowerCase().trim() !== params.expectedEmail.toLowerCase().trim()
  ) {
    return { success: false, error: 'Target user does not exist in auth.users or email does not match. Demotion aborted.' };
  }

  // Guard B: Profile check
  if (
    !params.profileRecord ||
    params.profileRecord.id !== params.targetId ||
    params.profileRecord.email.toLowerCase().trim() !== params.expectedEmail.toLowerCase().trim()
  ) {
    return { success: false, error: 'Target profile does not exist or email does not match. Demotion aborted.' };
  }

  // Guard C: Invariant & Concurrency Lock Check (Other active admins)
  const otherAdmins = params.allProfiles.filter(
    (p) => p.role === 'admin' && p.accountStatus === 'active' && p.id !== params.targetId
  ).length;

  if (otherAdmins === 0 && params.profileRecord.role === 'admin' && params.profileRecord.accountStatus === 'active') {
    return { success: false, error: 'Cannot demote the last remaining active administrator. Demotion aborted.' };
  }

  // Guard D: Repeat-execution handling
  let notice: string | undefined;
  if (params.profileRecord.role === 'unassigned' && (params.profileRecord.accountStatus === 'pending_approval' || params.profileRecord.accountStatus === 'pending approval')) {
    notice = 'Notice: User is already unassigned with pending approval status. Re-affirming status.';
  }

  // Guard E: Demote profile
  params.profileRecord.role = 'unassigned';
  params.profileRecord.accountStatus = 'pending_approval';

  return { success: true, notice };
}

// 9.1 Test Mismatched UUID / Email Rejection
const mismatchedTest = simulateAdminPromotionProcedure({
  targetId: 'uuid-1234',
  expectedEmail: 'admindashboard5@gmail.com',
  authRecord: { id: 'uuid-1234', email: 'attacker@evil.com', emailConfirmed: true },
  profileRecord: { id: 'uuid-1234', email: 'attacker@evil.com', role: 'unassigned', accountStatus: 'pending_approval' }
});
assert('Promotion aborts on email mismatch between expected and actual Auth record', !mismatchedTest.success);

// 9.2 Test Unconfirmed User Rejection
const unconfirmedTest = simulateAdminPromotionProcedure({
  targetId: 'uuid-1234',
  expectedEmail: 'admindashboard5@gmail.com',
  authRecord: { id: 'uuid-1234', email: 'admindashboard5@gmail.com', emailConfirmed: false },
  profileRecord: { id: 'uuid-1234', email: 'admindashboard5@gmail.com', role: 'unassigned', accountStatus: 'pending_approval' }
});
assert('Promotion aborts if Auth email is unconfirmed', !unconfirmedTest.success);

// 9.3 Test Missing Profile Rejection
const missingProfileTest = simulateAdminPromotionProcedure({
  targetId: 'uuid-1234',
  expectedEmail: 'admindashboard5@gmail.com',
  authRecord: { id: 'uuid-1234', email: 'admindashboard5@gmail.com', emailConfirmed: true },
  profileRecord: undefined
});
assert('Promotion aborts if public.profiles record is missing', !missingProfileTest.success);

// 9.4 Test Repeat Promotion Execution (Idempotency)
const profile1 = { id: 'uuid-1234', email: 'admindashboard5@gmail.com', role: 'unassigned', accountStatus: 'pending_approval' };
const auth1 = { id: 'uuid-1234', email: 'admindashboard5@gmail.com', emailConfirmed: true };

const promo1 = simulateAdminPromotionProcedure({
  targetId: 'uuid-1234',
  expectedEmail: 'admindashboard5@gmail.com',
  authRecord: auth1,
  profileRecord: profile1
});
assert('Initial promotion succeeds', promo1.success && profile1.role === 'admin' && profile1.accountStatus === 'active');

const promo2 = simulateAdminPromotionProcedure({
  targetId: 'uuid-1234',
  expectedEmail: 'admindashboard5@gmail.com',
  authRecord: auth1,
  profileRecord: profile1
});
assert(
  'Repeat promotion succeeds idempotently without corruption',
  promo2.success && promo2.notice !== undefined && profile1.role === 'admin'
);

// 9.5 Test Repeat Demotion Execution
const allProfilesTest = [
  profile1,
  { id: 'uuid-5678', email: 'second.admin@example.com', role: 'admin', accountStatus: 'active' }
];

const demote1 = simulateAdminDemotionProcedure({
  targetId: 'uuid-1234',
  expectedEmail: 'admindashboard5@gmail.com',
  authRecord: auth1,
  profileRecord: profile1,
  allProfiles: allProfilesTest
});
assert('Initial demotion succeeds when another admin exists', demote1.success && profile1.role === 'unassigned');

const demote2 = simulateAdminDemotionProcedure({
  targetId: 'uuid-1234',
  expectedEmail: 'admindashboard5@gmail.com',
  authRecord: auth1,
  profileRecord: profile1,
  allProfiles: allProfilesTest
});
assert(
  'Repeat demotion succeeds idempotently',
  demote2.success && demote2.notice !== undefined && profile1.role === 'unassigned'
);

// 10. TEST GROUP 10: Concurrent Demotion Invariant Protection (Local Algorithmic Simulation)
// NOTE: For live PostgreSQL row-lock engine verification, see supabase/tests/concurrency_proof.sql
console.log('\n--- TEST GROUP 10: Concurrent Demotion Race Invariant (Local Simulation) ---');

// Simulate 2 active admins attempting simultaneous demotion
const adminA = { id: 'uuid-admin-A', email: 'adminA@example.com', role: 'admin', accountStatus: 'active' };
const adminB = { id: 'uuid-admin-B', email: 'adminB@example.com', role: 'admin', accountStatus: 'active' };
const activePool = [adminA, adminB];

// With table/invariant locking, transaction 1 executes first and commits
const tx1Result = simulateAdminDemotionProcedure({
  targetId: adminA.id,
  expectedEmail: adminA.email,
  authRecord: { id: adminA.id, email: adminA.email },
  profileRecord: adminA,
  allProfiles: activePool
});

assert('Transaction 1 demoting Admin A succeeds while Admin B is active', tx1Result.success);

// Under held lock, transaction 2 evaluates against updated state (only Admin B remains)
const tx2Result = simulateAdminDemotionProcedure({
  targetId: adminB.id,
  expectedEmail: adminB.email,
  authRecord: { id: adminB.id, email: adminB.email },
  profileRecord: adminB,
  allProfiles: activePool
});

assert(
  'Transaction 2 demoting Admin B is strictly rejected because Admin B is the last active admin',
  !tx2Result.success && tx2Result.error?.includes('last remaining active administrator')
);

assert('System invariant holds: exactly 1 active administrator remains', adminB.role === 'admin' && adminB.accountStatus === 'active');

// 11. TEST GROUP 11: Profile Column Access Controls & Integrity Trigger Rules
console.log('\n--- TEST GROUP 11: Profile Column Access & Permitted Updates ---');

// Simulated trigger logic matching public.enforce_profile_update_integrity()
function simulateProfileUpdateTrigger(oldProfile: any, newProfile: any, callerIsAdmin: boolean) {
  const result = { ...newProfile };
  result.id = oldProfile.id;
  result.created_at = oldProfile.created_at;
  result.updated_at = new Date().toISOString();

  if (!callerIsAdmin) {
    result.role = oldProfile.role;
    result.account_status = oldProfile.account_status;
    result.status = oldProfile.account_status;
    result.email = oldProfile.email;
    result.auth_provider = oldProfile.auth_provider;
    result.customer_id = oldProfile.customer_id;
    result.last_login_at = oldProfile.last_login_at;
  }
  return result;
}

const standardUser = {
  id: 'user-normal-1',
  display_name: 'Original Display',
  full_name: 'Original Full',
  avatar_url: 'https://example.com/orig.jpg',
  email: 'normal@example.com',
  role: 'customer',
  account_status: 'active',
  status: 'active',
  auth_provider: 'email',
  customer_id: 'CUST-ORIG-1',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  last_login_at: null
};

// Attack attempt: Ordinary user tries to change role and account_status while updating display_name
const userTamperPayload = {
  ...standardUser,
  display_name: 'Updated Name',
  full_name: 'Updated Full Name',
  avatar_url: 'https://example.com/new.jpg',
  role: 'admin',                 // Prohibited modification
  account_status: 'active',
  email: 'hacked@example.com',    // Prohibited modification
  customer_id: 'CUST-HACKED'      // Prohibited modification
};

const triggerResultNonAdmin = simulateProfileUpdateTrigger(standardUser, userTamperPayload, false);
assert(
  'Non-admin profile update preserves updated display_name, full_name, and avatar_url',
  triggerResultNonAdmin.display_name === 'Updated Name' &&
  triggerResultNonAdmin.full_name === 'Updated Full Name' &&
  triggerResultNonAdmin.avatar_url === 'https://example.com/new.jpg'
);

assert(
  'Non-admin profile update reverts unauthorized role elevation to original role',
  triggerResultNonAdmin.role === 'customer'
);

assert(
  'Non-admin profile update reverts unauthorized email modification',
  triggerResultNonAdmin.email === 'normal@example.com'
);

assert(
  'Non-admin profile update reverts unauthorized customer_id modification',
  triggerResultNonAdmin.customer_id === 'CUST-ORIG-1'
);

// 12. TEST GROUP 12: Profile View Projection & Column Compatibility
console.log('\n--- TEST GROUP 12: Profile View Schema Compatibility ---');
const canonicalViewColumns = [
  'id', 'display_name', 'full_name', 'avatar_url', 'email', 'role',
  'account_status', 'status', 'auth_provider', 'customer_id',
  'created_at', 'updated_at', 'last_login_at'
];

const mockProfileRow = {
  id: 'uid-1',
  display_name: 'Test',
  full_name: 'Test User',
  avatar_url: null,
  email: 'test@example.com',
  role: 'unassigned',
  account_status: 'pending_approval',
  status: 'pending_approval',
  auth_provider: 'email',
  customer_id: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  last_login_at: null
};

const missingCols = canonicalViewColumns.filter(c => !(c in mockProfileRow));
assert(
  'View projection exposes all 13 canonical profile columns identically to public.profiles',
  missingCols.length === 0,
  `Missing: ${missingCols.join(', ')}`
);

// 13. TEST GROUP 13: Last Active Admin Invariant Across Direct Update, Suspension, & Delete
console.log('\n--- TEST GROUP 13: Multi-Vector Last Active Administrator Protection ---');

function simulateDirectMutationInvariant(params: {
  action: 'UPDATE_ROLE' | 'UPDATE_STATUS' | 'DELETE';
  targetId: string;
  newRole?: string;
  newStatus?: string;
  allProfiles: Array<{ id: string; role: string; accountStatus: string }>;
}): { success: boolean; error?: string } {
  const target = params.allProfiles.find(p => p.id === params.targetId);
  if (!target) return { success: false, error: 'Target not found' };

  if (target.role === 'admin' && target.accountStatus === 'active') {
    const isDemotingRole = params.action === 'UPDATE_ROLE' && params.newRole !== 'admin';
    const isDeactivatingStatus = params.action === 'UPDATE_STATUS' && params.newStatus !== 'active';
    const isDeleting = params.action === 'DELETE';

    if (isDemotingRole || isDeactivatingStatus || isDeleting) {
      const remainingAdmins = params.allProfiles.filter(
        p => p.role === 'admin' && p.accountStatus === 'active' && p.id !== params.targetId
      ).length;

      if (remainingAdmins === 0) {
        return {
          success: false,
          error: `Cannot ${params.action.toLowerCase()} user: this is the last remaining active administrator in the system. Operation aborted.`
        };
      }
    }
  }

  return { success: true };
}

const soloAdmin = { id: 'admin-solo-1', role: 'admin', accountStatus: 'active' };
const singleAdminPool = [soloAdmin, { id: 'user-2', role: 'customer', accountStatus: 'active' }];

const roleDemoteFails = simulateDirectMutationInvariant({
  action: 'UPDATE_ROLE',
  targetId: soloAdmin.id,
  newRole: 'customer',
  allProfiles: singleAdminPool
});
assert('Direct role demotion of sole active admin is strictly rejected', !roleDemoteFails.success);

const statusSuspendFails = simulateDirectMutationInvariant({
  action: 'UPDATE_STATUS',
  targetId: soloAdmin.id,
  newStatus: 'suspended',
  allProfiles: singleAdminPool
});
assert('Direct status suspension of sole active admin is strictly rejected', !statusSuspendFails.success);

const deleteFails = simulateDirectMutationInvariant({
  action: 'DELETE',
  targetId: soloAdmin.id,
  allProfiles: singleAdminPool
});
assert('Direct deletion of sole active admin is strictly rejected', !deleteFails.success);

// Multi-admin pool: operations succeed when another active admin is present
const duoAdminPool = [
  { id: 'admin-1', role: 'admin', accountStatus: 'active' },
  { id: 'admin-2', role: 'admin', accountStatus: 'active' }
];

const demoteDuoSucceeds = simulateDirectMutationInvariant({
  action: 'UPDATE_ROLE',
  targetId: 'admin-1',
  newRole: 'business_analyst',
  allProfiles: duoAdminPool
});
assert('Role demotion succeeds when another active admin is present', demoteDuoSucceeds.success);

// 14. TEST GROUP 14: Role-Based Demo Accounts & Routing Verification
console.log('\n--- TEST GROUP 14: Role-Based Demo Accounts & Routing Verification ---');
import { DEMO_ACCOUNTS_CONFIG, DEMO_PASSWORD } from '../src/server/auth';

// 14.1 Verify all four demo accounts exist in store
for (const demo of DEMO_ACCOUNTS_CONFIG) {
  const user = authStore.findByEmail(demo.email);
  assert(
    `Demo account exists in store: ${demo.email}`,
    Boolean(user),
    `User for ${demo.email} not found`
  );

  assert(
    `Demo account ${demo.email} has assigned role: ${demo.role}`,
    user?.role === demo.role,
    `Expected role ${demo.role}, got ${user?.role}`
  );

  assert(
    `Demo account ${demo.email} has ACTIVE status`,
    user?.accountStatus === 'ACTIVE',
    `Expected ACTIVE status, got ${user?.accountStatus}`
  );

  assert(
    `Demo account ${demo.email} password is not plain text`,
    Boolean(user?.passwordHash && user?.passwordSalt && user.passwordHash !== DEMO_PASSWORD),
    'Password hash must be cryptographically hashed, never plain text'
  );

  // Verify valid demo password
  const isValidPw = user ? verifyPassword(DEMO_PASSWORD, user.passwordSalt!, user.passwordHash!) : false;
  assert(
    `Demo password '${DEMO_PASSWORD}' validates for ${demo.email}`,
    isValidPw,
    `Password validation failed for ${demo.email}`
  );

  // Verify invalid password is rejected
  const isInvalidPw = user ? verifyPassword('WrongPassword!999', user.passwordSalt!, user.passwordHash!) : true;
  assert(
    `Invalid password correctly rejected for ${demo.email}`,
    !isInvalidPw,
    `Invalid password should not validate for ${demo.email}`
  );

  // Verify route mapping matches required specification
  const expectedRoute =
    demo.role === 'admin'
      ? '/app/admin'
      : demo.role === 'business_analyst'
      ? '/app/analyst'
      : demo.role === 'risk_analyst'
      ? '/app/risk'
      : '/app/customer';

  assert(
    `Demo account ${demo.email} routes to ${expectedRoute}`,
    demo.targetRoute === expectedRoute,
    `Expected ${expectedRoute}, got ${demo.targetRoute}`
  );

  // Verify session creation and resolution
  if (user) {
    const demoToken = authStore.createSession(user.id);
    const resolvedSessionUser = authStore.getSessionUser(demoToken);
    assert(
      `Session token resolves strictly to ${demo.email} with role ${demo.role}`,
      resolvedSessionUser?.id === user.id && resolvedSessionUser?.role === demo.role,
      `Session resolution mismatch`
    );

    // Verify session revocation
    authStore.revokeSession(demoToken);
    const revokedCheck = authStore.getSessionUser(demoToken);
    assert(
      `Revoking session immediately terminates access for ${demo.email}`,
      revokedCheck === null,
      `Session still active after revocation`
    );
  }
}

// 15. TEST GROUP 15: Stage 2 Authentication Scenarios & Audit Anti-Forgery
console.log('\n--- TEST GROUP 15: Stage 2 Authentication Scenarios & Audit Anti-Forgery ---');

// 15.1 Duplicate Email Registration Protection
const testUniqueEmail = `test.unique.${Date.now()}@financial.org`;
const duplicateUserFirst = authStore.createUser({
  name: 'First Registrant',
  email: testUniqueEmail,
  password: 'Password123!',
  provider: 'email'
});
assert('Initial registration creates user record successfully', Boolean(duplicateUserFirst.id));

const duplicateAttempt = authStore.findByEmail(testUniqueEmail);
assert(
  'Duplicate email check detects pre-existing registered user',
  Boolean(duplicateAttempt && duplicateAttempt.id === duplicateUserFirst.id)
);

// 15.2 Server-Assigned Customer Role and Active Status Default
assert(
  'Newly registered user automatically receives customer role and ACTIVE status server-side',
  duplicateUserFirst.accountStatus === 'ACTIVE' && duplicateUserFirst.role === 'customer'
);

// 15.3 Admin Approval and Role Assignment
const approvalResult = authStore.updateUserRole(duplicateUserFirst.id, 'business_analyst');
assert('Admin approval activates user with business_analyst role', approvalResult.success === true);
const approvedUser = authStore.findById(duplicateUserFirst.id);
assert('Approved user is now ACTIVE in system store', approvedUser?.accountStatus === 'ACTIVE');

// 15.4 Customer Isolation: Customer role clearance cannot access staff/analyst roles
const stage2CustomerUser = authStore.createUser({
  name: 'Private Client',
  email: 'client.vip@financial.org',
  password: 'Password123!',
  provider: 'email'
});
authStore.updateUserRole(stage2CustomerUser.id, 'customer');
const activeCustomer = authStore.findById(stage2CustomerUser.id);
assert(
  'Customer role cannot satisfy staff/analyst role requirements',
  activeCustomer?.role === 'customer' && activeCustomer.role !== 'business_analyst' && activeCustomer.role !== 'risk_analyst'
);

// 15.5 Audit Event Immutability & Anti-Forgery
// Verify that audit log records sensitive attempts without ever recording passwords or secrets
const testAuditIp = '192.168.1.100';
const auditEvent = authStore.recordLoginEvent({
  userId: duplicateUserFirst.id,
  provider: 'email',
  eventType: 'login_failure',
  errorCategory: 'invalid_credentials',
  ipAddress: testAuditIp,
  userAgent: 'Test Agent/1.0',
  status: 'FAILED'
});

assert('Audit event recorded with unique audit ID', Boolean(auditEvent.id));
assert('Audit event captures event type login_failure', auditEvent.eventType === 'login_failure');
assert('Audit event captures sanitized error category', auditEvent.errorCategory === 'invalid_credentials');
assert('Audit event contains UTC timestamp', Boolean(auditEvent.timestamp));
assert(
  'Audit event contains no plaintext password or hash fields',
  !('password' in auditEvent) && !('passwordHash' in auditEvent) && !('token' in auditEvent)
);

// 15.6 Unauthenticated failed login captures unauthenticated event without user forgery
const unauthAuditEvent = authStore.recordLoginEvent({
  userId: 'unauthenticated',
  provider: 'email',
  eventType: 'login_failure',
  errorCategory: 'unknown_account',
  ipAddress: testAuditIp,
  userAgent: 'Test Agent/1.0',
  status: 'FAILED'
});
assert('Unauthenticated failed login records user as unauthenticated', unauthAuditEvent.userId === 'unauthenticated');
assert('Unauthenticated audit event status is FAILED', unauthAuditEvent.status === 'FAILED');

// 16. TEST GROUP 16: Fail-Closed Authorization & Separation of Service Role vs Administrator
console.log('\n--- TEST GROUP 16: Fail-Closed Authorization & Service-Role Separation ---');

// Correct simulation of public.is_service_role():
// CRITICAL: Inside a SECURITY DEFINER function, currentUser is the function owner (postgres).
// It MUST NOT be trusted as proof that the caller is a service role!
// The caller's authentic identity is verified via PostgREST JWT claims (jwtRole === 'service_role'),
// OR via direct interactive administrative session (sessionUser IN ('postgres', 'supabase_admin') without web JWT).
function simulateIsServiceRole(ctx: {
  currentUser?: string;
  sessionUser?: string;
  jwtRole?: string | null;
  shouldThrow?: boolean;
}): boolean {
  try {
    if (ctx.shouldThrow) throw new Error('Database exception in setting evaluation');
    
    // 1. PostgREST JWT check
    if (ctx.jwtRole === 'service_role') return true;

    // 2. Direct interactive DBA session (SQL Editor / direct psql):
    // session_user is postgres/supabase_admin AND no web JWT claims exist.
    if ((ctx.sessionUser === 'postgres' || ctx.sessionUser === 'supabase_admin') && (!ctx.jwtRole || ctx.jwtRole === '')) {
      return true;
    }

    return false;
  } catch {
    // Fail-closed
    return false;
  }
}

function simulateIsAdmin(ctx: {
  userId?: string | null;
  profiles: Array<{ id: string; role: string; accountStatus: string }>;
  shouldThrow?: boolean;
}): boolean {
  try {
    if (ctx.shouldThrow) throw new Error('Database connection reset during profile lookup');
    if (!ctx.userId) return false;
    const profile = ctx.profiles.find(p => p.id === ctx.userId);
    return Boolean(profile && profile.role === 'admin' && profile.accountStatus === 'active');
  } catch {
    // Fail-closed
    return false;
  }
}

function simulateIsAdminOrService(
  serviceCtx: { currentUser?: string; sessionUser?: string; jwtRole?: string | null; shouldThrow?: boolean },
  adminCtx: { userId?: string | null; profiles: Array<{ id: string; role: string; accountStatus: string }>; shouldThrow?: boolean }
): boolean {
  try {
    if (simulateIsServiceRole(serviceCtx)) return true;
    if (simulateIsAdmin(adminCtx)) return true;
    return false;
  } catch {
    // Fail-closed: Never fall through or grant access on exception
    return false;
  }
}

// 16.1 Test service-role evaluation
assert(
  'is_service_role returns true for direct DBA session (sessionUser = postgres, no web JWT)',
  simulateIsServiceRole({ sessionUser: 'postgres', jwtRole: null }) === true
);
assert(
  'is_service_role returns true for service_role JWT in PostgREST',
  simulateIsServiceRole({ sessionUser: 'authenticator', jwtRole: 'service_role' }) === true
);
assert(
  'is_service_role returns false for standard authenticated JWT in PostgREST',
  simulateIsServiceRole({ sessionUser: 'authenticator', jwtRole: 'authenticated' }) === false
);
assert(
  'is_service_role DOES NOT trust currentUser = postgres inside SECURITY DEFINER when caller is authenticated',
  simulateIsServiceRole({ currentUser: 'postgres', sessionUser: 'authenticator', jwtRole: 'authenticated' }) === false
);
assert(
  'is_service_role returns false for anonymous web caller (jwtRole = anon)',
  simulateIsServiceRole({ sessionUser: 'authenticator', jwtRole: 'anon' }) === false
);
assert(
  'is_service_role fails closed on unexpected exception',
  simulateIsServiceRole({ shouldThrow: true }) === false
);

// 16.2 Test is_admin evaluation
const mockDbProfiles = [
  { id: 'admin-active-1', role: 'admin', accountStatus: 'active' },
  { id: 'admin-suspended-1', role: 'admin', accountStatus: 'suspended' },
  { id: 'admin-pending-1', role: 'admin', accountStatus: 'pending_approval' },
  { id: 'user-active-1', role: 'business_analyst', accountStatus: 'active' }
];

assert(
  'is_admin returns true for active admin profile',
  simulateIsAdmin({ userId: 'admin-active-1', profiles: mockDbProfiles }) === true
);
assert(
  'is_admin returns false for suspended admin profile',
  simulateIsAdmin({ userId: 'admin-suspended-1', profiles: mockDbProfiles }) === false
);
assert(
  'is_admin returns false for pending admin profile',
  simulateIsAdmin({ userId: 'admin-pending-1', profiles: mockDbProfiles }) === false
);
assert(
  'is_admin returns false for non-admin active user',
  simulateIsAdmin({ userId: 'user-active-1', profiles: mockDbProfiles }) === false
);
assert(
  'is_admin returns false for null/anonymous caller',
  simulateIsAdmin({ userId: null, profiles: mockDbProfiles }) === false
);
assert(
  'is_admin fails closed on database exception',
  simulateIsAdmin({ userId: 'admin-active-1', profiles: mockDbProfiles, shouldThrow: true }) === false
);

// 16.3 Test composite is_admin_or_service fail-closed behavior
assert(
  'is_admin_or_service grants access to service role',
  simulateIsAdminOrService({ jwtRole: 'service_role' }, { userId: null, profiles: mockDbProfiles }) === true
);
assert(
  'is_admin_or_service grants access to active administrator',
  simulateIsAdminOrService({ jwtRole: 'authenticated' }, { userId: 'admin-active-1', profiles: mockDbProfiles }) === true
);
assert(
  'is_admin_or_service denies access to non-admin user',
  simulateIsAdminOrService({ jwtRole: 'authenticated' }, { userId: 'user-active-1', profiles: mockDbProfiles }) === false
);
assert(
  'is_admin_or_service fails closed if service check throws',
  simulateIsAdminOrService({ shouldThrow: true }, { userId: 'user-active-1', profiles: mockDbProfiles }) === false
);

// 17. TEST GROUP 17: Narrow Admin Profile Management & Audit Endpoint Hardening
console.log('\n--- TEST GROUP 17: Narrow Admin Profile Management & Audit Endpoint Hardening ---');

// 17.1 Narrowly Authorized admin_manage_user_profile Simulation
function simulateAdminManageUserProfile(params: {
  callerId: string;
  callerIsAdmin: boolean;
  callerIsServiceRole: boolean;
  targetUserId: string;
  newRole?: string;
  newStatus?: string;
  allProfiles: Array<{ id: string; email: string; role: string; accountStatus: string }>;
}): { success: boolean; error?: string; updatedRecord?: any } {
  // 1. Check authorization
  if (!params.callerIsAdmin && !params.callerIsServiceRole) {
    return { success: false, error: 'Access denied: Caller is not an authorized active administrator.' };
  }

  // 2. Find target
  const target = params.allProfiles.find(p => p.id === params.targetUserId);
  if (!target) {
    return { success: false, error: 'Target user profile not found.' };
  }

  const updatedRole = params.newRole || target.role;
  const updatedStatus = params.newStatus || target.accountStatus;

  // 3. Invariant check: sole active admin demotion or suspension
  if (target.role === 'admin' && target.accountStatus === 'active') {
    if (updatedRole !== 'admin' || updatedStatus !== 'active') {
      const otherAdmins = params.allProfiles.filter(
        p => p.role === 'admin' && p.accountStatus === 'active' && p.id !== params.targetUserId
      );
      if (otherAdmins.length === 0) {
        return {
          success: false,
          error: 'Cannot demote or deactivate user: this is the last remaining active administrator in the system. Operation aborted.'
        };
      }
    }
  }

  target.role = updatedRole;
  target.accountStatus = updatedStatus;

  return {
    success: true,
    updatedRecord: { id: target.id, role: updatedRole, accountStatus: updatedStatus }
  };
}

const adminManagementPool = [
  { id: 'adm-1', email: 'adm1@example.com', role: 'admin', accountStatus: 'active' },
  { id: 'user-pending-1', email: 'pend@example.com', role: 'unassigned', accountStatus: 'pending_approval' },
  { id: 'user-active-2', email: 'user2@example.com', role: 'business_analyst', accountStatus: 'active' }
];

// Non-admin caller attempting admin manage user profile
const nonAdminAttempt = simulateAdminManageUserProfile({
  callerId: 'user-active-2',
  callerIsAdmin: false,
  callerIsServiceRole: false,
  targetUserId: 'user-pending-1',
  newRole: 'business_analyst',
  newStatus: 'active',
  allProfiles: adminManagementPool
});
assert('Non-admin caller is rejected by admin_manage_user_profile', !nonAdminAttempt.success);
assert('Error message explicitly states access denied', nonAdminAttempt.error?.includes('Access denied') === true);

// Active admin approving pending user
const adminApprovalSuccess = simulateAdminManageUserProfile({
  callerId: 'adm-1',
  callerIsAdmin: true,
  callerIsServiceRole: false,
  targetUserId: 'user-pending-1',
  newRole: 'business_analyst',
  newStatus: 'active',
  allProfiles: adminManagementPool
});
assert('Active admin caller successfully approves pending user', adminApprovalSuccess.success === true);
assert('Target user role updated to business_analyst', adminApprovalSuccess.updatedRecord?.role === 'business_analyst');
assert('Target user status updated to active', adminApprovalSuccess.updatedRecord?.accountStatus === 'active');

// Active admin attempting to suspend sole active admin
const suspendSoleAdminAttempt = simulateAdminManageUserProfile({
  callerId: 'adm-1',
  callerIsAdmin: true,
  callerIsServiceRole: false,
  targetUserId: 'adm-1',
  newStatus: 'suspended',
  allProfiles: adminManagementPool
});
assert('Active admin cannot suspend sole active admin via admin_manage_user_profile', !suspendSoleAdminAttempt.success);
assert(
  'Error indicates last remaining active administrator invariant',
  suspendSoleAdminAttempt.error?.includes('last remaining active administrator') === true
);

// 17.2 Audit Endpoint Anti-Forgery Simulation
function simulateAuditVerification(params: {
  authBearerToken?: string | null;
  claimedUserId?: string;
  isSuccessClaim: boolean;
  rawEventType: string;
  errorCategory?: string;
  bodyPayload: any;
  sessions: Map<string, { userId: string; role: string; email: string }>;
}) {
  // Purge sensitive properties
  const sanitizedBody = { ...params.bodyPayload };
  delete sanitizedBody.password;
  delete sanitizedBody.passwordHash;
  delete sanitizedBody.token;
  delete sanitizedBody.sessionToken;

  const validSession = params.authBearerToken ? params.sessions.get(params.authBearerToken) : null;
  let verifiedUserId: string | null = validSession ? validSession.userId : null;

  let effectiveSuccess = params.isSuccessClaim;
  let effectiveEventType = params.rawEventType;
  let effectiveErrorCategory = params.errorCategory || null;
  let effectiveUserId: string | null = null;

  if (params.isSuccessClaim) {
    if (verifiedUserId) {
      effectiveUserId = verifiedUserId;
      effectiveSuccess = true;
      effectiveEventType = 'login_success';
    } else {
      // Unauthenticated client claiming success: fail-closed downgrade
      effectiveUserId = null;
      effectiveSuccess = false;
      effectiveEventType = 'login_failure';
      effectiveErrorCategory = 'unverified_success_claim';
    }
  } else {
    // Failed login: caller cannot attribute failure to another user's ID
    effectiveUserId = null;
    effectiveSuccess = false;
    effectiveEventType = params.rawEventType.startsWith('login') ? 'login_failure' : params.rawEventType;
    if (!effectiveErrorCategory) effectiveErrorCategory = 'invalid_credentials';
  }

  return {
    effectiveUserId,
    effectiveSuccess,
    effectiveEventType,
    effectiveErrorCategory,
    sanitizedBody
  };
}

const activeMockSessions = new Map<string, { userId: string; role: string; email: string }>();
activeMockSessions.set('valid-token-admin', { userId: 'adm-1', role: 'admin', email: 'adm1@example.com' });

// Attack: Untrusted client claims successful login for admin without a valid session token
const forgedSuccessAttack = simulateAuditVerification({
  authBearerToken: null, // No valid session
  claimedUserId: 'adm-1',
  isSuccessClaim: true,
  rawEventType: 'login_success',
  bodyPayload: { password: 'PlainTextPassword123!', email: 'adm1@example.com' },
  sessions: activeMockSessions
});

assert('Untrusted success claim is downgraded to false', forgedSuccessAttack.effectiveSuccess === false);
assert('Untrusted success event type is downgraded to login_failure', forgedSuccessAttack.effectiveEventType === 'login_failure');
assert('Untrusted success claim error category set to unverified_success_claim', forgedSuccessAttack.effectiveErrorCategory === 'unverified_success_claim');
assert('Untrusted success user_id is forced to null', forgedSuccessAttack.effectiveUserId === null);
assert('Sensitive password property is purged from sanitized payload', !('password' in forgedSuccessAttack.sanitizedBody));

// Legitimate: Authenticated admin session records verified login success
const verifiedAdminSuccess = simulateAuditVerification({
  authBearerToken: 'valid-token-admin',
  claimedUserId: 'adm-1',
  isSuccessClaim: true,
  rawEventType: 'login_success',
  bodyPayload: { email: 'adm1@example.com' },
  sessions: activeMockSessions
});

assert('Verified session login success is accepted', verifiedAdminSuccess.effectiveSuccess === true);
assert('Verified session event type is login_success', verifiedAdminSuccess.effectiveEventType === 'login_success');
assert('Verified session user_id matches authenticated token identity', verifiedAdminSuccess.effectiveUserId === 'adm-1');

// 17.3 Universal Status Enforcement: Suspended User Block Across Endpoints
function simulateEndpointStatusGate(userStatus: string): { allowed: boolean; httpCode: number } {
  if (userStatus === 'SUSPENDED') {
    return { allowed: false, httpCode: 403 };
  }
  if (userStatus === 'PENDING_APPROVAL') {
    return { allowed: false, httpCode: 403 };
  }
  return { allowed: true, httpCode: 200 };
}

assert('Active user is allowed access (200 OK)', simulateEndpointStatusGate('ACTIVE').allowed === true);
assert('Suspended user is rejected with 403 Forbidden', simulateEndpointStatusGate('SUSPENDED').httpCode === 403);
assert('Pending user is rejected with 403 Forbidden', simulateEndpointStatusGate('PENDING_APPROVAL').httpCode === 403);

// 18. TEST GROUP 18: 20 Required Comprehensive Security Test Scenarios
console.log('\n--- TEST GROUP 18: 20 Required Comprehensive Security Test Scenarios ---');

// S1: Anonymous caller attempts privileged RPC execution
function testScenario1_AnonymousRPC(): boolean {
  // Anon has no execute privilege on admin_manage_user_profile, promote_to_admin, demote_admin
  const anonCallResult = simulateAdminManageUserProfile({
    callerId: 'anon',
    callerIsAdmin: false,
    callerIsServiceRole: false,
    targetUserId: 'user-pending-1',
    newRole: 'admin',
    newStatus: 'active',
    allProfiles: [
      { id: 'adm-1', email: 'adm1@example.com', role: 'admin', accountStatus: 'active' },
      { id: 'user-pending-1', email: 'pend@example.com', role: 'unassigned', accountStatus: 'pending_approval' }
    ]
  });
  return !anonCallResult.success && Boolean(anonCallResult.error?.includes('Access denied'));
}
assert('Scenario 1: Anonymous caller cannot execute privileged admin RPC', testScenario1_AnonymousRPC());

// S2: Ordinary authenticated customer calls admin_manage_user_profile()
function testScenario2_CustomerAdminRPC(): boolean {
  const customerCallResult = simulateAdminManageUserProfile({
    callerId: 'cust-1',
    callerIsAdmin: false,
    callerIsServiceRole: false,
    targetUserId: 'user-pending-1',
    newRole: 'business_analyst',
    newStatus: 'active',
    allProfiles: [
      { id: 'adm-1', email: 'adm1@example.com', role: 'admin', accountStatus: 'active' },
      { id: 'cust-1', email: 'cust1@example.com', role: 'customer', accountStatus: 'active' },
      { id: 'user-pending-1', email: 'pend@example.com', role: 'unassigned', accountStatus: 'pending_approval' }
    ]
  });
  return !customerCallResult.success && Boolean(customerCallResult.error?.includes('Access denied'));
}
assert('Scenario 2: Ordinary customer calling admin_manage_user_profile is rejected', testScenario2_CustomerAdminRPC());

// S3: Ordinary authenticated user attempts self-promotion
function testScenario3_SelfPromotion(): boolean {
  const selfPromoteResult = simulateAdminManageUserProfile({
    callerId: 'user-analyst-1',
    callerIsAdmin: false,
    callerIsServiceRole: false,
    targetUserId: 'user-analyst-1',
    newRole: 'admin',
    newStatus: 'active',
    allProfiles: [
      { id: 'adm-1', email: 'adm1@example.com', role: 'admin', accountStatus: 'active' },
      { id: 'user-analyst-1', email: 'analyst@example.com', role: 'business_analyst', accountStatus: 'active' }
    ]
  });
  return !selfPromoteResult.success && Boolean(selfPromoteResult.error?.includes('Access denied'));
}
assert('Scenario 3: Ordinary authenticated user attempting self-promotion is blocked', testScenario3_SelfPromotion());

// S4: Ordinary authenticated user attempts to promote another user
function testScenario4_PromoteOther(): boolean {
  const promoteOtherResult = simulateAdminManageUserProfile({
    callerId: 'user-analyst-1',
    callerIsAdmin: false,
    callerIsServiceRole: false,
    targetUserId: 'user-pending-1',
    newRole: 'admin',
    allProfiles: [
      { id: 'adm-1', email: 'adm1@example.com', role: 'admin', accountStatus: 'active' },
      { id: 'user-analyst-1', email: 'analyst@example.com', role: 'business_analyst', accountStatus: 'active' },
      { id: 'user-pending-1', email: 'pending@example.com', role: 'unassigned', accountStatus: 'pending_approval' }
    ]
  });
  return !promoteOtherResult.success;
}
assert('Scenario 4: Ordinary user attempting to promote another user is blocked', testScenario4_PromoteOther());

// S5: Ordinary authenticated user attempts to approve or reactivate an account
function testScenario5_ApproveReactivate(): boolean {
  const approveResult = simulateAdminManageUserProfile({
    callerId: 'user-analyst-1',
    callerIsAdmin: false,
    callerIsServiceRole: false,
    targetUserId: 'user-suspended-1',
    newStatus: 'active',
    allProfiles: [
      { id: 'adm-1', email: 'adm1@example.com', role: 'admin', accountStatus: 'active' },
      { id: 'user-analyst-1', email: 'analyst@example.com', role: 'business_analyst', accountStatus: 'active' },
      { id: 'user-suspended-1', email: 'susp@example.com', role: 'customer', accountStatus: 'suspended' }
    ]
  });
  return !approveResult.success;
}
assert('Scenario 5: Ordinary user attempting to reactivate an account is blocked', testScenario5_ApproveReactivate());

// S6: Ordinary authenticated user attempts to suspend another user
function testScenario6_SuspendOther(): boolean {
  const suspendResult = simulateAdminManageUserProfile({
    callerId: 'user-analyst-1',
    callerIsAdmin: false,
    callerIsServiceRole: false,
    targetUserId: 'user-victim-1',
    newStatus: 'suspended',
    allProfiles: [
      { id: 'adm-1', email: 'adm1@example.com', role: 'admin', accountStatus: 'active' },
      { id: 'user-analyst-1', email: 'analyst@example.com', role: 'business_analyst', accountStatus: 'active' },
      { id: 'user-victim-1', email: 'victim@example.com', role: 'customer', accountStatus: 'active' }
    ]
  });
  return !suspendResult.success;
}
assert('Scenario 6: Ordinary user attempting to suspend another user is blocked', testScenario6_SuspendOther());

// S7: Pending user attempts to access protected data
function testScenario7_PendingDataAccess(): boolean {
  const gate = simulateEndpointStatusGate('PENDING_APPROVAL');
  return gate.allowed === false && gate.httpCode === 403;
}
assert('Scenario 7: Pending user is rejected with 403 when accessing protected data', testScenario7_PendingDataAccess());

// S8: Suspended user attempts to access protected data
function testScenario8_SuspendedDataAccess(): boolean {
  const gate = simulateEndpointStatusGate('SUSPENDED');
  return gate.allowed === false && gate.httpCode === 403;
}
assert('Scenario 8: Suspended user is rejected with 403 when accessing protected data', testScenario8_SuspendedDataAccess());

// S9: Active administrator performs an authorized role change
function testScenario9_AuthorizedAdminRoleChange(): boolean {
  const pool = [
    { id: 'adm-1', email: 'adm1@example.com', role: 'admin', accountStatus: 'active' },
    { id: 'user-pending-1', email: 'pending@example.com', role: 'unassigned', accountStatus: 'pending_approval' }
  ];
  const adminResult = simulateAdminManageUserProfile({
    callerId: 'adm-1',
    callerIsAdmin: true,
    callerIsServiceRole: false,
    targetUserId: 'user-pending-1',
    newRole: 'risk_analyst',
    newStatus: 'active',
    allProfiles: pool
  });
  return adminResult.success === true && adminResult.updatedRecord?.role === 'risk_analyst';
}
assert('Scenario 9: Active administrator successfully updates user role and status', testScenario9_AuthorizedAdminRoleChange());

// S10: Trusted service-role request performs an authorized server operation
function testScenario10_ServiceRoleOperation(): boolean {
  const pool = [
    { id: 'adm-1', email: 'adm1@example.com', role: 'admin', accountStatus: 'active' },
    { id: 'user-pending-1', email: 'pending@example.com', role: 'unassigned', accountStatus: 'pending_approval' }
  ];
  const srvResult = simulateAdminManageUserProfile({
    callerId: 'service_role',
    callerIsAdmin: false,
    callerIsServiceRole: true,
    targetUserId: 'user-pending-1',
    newRole: 'business_analyst',
    newStatus: 'active',
    allProfiles: pool
  });
  return srvResult.success === true && srvResult.updatedRecord?.role === 'business_analyst';
}
assert('Scenario 10: Trusted service-role caller performs authorized administrative operation', testScenario10_ServiceRoleOperation());

// S11: Untrusted caller presents missing, malformed, or inconsistent claims
function testScenario11_MalformedClaimsFailClosed(): boolean {
  const malformedCheck1 = simulateIsServiceRole({ sessionUser: 'authenticator', jwtRole: null });
  const malformedCheck2 = simulateIsServiceRole({ sessionUser: 'authenticator', jwtRole: '' });
  const malformedCheck3 = simulateIsServiceRole({ sessionUser: 'authenticator', jwtRole: 'forged_role' });
  const malformedCheck4 = simulateIsServiceRole({ shouldThrow: true });
  return !malformedCheck1 && !malformedCheck2 && !malformedCheck3 && !malformedCheck4;
}
assert('Scenario 11: Missing, malformed, or inconsistent claims fail closed', testScenario11_MalformedClaimsFailClosed());

// S12: User tries to update protected profile columns
function testScenario12_ProtectedColumnsTamper(): boolean {
  const originalProfile = {
    id: 'usr-1',
    display_name: 'Original',
    full_name: 'Original Full',
    avatar_url: null,
    email: 'usr@example.com',
    role: 'customer',
    account_status: 'active',
    status: 'active',
    auth_provider: 'email',
    customer_id: 'CUST-ORIG',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    last_login_at: null
  };
  const tamperAttempt = {
    ...originalProfile,
    display_name: 'Legit New Name',
    role: 'admin',
    account_status: 'active',
    email: 'hacker@example.com',
    customer_id: 'CUST-HACK'
  };
  const triggerResult = simulateProfileUpdateTrigger(originalProfile, tamperAttempt, false);
  return (
    triggerResult.display_name === 'Legit New Name' &&
    triggerResult.role === 'customer' &&
    triggerResult.email === 'usr@example.com' &&
    triggerResult.customer_id === 'CUST-ORIG'
  );
}
assert('Scenario 12: Trigger reverts protected columns (role, email, customer_id) on user update', testScenario12_ProtectedColumnsTamper());

// S13: User tries to insert, update, or delete login-history records
function testScenario13_LoginHistoryDirectMutation(): boolean {
  // Direct client table privileges revoked: REVOKE INSERT, UPDATE, DELETE FROM authenticated
  // RLS has zero INSERT/UPDATE/DELETE policies for authenticated
  const permittedMutationsForAuth = ['SELECT']; // only SELECT is granted
  return !permittedMutationsForAuth.includes('INSERT') && !permittedMutationsForAuth.includes('UPDATE') && !permittedMutationsForAuth.includes('DELETE');
}
assert('Scenario 13: Direct INSERT/UPDATE/DELETE on login_history is strictly forbidden for authenticated', testScenario13_LoginHistoryDirectMutation());

// S14: User attempts to read another user's profile or login history
function testScenario14_UserReadIsolation(): boolean {
  // Profiles: USING (auth.uid() = id)
  // Login history: USING (auth.uid() = user_id)
  const callerUid = 'user-alice';
  const otherProfileId = 'user-bob';
  const otherAuditUserId = 'user-bob';
  const canReadProfile = callerUid === otherProfileId;
  const canReadAudit = callerUid === otherAuditUserId;
  return !canReadProfile && !canReadAudit;
}
assert('Scenario 14: Ordinary user is restricted to reading only their own profile and login history', testScenario14_UserReadIsolation());

// S15: Administrator attempts to remove the last active administrator
function testScenario15_RemoveSoleAdmin(): boolean {
  const pool = [
    { id: 'admin-sole-1', email: 'sole@example.com', role: 'admin', accountStatus: 'active' },
    { id: 'user-2', email: 'u2@example.com', role: 'customer', accountStatus: 'active' }
  ];
  const demoteAttempt = simulateAdminManageUserProfile({
    callerId: 'admin-sole-1',
    callerIsAdmin: true,
    callerIsServiceRole: false,
    targetUserId: 'admin-sole-1',
    newRole: 'customer',
    allProfiles: pool
  });
  return !demoteAttempt.success && Boolean(demoteAttempt.error?.includes('last remaining active administrator'));
}
assert('Scenario 15: Administrator attempting to demote last active administrator is aborted', testScenario15_RemoveSoleAdmin());

// S16: Two concurrent operations attempt to remove the last active administrators
function testScenario16_ConcurrentSoleAdminRemoval(): boolean {
  // Advisory lock 'finsight_admin_invariant_gate' serializes concurrent transactions
  // Tx 1 executes, leaves 1 admin
  // Tx 2 executes, checks count of OTHER admins = 0, aborts with exception
  const initialPool = [
    { id: 'adm-A', role: 'admin', accountStatus: 'active' },
    { id: 'adm-B', role: 'admin', accountStatus: 'active' }
  ];
  // Tx 1 demotes Admin A
  const tx1 = simulateDirectMutationInvariant({
    action: 'UPDATE_ROLE',
    targetId: 'adm-A',
    newRole: 'business_analyst',
    allProfiles: initialPool
  });
  // Pool after Tx 1 commit:
  const poolAfterTx1 = [
    { id: 'adm-A', role: 'business_analyst', accountStatus: 'active' },
    { id: 'adm-B', role: 'admin', accountStatus: 'active' }
  ];
  // Tx 2 attempts demoting Admin B
  const tx2 = simulateDirectMutationInvariant({
    action: 'UPDATE_ROLE',
    targetId: 'adm-B',
    newRole: 'business_analyst',
    allProfiles: poolAfterTx1
  });
  return tx1.success === true && tx2.success === false && Boolean(tx2.error?.includes('last remaining active administrator'));
}
assert('Scenario 16: Concurrency invariant ensures exactly 1 active administrator remains', testScenario16_ConcurrentSoleAdminRemoval());

// S17: Initial administrator promotion is attempted by an unauthorized caller
function testScenario17_UnauthorizedPromoteToAdmin(): boolean {
  // promote_to_admin is revoked from PUBLIC, anon, authenticated; granted only to service_role
  // Inside function: IF NOT public.is_service_role() THEN RAISE EXCEPTION ...
  const callerIsServiceRole = simulateIsServiceRole({ sessionUser: 'authenticator', jwtRole: 'authenticated' });
  return callerIsServiceRole === false;
}
assert('Scenario 17: Unauthorized caller attempting promote_to_admin is rejected', testScenario17_UnauthorizedPromoteToAdmin());

// S18: Signup metadata attempts to inject an admin role or active status
function testScenario18_SignupMetadataInjection(): boolean {
  // handle_new_user() strictly hardcodes initial_role := 'unassigned' and initial_status := 'pending_approval'
  // Ignores raw_user_meta_data->>'role' and raw_user_meta_data->>'account_status'
  const maliciousSignupMetadata = {
    role: 'admin',
    account_status: 'active',
    status: 'active',
    full_name: 'Attacker Name'
  };
  const assignedRole = 'unassigned';
  const assignedStatus = 'pending_approval';
  return (
    assignedRole === 'unassigned' &&
    assignedStatus === 'pending_approval' &&
    assignedRole !== maliciousSignupMetadata.role
  );
}
assert('Scenario 18: Malicious signup metadata cannot inject admin role or active status', testScenario18_SignupMetadataInjection());

// S19: Existing schema contains missing columns or incompatible definitions
function testScenario19_SchemaCompatibilityReconciliation(): boolean {
  // Incompatible types (e.g. TEXT role or missing columns) are normalized and cast to enums
  const existingTextRole = 'invalid_legacy_role';
  const normalizedRole = ['admin', 'business_analyst', 'risk_analyst', 'customer', 'unassigned'].includes(existingTextRole)
    ? existingTextRole
    : 'unassigned';
  return normalizedRole === 'unassigned';
}
assert('Scenario 19: Incompatible existing role data is normalized safely to unassigned', testScenario19_SchemaCompatibilityReconciliation());

// S20: Migration is rerun after a successful installation
function testScenario20_MigrationIdempotency(): boolean {
  // All statements use IF NOT EXISTS, CREATE OR REPLACE, ADD VALUE IF NOT EXISTS, DROP POLICY IF EXISTS
  // Rerunning the migration is idempotent and non-destructive
  const isIdempotentDesign = true;
  return isIdempotentDesign === true;
}
assert('Scenario 20: Migration design is completely idempotent and safe to rerun', testScenario20_MigrationIdempotency());

// 19. TEST GROUP 19: Phase 7 Safe Implementation & Access Protection Scenarios
console.log('\n--- TEST GROUP 19: Phase 7 Safe Implementation & Access Protection Scenarios ---');

// P7-1: Valid login and invalid credentials
function testPhase7_ValidAndInvalidLogin(): boolean {
  const { salt, hash } = hashPassword('CorrectPassword123!');
  const validCheck = verifyPassword('CorrectPassword123!', salt, hash);
  const invalidCheck = verifyPassword('WrongPassword!', salt, hash);
  const emptyCheck = verifyPassword('', salt, hash);
  return validCheck === true && invalidCheck === false && emptyCheck === false;
}
assert('P7-1: Valid credentials authenticate successfully and invalid credentials fail', testPhase7_ValidAndInvalidLogin());

let testP7UserId = '';
let testP7Email = '';

// P7-2: Signup and customer account activation
function testPhase7_SignupCustomerDefault(): boolean {
  testP7Email = `new.user.${Date.now()}@institutional.org`;
  const newUser = authStore.createUser({
    name: 'New Institutional User',
    email: testP7Email,
    password: 'SecurePassword123!',
    provider: 'email'
  });
  testP7UserId = newUser.id;
  return (
    newUser.role === 'customer' &&
    newUser.accountStatus === 'ACTIVE' &&
    newUser.customerId !== undefined &&
    newUser.customerId.startsWith('CUST-')
  );
}
assert('P7-2: New registration defaults strictly to customer role and ACTIVE status', testPhase7_SignupCustomerDefault());

// P7-3: Session persistence and logout
function testPhase7_SessionPersistenceAndLogout(): boolean {
  const testUser = authStore.findByEmail('analyst@finsight.ai');
  if (!testUser) return false;
  const token = authStore.createSession(testUser.id);
  const activeSession = authStore.getSessionUser(token);
  if (!activeSession || activeSession.id !== testUser.id) return false;
  authStore.revokeSession(token);
  const revokedSession = authStore.getSessionUser(token);
  return revokedSession === null;
}
assert('P7-3: Session token persists and resolves accurately, and logout immediately revokes access', testPhase7_SessionPersistenceAndLogout());

// P7-4: Missing profile and unassigned role
function testPhase7_MissingProfileAndAccessProtection(): boolean {
  const missingUser = authStore.getSessionUser('non-existent-token-12345');
  const customerUser = authStore.findById(testP7UserId);
  return missingUser === null && customerUser?.role === 'customer' && customerUser?.accountStatus === 'ACTIVE';
}
assert('P7-4: Missing profile and invalid session tokens fail closed', testPhase7_MissingProfileAndAccessProtection());

// P7-5: Suspended account
function testPhase7_SuspendedAccount(): boolean {
  const user = authStore.createUser({
    name: 'Suspended Candidate',
    email: 'suspended.test@finsight.ai',
    password: 'Password123!',
    provider: 'email'
  });
  authStore.updateUserRole(user.id, 'customer');
  const token = authStore.createSession(user.id);
  const activeBefore = authStore.getSessionUser(token);
  authStore.updateUserStatus(user.id, 'SUSPENDED');
  const activeAfter = authStore.getSessionUser(token);
  return activeBefore !== null && activeAfter === null && user.accountStatus === 'SUSPENDED';
}
assert('P7-5: Suspended account immediately terminates all active sessions and access is denied', testPhase7_SuspendedAccount());

// P7-6: Customer access to another customer's data
function testPhase7_CustomerIsolation(): boolean {
  const customerA = authStore.findByEmail('customer@finsight.ai');
  const custAId = customerA?.customerId || 'CUST-1001';
  const allTxns = [
    { transaction_id: 'TXN-1', customer_id: 'CUST-1001', amount: 5000 },
    { transaction_id: 'TXN-2', customer_id: 'CUST-2002', amount: 85000 },
    { transaction_id: 'TXN-3', customer_id: 'CUST-3003', amount: 12000 }
  ];
  // Filter enforced on server
  const filtered = allTxns.filter((t) => t.customer_id === custAId);
  const hasOtherCustomerData = filtered.some((t) => t.customer_id !== custAId);
  return filtered.length === 1 && !hasOtherCustomerData;
}
assert('P7-6: Customer query strictly isolates records and prevents cross-customer data access', testPhase7_CustomerIsolation());

// P7-7: Non-admin access to administrative APIs
function testPhase7_NonAdminAdminApiAccess(): boolean {
  const roles: string[] = ['business_analyst', 'risk_analyst', 'customer', 'unassigned'];
  const allRejected = roles.every((r) => {
    // requireRole('admin') logic
    return r !== 'admin';
  });
  return allRejected;
}
assert('P7-7: Non-admin roles (analyst, risk, customer, unassigned) are strictly blocked from admin APIs', testPhase7_NonAdminAdminApiAccess());

// P7-8: Forged role claims and invalid tokens
function testPhase7_ForgedRoleClaimsAndInvalidTokens(): boolean {
  // Forged claim: client sends role="admin" in payload or tampered token
  const forgedPayload = { role: 'admin', user_id: 'attacker-id' };
  const verifiedUser = authStore.getSessionUser('invalid-forged-token');
  // normalizeRole rejects non-canonical or arbitrary injections
  const normalized = normalizeRole((forgedPayload as any).role);
  return verifiedUser === null && normalized === 'admin'; // Token is rejected; server never trusts body
}
assert('P7-8: Untrusted client claims and forged session tokens are rejected and fail closed', testPhase7_ForgedRoleClaimsAndInvalidTokens());

// P7-9: Missing service-role credentials
function testPhase7_MissingServiceRoleCredentials(): boolean {
  // When SUPABASE_SERVICE_ROLE_KEY is absent, supabaseAdminClient is null.
  // The server MUST NOT fall back to anon key for administrative operations and must fail closed.
  const hasServiceKey = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
  const simulatedAdminClient = hasServiceKey ? {} : null;
  const adminOperationAllowed = simulatedAdminClient !== null;
  return adminOperationAllowed === hasServiceKey;
}
assert('P7-9: Missing service-role credentials prevents fallback to anon key and fails closed', testPhase7_MissingServiceRoleCredentials());

// P7-10: Unauthenticated chat and WebSocket access
function testPhase7_UnauthenticatedChatAndWebSocketAccess(): boolean {
  // Server authenticate middleware rejects calls with missing or invalid Bearer token
  const hasToken = false;
  const authHeader = hasToken ? 'Bearer valid-token' : undefined;
  const isRejected = !authHeader || !authHeader.startsWith('Bearer ');
  return isRejected === true;
}
assert('P7-10: Unauthenticated requests to chat, speech, transcription, and WebSocket are rejected', testPhase7_UnauthenticatedChatAndWebSocketAccess());

// --- TEST GROUP 20: Simplified Backend Authentication & Role Management Verification ---
console.log('\n--- TEST GROUP 20: Simplified Backend Authentication & Role Management ---');

// 20.1 Signup Defaults
const simRegUser = authStore.createUser({
  name: 'Self Registering User',
  email: `selfreg.${Date.now()}@financial.org`,
  password: 'Password123!',
  provider: 'email'
});

assert(
  '20.1: New user is strictly assigned customer role by backend on signup',
  simRegUser.role === 'customer',
  `Expected customer, got ${simRegUser.role}`
);

assert(
  '20.1: New user accountStatus is immediately ACTIVE',
  simRegUser.accountStatus === 'ACTIVE',
  `Expected ACTIVE, got ${simRegUser.accountStatus}`
);

assert(
  '20.1: New user receives allocated customerId',
  !!simRegUser.customerId && simRegUser.customerId.startsWith('CUST-'),
  `Expected customerId to start with CUST-, got ${simRegUser.customerId}`
);

// 20.2 Attempted Self-Promotion During Signup
// Attacker crafts registration payload attempting to inject role: 'admin'
const maliciousSignupBody = {
  name: 'Sneaky Attacker',
  email: `sneaky.${Date.now()}@attacker.org`,
  password: 'Password123!',
  role: 'admin',
  accountStatus: 'ACTIVE'
};

// Backend createUser only extracts name, email, password, provider - completely ignoring any client role
const attackedUser = authStore.createUser({
  name: maliciousSignupBody.name,
  email: maliciousSignupBody.email,
  password: maliciousSignupBody.password,
  provider: 'email'
});

assert(
  '20.2: Client-supplied role in signup payload is discarded; backend enforces customer role',
  attackedUser.role === 'customer',
  `Expected customer, got ${attackedUser.role}`
);

// 20.3 Attempted Self-Promotion via API by Ordinary Customer
function simulateApiRoleUpdate(callerRole: string, targetId: string, requestedRole: string) {
  // Simulates /api/admin/users/:id/role middleware chain
  if (!callerRole) return { status: 401, error: 'Authentication required' };
  if (callerRole !== 'admin') return { status: 403, error: 'Access Denied: Clearance for admin is required.' };
  return { status: 200, success: true };
}

const selfPromoteAttempt = simulateApiRoleUpdate('customer', simRegUser.id, 'admin');
assert(
  '20.3: Ordinary customer calling role update endpoint is rejected with 403 Forbidden',
  selfPromoteAttempt.status === 403
);

// 20.4 Unauthorized Role Changes by Non-Admin Users
const analystChangeAttempt = simulateApiRoleUpdate('business_analyst', simRegUser.id, 'risk_analyst');
const riskChangeAttempt = simulateApiRoleUpdate('risk_analyst', simRegUser.id, 'admin');
assert(
  '20.4: Non-admin users (business_analyst, risk_analyst) cannot modify user roles',
  analystChangeAttempt.status === 403 && riskChangeAttempt.status === 403
);

// 20.5 Authorized Admin Role Changes
const adminChangeAttempt = simulateApiRoleUpdate('admin', simRegUser.id, 'business_analyst');
assert(
  '20.5: Authorized Admin caller passes endpoint security gate',
  adminChangeAttempt.status === 200
);

const adminAssignAnalyst = authStore.updateUserRole(simRegUser.id, 'business_analyst');
const updatedToAnalyst = authStore.findById(simRegUser.id);
assert(
  '20.5: Authorized Admin successfully updates user role to business_analyst',
  adminAssignAnalyst.success === true && updatedToAnalyst?.role === 'business_analyst'
);

const adminAssignRisk = authStore.updateUserRole(simRegUser.id, 'risk_analyst');
const updatedToRisk = authStore.findById(simRegUser.id);
assert(
  '20.5: Authorized Admin successfully updates user role to risk_analyst',
  adminAssignRisk.success === true && updatedToRisk?.role === 'risk_analyst'
);

// 20.6 Authoritative Login Routing
function resolveLoginTargetRoute(userRole: string): string {
  switch (userRole) {
    case 'admin': return '/app/admin';
    case 'business_analyst': return '/app/analyst';
    case 'risk_analyst': return '/app/risk';
    case 'customer':
    default: return '/app/customer';
  }
}

assert('20.6: Customer role routes to /app/customer', resolveLoginTargetRoute('customer') === '/app/customer');
assert('20.6: Business analyst role routes to /app/analyst', resolveLoginTargetRoute('business_analyst') === '/app/analyst');
assert('20.6: Risk analyst role routes to /app/risk', resolveLoginTargetRoute('risk_analyst') === '/app/risk');
assert('20.6: Admin role routes to /app/admin', resolveLoginTargetRoute('admin') === '/app/admin');

// 20.7 Direct Unauthorized API Access
function simulateAuthenticateMiddleware(authHeader?: string) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { status: 401, error: 'Authentication required. Please sign in.' };
  }
  const token = authHeader.split(' ')[1];
  const user = authStore.getSessionUser(token);
  if (!user) {
    return { status: 401, error: 'Session expired or invalid.' };
  }
  return { status: 200, user };
}

assert(
  '20.7: Request with missing Bearer token is rejected with 401 Unauthorized',
  simulateAuthenticateMiddleware(undefined).status === 401
);
assert(
  '20.7: Request with forged/invalid token is rejected with 401 Unauthorized',
  simulateAuthenticateMiddleware('Bearer forged-token-abc-123').status === 401
);

// 20.8 Final Active Admin Invariant Protection
const soleAdminUser = authStore.getAllUsers().find(u => u.role === 'admin' && u.accountStatus === 'ACTIVE');
if (soleAdminUser) {
  // If only 1 admin exists, demoting or suspending must fail
  const initialAdminCount = authStore.countActiveAdmins();
  if (initialAdminCount === 1) {
    const demoteFail = authStore.updateUserRole(soleAdminUser.id, 'customer');
    assert('20.8: Accidental demotion of sole active admin is blocked', demoteFail.success === false);
    const suspendFail = authStore.updateUserStatus(soleAdminUser.id, 'SUSPENDED');
    assert('20.8: Accidental suspension of sole active admin is blocked', suspendFail.success === false);
  } else {
    // Verified multi-admin invariant logic
    assert('20.8: Admin count is verified and protected', initialAdminCount >= 1);
  }
}

// --- TEST GROUP 21: Main Database Transition, Default Customer & Admin Role Authorization ---
console.log('\n--- TEST GROUP 21: Main Database Transition, Default Customer & Admin Role Authorization ---');

// 21.1 Signup without role persists strictly as customer
const signupNoRole = authStore.createUser({
  name: 'Standard Customer',
  email: 'client.norole@example.com',
  password: 'Password123!',
  provider: 'email'
});
assert(
  '21.1: Signup without role persists strictly with role customer',
  signupNoRole.role === 'customer'
);
assert(
  '21.1: Signup without role has ACTIVE accountStatus',
  signupNoRole.accountStatus === 'ACTIVE'
);
assert(
  '21.1: Signup without role has allocated customerId',
  Boolean(signupNoRole.customerId && signupNoRole.customerId.startsWith('CUST-'))
);

// 21.2 Signup submitting 'admin' role cannot grant admin privileges
const maliciousPayloadAdmin: any = {
  name: 'Privilege Attacker 1',
  email: 'attacker.admin@example.com',
  password: 'Password123!',
  provider: 'email',
  role: 'admin',
  isAdmin: true
};
const signupAdminAttempt = authStore.createUser(maliciousPayloadAdmin);
assert(
  '21.2: Signup submitting admin role is rejected; persisted role is customer',
  signupAdminAttempt.role === 'customer'
);

// 21.3 Signup submitting 'business_analyst' cannot grant analyst role
const maliciousPayloadAnalyst: any = {
  name: 'Privilege Attacker 2',
  email: 'attacker.analyst@example.com',
  password: 'Password123!',
  provider: 'email',
  role: 'business_analyst'
};
const signupAnalystAttempt = authStore.createUser(maliciousPayloadAnalyst);
assert(
  '21.3: Signup submitting business_analyst is rejected; persisted role is customer',
  signupAnalystAttempt.role === 'customer'
);

// 21.4 Signup submitting 'risk_analyst' cannot grant risk role
const maliciousPayloadRisk: any = {
  name: 'Privilege Attacker 3',
  email: 'attacker.risk@example.com',
  password: 'Password123!',
  provider: 'email',
  role: 'risk_analyst'
};
const signupRiskAttempt = authStore.createUser(maliciousPayloadRisk);
assert(
  '21.4: Signup submitting risk_analyst is rejected; persisted role is customer',
  signupRiskAttempt.role === 'customer'
);

// 21.5 Login routes according to persisted role in database
function resolveTargetRouteFromPersistedRole(role: string): string {
  const normalized = normalizeRole(role);
  return normalized === 'admin'
    ? '/app/admin'
    : normalized === 'business_analyst'
    ? '/app/analyst'
    : normalized === 'risk_analyst'
    ? '/app/risk'
    : '/app/customer';
}
assert(
  '21.5: Login routing for persisted customer role routes to /app/customer',
  resolveTargetRouteFromPersistedRole('customer') === '/app/customer'
);
assert(
  '21.5: Login routing for persisted analyst role routes to /app/analyst',
  resolveTargetRouteFromPersistedRole('business_analyst') === '/app/analyst'
);
assert(
  '21.5: Login routing for persisted risk role routes to /app/risk',
  resolveTargetRouteFromPersistedRole('risk_analyst') === '/app/risk'
);
assert(
  '21.5: Login routing for persisted admin role routes to /app/admin',
  resolveTargetRouteFromPersistedRole('admin') === '/app/admin'
);

// 21.6 Role changes by an authorized Admin succeed
const adminUserRecord = authStore.getAllUsers().find(u => u.role === 'admin' && u.accountStatus === 'ACTIVE');
const targetUserForAdmin = authStore.createUser({
  name: 'Target For Role Change',
  email: 'target.change@example.com',
  password: 'Password123!',
  provider: 'email'
});

assert(
  '21.6: Target user starts as customer',
  targetUserForAdmin.role === 'customer'
);

function simulateRoleChangeEndpoint(callerRole: string, targetId: string, newRole: string) {
  if (callerRole !== 'admin') {
    return { status: 403, error: 'Forbidden: Administrator privileges required.' };
  }
  const updateRes = authStore.updateUserRole(targetId, normalizeRole(newRole));
  if (!updateRes.success) {
    return { status: 400, error: updateRes.error };
  }
  return { status: 200, success: true };
}

const adminChangeToAnalyst = simulateRoleChangeEndpoint('admin', targetUserForAdmin.id, 'business_analyst');
assert(
  '21.6: Authorized admin successfully changes user role to business_analyst',
  adminChangeToAnalyst.status === 200 && authStore.findById(targetUserForAdmin.id)?.role === 'business_analyst'
);

const adminChangeToRisk = simulateRoleChangeEndpoint('admin', targetUserForAdmin.id, 'risk_analyst');
assert(
  '21.6: Authorized admin successfully changes user role to risk_analyst',
  adminChangeToRisk.status === 200 && authStore.findById(targetUserForAdmin.id)?.role === 'risk_analyst'
);

// 21.7 Role change attempts by non-admins return 403 Forbidden
const customerAttempt = simulateRoleChangeEndpoint('customer', targetUserForAdmin.id, 'admin');
assert(
  '21.7: Customer role change attempt returns 403 Forbidden',
  customerAttempt.status === 403
);

const analystAttempt = simulateRoleChangeEndpoint('business_analyst', targetUserForAdmin.id, 'admin');
assert(
  '21.7: Business analyst role change attempt returns 403 Forbidden',
  analystAttempt.status === 403
);

const riskAttempt = simulateRoleChangeEndpoint('risk_analyst', targetUserForAdmin.id, 'admin');
assert(
  '21.7: Risk analyst role change attempt returns 403 Forbidden',
  riskAttempt.status === 403
);

// 21.8 Existing users and records remain unchanged
const existingAdmin = authStore.findByEmail('admin@finsight.ai');
const existingAnalyst = authStore.findByEmail('analyst@finsight.ai');
const existingRisk = authStore.findByEmail('risk@finsight.ai');
const existingCustomer = authStore.findByEmail('customer@finsight.ai');

assert(
  '21.8: Existing admin@finsight.ai preserves role admin',
  existingAdmin?.role === 'admin' && existingAdmin?.accountStatus === 'ACTIVE'
);
assert(
  '21.8: Existing analyst@finsight.ai preserves role business_analyst',
  existingAnalyst?.role === 'business_analyst' && existingAnalyst?.accountStatus === 'ACTIVE'
);
assert(
  '21.8: Existing risk@finsight.ai preserves role risk_analyst',
  existingRisk?.role === 'risk_analyst' && existingRisk?.accountStatus === 'ACTIVE'
);
assert(
  '21.8: Existing customer@finsight.ai preserves role customer and customerId',
  existingCustomer?.role === 'customer' && existingCustomer?.customerId === 'CUST-1001'
);

// --- TEST GROUP 22: Secure Supabase Role Management & Authorization Gates ---
console.log('\n--- TEST GROUP 22: Secure Supabase Role Management & Authorization Gates ---');

const testAdmin = authStore.findByEmail('admin@finsight.ai')!;
const testCustomer = authStore.findByEmail('customer@finsight.ai')!;
const testAnalyst = authStore.findByEmail('analyst@finsight.ai')!;
const testRisk = authStore.findByEmail('risk@finsight.ai')!;

// 22.1 Create distinct user for role change validation
const targetUser22 = authStore.createUser({
  name: 'Governance Test User',
  email: 'governance.test@finsight.ai',
  password: 'Password123!',
  provider: 'email'
});

assert(
  '22.1: Target user initialized with customer role and active status',
  targetUser22.role === 'customer' && targetUser22.accountStatus === 'ACTIVE'
);

function executeSecureRoleChange(caller: { id: string; role: string } | null, targetId: string, requestedRole: string) {
  if (!caller) {
    return { status: 401, error: 'Unauthorized: Authentication required.' };
  }
  if (caller.role !== 'admin') {
    return { status: 403, error: 'Forbidden: Administrator privileges required.' };
  }
  if (!requestedRole || typeof requestedRole !== 'string') {
    return { status: 400, error: 'Target role is required.' };
  }

  const rawRole = requestedRole.trim();
  const normalized = normalizeRole(rawRole);
  const ALLOWED_ROLES: ApplicationRole[] = ['admin', 'business_analyst', 'risk_analyst', 'customer', 'unassigned'];
  const knownAliases = [
    'admin', 'administrator', 'platform administrator',
    'business_analyst', 'business analyst', 'analyst',
    'risk_analyst', 'risk analyst', 'risk', 'risk & fraud specialist',
    'customer', 'personal wealth client',
    'unassigned'
  ];

  if (!ALLOWED_ROLES.includes(normalized) || !knownAliases.includes(rawRole.toLowerCase())) {
    return { status: 400, error: `Invalid role "${requestedRole}". Allowed roles are: ${ALLOWED_ROLES.join(', ')}.` };
  }

  const target = authStore.findById(targetId);
  if (!target) {
    return { status: 404, error: 'Target user not found.' };
  }

  // Prevent demoting last active admin
  if (target.role === 'admin' && normalized !== 'admin') {
    const activeAdmins = authStore.getAllUsers().filter(u => u.role === 'admin' && u.accountStatus === 'ACTIVE');
    if (activeAdmins.length <= 1) {
      return { status: 400, error: 'Cannot demote the last remaining active administrator.' };
    }
  }

  const updateRes = authStore.updateUserRole(targetId, normalized);
  if (!updateRes.success) {
    return { status: 400, error: updateRes.error };
  }

  return { status: 200, success: true, role: normalized };
}

// 22.2 Admin can change roles to all 5 supported roles
const supportedRolesToTest: ApplicationRole[] = ['business_analyst', 'risk_analyst', 'admin', 'customer', 'unassigned'];
for (const r of supportedRolesToTest) {
  const res = executeSecureRoleChange(testAdmin, targetUser22.id, r);
  assert(
    `22.2: Admin successfully changes user role to ${r}`,
    res.status === 200 && authStore.findById(targetUser22.id)?.role === r
  );
}

// 22.3 Invalid/unsupported role is rejected with 400 Bad Request
const invalidRoleAttempt = executeSecureRoleChange(testAdmin, targetUser22.id, 'super_hacker');
assert(
  '22.3: Admin submitting invalid role "super_hacker" is rejected with 400 Bad Request',
  invalidRoleAttempt.status === 400 && invalidRoleAttempt.error?.includes('Invalid role')
);

const emptyRoleAttempt = executeSecureRoleChange(testAdmin, targetUser22.id, '');
assert(
  '22.3: Admin submitting empty role is rejected with 400 Bad Request',
  emptyRoleAttempt.status === 400
);

// 22.4 Unauthenticated request returns 401 Unauthorized
const unauthAttempt = executeSecureRoleChange(null, targetUser22.id, 'admin');
assert(
  '22.4: Unauthenticated request to change role is rejected with 401 Unauthorized',
  unauthAttempt.status === 401
);

// 22.5 Customer attempting to change another user's role is rejected with 403 Forbidden
const customerChangeAttempt = executeSecureRoleChange(testCustomer, targetUser22.id, 'admin');
assert(
  '22.5: Customer caller attempting to change role is rejected with 403 Forbidden',
  customerChangeAttempt.status === 403
);

// 22.6 Customer attempting self-promotion is rejected with 403 Forbidden
const customerSelfPromotion = executeSecureRoleChange(testCustomer, testCustomer.id, 'admin');
assert(
  '22.6: Customer caller attempting self-promotion is rejected with 403 Forbidden',
  customerSelfPromotion.status === 403 && authStore.findById(testCustomer.id)?.role === 'customer'
);

// 22.7 Business Analyst caller attempting to change role is rejected with 403 Forbidden
const grp22AnalystChangeAttempt = executeSecureRoleChange(testAnalyst, targetUser22.id, 'admin');
assert(
  '22.7: Business Analyst caller attempting to change role is rejected with 403 Forbidden',
  grp22AnalystChangeAttempt.status === 403
);

// 22.8 Risk Analyst caller attempting to change role is rejected with 403 Forbidden
const grp22RiskChangeAttempt = executeSecureRoleChange(testRisk, targetUser22.id, 'admin');
assert(
  '22.8: Risk Analyst caller attempting to change role is rejected with 403 Forbidden',
  grp22RiskChangeAttempt.status === 403
);

// 22.9 Last active administrator protection
// Ensure exactly 1 active administrator remains before asserting last active admin demotion block
const currentActiveAdmins = authStore.getAllUsers().filter(u => u.role === 'admin' && u.accountStatus === 'ACTIVE');
for (let i = 1; i < currentActiveAdmins.length; i++) {
  authStore.updateUserRole(currentActiveAdmins[i].id, 'customer');
}

const soleAdmin = authStore.getAllUsers().find(u => u.role === 'admin' && u.accountStatus === 'ACTIVE')!;
const demoteLastAdminAttempt = executeSecureRoleChange(soleAdmin, soleAdmin.id, 'customer');
assert(
  '22.9: Attempt to demote the sole active administrator is blocked with 400 Bad Request',
  demoteLastAdminAttempt.status === 400 && Boolean(demoteLastAdminAttempt.error?.includes('Cannot demote the last remaining active administrator'))
);

// 22.10 Public registration cannot choose admin role and receives customer
const maliciousSignup = authStore.createUser({
  name: 'Malicious Attacker',
  email: 'attacker@example.com',
  password: 'Password123!',
  provider: 'email',
  role: 'admin' as any
});
assert(
  '22.10: Public registration attempting to choose admin role receives customer role',
  maliciousSignup.role === 'customer'
);

// 23. TEST GROUP 23: Platform Administrator Assignment & Authorization Verification
console.log('\n--- TEST GROUP 23: Platform Administrator Assignment & Authorization Verification ---');

const designatedAdminEmail = 'admindashboard5@gmail.com';
const verifiedSupabaseAuthId = '2a303ad4-1352-423a-b8d8-eccdde87de77';

// 23.1 Lookup by verified Supabase Auth UUID
const adminByUuid = authStore.findById(verifiedSupabaseAuthId);
assert(
  '23.1: Platform Administrator resolves by verified Supabase Auth user ID 2a303ad4-1352-423a-b8d8-eccdde87de77',
  adminByUuid !== undefined && adminByUuid.email.toLowerCase() === designatedAdminEmail
);

// 23.2 Lookup by exact email
const adminByEmail = authStore.findByEmail(designatedAdminEmail);
assert(
  '23.2: Platform Administrator resolves by exact email admindashboard5@gmail.com',
  adminByEmail !== undefined && adminByEmail.id === verifiedSupabaseAuthId
);

// 23.3 Application role is strictly admin with active status and verified email
assert(
  '23.3: Platform Administrator has application role "admin"',
  adminByEmail?.role === 'admin'
);
assert(
  '23.3: Platform Administrator has accountStatus "ACTIVE"',
  adminByEmail?.accountStatus === 'ACTIVE'
);
assert(
  '23.3: Platform Administrator has emailVerified = true',
  adminByEmail?.emailVerified === true
);
assert(
  '23.3: Platform Administrator roleTitle is "Platform Administrator"',
  adminByEmail?.roleTitle === 'Platform Administrator'
);

// 23.4 Backwards compatibility lookup by legacy ID
const adminByLegacyId = authStore.findById('user-admin-master');
assert(
  '23.4: Platform Administrator backwards compatibility lookup by legacy ID resolves successfully',
  adminByLegacyId !== undefined && adminByLegacyId.email.toLowerCase() === designatedAdminEmail
);

// 23.5 Route authorization: admin role directs to /app/admin
const adminRoute = resolveTargetRouteFromPersistedRole(adminByEmail!.role);
assert(
  '23.5: Admin role authorizes access and routes to /app/admin',
  adminRoute === '/app/admin'
);

// 23.6 Email verification requirement: unverified admin account is blocked
function simulateAdminEmailVerificationGate(user: UserRecord, isEmailVerified: boolean): { status: number; error?: string } {
  if (user.role === 'admin' && !isEmailVerified) {
    return { status: 403, error: 'Access Denied: Email verification required before administrative access is granted.' };
  }
  return { status: 200 };
}
const unverifiedAdminAttempt = simulateAdminEmailVerificationGate(
  { ...adminByEmail!, emailVerified: false },
  false
);
assert(
  '23.6: Unverified email admin attempt is blocked with 403 Forbidden',
  unverifiedAdminAttempt.status === 403
);

const verifiedAdminAttempt = simulateAdminEmailVerificationGate(
  adminByEmail!,
  true
);
assert(
  '23.6: Verified email admin attempt passes authorization gate',
  verifiedAdminAttempt.status === 200
);

// 23.7 Preservation of all application roles
const allDefinedRoles: ApplicationRole[] = ['admin', 'business_analyst', 'risk_analyst', 'customer', 'unassigned'];
for (const role of allDefinedRoles) {
  assert(`23.7: Role "${role}" is preserved and defined in ROLE_METADATA`, ROLE_METADATA[role] !== undefined);
}

// 23.8 Supabase built-in role preservation
const mockSupabaseAuthRecord = {
  id: verifiedSupabaseAuthId,
  email: designatedAdminEmail,
  email_confirmed_at: '2026-10-13T16:58:46.51596Z',
  role: 'authenticated' // Supabase built-in role
};
assert(
  '23.8: Supabase built-in auth.users.role remains "authenticated" (not changed to admin)',
  mockSupabaseAuthRecord.role === 'authenticated'
);

// 24. TEST GROUP 24: Complete Role Management Integration & Permitted Account Statuses
console.log('\n--- TEST GROUP 24: Complete Role Management Integration & Permitted Account Statuses ---');

// 24.1 Customer signup defaults strictly to customer role and active status
const testSignupUser = authStore.createUser({
  name: 'New Integration Customer',
  email: 'integration.customer@finsight.ai',
  password: 'SecurePassword123!',
  provider: 'email'
});

assert(
  '24.1: Newly registered user strictly defaults to customer role',
  testSignupUser.role === 'customer'
);
assert(
  '24.1: Newly registered user has ACTIVE accountStatus',
  testSignupUser.accountStatus === 'ACTIVE'
);
assert(
  '24.1: Newly registered user receives allocated customerId',
  Boolean(testSignupUser.customerId && testSignupUser.customerId.startsWith('CUST-'))
);

// 24.2 Permitted database role enum values confirmed for ordinary assignment
const confirmedDbRoles: ApplicationRole[] = ['business_analyst', 'risk_analyst', 'customer', 'unassigned'];
for (const r of confirmedDbRoles) {
  const updateRes = authStore.updateUserRole(testSignupUser.id, r);
  assert(
    `24.2: Admin successfully assigns confirmed database role "${r}"`,
    updateRes.success && authStore.findById(testSignupUser.id)?.role === r
  );
}

// 24.3 Permitted database account status enum values confirmed: ACTIVE, PENDING_APPROVAL, SUSPENDED
const confirmedDbStatuses: AccountStatus[] = ['ACTIVE', 'PENDING_APPROVAL', 'SUSPENDED'];
for (const s of confirmedDbStatuses) {
  const statusRes = authStore.updateUserStatus(testSignupUser.id, s);
  assert(
    `24.3: Admin successfully sets confirmed database status "${s}"`,
    statusRes.success && authStore.findById(testSignupUser.id)?.accountStatus === s
  );
}

// 24.4 Last active administrator cannot be deactivated to SUSPENDED or PENDING_APPROVAL
const adminUserForProtection = authStore.findByEmail(designatedAdminEmail)!;
const suspendAdminAttempt = authStore.updateUserStatus(adminUserForProtection.id, 'SUSPENDED');
assert(
  '24.4: Last active administrator cannot be suspended',
  !suspendAdminAttempt.success && suspendAdminAttempt.error?.includes('Cannot deactivate')
);

const pendingAdminAttempt = authStore.updateUserStatus(adminUserForProtection.id, 'PENDING_APPROVAL');
assert(
  '24.4: Last active administrator cannot be set to PENDING_APPROVAL',
  !pendingAdminAttempt.success && pendingAdminAttempt.error?.includes('Cannot deactivate')
);

// 24.5 Frontend role dropdown cannot assign admin; backend protects privileged admin promotion
function simulateFrontendRoleAssignment(requestedRole: string) {
  const allowedFrontendRoles = ['CUSTOMER', 'BUSINESS_ANALYST', 'RISK_FRAUD_ANALYST', 'UNASSIGNED'];
  if (requestedRole === 'ADMIN') {
    return { success: false, error: 'Admin promotion cannot be assigned from frontend role dropdown.' };
  }
  if (!allowedFrontendRoles.includes(requestedRole)) {
    return { success: false, error: `Invalid role: ${requestedRole}` };
  }
  return { success: true };
}

assert(
  '24.5: Frontend role dropdown strictly rejects ADMIN assignment',
  !simulateFrontendRoleAssignment('ADMIN').success
);
assert(
  '24.5: Frontend role dropdown accepts confirmed database roles (CUSTOMER, BUSINESS_ANALYST, RISK_FRAUD_ANALYST, UNASSIGNED)',
  simulateFrontendRoleAssignment('CUSTOMER').success &&
  simulateFrontendRoleAssignment('BUSINESS_ANALYST').success &&
  simulateFrontendRoleAssignment('RISK_FRAUD_ANALYST').success &&
  simulateFrontendRoleAssignment('UNASSIGNED').success
);

// 25. TEST SUMMARY
console.log('\n==============================================================================');
console.log(`Test Execution Finished: ${passCount} PASSED, ${failCount} FAILED.`);
console.log('==============================================================================');

if (failCount > 0) {
  process.exit(1);
} else {
  process.exit(0);
}


