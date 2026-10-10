import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { FinAiProvider } from './context/FinAiContext';
import { HomePage } from './pages/public/HomePage';
import { LoginPage } from './pages/public/LoginPage';
import { SignupPage } from './pages/public/SignupPage';
import { ForgotPasswordPage } from './pages/public/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/public/ResetPasswordPage';
import { EmailVerificationPage } from './pages/public/EmailVerificationPage';
import { AboutPage } from './pages/public/AboutPage';
import { ContactPage } from './pages/public/ContactPage';
import { AnalystDashboard } from './pages/app/AnalystDashboard';
import { AdminDashboard } from './pages/app/AdminDashboard';
import { CustomerDashboard } from './pages/app/CustomerDashboard';
import { RiskDashboard } from './pages/app/RiskDashboard';
import { PendingPage } from './pages/app/PendingPage';
import { AccessDeniedPage } from './pages/app/AccessDeniedPage';
import { TransactionsPage } from './pages/app/TransactionsPage';
import { CustomersPage } from './pages/app/CustomersPage';
import { CasesPage } from './pages/app/CasesPage';
import { RecommendationsPage } from './pages/app/RecommendationsPage';
import { AssistantPage } from './pages/app/AssistantPage';
import { DocumentsPage } from './pages/app/DocumentsPage';
import { SettingsPage } from './pages/app/SettingsPage';
import { Button } from './components/ui/Button';

const Router: React.FC = () => {
  const { currentPath, currentRole, navigate } = useApp();

  // Public Routes
  if (currentPath === '/' || currentPath === '') {
    return <HomePage />;
  }

  if (currentPath === '/login') {
    return <LoginPage />;
  }

  if (currentPath === '/signup') {
    return <SignupPage />;
  }

  if (currentPath === '/forgot-password' || currentPath.startsWith('/forgot-password')) {
    return <ForgotPasswordPage />;
  }

  if (currentPath === '/reset-password' || currentPath.startsWith('/reset-password')) {
    return <ResetPasswordPage />;
  }

  if (currentPath === '/verify-email' || currentPath.startsWith('/verify-email')) {
    return <EmailVerificationPage />;
  }

  if (currentPath === '/about') {
    return <AboutPage />;
  }

  if (currentPath === '/contact') {
    return <ContactPage />;
  }

  // Pending user page
  if (currentPath === '/app/pending' || (currentRole === 'UNASSIGNED' && currentPath.startsWith('/app'))) {
    return <PendingPage />;
  }

  // Application Entry Dispatcher ('/app')
  if (currentPath === '/app') {
    if (currentRole === 'ADMIN') return <AdminDashboard />;
    if (currentRole === 'CUSTOMER') return <CustomerDashboard />;
    if (currentRole === 'RISK_FRAUD_ANALYST') return <RiskDashboard />;
    if (currentRole === 'BUSINESS_ANALYST') return <AnalystDashboard />;
    return <PendingPage />;
  }

  // Protected: Admin Dashboard (Only ADMIN allowed)
  if (currentPath === '/app/admin') {
    if (currentRole !== 'ADMIN') {
      return <AccessDeniedPage requiredRole="Platform Administrator" />;
    }
    return <AdminDashboard />;
  }

  // Protected: Risk Dashboard (Only ADMIN and RISK_FRAUD_ANALYST allowed)
  if (currentPath === '/app/risk') {
    if (currentRole !== 'ADMIN' && currentRole !== 'RISK_FRAUD_ANALYST') {
      return <AccessDeniedPage requiredRole="Risk & Fraud Specialist" />;
    }
    return <RiskDashboard />;
  }

  // Protected: Analyst Dashboard (Only ADMIN and BUSINESS_ANALYST allowed)
  if (currentPath === '/app/analyst') {
    if (currentRole !== 'ADMIN' && currentRole !== 'BUSINESS_ANALYST') {
      return <AccessDeniedPage requiredRole="Business Analyst" />;
    }
    return <AnalystDashboard />;
  }

  // Protected: Customer Dashboard (Only ADMIN and CUSTOMER allowed)
  if (currentPath === '/app/customer') {
    if (currentRole !== 'ADMIN' && currentRole !== 'CUSTOMER') {
      return <AccessDeniedPage requiredRole="Personal Wealth Client" />;
    }
    return <CustomerDashboard />;
  }

  // Feature Modules
  if (currentPath === '/app/transactions') {
    return <TransactionsPage />;
  }

  if (currentPath.startsWith('/app/customers')) {
    if (currentRole === 'CUSTOMER') {
      return <AccessDeniedPage requiredRole="Institutional Analyst" />;
    }
    return <CustomersPage />;
  }

  if (currentPath === '/app/cases') {
    return <CasesPage />;
  }

  if (currentPath === '/app/recommendations') {
    return <RecommendationsPage />;
  }

  if (currentPath === '/app/assistant') {
    return <AssistantPage />;
  }

  if (currentPath === '/app/documents') {
    return <DocumentsPage />;
  }

  if (currentPath === '/app/settings') {
    return <SettingsPage />;
  }

  // 404 Not Found Page
  return (
    <div className="min-h-screen bg-[#041610] text-white flex flex-col items-center justify-center p-6 text-center">
      <div className="max-w-md space-y-4">
        <span className="text-4xl font-extrabold text-[#deb03e] font-mono">404</span>
        <h2 className="text-2xl font-bold font-heading">Page Not Found</h2>
        <p className="text-xs text-[#8cb2a1]">
          The route <code className="text-[#f1cd6b]">{currentPath}</code> does not exist in FinSight AI.
        </p>
        <div className="pt-4 flex items-center justify-center gap-3">
          <Button variant="gold" size="sm" onClick={() => navigate('/')}>
            Return Home
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigate('/app')}>
            Go to Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <FinAiProvider>
        <Router />
      </FinAiProvider>
    </AppProvider>
  );
}
