import { useEffect, useState } from 'react';
import { Skeleton } from 'boneyard-js/react';
import { useDashboardStore } from './stores/useDashboardStore';
import { useWebSocket } from './hooks/useWebSocket';
import { useQuota } from './hooks/useQuota';
import { useBurnRate } from './hooks/useBurnRate';
import { useAuth } from './hooks/useAuth';
import { AppShell } from './components/AppShell';
import { DashboardPage } from './components/DashboardPage';
import { AccountsPage } from './components/AccountsPage';
import { LogsPage } from './components/LogsPage';
import { SettingsPage } from './components/SettingsPage';
import { AuthPrompt } from './components/AuthPrompt';

const BONEYARD_BUILD =
  typeof window !== 'undefined' &&
  (window as unknown as { __BONEYARD_BUILD?: boolean }).__BONEYARD_BUILD === true;

function App() {
  const {
    wsConnected,
    setLocalAccounts,
    currentPage,
    setCurrentPage,
    preferences,
    updatePreferences,
  } = useDashboardStore();

  const { token, setToken, authRequired, authError, isAuthenticated } = useAuth();
  const { refresh: refreshQuotas, lastRefresh: quotaLastRefresh } = useQuota(120000);
  const { refresh: refreshBurnRates, lastRefresh: burnLastRefresh } = useBurnRate(60000);

  const [refreshing, setRefreshing] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [shellFadeIn, setShellFadeIn] = useState(false);

  useWebSocket({ autoConnect: isAuthenticated, token: token || undefined });

  useEffect(() => {
    const theme = preferences.theme;
    if (theme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
    } else {
      document.documentElement.setAttribute('data-theme', theme);
    }
  }, [preferences.theme]);

  useEffect(() => {
    if (isAuthenticated) {
      void fetchAccounts();
    }
  }, [isAuthenticated, token]);

  const fetchAccounts = async () => {
    try {
      const headers: HeadersInit = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      const response = await fetch('/api/accounts/local', { headers });

      if (response.status === 401) {
        setInitialLoading(false);
        return;
      }

      const data = await response.json();
      if (data.success && data.data) {
        setLocalAccounts(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch accounts:', error);
    } finally {
      setInitialLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchAccounts(), refreshQuotas(), refreshBurnRates()]);
    setRefreshing(false);
  };

  const toggleTheme = () => {
    const newTheme = preferences.theme === 'dark' ? 'light' : 'dark';
    updatePreferences({ theme: newTheme });
  };

  useEffect(() => {
    if (initialLoading) {
      setShellFadeIn(false);
      return;
    }
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => setShellFadeIn(true));
    });
    return () => cancelAnimationFrame(id);
  }, [initialLoading]);

  if (!BONEYARD_BUILD && authRequired && !token) {
    return <AuthPrompt onLogin={setToken} error={authError} />;
  }

  const shellFixture = (
    <AppShell
      currentPage="dashboard"
      onPageChange={() => {}}
      wsConnected
      quotaLastRefresh={Date.now()}
      burnLastRefresh={Date.now()}
      preferences={preferences}
      onToggleTheme={() => {}}
      onRefresh={() => {}}
      refreshing={false}
      contentPlaceholder
    >
      {null}
    </AppShell>
  );

  const mainPages = (
    <>
      {currentPage === 'dashboard' && <DashboardPage />}
      {currentPage === 'accounts' && <AccountsPage />}
      {currentPage === 'logs' && <LogsPage />}
      {currentPage === 'settings' && <SettingsPage />}
    </>
  );

  return (
    <Skeleton
      name="antigravity-dashboard-shell"
      loading={initialLoading}
      className="min-h-screen w-full"
      animate="pulse"
      fixture={shellFixture}
      fallback={shellFixture}
    >
      <div
        className={`min-h-screen w-full transition-opacity duration-300 ease-out ${
          shellFadeIn ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <AppShell
          currentPage={currentPage}
          onPageChange={setCurrentPage}
          wsConnected={wsConnected}
          quotaLastRefresh={quotaLastRefresh}
          burnLastRefresh={burnLastRefresh}
          preferences={preferences}
          onToggleTheme={toggleTheme}
          onRefresh={handleRefresh}
          refreshing={refreshing}
        >
          {mainPages}
        </AppShell>
      </div>
    </Skeleton>
  );
}

export default App;
