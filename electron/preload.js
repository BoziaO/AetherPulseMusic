const { contextBridge, ipcMain, ipcRenderer } = require('electron');

/**
 * Expose IPC methods do window.electron
 */
contextBridge.exposeInMainWorld('electron', {
  // Konfiguracja aplikacji
  getConfig: () => ipcRenderer.invoke('get-config'),
  getVersion: () => ipcRenderer.invoke('app-version'),
  getUserDataPath: () => ipcRenderer.invoke('get-user-data-path'),
  getDownloadsPath: () => ipcRenderer.invoke('get-downloads-path'),
  
  // Akcje
  restartApp: () => ipcRenderer.invoke('restart-app'),
  
  // Platform check
  platform: process.platform,
  isElectron: true,
});

console.log('[Preload] Electron API exposed to window.electron');
