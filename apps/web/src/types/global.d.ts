export {};

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
    };
  }
}
