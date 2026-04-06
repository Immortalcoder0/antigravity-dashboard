export {};

export interface ElectronShellState {
  backendHttpReady: boolean;
  port: number;
  origin: string;
}

declare global {
  interface Window {
    antigravityShell?: {
      readonly isElectron: boolean;
      readonly platform: string;
    };
    electronAPI?: {
      platform: string;
      getIsPackaged: () => Promise<boolean>;
      retryDashboardLoad: () => Promise<void>;
      relaunchApp: () => Promise<void>;
      getShellState: () => Promise<ElectronShellState>;
    };
  }
}
