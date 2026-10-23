import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export type ApplicationRole = 'admin' | 'business_analyst' | 'risk_analyst' | 'customer' | 'unassigned';
export type AccountStatus = 'ACTIVE' | 'PENDING_APPROVAL' | 'SUSPENDED';

export interface UserRecord {
  id: string;
  name: string;
  display_name?: string;
  email: string;
  role: ApplicationRole;
  roleTitle: string;
  avatarInitials: string;
  accountStatus: AccountStatus;
  status?: string;
  authProviders: Array<'email' | 'google'>;
  auth_provider?: string;
  googleId?: string;
  passwordSalt?: string;
  passwordHash?: string;
  emailVerified: boolean;
  createdDate: string;
  created_at?: string;
  updated_at?: string;
  lastLogin?: string;
  last_login_at?: string;
  customerId?: string;
  resetToken?: string;
  resetTokenExpires?: number;
}

export interface LoginHistoryRecord {
  id: string;
  userId: string;
  email: string;
  displayName: string;
  role: ApplicationRole;
  provider: 'email' | 'google';
  eventType?: string;
  success?: boolean;
  errorCategory?: string | null;
  ipAddress: string;
  userAgent: string;
  status: 'SUCCESS' | 'FAILED';
  timestamp?: string;
  createdAt: string;
}

export interface SessionInfo {
  token: string;
  userId: string;
  createdAt: number;
  expiresAt: number;
}

const DATA_DIR = path.resolve('data');
const DB_FILE = path.join(DATA_DIR, 'users.json');
const LOGIN_HISTORY_FILE = path.join(DATA_DIR, 'login_history.json');

// Memory cache for active sessions (token -> SessionInfo)
const activeSessions = new Map<string, SessionInfo>();

// Role titles mapping
export const ROLE_METADATA: Record<ApplicationRole, { title: string; clientRole: string }> = {
  admin: { title: 'Platform Administrator', clientRole: 'ADMIN' },
  business_analyst: { title: 'Senior Financial Analyst', clientRole: 'BUSINESS_ANALYST' },
  risk_analyst: { title: 'Risk & Fraud Specialist', clientRole: 'RISK_FRAUD_ANALYST' },
  customer: { title: 'Personal Wealth Client', clientRole: 'CUSTOMER' },
  unassigned: { title: 'Pending Role Assignment', clientRole: 'UNASSIGNED' }
};

export const normalizeRole = (rawRole: string): ApplicationRole => {
  const r = (rawRole || '').trim().toLowerCase();
  if (r === 'admin' || r === 'platform administrator') return 'admin';
  if (r === 'business_analyst' || r === 'business analyst' || r === 'analyst') return 'business_analyst';
  if (r === 'risk_analyst' || r === 'risk & fraud specialist' || r === 'risk' || r === 'risk_fraud_analyst') return 'risk_analyst';
  if (r === 'customer' || r === 'personal wealth client') return 'customer';
  if (r === 'unassigned') return 'unassigned';
  return 'customer';
};

// Cryptographic password hashing (scrypt)
export const hashPassword = (password: string, salt?: string): { salt: string; hash: string } => {
  const actualSalt = salt || crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.scryptSync(password, actualSalt, 64);
  return {
    salt: actualSalt,
    hash: derivedKey.toString('hex')
  };
};

export const verifyPassword = (password: string, salt: string, storedHash: string): boolean => {
  try {
    const derivedKey = crypto.scryptSync(password, salt, 64);
    const keyBuffer = Buffer.from(derivedKey.toString('hex'), 'hex');
    const storedBuffer = Buffer.from(storedHash, 'hex');
    if (keyBuffer.length !== storedBuffer.length) return false;
    return crypto.timingSafeEqual(keyBuffer, storedBuffer);
  } catch {
    return false;
  }
};

export const DEMO_PASSWORD = 'FinSight@Demo123';

export interface DemoAccountDefinition {
  id: string;
  email: string;
  name: string;
  display_name: string;
  role: ApplicationRole;
  roleTitle: string;
  avatarInitials: string;
  accountStatus: AccountStatus;
  targetRoute: string;
  customerId?: string;
}

