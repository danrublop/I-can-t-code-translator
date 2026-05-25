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
  /** Run a query end to end; partial tokens arrive via onToken. */
  runQuery: (req: PanelQueryRequest): Promise<PanelQueryResult> => ipcRenderer.invoke('panel:run-query', req),
  /** Trigger interactive region screenshot; returns the saved path or null (cancel). */
  captureScreenshot: (): Promise<string | null> => ipcRenderer.invoke('panel:screenshot'),
  /** Full-text search the notebook. */
  search: (query: string) => ipcRenderer.invoke('panel:search', query) as Promise<Array<{ id: string; snippet: string; tags: string[] }>>,
  /** Hide the panel. */
  close: () => ipcRenderer.send('panel:close'),

  /** Streaming answer tokens (cumulative string). */
  onToken: (cb: (partial: string) => void) => {
    const h = (_e: unknown, partial: string) => cb(partial);
    ipcRenderer.on('panel:token', h);
    return () => ipcRenderer.removeListener('panel:token', h);
  },
  /** Fired when the hotkey captured a selection (prefill the panel). */
  onCaptured: (cb: (data: PanelCaptured) => void) => {
    const h = (_e: unknown, data: PanelCaptured) => cb(data);
    ipcRenderer.on('panel:captured', h);
    return () => ipcRenderer.removeListener('panel:captured', h);
  },
};

contextBridge.exposeInMainWorld('llamasAPI', api);

export type LlamasAPI = typeof api;
