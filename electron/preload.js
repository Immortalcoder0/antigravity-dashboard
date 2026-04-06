const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  getIsPackaged: () => ipcRenderer.invoke('electron:is-packaged'),
  retryDashboardLoad: () => ipcRenderer.invoke('electron:dashboard-retry'),
  relaunchApp: () => ipcRenderer.invoke('electron:relaunch-app'),
  getShellState: () => ipcRenderer.invoke('electron:get-shell-state'),
});

contextBridge.exposeInMainWorld('antigravityShell', {
  isElectron: true,
  platform: process.platform,
});
