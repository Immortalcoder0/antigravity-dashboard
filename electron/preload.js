const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  getIsPackaged: () => ipcRenderer.invoke('electron:is-packaged'),
  retryDashboardLoad: () => ipcRenderer.invoke('electron:dashboard-retry'),
});
