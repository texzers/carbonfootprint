import React, { useEffect, Suspense } from 'react';
import { useAppStore, useNotifications } from './store';
import { useAuth } from './hooks/useAuth';
import { AuthGuard } from './components/auth/LoginPage';
import { OnboardingWizard } from './components/auth/OnboardingWizard';
import { Sidebar } from './components/dashboard/Sidebar';
import { Dashboard } from './components/dashboard/Dashboard';
import { ActivityLogger } from './components/tracker/ActivityLogger';
import { EcoCoachPanel } from './components/insights/EcoCoachPanel';
import { GoalsPage } from './components/goals/GoalsPage';
import { ReportsPage } from './components/reports/ReportsPage';
import { SettingsPage } from './components/settings/SettingsPage';
import { Toast } from './components/shared';
import { LoadingSpinner } from './components/shared';

// ─── Notification Toast Container ─────────────────────────────────────────────

function NotificationContainer() {
  const notifications = useNotifications();
  const { removeNotification } = useAppStore();

  useEffect(() => {
    // Auto-remove notifications after 4 seconds
    const timers = notifications.map((n) =>
      setTimeout(() => removeNotification(n.id), 4000)
    );
    return () => timers.forEach(clearTimeout);
  }, [notifications]);

  return (
    <div
      className="fixed bottom-6 right-6 z-50 flex flex-col gap-2"
      aria-live="polite"
      aria-label="Notifications"
    >
      {notifications.map((n) => (
        <Toast
          key={n.id}
          type={n.type}
          message={n.message}
          onClose={() => removeNotification(n.id)}
        />
      ))}
    </div>
  );
}

// ─── Page Content ─────────────────────────────────────────────────────────────

function PageContent() {
  const { activeTab } = useAppStore();

  const pages: Record<string, React.ReactNode> = {
    dashboard: <Dashboard />,
    logger: <ActivityLogger />,
    insights: <EcoCoachPanel />,
    goals: <GoalsPage />,
    reports: <ReportsPage />,
    settings: <SettingsPage />,
  };

  return (
    <main id="main-content" className="flex-1 overflow-hidden flex flex-col">
      <Suspense fallback={
        <div className="flex-1 flex items-center justify-center" aria-live="polite">
          <LoadingSpinner size={32} className="text-eco-leaf" />
        </div>
      }>
        {pages[activeTab] ?? <Dashboard />}
      </Suspense>
    </main>
  );
}

// ─── Authenticated App ────────────────────────────────────────────────────────

function AuthenticatedApp() {
  const { isOnboarding, sidebarOpen, setSidebarOpen, theme } = useAppStore();

  // Apply theme
  useEffect(() => {
    const root = document.documentElement;
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const isDark = theme === 'dark' || (theme === 'system' && prefersDark);
    root.classList.toggle('dark', isDark);
  }, [theme]);

  if (isOnboarding) return <OnboardingWizard />;

  return (
    <div className="min-h-screen bg-eco-stone flex">
      {/* Skip to main content */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-72 focus:z-50 bg-eco-forest text-white px-4 py-2 rounded-lg font-medium"
      >
        Skip to main content
      </a>

      {/* Sidebar */}
      <Sidebar />

      {/* Mobile sidebar toggle */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="fixed top-4 left-4 z-40 lg:hidden w-10 h-10 bg-eco-forest text-white rounded-xl flex items-center justify-center shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-eco-mint"
        aria-label={sidebarOpen ? 'Close navigation' : 'Open navigation'}
        aria-expanded={sidebarOpen}
        aria-controls="main-nav"
      >
        <span aria-hidden="true">{sidebarOpen ? '✕' : '☰'}</span>
      </button>

      {/* Main area */}
      <div className="flex-1 lg:ml-64 overflow-hidden flex flex-col min-h-screen">
        <PageContent />
      </div>

      {/* Notifications */}
      <NotificationContainer />
    </div>
  );
}

// ─── Root App ─────────────────────────────────────────────────────────────────

export default function App() {
  useAuth(); // Initialize auth listener

  return (
    <AuthGuard>
      <AuthenticatedApp />
    </AuthGuard>
  );
}
