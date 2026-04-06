import { useEffect, useState } from 'react';
import { Skeleton } from 'boneyard-js/react';
import { useDashboardStore } from './stores/useDashboardStore';
import { useWebSocket } from './hooks/useWebSocket';
import { useQuota } from './hooks/useQuota';
import { useBurnRate } from './hooks/useBurnRate';
import { useAuth } from './hooks/useAuth';
import { AppShell } from './components/AppShell';
import { ElectronApiBanner } from './components/ElectronApiBanner';
import { DashboardPage } from './components/DashboardPage';
import { AccountsPage } from './components/AccountsPage';
import { LogsPage } from './components/LogsPage';
import { SettingsPage } from './components/SettingsPage';
import { AuthPrompt } from './components/AuthPrompt';
import { useElectronApiBanner } from './hooks/useElectronApiBanner';

/** Minimum time the boneyard shell skeleton stays visible before the real app is shown. */
const MIN_SHELL_SKELETON_MS = 3000;

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
  const { refresh: refreshQuotas, lastRefresh: quotaLastRefresh, error: quotaError } = useQuota(120000);
  const { refresh: refreshBurnRates, lastRefresh: burnLastRefresh } = useBurnRate(60000);

  const [refreshing, setRefreshing] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [shellFadeIn, setShellFadeIn] = useState(false);
  const [accountsNetworkError, setAccountsNetworkError] = useState(false);

  const { connect: reconnectWs } = useWebSocket({ autoConnect: isAuthenticated, token: token || undefined });

  const isElectron = window.antigravityShell?.isElectron === true;
  const electronBanner = useElectronApiBanner({
    isElectron,
    initialLoading,
    quotaError,
    accountsNetworkError,
  });

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
      void fetchAccounts({ forInitialShell: true });
    }
  }, [isAuthenticated, token]);

  const fetchAccounts = async (options?: { forInitialShell?: boolean }) => {
    const forInitialShell = options?.forInitialShell === true;
    const started = Date.now();
    try {
      const headers: HeadersInit = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      const response = await fetch('/api/accounts/local', { headers });

      if (response.status === 401) {
        setAccountsNetworkError(false);
        return;
      }

      const data = await response.json();
      if (data.success && data.data) {
        setLocalAccounts(data.data);
      }
      setAccountsNetworkError(false);
    } catch (error) {
      console.error('Failed to fetch accounts:', error);
      setAccountsNetworkError(true);
    } finally {
      if (forInitialShell) {
        const elapsed = Date.now() - started;
        const remaining = Math.max(0, MIN_SHELL_SKELETON_MS - elapsed);
        if (remaining > 0) {
          await new Promise<void>((resolve) => {
            setTimeout(resolve, remaining);
          });
        }
        setInitialLoading(false);
      }
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchAccounts(), refreshQuotas(), refreshBurnRates()]);
    setRefreshing(false);
  };

  const handleElectronConnectivityRetry = async () => {
    await handleRefresh();
    reconnectWs();
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
    <>
      <ElectronApiBanner
        visible={electronBanner.visible}
        dismiss={electronBanner.dismiss}
        onRetryConnection={handleElectronConnectivityRetry}
      />
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
    </>
  );
}

export default App;
