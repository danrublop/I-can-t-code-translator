// Preload for the notebook window. Receives streaming answers from the main process.

import { contextBridge, ipcRenderer } from 'electron';

export interface NotebookMeta {
  prompt: string;        // action label (Explain / Debug / …) or freeform question
  selection: string;     // captured text
  sourceApp?: string;
  model: string;
}

const api = {
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
