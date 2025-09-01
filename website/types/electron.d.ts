// TypeScript declarations for Electron API

declare global {
  interface Window {
    electronAPI?: {
      sendAuthSuccess: (userData: any) => Promise<{ success: boolean; error?: string }>;
      continueToApplication: () => Promise<{ success: boolean; error?: string }>;
      isElectron: boolean;
    };
  }
}

export {};
