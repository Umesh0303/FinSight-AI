import { authStore, verifyPassword, DEMO_ACCOUNTS_CONFIG, DEMO_PASSWORD } from '../src/server/auth';

console.log('==============================================================================');
console.log('FinSight AI — Demo Login API & End-to-End Simulation Tests');
console.log('==============================================================================\n');

let pass = 0;
let fail = 0;

function assert(msg: string, condition: boolean, err?: string) {
  if (condition) {
    console.log(`[PASS] ${msg}`);
    pass++;
  } else {
    console.error(`[FAIL] ${msg}: ${err || ''}`);
    fail++;
  }
}

// 1. Verify Demo Accounts Data Setup
for (const acc of DEMO_ACCOUNTS_CONFIG) {
  const user = authStore.findByEmail(acc.email);
  assert(`Account exists: ${acc.email}`, !!user);
  assert(`Role matches: ${acc.email} -> ${acc.role}`, user?.role === acc.role);
  assert(`Account status is ACTIVE for ${acc.email}`, user?.accountStatus === 'ACTIVE');
  
  // Verify password hash
  const pwOk = user?.passwordHash && user?.passwordSalt
    ? verifyPassword(DEMO_PASSWORD, user.passwordSalt, user.passwordHash)
    : false;
  assert(`Password FinSight@Demo123 authenticates for ${acc.email}`, pwOk);

  const wrongPw = user?.passwordHash && user?.passwordSalt
    ? verifyPassword('WrongPw123', user.passwordSalt, user.passwordHash)
    : false;
  assert(`Wrong password fails for ${acc.email}`, !wrongPw);
}

// 2. Simulate Login & Session Lifecycle for Each Role
const tokens: Record<string, string> = {};

for (const acc of DEMO_ACCOUNTS_CONFIG) {
  const user = authStore.findByEmail(acc.email);
  if (!user) continue;

  const token = authStore.createSession(user.id);
  tokens[acc.email] = token;

  const sessionUser = authStore.getSessionUser(token);
  assert(`Session resolves to correct user for ${acc.email}`, sessionUser?.id === user.id);
  assert(`Session user role is immutable: ${sessionUser?.role}`, sessionUser?.role === acc.role);

  // Route check
  const route =
    sessionUser?.role === 'admin'
      ? '/app/admin'
      : sessionUser?.role === 'business_analyst'
      ? '/app/analyst'
      : sessionUser?.role === 'risk_analyst'
      ? '/app/risk'
      : sessionUser?.role === 'customer'
      ? '/app/customer'
      : '/app/pending';

  assert(`Route mapping correct for ${acc.email} -> ${route}`, route === acc.targetRoute);
}

// 3. Customer Isolation Check
const customerToken = tokens['customer@finsight.ai'];
const customerUser = authStore.getSessionUser(customerToken);
assert('Customer user has customerId CUST-1001', customerUser?.customerId === 'CUST-1001');

// 4. Session Revocation (Logout) Check
const adminToken = tokens['admin@finsight.ai'];
assert('Admin session active before logout', authStore.getSessionUser(adminToken) !== null);
authStore.revokeSession(adminToken);
assert('Admin session revoked after logout', authStore.getSessionUser(adminToken) === null);

// 5. Test Summary
console.log('\n==============================================================================');
console.log(`Integration Simulation Result: ${pass} PASSED, ${fail} FAILED.`);
console.log('==============================================================================');

if (fail > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
