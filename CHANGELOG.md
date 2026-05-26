# Changelog

All notable changes to Llamas Remote are documented here.
The format is based on [Keep a Changelog](https://keepachangelog.com/).

## [1.2.0] - 2026-05-26

### Added
- **Models page** in the notebook: see every model (installed + cloud), whether it fits your Mac's RAM (comfortable / tight / won't fit), pull recommended models, delete local ones, and set your default text and vision model.
- **Grab text from a screenshot** — a new notch button that pulls the text out of any screen region on-device (no model, no RAM cost) and drops it in as your selection.
- Screenshots can now use a cloud vision model (gpt-4o, Claude) when you've added an API key, not just local llava.

### Fixed
- Selection capture now reads the real selection via the macOS accessibility API (so it works in apps that ignore a synthetic copy), only falls back to Cmd+C on an explicit action, and never loses an image/file already on your clipboard.
- The first answer after launch now streams in instead of appearing to hang and popping in late.
- Starting a new question or closing the notebook now stops the previous answer instead of letting stale text bleed in.
- A vision model that runs out of memory now shows a clear message (free RAM / try a smaller model / use cloud) instead of a cryptic error.
- Cloud (OpenAI/Anthropic) errors now show the provider's real message instead of "Request failed with status code 400".
- Long answers no longer stutter while streaming.
- Your saved API keys survive a crash during a settings save.

### Changed
- Dropped the unsafe automatic Ollama installer; the app now detects Ollama and links you to ollama.com if it's missing.

## [1.1.1] - 2026-05-26

### Removed
- Deleted ~23 stale docs from the pre-pivot "Code Explainer" / "i cant code" eras and stray release/extract scripts.
- Removed two unused services (`ollama.service.ts`, `code-analysis.service.ts`, 646 LOC) that the notch/notebook pivot left stranded.
- Dropped unused dependencies: `electron-log`, `getos`, `@types/getos`.

### Changed
- Rewrote `README.md` to describe the current notch/notebook app instead of the old Mistral popup.
- Added `CLAUDE.md` with build/test commands, the pivot history, and an architecture map.

### Added
- Round-trip tests for the notebook's on-disk Markdown format (`markdown-store`).
- Tests for API-key persistence (`settings-service`): encrypt-at-rest, legacy-plaintext migration, and the silent-drop-on-corruption path.

### Tests
- Suite grew from 50 to 67 passing tests.
