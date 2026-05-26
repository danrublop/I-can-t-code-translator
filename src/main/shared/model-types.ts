// Shared model DTOs for the Models page IPC contract.
//
// These are plain data shapes crossing the main↔renderer boundary (models:list-detailed,
// models:catalog). They live here (not duplicated in the preload and the renderer) so the
// shape has one definition. Pure types — no electron import — so the renderer can pull them
// in with `import type` at zero runtime cost. The Window-bridge interfaces (NotebookAPI /
// SettingsAPI) still get re-declared per side, because those wrap ipcRenderer and can't be
// shared across the contextBridge.

/** RAM-fit classification from model-capability.fitFor (local models). */
export type Fit = 'comfortable' | 'tight' | 'wont-fit';

/** Fit as surfaced to the UI — adds 'cloud' for hosted models (no local RAM cost). */
export type ModelFit = Fit | 'cloud';

export interface DetailedModel {
  id: string;
  provider: 'ollama' | 'cloud';
  sizeBytes: number;
  vision: boolean;
  installed: boolean;
  fit: ModelFit;
}

export interface CatalogEntry {
  id: string;
  label: string;
  sizeBytes: number;
  vision: boolean;
  note: string;
  installed: boolean;
  fit: ModelFit;
}

export interface ModelsList {
  totalRamBytes: number;
  models: DetailedModel[];
  defaultTextModel: string;
  defaultVisionModel: string;
}
