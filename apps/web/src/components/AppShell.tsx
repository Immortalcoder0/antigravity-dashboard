import type { ReactNode } from 'react';
import {
  RefreshCw,
  Zap,
  LayoutDashboard,
  Users,
  Settings,
  Moon,
  Sun,
  FileText,
} from 'lucide-react';
import { LastRefreshIndicator } from './LastRefreshIndicator';
import type { PageType, UserPreferences } from '../types';

const navItems: { key: PageType; label: string; icon: typeof LayoutDashboard }[] = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'accounts', label: 'Accounts', icon: Users },
  { key: 'logs', label: 'Logs', icon: FileText },
  { key: 'settings', label: 'Settings', icon: Settings },
];

export interface AppShellProps {
  currentPage: PageType;
  onPageChange: (page: PageType) => void;
  wsConnected: boolean;
  quotaLastRefresh: number | null;
  burnLastRefresh: number | null;
  preferences: UserPreferences;
  onToggleTheme: () => void;
  onRefresh: () => void;
  refreshing: boolean;
  /** Mirrors main chrome without live page content (boneyard fixture / fallback). */
  contentPlaceholder?: boolean;
  children: ReactNode;
}

export function AppShell({
  currentPage,
  onPageChange,
  wsConnected,
  quotaLastRefresh,
  burnLastRefresh,
  preferences,
  onToggleTheme,
  onRefresh,
  refreshing,
  contentPlaceholder,
  children,
}: AppShellProps) {
  return (
    <div className="min-h-screen w-full pb-12">
      <header className="sticky top-0 z-50 backdrop-blur-xl border-b border-cyan-500/10 bg-black/40">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 flex items-center justify-center border border-cyan-500/50 bg-cyan-500/10 shadow-[0_0_10px_rgba(6,182,212,0.3)]">
                <Zap size={18} className="text-cyan-400" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white tracking-widest leading-none uppercase font-mono">
                  Antigravity
                </h1>
                <p className="text-[10px] font-bold text-cyan-400 tracking-[0.2em] uppercase mt-0.5">
                  System Monitor
                </p>
              </div>
            </div>

            <div className="flex items-center gap-6">
              <div className="hidden md:flex flex-col items-end gap-1">
                <LastRefreshIndicator timestamp={quotaLastRefresh || Date.now()} label="Quota" />
                <LastRefreshIndicator timestamp={burnLastRefresh || Date.now()} label="Usage" />
              </div>

              <div className="h-8 w-px bg-cyan-500/20 hidden md:block" />

              <div className="flex items-center gap-4">
                <div
                  className={`flex items-center gap-2 px-3 py-1 border ${
                    wsConnected
                      ? 'bg-green-500/5 border-green-500/30 text-green-400'
                      : 'bg-red-500/5 border-red-500/30 text-red-400'
                  }`}
                >
                  <div
                    className={`w-1.5 h-1.5 ${
                      wsConnected
                        ? 'bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.8)]'
                        : 'bg-red-400 shadow-[0_0_8px_rgba(248,113,113,0.8)]'
                    }`}
                  />
                  <span className="text-xs font-bold uppercase tracking-widest font-mono">
                    {wsConnected ? 'Online' : 'Offline'}
                  </span>
                </div>

                <button
                  onClick={onToggleTheme}
                  className="btn-icon rounded-none"
                  title="Toggle Theme"
                  type="button"
                >
                  {preferences.theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                </button>

                <button
                  onClick={onRefresh}
                  disabled={refreshing}
                  className="btn-icon rounded-none"
                  title="Refresh All Data"
                  type="button"
                >
                  <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>
          </div>

          <nav className="flex items-center gap-1 border-t border-cyan-500/10 pt-4">
            {navItems.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => onPageChange(item.key)}
                className={`flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-widest transition-all font-mono border border-transparent ${
                  currentPage === item.key
                    ? 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30 shadow-[0_0_10px_rgba(6,182,212,0.1)]'
                    : 'text-text-secondary hover:text-white hover:bg-white/5 hover:border-white/10'
                }`}
              >
                <item.icon size={14} />
                {item.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 w-full">
        {contentPlaceholder ? (
          <div className="space-y-4 w-full" aria-hidden>
            <div className="h-36 w-full rounded border border-cyan-500/10 bg-cyan-500/[0.07]" />
            <div className="h-52 w-full rounded border border-cyan-500/10 bg-white/[0.04]" />
            <div className="h-40 w-full rounded border border-cyan-500/10 bg-white/[0.03] md:block hidden" />
          </div>
        ) : (
          children
        )}
      </main>

      <div className="fixed bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-bg-primary to-transparent pointer-events-none -z-10" />
    </div>
  );
}
