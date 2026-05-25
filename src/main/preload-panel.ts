// Preload for the notch panel renderer. Exposes a small, purpose-built bridge
// (window.llamasAPI) rather than the legacy explanation preload.

import { contextBridge, ipcRenderer } from 'electron';

export interface PanelQueryRequest {
  kind: 'text' | 'image';
  presetId?: string;
  freeText?: string;
  /** Pre-captured selection (sent by main when the hotkey fires). */
  selection?: string;
  sourceApp?: string;
  imagePath?: string;
  /** Model the user picked in the panel. */
  userSelectedModel?: string;
  /** Auto-open the notebook when done (default true). */
  autoOpen?: boolean;
}

export interface PanelQueryResult {
  ok: boolean;
  answer?: string;
  model?: string;
  entryId?: string;
  error?: string;
}

export interface PanelCaptured {
  selection: string;
  sourceApp?: string;
  /** true when capture failed and the user should paste/type instead. */
  empty: boolean;
}

const api = {
  /** Run a query end to end (the answer streams into the notebook window, not here). */
  runQuery: (req: PanelQueryRequest): Promise<PanelQueryResult> => ipcRenderer.invoke('panel:run-query', req),
  /** Trigger interactive region screenshot; returns the saved path or null (cancel). */
  captureScreenshot: (): Promise<string | null> => ipcRenderer.invoke('panel:screenshot'),
  /** List installed local models for the picker. */
  listModels: (): Promise<string[]> => ipcRenderer.invoke('panel:models'),
  /** Open the notebook window now (watch the answer stream in). */
  openNotebook: () => ipcRenderer.send('open-notebook'),
  /** Open the settings window (pull models, add cloud keys). */
  openSettings: () => ipcRenderer.send('open-settings'),
  /** Capture the current selection on demand (used when the panel opens via hover). */
  requestCapture: (): Promise<{ selection: string; sourceApp?: string; empty: boolean }> => ipcRenderer.invoke('panel:capture'),
  /** Collapse the panel back to the idle island. */
  close: () => ipcRenderer.send('panel:close'),
  /** Toggle whether the window captures mouse events (true) or is click-through (false). */
  setInteractive: (on: boolean) => ipcRenderer.send('panel:set-interactive', on),

  /** Fired when the hotkey captured a selection (prefill the panel). */
  onCaptured: (cb: (data: PanelCaptured) => void) => {
    const h = (_e: unknown, data: PanelCaptured) => cb(data);
    ipcRenderer.on('panel:captured', h);
    return () => ipcRenderer.removeListener('panel:captured', h);
  },
  /** Main asks the panel to expand (hotkey/tray). */
  onExpand: (cb: () => void) => {
    const h = () => cb();
    ipcRenderer.on('panel:expand', h);
    return () => ipcRenderer.removeListener('panel:expand', h);
  },
  /** Main asks the panel to collapse to the idle island (blur). */
  onCollapse: (cb: () => void) => {
    const h = () => cb();
    ipcRenderer.on('panel:collapse', h);
    return () => ipcRenderer.removeListener('panel:collapse', h);
  },
};

contextBridge.exposeInMainWorld('llamasAPI', api);

export type LlamasAPI = typeof api;
