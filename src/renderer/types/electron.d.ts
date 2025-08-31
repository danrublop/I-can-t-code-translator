// Extend the global Window interface to include electronAPI
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
      }) => Promise<{ success: boolean; explanation?: any; error?: string; isDuplicate?: boolean }>;
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
      
      // Ollama operations
      getOllamaStatus: () => Promise<{ 
        success: boolean; 
        status?: {
          isRunning: boolean;
          isStarting: boolean;
          error?: string;
        };
        error?: string 
      }>;
      startOllama: () => Promise<{ 
        success: boolean; 
        status?: {
          isRunning: boolean;
          isStarting: boolean;
          error?: string;
        };
        error?: string 
      }>;
      
      // Session management
      getSessionInfo: () => Promise<{
        success: boolean;
        sessionInfo?: {
          daysRemaining: number;
          expiresAt: Date;
          appVersion: string;
        } | null;
        error?: string;
      }>;
      extendSession: () => Promise<{ success: boolean; error?: string }>;
      
      // Version checking
      checkForUpdates: () => Promise<{
        success: boolean;
        versionInfo?: {
          appVersion: string;
          websiteVersion: string;
          hasUpdate: boolean;
          updateAvailable?: {
            version: string;
            releaseNotes: string;
            downloadUrl: string;
          };
        };
        error?: string;
      }>;
      forceVersionCheck: () => Promise<{
        success: boolean;
        requiresReauth?: boolean;
        error?: string;
      }>;
    };
  }
}

// Declare module for PNG imports
declare module '*.png' {
  const value: string;
  export default value;
}

declare module '*.jpg' {
  const value: string;
  export default value;
}

declare module '*.jpeg' {
  const value: string;
  export default value;
}

declare module '*.gif' {
  const value: string;
  export default value;
}

declare module '*.svg' {
  const value: string;
  export default value;
}

export {};