export const DEMO_ACCOUNTS_CONFIG: DemoAccountDefinition[] = [
  {
    id: 'demo-user-admin',
    email: 'admin@finsight.ai',
    name: 'Elena Rostova',
    display_name: 'Elena Rostova',
    role: 'admin',
    roleTitle: 'Platform Administrator',
    avatarInitials: 'ER',
    accountStatus: 'ACTIVE',
    targetRoute: '/app/admin'
  },
  {
    id: 'demo-user-analyst',
    email: 'analyst@finsight.ai',
    name: 'T. Gopi Chand',
    display_name: 'T. Gopi Chand',
    role: 'business_analyst',
    roleTitle: 'Senior Financial Analyst',
    avatarInitials: 'TG',
    accountStatus: 'ACTIVE',
    targetRoute: '/app/analyst'
  },
  {
    id: 'demo-user-risk',
    email: 'risk@finsight.ai',
    name: 'Devraj Sen',
    display_name: 'Devraj Sen',
    role: 'risk_analyst',
    roleTitle: 'Risk & Fraud Specialist',
    avatarInitials: 'DS',
    accountStatus: 'ACTIVE',
    targetRoute: '/app/risk'
  },
  {
    id: 'demo-user-customer',
    email: 'customer@finsight.ai',
    name: 'Arjun Verma',
    display_name: 'Arjun Verma',
    role: 'customer',
    roleTitle: 'Personal Wealth Client',
    avatarInitials: 'AV',
    accountStatus: 'ACTIVE',
    targetRoute: '/app/customer',
    customerId: 'CUST-1001'
  }
];

export const isDemoEmail = (emailStr: string): boolean => {
  const e = (emailStr || '').trim().toLowerCase();
  return DEMO_ACCOUNTS_CONFIG.some((d) => d.email.toLowerCase() === e);
};

class AuthStore {
  private users: UserRecord[] = [];
  private loginHistory: LoginHistoryRecord[] = [];

  constructor() {
    this.init();
  }

  private init() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    if (fs.existsSync(DB_FILE)) {
      try {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed: UserRecord[] = JSON.parse(raw);
        this.users = parsed.map((u) => {
          const nowIso = new Date().toISOString();
          return {
            ...u,
            display_name: u.display_name || u.name,
            auth_provider: u.auth_provider || (u.authProviders && u.authProviders[0]) || 'email',
            created_at: u.created_at || (u.createdDate ? new Date(u.createdDate).toISOString() : nowIso),
            last_login_at: u.last_login_at || nowIso
          };
        });
      } catch (err) {
        console.error('Error loading users.json, reinitializing defaults', err);
        this.seedDefaults();
      }
    } else {
      this.seedDefaults();
    }

    // Load login history
    if (fs.existsSync(LOGIN_HISTORY_FILE)) {
      try {
        const historyRaw = fs.readFileSync(LOGIN_HISTORY_FILE, 'utf-8');
        this.loginHistory = JSON.parse(historyRaw);
      } catch (err) {
        console.error('Error loading login_history.json', err);
        this.loginHistory = [];
      }
    } else {
      this.loginHistory = [];
    }

    // Ensure the four predefined demo accounts exist with scrypt hashed password
    this.ensureDemoAccounts();

