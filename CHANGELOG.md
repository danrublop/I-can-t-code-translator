# Changelog

All notable changes to Llamas Remote are documented here.
The format is based on [Keep a Changelog](https://keepachangelog.com/).

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
