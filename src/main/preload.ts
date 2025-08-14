import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Context file operations
  addContextFile: (filePath: string) => ipcRenderer.invoke('add-context-file', filePath),
  
  // Translation operations
  translateCode: (code: string, detailLevel: string) => 
    ipcRenderer.invoke('translate-code', code, detailLevel),
  
  // Clipboard operations
  getClipboardLineCount: () => ipcRenderer.invoke('get-clipboard-line-count'),
  
  // Event listeners
  onExplanationData: (callback: (data: any) => void) => {
    ipcRenderer.on('explanation-data', (_event, data) => callback(data));
  },
  
  onClipboardUpdate: (callback: (data: { lineCount: number; charCount: number; hasContent: boolean }) => void) => {
    ipcRenderer.on('clipboard-update', (_event, data) => callback(data));
  },
  
  onOpenSettingsPage: (callback: () => void) => {
    ipcRenderer.on('open-settings-page', () => callback());
  },
  
  // Settings page control
  openSettingsPage: () => {
    // Send IPC message to main process to open settings page
    ipcRenderer.send('open-settings-page');
  },
  
  // Remove event listeners
  removeExplanationDataListener: () => {
    ipcRenderer.removeAllListeners('explanation-data');
  },
  
  removeClipboardUpdateListener: () => {
    ipcRenderer.removeAllListeners('clipboard-update');
  },
  
  removeOpenSettingsPageListener: () => {
    ipcRenderer.removeAllListeners('open-settings-page');
  }
});

// Type definitions for TypeScript
declare global {
  interface Window {
    electronAPI: {
      addContextFile: (filePath: string) => Promise<{ success: boolean; filePath?: string; error?: string }>;
      translateCode: (code: string, detailLevel: string) => Promise<{ success: boolean; explanation?: string; language?: string; error?: string }>;
      getClipboardLineCount: () => Promise<number>;
      onExplanationData: (callback: (data: any) => void) => void;
      onClipboardUpdate: (callback: (data: { lineCount: number; charCount: number; hasContent: boolean }) => void) => void;
      removeExplanationDataListener: () => void;
      removeClipboardUpdateListener: () => void;
    };
  }
}
