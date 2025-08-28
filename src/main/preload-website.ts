import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  sendAuthSuccess: (userData: any) => ipcRenderer.invoke('auth-success', userData),
  continueToApplication: () => ipcRenderer.invoke('continue-to-application'),
  isElectron: true
});
