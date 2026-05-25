// Preload for the notebook window. Receives streaming answers from the main process.

import { contextBridge, ipcRenderer } from 'electron';

export interface NotebookMeta {
  prompt: string;        // action label (Explain / Debug / …) or freeform question
  selection: string;     // captured text
  sourceApp?: string;
  model: string;
}

export interface NoteSummary {
  id: string;
  title: string;
  snippet: string;
  sourceApp?: string;
  pinned: boolean;
  createdAt: string;
}

const api = {
  // Notes-app operations
  openSettings: () => ipcRenderer.send('open-settings'),
  list: (): Promise<NoteSummary[]> => ipcRenderer.invoke('notebook:list'),
  search: (query: string): Promise<Array<{ id: string; snippet: string; tags: string[] }>> => ipcRenderer.invoke('notebook:search', query),
  getBody: (id: string): Promise<string | null> => ipcRenderer.invoke('notebook:get', id),
  rename: (id: string, title: string): Promise<void> => ipcRenderer.invoke('notebook:rename', id, title),
  setPinned: (id: string, pinned: boolean): Promise<void> => ipcRenderer.invoke('notebook:pin', id, pinned),
  updateBody: (id: string, body: string): Promise<void> => ipcRenderer.invoke('notebook:update-body', id, body),
  /** Fired after a streamed answer is saved (id of the new note). */
  onSaved: (cb: (id: string) => void) => {
    const h = (_e: unknown, id: string) => cb(id);
    ipcRenderer.on('notebook:saved', h);
    return () => ipcRenderer.removeListener('notebook:saved', h);
  },

  /** A new query started — reset the view with its metadata. */
  onStart: (cb: (meta: NotebookMeta) => void) => {
    const h = (_e: unknown, meta: NotebookMeta) => cb(meta);
    ipcRenderer.on('notebook:start', h);
    return () => ipcRenderer.removeListener('notebook:start', h);
  },
  /** Streaming answer tokens (cumulative string). */
  onToken: (cb: (partial: string) => void) => {
    const h = (_e: unknown, partial: string) => cb(partial);
    ipcRenderer.on('notebook:token', h);
    return () => ipcRenderer.removeListener('notebook:token', h);
  },
  /** Query finished (final answer). */
  onDone: (cb: (answer: string) => void) => {
    const h = (_e: unknown, answer: string) => cb(answer);
    ipcRenderer.on('notebook:done', h);
    return () => ipcRenderer.removeListener('notebook:done', h);
  },
  /** Query errored. */
  onError: (cb: (message: string) => void) => {
    const h = (_e: unknown, message: string) => cb(message);
    ipcRenderer.on('notebook:error', h);
    return () => ipcRenderer.removeListener('notebook:error', h);
  },
};

contextBridge.exposeInMainWorld('notebookAPI', api);
export type NotebookAPI = typeof api;
