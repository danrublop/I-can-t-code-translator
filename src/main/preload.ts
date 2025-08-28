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
  
  onOpenNotebookInExplanation: (callback: () => void) => {
    ipcRenderer.on('open-notebook-in-explanation', () => callback());
  },
  
  // Settings page control
  openSettingsPage: () => {
    // Send IPC message to main process to open settings page
    ipcRenderer.send('open-settings-page');
  },
  
  // Notebook operations
  openNotebookInExplanation: () => {
    ipcRenderer.send('open-notebook-in-explanation');
  },
  
  saveExplanation: (data: {
    code: string;
    language: string;
    explanation: string;
    title?: string;
    tags?: string[];
  }) => ipcRenderer.invoke('save-explanation', data),
  
  getAllExplanations: () => ipcRenderer.invoke('get-all-explanations'),
  
  searchExplanations: (query: string) => ipcRenderer.invoke('search-explanations', query),
  
  deleteExplanation: (id: string) => ipcRenderer.invoke('delete-explanation', id),
  
  // License management
  getLicenseInfo: () => ipcRenderer.invoke('get-license-info'),
  startTrial: () => ipcRenderer.invoke('start-trial'),
  
  getAllTags: () => ipcRenderer.invoke('get-all-tags'),
  
  getAllLanguages: () => ipcRenderer.invoke('get-all-languages'),
  
  exportExplanations: (format: 'json' | 'markdown') => ipcRenderer.invoke('export-explanations', format),
  
  // Remove event listeners
  removeExplanationDataListener: () => {
    ipcRenderer.removeAllListeners('explanation-data');
  },
  
  removeClipboardUpdateListener: () => {
    ipcRenderer.removeAllListeners('clipboard-update');
  },
  
  removeOpenSettingsPageListener: () => {
    ipcRenderer.removeAllListeners('open-settings-page');
  },

  // Authentication state change listener
  onAuthStateChanged: (callback: (data: { isAuthenticated: boolean; user?: any }) => void) => {
    ipcRenderer.on('auth-state-changed', (_, data) => callback(data));
  },
  
  removeAuthStateChangedListener: () => {
    ipcRenderer.removeAllListeners('auth-state-changed');
  },

  // Authentication status listener (for initial status)
  onAuthStatus: (callback: (data: { isAuthenticated: boolean; user?: any }) => void) => {
    ipcRenderer.on('auth-status', (_, data) => callback(data));
  },
  
  removeAuthStatusListener: () => {
    ipcRenderer.removeAllListeners('auth-status');
  },

  // Window control operations
  windowClose: () => ipcRenderer.invoke('window-close'),
  windowMinimize: () => ipcRenderer.invoke('window-minimize'),
  windowMaximize: () => ipcRenderer.invoke('window-maximize'),

  // Authentication operations
  authLogin: () => ipcRenderer.invoke('auth-login'),
  authBypassLogin: () => ipcRenderer.invoke('auth-bypass-login'),
  authLogout: () => ipcRenderer.invoke('auth-logout'),
  authGetUser: () => ipcRenderer.invoke('auth-get-user'),
  authIsAuthenticated: () => ipcRenderer.invoke('auth-is-authenticated'),
  authRefreshState: () => ipcRenderer.invoke('auth-refresh-state'),
  authAddPoints: (points: number) => ipcRenderer.invoke('auth-add-points', points),
  authUpdateProfile: (updates: any) => ipcRenderer.invoke('auth-update-profile', updates),

  // Gamification operations
  gamificationGetAchievements: () => ipcRenderer.invoke('gamification-get-achievements'),
  gamificationGetOutfitItems: () => ipcRenderer.invoke('gamification-get-outfit-items'),
  gamificationPurchaseItem: (itemId: string, userPoints: number) => 
    ipcRenderer.invoke('gamification-purchase-item', itemId, userPoints),

  // External operations
  openExternal: (url: string) => ipcRenderer.invoke('open-external', url),
  
  // Website authentication operations
  openAuthWebsite: () => ipcRenderer.invoke('open-auth-website'),
  closeLoginWindow: () => ipcRenderer.invoke('close-login-window'),
  
  // Website-specific operations (for website authentication window)
  sendAuthSuccess: (userData: any) => ipcRenderer.invoke('auth-success', userData)
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
      onOpenSettingsPage: (callback: () => void) => void;
      onOpenNotebookInExplanation: (callback: () => void) => void;
      openSettingsPage: () => void;
      openNotebookInExplanation: () => void;
      saveExplanation: (data: {
        code: string;
        language: string;
        explanation: string;
        title?: string;
        tags?: string[];
      }) => Promise<{ success: boolean; explanation?: any; error?: string }>;
      getAllExplanations: () => Promise<{ success: boolean; explanations?: any[]; error?: string }>;
      searchExplanations: (query: string) => Promise<{ success: boolean; explanations?: any[]; error?: string }>;
      deleteExplanation: (id: string) => Promise<{ success: boolean; error?: string }>;
      
      // License management
      getLicenseInfo: () => Promise<{ 
        success: boolean; 
        licenseInfo?: any; 
        isFreeMode?: boolean; 
        config?: any; 
        error?: string 
      }>;
      startTrial: () => Promise<{ success: boolean; licenseInfo?: any; error?: string }>;
      
      getAllTags: () => Promise<{ success: boolean; tags?: string[]; error?: string }>;
      getAllLanguages: () => Promise<{ success: boolean; languages?: string[]; error?: string }>;
      exportExplanations: (format: 'json' | 'markdown') => Promise<{ success: boolean; data?: string; error?: string }>;
      removeExplanationDataListener: () => void;
      removeClipboardUpdateListener: () => void;
      removeOpenSettingsPageListener: () => void;
      
      // Authentication state change listener
      onAuthStateChanged: (callback: (data: { isAuthenticated: boolean; user?: any }) => void) => void;
      removeAuthStateChangedListener: () => void;
      
      // Authentication status listener (for initial status)
      onAuthStatus: (callback: (data: { isAuthenticated: boolean; user?: any }) => void) => void;
      removeAuthStatusListener: () => void;
      
      windowClose: () => Promise<{ success: boolean }>;
      windowMinimize: () => Promise<{ success: boolean }>;
      windowMaximize: () => Promise<{ success: boolean }>;
      
      // Authentication operations
      authLogin: () => Promise<{ success: boolean; error?: string }>;
      authBypassLogin: () => Promise<{ success: boolean; error?: string }>;
      authLogout: () => Promise<{ success: boolean; error?: string }>;
      authGetUser: () => Promise<{ success: boolean; user?: any; error?: string }>;
      authIsAuthenticated: () => Promise<{ success: boolean; isAuthenticated: boolean }>;
      authRefreshState: () => Promise<{ success: boolean; isAuthenticated?: boolean; user?: any; error?: string }>;
      authAddPoints: (points: number) => Promise<{ success: boolean; error?: string }>;
      authUpdateProfile: (updates: any) => Promise<{ success: boolean; error?: string }>;

      // Gamification operations
      gamificationGetAchievements: () => Promise<{ success: boolean; achievements?: any[]; error?: string }>;
      gamificationGetOutfitItems: () => Promise<{ success: boolean; items?: any[]; error?: string }>;
      gamificationPurchaseItem: (itemId: string, userPoints: number) => Promise<{ success: boolean; item?: any; error?: string }>;

      // External operations
      openExternal: (url: string) => Promise<{ success: boolean; error?: string }>;
      
      // Website authentication operations
      openAuthWebsite: () => Promise<{ success: boolean; error?: string }>;
      closeLoginWindow: () => Promise<{ success: boolean; error?: string }>;
      
      // Website-specific operations (for website authentication window)
      sendAuthSuccess: (userData: any) => Promise<{ success: boolean; error?: string }>;
    };
  }
}
