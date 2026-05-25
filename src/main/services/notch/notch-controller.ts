// NotchController: the orchestration brain behind the notch panel.
//
//   capture/screenshot ─▶ pick preset ─▶ build prompt ─▶ route model ─▶ stream from LLM
//                                                                         │
//                                              save answer to notebook ◀──┘
//
// All deps are injected (capture provider, LLM client, router config, presets, notebook,
// clock/id) so the whole flow is unit-testable without Electron, Ollama, or a real model.
// The window/hotkey/renderer glue that calls this lives in main.ts (runtime).

import { routeModel, type RouterConfig } from '../router/model-router';
import { renderPrompt, canHandle, type Preset, type CaptureKind } from '../presets/presets';
import { makeEntry } from '../notebook/markdown-store';
import type { NotebookEntry } from '../notebook/types';
import type { CaptureResult } from '../capture/capture';

/** Minimal LLM port. The real impl wraps OllamaService. */
export interface LlmClient {
  generate(opts: {
    model: string;
    prompt: string;
    imagePath?: string;
    onToken?: (partial: string) => void;
  }): Promise<string>;
}

export interface NotebookSink {
  save(entry: NotebookEntry): void;
}

export interface NotchControllerDeps {
  llm: LlmClient;
  notebook: NotebookSink;
  routerConfig: RouterConfig;
  presets: readonly Preset[];
  /** id + clock injected for deterministic tests. */
  newId: () => string;
  now: () => string;
}

export interface QueryRequest {
  kind: CaptureKind;
  /** Preset id, if the user tapped an action pill. */
  presetId?: string;
  /** Freeform question typed into the panel (used when no preset, or appended). */
  freeText?: string;
  /** A model the user explicitly picked, if any. */
  userSelectedModel?: string;
  /** Capture for text queries. */
  capture?: CaptureResult;
  /** Screenshot path for image queries. */
  imagePath?: string;
  /** Language detected for the selection, if any (used as a tag). */
  language?: string;
  /** Stream callback for partial answer tokens. */
  onToken?: (partial: string) => void;
}

export interface QueryResult {
  answer: string;
  model: string;
  entry: NotebookEntry;
}

export class NotchController {
  constructor(private readonly deps: NotchControllerDeps) {}

  /**
   * Run a query end to end and persist the answer. Throws if there is no usable input
   * (so the caller can show the "couldn't read selection — paste or type" state).
   */
  async runQuery(req: QueryRequest): Promise<QueryResult> {
    const preset = req.presetId ? this.deps.presets.find((p) => p.id === req.presetId) : undefined;
    if (req.presetId && !preset) {
      throw new Error(`Unknown preset: ${req.presetId}`);
    }
    if (preset && !canHandle(preset, req.kind)) {
      throw new Error(`Preset "${preset.id}" does not accept ${req.kind} input`);
    }

    const selection = req.capture?.text ?? '';
    const prompt = this.buildPrompt(req, preset, selection);
    if (prompt.trim().length === 0) {
      throw new Error('Nothing to ask — no selection, screenshot, or question provided');
    }

    const { model } = routeModel(
      { kind: req.kind, preset, userSelectedModel: req.userSelectedModel },
      this.deps.routerConfig,
    );

    const answer = await this.deps.llm.generate({
      model,
      prompt,
      imagePath: req.kind === 'image' ? req.imagePath : undefined,
      onToken: req.onToken,
    });

    const entry = makeEntry({
      id: this.deps.newId(),
      title: this.buildTitle(req, preset, selection),
      body: answer,
      tags: this.buildTags(req),
      model,
      sourceApp: req.capture?.sourceApp ?? 'unknown',
      sourceKind: req.kind,
      createdAt: this.deps.now(),
      imagePath: req.kind === 'image' ? req.imagePath : undefined,
    });
    this.deps.notebook.save(entry);

    return { answer, model, entry };
  }

  private buildPrompt(req: QueryRequest, preset: Preset | undefined, selection: string): string {
    if (preset) {
      const base = renderPrompt(preset.promptTemplate, { selection, image: req.imagePath });
      // A typed follow-up appends to the preset prompt.
      return req.freeText?.trim() ? `${base}\n\n${req.freeText.trim()}` : base;
    }
    // No preset: freeform question about the selection, or just the selection/question.
    if (req.freeText?.trim() && selection.trim()) {
      return `${req.freeText.trim()}\n\n${selection}`;
    }
    return (req.freeText ?? selection).trim();
  }

  private buildTitle(req: QueryRequest, preset: Preset | undefined, selection: string): string {
    const base = preset?.name ?? (req.freeText?.trim() || (req.kind === 'image' ? 'Screenshot' : 'Note'));
    const context = (selection || req.freeText || '').replace(/\s+/g, ' ').trim().slice(0, 40);
    const title = context ? `${base} — ${context}` : base;
    return title.slice(0, 70);
  }

  private buildTags(req: QueryRequest): string[] {
    const tags: string[] = [];
    if (req.capture?.sourceApp) tags.push(req.capture.sourceApp);
    if (req.language) tags.push(req.language);
    return tags;
  }
}
