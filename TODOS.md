# TODOS

Deferred work from the 2026-05-25 CEO review of the local-LLM notch/notebook pivot.
See the full plan: `~/.gstack/projects/danrublop-Code-Explainer/ceo-plans/2026-05-25-local-llm-notch-notebook.md`

## P2 — Local RAG over folders / notebook
- **What:** Index the user's own documents and the saved notebook for retrieval-augmented local answers.
- **Why:** The natural next differentiator after the capture→ask→persist loop; turns the notebook from storage into a queryable knowledge base. GPT4All proves the demand.
- **Context:** Notebook already stores markdown + a SQLite FTS5 index (v1). RAG adds a local embedding model (via Ollama) + vector store. Start by embedding existing notebook entries.
- **Effort:** L (human) → M (CC). **Depends on:** v1 notebook persistence shipped.

## P2 — Full task-based model auto-routing
- **What:** Pick the local model by task type (code / general / long-context), beyond v1's vision-autodetect + manual pick.
- **Why:** Hides model complexity = the "easily use local LLMs" promise. Was scoped down in v1 (first-to-cut) to avoid ambiguity.
- **Context:** Needs a defined routing decision table: inputs = source app, language (from code-analysis.service), selection length, preset. Was deferred because the heuristic was under-specified at plan time.
- **Effort:** M (human) → S (CC). **Depends on:** v1 manual picker + presets shipped.

## P3 — Opt-in auto-popup on selection (continuous monitoring)
- **What:** Optional mode where the app watches selections and shows a Look-Up-style affordance the moment you highlight text.
- **Why:** Better discovery UX than remembering a hotkey. Deferred from eng review E4.
- **Context:** selection-hook supports a continuous monitoring mode. Kept OFF in v1 for battery + privacy (the "we never read anything until you ask" story). Ship as explicit opt-in toggle if users ask.
- **Effort:** S (human) → S (CC). **Depends on:** v1 CaptureProvider shipped.

## P2/P3 — Re-runnable notebook cells
- **What:** Make each saved answer an editable cell you can re-run against a model, Jupyter-style.
- **Why:** Pushes toward the 12-month "living notebook" vision where chat IS the notebook.
- **Context:** v1 entries are immutable saved answers with a `conversation_id`. This adds edit + re-execute + cell ordering UX. Larger UX surface; sequence after core loop is loved.
- **Effort:** L (human) → M (CC). **Depends on:** v1 notebook + full app window shipped.

---

## From the 2026-05-26 eng review (deferred from a cleanup pass)

Cleanup + dead-code removal landed; these correctness/robustness items were triaged out and
captured here so they aren't lost. Roughly priority-ordered.

### P1 — Cross-platform Ollama start/install is broken
- **What:** `ollama-process.service.ts` `getOllamaCommand()` has dead code (`return 'ollama.exe'` after a `return`) and **no `win32` branch**, so Windows resolves to `'ollama'`. `installOllama()` pipes `curl … install.sh | sh` via `sudo-prompt` for **both** macOS and Linux, but that script is the Linux installer (macOS ships a `.app`/dmg).
- **Why:** Auto-start fails on Windows; macOS auto-install can't work; piping a network script into a root shell is a supply-chain smell in a signed, hardened-runtime app.
- **How to start:** Add a real `win32` case; on macOS detect the Ollama.app / `brew` instead of `curl|sh`; or simplest — drop auto-install and link users to ollama.com on failure. Keep `sudo-prompt` only if a real install path needs it.
- **Effort:** M (human) → S (CC).

### P1 — First-query streaming is invisible
- **What:** `main.ts` `panel:run-query` calls `createNotebookWindow()` then immediately `sendNotebook('notebook:start'/'token')`. On the first query the renderer hasn't finished loading, so those events drop; only `done`/`saved` land seconds later. `showSettings()` already waits for `did-finish-load` — `run-query` should too.
- **Why:** First answer after launch appears to hang, then pops in fully formed — looks broken.
- **How to start:** Gate the first `notebook:start`/token send on `webContents.once('did-finish-load')` when the window was freshly created (mirror `showSettings`).
- **Effort:** S (human) → S (CC).

