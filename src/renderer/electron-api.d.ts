// Type definitions for electronAPI
declare global {
  interface Window {
    electronAPI: {
      // Context file operations
      addContextFile: (filePath: string) => Promise<{ success: boolean; filePath?: string; error?: string }>;
      
      // Translation operations
      translateCode: (code: string, detailLevel: string) => Promise<{ success: boolean; explanation?: string; language?: string; error?: string }>;
      
      // Clipboard operations
      getClipboardLineCount: () => Promise<number>;
      
      // Event listeners
      onExplanationData: (callback: (data: any) => void) => void;
      onClipboardUpdate: (callback: (data: { lineCount: number; charCount: number; hasContent: boolean }) => void) => void;
      onOpenSettingsPage: (callback: () => void) => void;
      onOpenNotebookInExplanation: (callback: () => void) => void;
      
      // Settings page control
      openSettingsPage: () => void;
      openNotebookInExplanation: () => void;
      
      // Notebook operations
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
      getAllTags: () => Promise<{ success: boolean; tags?: string[]; error?: string }>;
      getAllLanguages: () => Promise<{ success: boolean; languages?: string[]; error?: string }>;
      exportExplanations: (format: 'json' | 'markdown') => Promise<{ success: boolean; data?: string; error?: string }>;
      
      // Remove event listeners
      removeExplanationDataListener: () => void;
      removeClipboardUpdateListener: () => void;
      removeOpenSettingsPageListener: () => void;
      
      // Window control operations
      windowClose: () => Promise<{ success: boolean }>;
      windowMinimize: () => Promise<{ success: boolean }>;
      windowMaximize: () => Promise<{ success: boolean }>;
      
      // Authentication operations
      authLogin: () => Promise<{ success: boolean; error?: string }>;
      authBypassLogin: () => Promise<{ success: boolean; error?: string }>;
      authLogout: () => Promise<{ success: boolean; error?: string }>;
      authGetUser: () => Promise<{ success: boolean; user?: any; error?: string }>;
      authIsAuthenticated: () => Promise<{ success: boolean; isAuthenticated: boolean }>;
      authAddPoints: (points: number) => Promise<{ success: boolean; error?: string }>;
      authUpdateProfile: (updates: any) => Promise<{ success: boolean; error?: string }>;
      
      // License operations
      getLicenseInfo: () => Promise<{ success: boolean; licenseInfo?: any; isFreeMode?: boolean; config?: any; error?: string }>;
      startTrial: () => Promise<{ success: boolean; licenseInfo?: any; error?: string }>;
      
      // Gamification operations
      gamificationGetAchievements: () => Promise<{ success: boolean; achievements?: any[]; error?: string }>;
      gamificationGetOutfitItems: () => Promise<{ success: boolean; items?: any[]; error?: string }>;
      gamificationPurchaseItem: (itemId: string, userPoints: number) => Promise<{ success: boolean; item?: any; error?: string }>;
      
      // External operations
      openExternal: (url: string) => Promise<{ success: boolean; error?: string }>;
      
      // Website authentication operations
      openAuthWebsite: () => Promise<{ success: boolean; error?: string }>;
      closeLoginWindow: () => Promise<{ success: boolean; error?: string }>;
    };
  }
}

export {};
