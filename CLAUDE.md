# CLAUDE.md

Guidance for working in this repo.

## What this is

**Llamas Remote** — an Electron + React + TypeScript macOS app. A Dynamic-Island-style notch
panel captures the current selection (or a screen region), asks a local/cloud LLM, and streams
the answer into a searchable Markdown notebook.

History: this repo was previously "Code Explainer" / "i cant code" (a Mistral code-explanation
popup). It pivoted to the notch/notebook product. Pre-pivot docs and dead services were removed;
if you find references to the old names, they are stale.

## Commands

```bash
npm run dev      # build main + watch renderer + launch electron
npm run build    # compile main (tsc) + renderer (webpack)
npm run dist:mac # package a universal macOS dmg/zip
```

## Testing

- Framework: **vitest**. Run: `npm test` (CI) or `npm run test:watch`.
- Tests live next to the code as `*.test.ts` under `src/main/services`.
- The service layer is designed for headless unit tests: dependencies (capture provider, LLM
  client, clock, id, clipboard) are injected, so the core flow runs without Electron or Ollama.
- `sqlite-index.ts` is **not** unit-tested (native module built for the Electron ABI); the store
  logic is tested through an in-memory fake index (`memory-index.ts`). Verify SQLite at runtime.

## Architecture map

```
src/main/
  main.ts                       window / tray / global-shortcut / IPC glue (runtime only)
  services/
    capture/                    on-demand selection capture (accessibility stub → clipboard fallback)
    vision/screenshot.ts        screencapture -i region grab
    llm/                        MultiLlmClient routes by model id → ollama | openai | anthropic
    notch/notch-controller.ts   orchestration: build prompt → route model → stream → save
    router/model-router.ts      pure model-selection precedence
    presets/                    built-in action prompts (Debug/Translate/…)
    notebook/                   MarkdownStore (truth) + SqliteNotebookIndex (FTS5) + reconcile
    settings/                   API keys, encrypted at rest via safeStorage
    ollama-process.service.ts   auto-start / install Ollama
src/renderer/
  panel.tsx                     the notch HUD
  notebook.tsx                  notebook + in-pane settings
  preload-panel.ts / preload-notebook.ts   narrow contextBridge IPC surfaces
```

## Conventions

- Markdown files in `userData/notebook/` are the source of truth; the SQLite index is rebuilt
  from disk on launch (`reconcile.ts`). Never treat the DB as authoritative over the files.
- Renderer security: `contextIsolation: true`, `nodeIntegration: false`. All main↔renderer
  traffic goes through the preload bridges — don't widen them without reason.
- Model output rendered into the notebook is sanitized with DOMPurify before display.
- Capture/screenshot/tray shell out via `execFile` with fixed args (no shell) — keep it that way.

## Open work

See `TODOS.md` for deferred items (capture wiring, stream cancellation, cross-platform install,
streaming races). Check it before starting adjacent work.
