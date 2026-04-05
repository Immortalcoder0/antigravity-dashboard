import { AlertTriangle, X } from 'lucide-react';
import type { UseElectronApiBannerResult } from '../hooks/useElectronApiBanner';

export interface ElectronApiBannerProps extends UseElectronApiBannerResult {
  onRetryConnection: () => void | Promise<void>;
}

export function ElectronApiBanner({
  visible,
  dismiss,
  onRetryConnection,
}: ElectronApiBannerProps) {
  if (!visible) {
    return null;
  }

  const reload = () => {
    window.location.reload();
  };

  return (
    <div
      role="alert"
      className="sticky top-0 z-[200] w-full border-b border-amber-500/35 bg-gradient-to-r from-amber-950/95 via-zinc-950/95 to-amber-950/95 backdrop-blur-md shadow-[0_8px_32px_rgba(0,0,0,0.45)]"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className="mt-0.5 shrink-0 p-1.5 border border-amber-500/40 bg-amber-500/10">
            <AlertTriangle className="w-4 h-4 text-amber-400" aria-hidden />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-amber-100 font-mono tracking-wide uppercase">
              Cannot reach local backend
            </p>
            <p className="text-xs text-amber-200/80 mt-1 leading-relaxed">
              The Antigravity dashboard needs the Express server on this machine. Check that the app
              sidecar is running, then retry or reload.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => void onRetryConnection()}
            className="px-4 py-2 text-xs font-bold uppercase tracking-widest font-mono border border-cyan-500/50 bg-cyan-500/15 text-cyan-100 hover:bg-cyan-500/25 transition-colors"
          >
            Retry connection
          </button>
          <button
            type="button"
            onClick={reload}
            className="px-4 py-2 text-xs font-bold uppercase tracking-widest font-mono border border-white/20 bg-white/5 text-white hover:bg-white/10 transition-colors"
          >
            Reload dashboard
          </button>
          <button
            type="button"
            onClick={dismiss}
            className="btn-icon rounded-none border border-white/15 text-text-muted hover:text-white"
            aria-label="Dismiss banner"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
