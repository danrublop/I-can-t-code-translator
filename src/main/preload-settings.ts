// Preload for the settings window.

import { contextBridge, ipcRenderer } from 'electron';

const api = {
  get: (): Promise<{ openaiKeySet: boolean; anthropicKeySet: boolean }> => ipcRenderer.invoke('settings:get'),
  setKey: (provider: 'openai' | 'anthropic', key: string): Promise<void> => ipcRenderer.invoke('settings:set-key', provider, key),
  listModels: (): Promise<string[]> => ipcRenderer.invoke('panel:models'),
  pullModel: (name: string): Promise<{ ok: boolean; error?: string }> => ipcRenderer.invoke('ollama:pull', name),
  onPullProgress: (cb: (p: { name: string; status: string; percent: number }) => void) => {
    const h = (_e: unknown, p: { name: string; status: string; percent: number }) => cb(p);
    ipcRenderer.on('settings:pull-progress', h);
    return () => ipcRenderer.removeListener('settings:pull-progress', h);
  },
};

contextBridge.exposeInMainWorld('settingsAPI', api);
export type SettingsAPI = typeof api;
