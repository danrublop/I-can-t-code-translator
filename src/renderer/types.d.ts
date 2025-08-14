declare global {
  interface Window {
    electronAPI: {
      addContextFile: (filePath: string) => Promise<{ success: boolean; filePath?: string; error?: string }>;
      translateCode: (code: string, detailLevel: string) => Promise<{ success: boolean; explanation?: string; language?: string; error?: string }>;
      getClipboardLineCount: () => Promise<number>;
      onExplanationData: (callback: (data: any) => void) => void;
      onClipboardUpdate: (callback: (data: { lineCount: number; charCount: number; hasContent: boolean }) => void) => void;
      onOpenSettingsPage: (callback: () => void) => void;
      openSettingsPage: () => void;
      removeExplanationDataListener: () => void;
      removeClipboardUpdateListener: () => void;
      removeOpenSettingsPageListener: () => void;
    };
  }
}

export {};
