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
