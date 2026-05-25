// Model router (eng review E3 / plan item 8, V1 scope).
//
// V1 is intentionally small: auto-detect vision (image input -> vision model) and
// otherwise honor the preset's model, then the user's picked model, then the global
// default. Full task-based routing (code vs general heuristics) is deferred to a TODO.
// Pure function; no Ollama calls here.

import type { CaptureKind, Preset } from '../presets/presets';

export interface RouterConfig {
  /** Default model for text queries when nothing more specific applies. */
  defaultTextModel: string;
  /** Model used whenever the input is an image. */
  visionModel: string;
}

export interface RouteInput {
  kind: CaptureKind;
  /** The active preset, if the query came from a one-tap action. */
  preset?: Preset;
  /** A model the user explicitly picked in the UI, if any. */
  userSelectedModel?: string;
}

export interface RouteResult {
  model: string;
  /** Why this model was chosen — surfaced in logs and (optionally) the UI. */
  reason: string;
}

/**
 * Resolve which local model should answer this query.
 *
 * Precedence:
 *   image input                -> visionModel            (vision is required for images)
 *   text + userSelectedModel   -> that model             (explicit pick wins)
 *   text + preset.defaultModel -> that model
 *   text (nothing else)        -> defaultTextModel
 */
export function routeModel(input: RouteInput, config: RouterConfig): RouteResult {
  if (input.kind === 'image') {
    // Images need a vision-capable model; the text picker can't be trusted to be one.
    return { model: config.visionModel, reason: 'image input routed to vision model' };
  }

  if (input.userSelectedModel) {
    return { model: input.userSelectedModel, reason: 'user-selected model' };
  }

  if (input.preset?.defaultModel) {
    return { model: input.preset.defaultModel, reason: `preset "${input.preset.id}" default model` };
  }

  return { model: config.defaultTextModel, reason: 'default text model' };
}
