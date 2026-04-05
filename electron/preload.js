const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  isPackaged: ipcRenderer.invoke('is-packaged'),
});