### P2 — No cancellation for in-flight LLM streams
- **What:** None of the three LLM clients accept an `AbortSignal`. Closing the panel or starting a new query leaves the old axios stream running and still firing `onToken`.
- **Why:** A 5-minute local generation can't be stopped; stale tokens can bleed into the wrong note (see next item).
- **How to start:** Thread an `AbortSignal` through `LlmClient.generate` and pass `signal` to axios; abort on panel close / new query. Pairs with extracting the shared stream parser (below).
- **Effort:** M (human) → S (CC).

### P2 — Concurrent queries race into one notebook window
- **What:** The `notebook:*` IPC channel carries no request id. Firing query B while A streams: B's `notebook:start` resets the editor, but A's late `token`/`done` still arrive and overwrite.
- **Why:** Interleaved/overwritten answers; the saved note can mismatch its title/metadata.
- **How to start:** Tag each run with an id; the renderer ignores tokens whose id isn't the active one. Cancellation (above) reduces the window further.
- **Effort:** M (human) → S (CC).

### P2 — Capture honesty: accessibility path is a stub
- **What:** `mac-capture.ts` `readAccessibilitySelection()` always returns `null` and `selection-hook` isn't a dependency, so every capture uses the synthetic `Cmd+C` fallback — but the comments describe an accessibility-first reader that doesn't exist. The clipboard fallback also only snapshots/restores the **text** representation, so an image/file on the clipboard is lost on each capture.
- **Why:** Misleading comments; silent clipboard data loss for non-text clipboards; apps that ignore synthetic Cmd+C return nothing.
- **How to start:** Either wire `selection-hook` (or a native AX read) for real, or rewrite the comments to state clipboard-only reality and snapshot/restore all clipboard formats.
- **Effort:** M (human) → M (CC).

### P3 — Markdown serializer isn't comma/quote-safe for tags
- **What:** `markdown-store.ts` parses the `tags: [a, b]` flow list by splitting on `,` before unescaping, so a tag containing a comma doesn't round-trip. `esc()` only quotes on `:#\n`. (Covered as a known limitation in `markdown-store.test.ts`.)
- **Why:** Low real risk today (tags are app name + language), but it's silent corruption of the source-of-truth files if a comma ever lands in a tag.
- **How to start:** Quote-aware split, or store tags as JSON. Add the comma round-trip case to the test once fixed.
- **Effort:** S (human) → S (CC).

### P3 — Cloud vision is silently dropped
- **What:** `model-router.ts` forces the local `visionModel` (llava) for any image even when the user picked a vision-capable cloud model (e.g. gpt-4o), and the OpenAI/Anthropic clients don't accept `imagePath` at all. Result: a screenshot with a cloud model selected switches to llava, which may not be installed → confusing error.
- **Why:** Surprising model switch; broken UX if llava isn't pulled.
- **How to start:** Let cloud clients take an image (both APIs support it), and only force llava when the selected model isn't vision-capable.
- **Effort:** M (human) → S (CC).

### P3 — Surface cloud API error bodies
- **What:** Only the Ollama client reads the error response stream for a useful message. OpenAI/Anthropic show `error.message` ("Request failed with status code 400") except for 401.
- **Why:** Users can't tell why a cloud call failed (bad model, quota, etc.).
- **How to start:** Read `error.response.data` (stream) like `ollama-llm-client.ts` does and include the API's message.
- **Effort:** S (human) → S (CC).

### P3 — Unprompted model download on launch
- **What:** `main.ts` `startOllamaIfNeeded()` calls `ensureModelAvailable('mistral:latest')`, pulling ~4GB on first run with no UI or consent. `DEFAULT_TEXT_MODEL` is also a leftover from the pre-pivot app.
- **Why:** Surprise multi-GB download; `mistral` may not be the model the user wants as default.
- **How to start:** Make the default model a setting; pull on first use with a progress UI (the pull-progress IPC already exists) instead of silently on launch.
- **Effort:** S (human) → S (CC).

### P3 — Wire structured logging
- **What:** `electron-log` was removed in the cleanup pass (it was an unused dependency); `src/main` has ~45 raw `console.*` calls that produce no output in a packaged build.
- **Why:** No diagnostics from shipped apps when users hit capture/Ollama errors.
- **How to start:** Re-add a logger (electron-log or similar) and route main-process logs to a file; keep console in dev.
- **Effort:** S (human) → S (CC).