    // Ensure the initial administrator account strictly exists as required
    this.ensureInitialAdmin();
    this.persist();
    this.persistLoginHistory();
  }

  private seedDefaults() {
    this.users = [];
    this.persist();
  }

  public ensureDemoAccounts(): void {
    const { salt, hash } = hashPassword(DEMO_PASSWORD);
    const nowIso = new Date().toISOString();

    for (const demo of DEMO_ACCOUNTS_CONFIG) {
      let user = this.users.find((u) => u.email.toLowerCase() === demo.email.toLowerCase());
      if (!user) {
        user = {
          id: demo.id,
          name: demo.name,
          display_name: demo.display_name,
          email: demo.email.toLowerCase(),
          role: demo.role,
          roleTitle: demo.roleTitle,
          avatarInitials: demo.avatarInitials,
          accountStatus: 'ACTIVE',
          authProviders: ['email'],
          auth_provider: 'email',
          emailVerified: true,
          createdDate: '2026-10-10',
          created_at: nowIso,
          lastLogin: 'Just now',
          last_login_at: nowIso,
          customerId: demo.customerId,
          passwordSalt: salt,
          passwordHash: hash
        };
        this.users.push(user);
        console.log(`[AUTH] Provisioned demo account: ${demo.email} (${demo.role} -> ${demo.targetRoute})`);
      } else {
        // Enforce demo account integrity and credentials
        user.name = demo.name;
        user.display_name = demo.display_name;
        user.role = demo.role;
        user.roleTitle = demo.roleTitle;
        user.avatarInitials = demo.avatarInitials;
        user.accountStatus = 'ACTIVE';
        user.passwordSalt = salt;
        user.passwordHash = hash;
        if (demo.customerId) user.customerId = demo.customerId;
      }
    }
  }

  public ensureInitialAdmin(): UserRecord {
    const adminEmail = 'admindashboard5@gmail.com';
    const verifiedSupabaseAuthId = '2a303ad4-1352-423a-b8d8-eccdde87de77';
    let admin = this.users.find((u) => u.email.toLowerCase() === adminEmail);
    const nowIso = new Date().toISOString();

    if (!admin) {
      admin = {
        id: verifiedSupabaseAuthId,
        name: 'Admin Dashboard',
        display_name: 'Admin Dashboard',
        email: adminEmail,
        role: 'admin',
        roleTitle: ROLE_METADATA.admin.title,
        avatarInitials: 'A',
        accountStatus: 'ACTIVE',
        authProviders: ['google', 'email'],
        auth_provider: 'google',
        emailVerified: true,
        createdDate: nowIso.split('T')[0],
        created_at: nowIso,
        lastLogin: 'Just now',
        last_login_at: nowIso
      };
      this.users.unshift(admin);
      this.persist();
      console.log(`[AUTH] Initial administrator provisioned for ${adminEmail} (UUID: ${verifiedSupabaseAuthId}) with role: admin`);
    } else {
      // Ensure the verified Supabase Auth user ID is bound
      if (admin.id !== verifiedSupabaseAuthId) {
        admin.id = verifiedSupabaseAuthId;
      }
      // Ensure role and accountStatus are strictly active admin
      if (admin.role !== 'admin' || admin.accountStatus !== 'ACTIVE') {
        admin.role = 'admin';
        admin.roleTitle = ROLE_METADATA.admin.title;
        admin.accountStatus = 'ACTIVE';
        if (!admin.authProviders.includes('google')) admin.authProviders.push('google');
        if (!admin.authProviders.includes('email')) admin.authProviders.push('email');
      }
      admin.emailVerified = true;
      admin.display_name = admin.display_name || admin.name;
      admin.created_at = admin.created_at || nowIso;
      admin.last_login_at = admin.last_login_at || nowIso;
      this.persist();
    }

    return admin;
  }

  public persist() {
    try {
      // Mandate: Never store passwords or authentication tokens in custom JSON files
      const sanitized = this.users.map((u) => {
        const copy: any = { ...u };
        delete copy.passwordHash;
        delete copy.passwordSalt;
        delete copy.resetToken;
        delete copy.resetTokenExpires;
        return copy;
      });
      fs.writeFileSync(DB_FILE, JSON.stringify(sanitized, null, 2), 'utf-8');
    } catch (err) {
      console.error('Failed to write users.json', err);
    }
  }

  public persistLoginHistory() {
    try {
      fs.writeFileSync(LOGIN_HISTORY_FILE, JSON.stringify(this.loginHistory, null, 2), 'utf-8');
    } catch (err) {
      console.error('Failed to write login_history.json', err);
    }
  }

  public recordLoginEvent(params: {
    userId: string;
    email?: string;
    provider?: 'email' | 'google';
    eventType?: string;
    success?: boolean;
    errorCategory?: string | null;
    ipAddress?: string;
    userAgent?: string;
    status?: 'SUCCESS' | 'FAILED';
  }): LoginHistoryRecord {
    const user = this.findById(params.userId);
    const now = new Date();
    const serverTimestamp = now.toISOString();
    const provider = params.provider || (user?.authProviders.includes('google') ? 'google' : 'email');
    const eventType = params.eventType || 'login';
    const isSuccess = params.success !== undefined ? params.success : (params.status !== 'FAILED');
    const status = params.status || (isSuccess ? 'SUCCESS' : 'FAILED');
    const errorCategory = params.errorCategory || null;

    const email = params.email || user?.email || (params.userId.includes('@') ? params.userId : 'unknown@attempt.internal');
    const effectiveUserId = user ? user.id : (params.userId || 'unauthenticated');
    const displayName = user ? (user.display_name || user.name) : (email.split('@')[0] || 'Unauthenticated Visitor');
    const role = user ? user.role : 'unassigned';

    // Deduplication check: if identical user, provider & eventType recorded in last 5 seconds, return existing
    const recentEvent = this.loginHistory.find(
      (h) =>
        h.userId === effectiveUserId &&
        h.provider === provider &&
        (h.eventType || 'login') === eventType &&
        now.getTime() - new Date(h.createdAt).getTime() < 5000
    );

    if (recentEvent) {
      return recentEvent;
    }

    // Update user profile last login & updated_at if user exists
    if (user && isSuccess) {
      user.lastLogin = 'Just now';
      user.last_login_at = serverTimestamp;
      user.updated_at = serverTimestamp;
      this.persist();
    }

    const record: LoginHistoryRecord = {
      id: crypto.randomUUID(),
      userId: effectiveUserId,
      email,
      displayName,
      role,
      provider,
      eventType,
      success: isSuccess,
      errorCategory,
      ipAddress: params.ipAddress || '127.0.0.1',
      userAgent: params.userAgent || 'FinSight Secure Web Client',
      status,
      timestamp: serverTimestamp,
      createdAt: serverTimestamp
    };

    this.loginHistory.unshift(record);
    // Keep max 500 records
    if (this.loginHistory.length > 500) {
      this.loginHistory = this.loginHistory.slice(0, 500);
    }

    this.persistLoginHistory();
    return record;
  }

  public getLoginHistory(limit = 100): LoginHistoryRecord[] {
    return this.loginHistory.slice(0, limit);
  }

  public getAllUsers(): UserRecord[] {
    return this.users.map((u) => ({ ...u, passwordHash: undefined, passwordSalt: undefined }));
  }

  public findByEmail(email: string): UserRecord | undefined {
    const clean = (email || '').trim().toLowerCase();
    return this.users.find((u) => u.email.toLowerCase() === clean);
  }

  public findById(id: string): UserRecord | undefined {
    return this.users.find(
      (u) =>
        u.id === id ||
        (id === 'user-admin-master' && u.email.toLowerCase() === 'admindashboard5@gmail.com') ||
        (id === '2a303ad4-1352-423a-b8d8-eccdde87de77' && u.email.toLowerCase() === 'admindashboard5@gmail.com')
    );
  }

  public countActiveAdmins(): number {
    return this.users.filter((u) => u.role === 'admin' && u.accountStatus === 'ACTIVE').length;
  }

  public createUser(data: {
    name: string;
    email: string;
    password?: string;
    provider: 'email' | 'google';
    googleId?: string;
  }): UserRecord {
    const cleanEmail = data.email.trim().toLowerCase();

    // Secure Backend Role Assignment: All newly registered users strictly receive 'customer' role
    // and 'ACTIVE' account status server-side. Client-supplied roles or statuses are never accepted.
    // Privileged roles (analyst, risk, admin) are granted exclusively by an authorized Admin.
    const nowIso = new Date().toISOString();
    const displayName = data.name.trim() || cleanEmail.split('@')[0];
    const customerId = `CUST-${Math.floor(1000 + Math.random() * 9000)}`;
    const newUser: UserRecord = {
      id: crypto.randomUUID(),
      name: displayName,
      display_name: displayName,
      email: cleanEmail,
      role: 'customer',
      roleTitle: ROLE_METADATA.customer.title,
      avatarInitials: (displayName[0] || cleanEmail[0] || 'U').toUpperCase(),
      accountStatus: 'ACTIVE',
      authProviders: [data.provider],
      auth_provider: data.provider,
      googleId: data.googleId,
      emailVerified: data.provider === 'google',
      createdDate: nowIso.split('T')[0],
      created_at: nowIso,
      lastLogin: 'Just now',
      last_login_at: nowIso,
      customerId
    };

    if (data.password) {
      const { salt, hash } = hashPassword(data.password);
      newUser.passwordSalt = salt;
      newUser.passwordHash = hash;
    }

    this.users.push(newUser);
    this.persist();
    return newUser;
  }

  public linkGoogleProvider(user: UserRecord, googleId?: string): void {
    if (!user.authProviders.includes('google')) {
      user.authProviders.push('google');
    }
    if (googleId) user.googleId = googleId;
    user.emailVerified = true;
    this.persist();
  }

  public linkPasswordProvider(user: UserRecord, password: string): void {
    if (!user.authProviders.includes('email')) {
      user.authProviders.push('email');
    }
    const { salt, hash } = hashPassword(password);
    user.passwordSalt = salt;
    user.passwordHash = hash;
    this.persist();
  }

  public updateUserRole(userId: string, newRole: ApplicationRole): { success: boolean; error?: string } {
    const user = this.findById(userId);
    if (!user) return { success: false, error: 'User not found' };

    // Prevent removing the last active administrator
    if (user.role === 'admin' && newRole !== 'admin') {
      if (this.countActiveAdmins() <= 1) {
        return {
          success: false,
          error: 'Cannot remove the last active administrator from the system.'
        };
      }
    }

    user.role = newRole;
    user.roleTitle = ROLE_METADATA[newRole]?.title || 'Assigned User';

    // If assigned to customer and doesn't have customerId, allocate one
    if (newRole === 'customer' && !user.customerId) {
      user.customerId = `CUST-${Math.floor(1000 + Math.random() * 9000)}`;
    }

    // Auto-activate account status if it was pending
    if (user.accountStatus === 'PENDING_APPROVAL') {
      user.accountStatus = 'ACTIVE';
    }

    this.persist();
    return { success: true };
  }

  public updateUserStatus(userId: string, status: AccountStatus): { success: boolean; error?: string } {
    const user = this.findById(userId);
    if (!user) return { success: false, error: 'User not found' };

    // Prevent suspending or deactivating the last active administrator
    if (user.role === 'admin' && status !== 'ACTIVE') {
      if (this.countActiveAdmins() <= 1) {
        return {
          success: false,
          error: 'Cannot deactivate the last active administrator.'
        };
      }
    }

    user.accountStatus = status;

    // If suspended, revoke all active sessions immediately
    if (status === 'SUSPENDED') {
      for (const [token, session] of activeSessions.entries()) {
        if (session.userId === user.id) {
          activeSessions.delete(token);
        }
      }
    }

    this.persist();
    return { success: true };
  }

  public setInitialAdminPassword(password: string): { success: boolean; error?: string } {
    const admin = this.findByEmail('admindashboard5@gmail.com');
    if (!admin) return { success: false, error: 'Admin account not provisioned' };

    const { salt, hash } = hashPassword(password);
    admin.passwordSalt = salt;
    admin.passwordHash = hash;
    if (!admin.authProviders.includes('email')) admin.authProviders.push('email');
    this.persist();
    return { success: true };
  }

  public hasAdminPassword(): boolean {
    const admin = this.findByEmail('admindashboard5@gmail.com');
    return !!(admin && admin.passwordHash && admin.passwordSalt);
  }

  // Session Token Methods
  public createSession(userId: string): string {
    const token = crypto.randomBytes(32).toString('hex');
    const now = Date.now();
    const expiresAt = now + 7 * 24 * 60 * 60 * 1000; // 7 days

    activeSessions.set(token, {
      token,
      userId,
      createdAt: now,
      expiresAt
    });

    const user = this.findById(userId);
    if (user) {
      user.lastLogin = 'Just now';
      this.persist();
    }

    return token;
  }

  public getSessionUser(token: string): UserRecord | null {
    if (!token) return null;
    const session = activeSessions.get(token);
    if (!session) return null;

    if (Date.now() > session.expiresAt) {
      activeSessions.delete(token);
      return null;
    }

    const user = this.findById(session.userId);
    if (!user || user.accountStatus === 'SUSPENDED') {
      activeSessions.delete(token);
      return null;
    }

    return user;
  }

  public revokeSession(token: string): void {
    activeSessions.delete(token);
  }
}

export const authStore = new AuthStore();
