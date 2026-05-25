// Notebook domain types + the index port.
//
// The SQLite/FTS5 side is hidden behind NotebookIndex so the store logic can be
// integration-tested headless (Node) with an in-memory fake, while the real app uses
// the better-sqlite3 implementation (which needs an Electron-ABI native build). This is
// the eng review's "index behind an interface, swappable" decision.

import type { IndexRow } from './reconcile';

export type SourceKind = 'text' | 'image';

/** One saved answer. The markdown FILE is the source of truth for `body`. */
export interface NotebookEntry {
  id: string;
  title: string;
  body: string;
  tags: string[];
  model: string;
  sourceApp: string;
  sourceKind: SourceKind;
  pinned: boolean;
  createdAt: string; // ISO 8601
}

export interface SearchHit {
  id: string;
  /** A short snippet of the matching body. */
  snippet: string;
  tags: string[];
}

/** Sidebar row for the notes list. */
export interface NoteSummary {
  id: string;
  title: string;
  snippet: string;
  sourceApp?: string;
  model?: string;
  pinned: boolean;
  createdAt: string;
}

/** Row written to the index. Mirrors NotebookEntry minus the body-of-truth nuance. */
export interface IndexUpsert {
  id: string;
  body: string;
  tags: string[];
  title?: string;
  model?: string;
  sourceApp?: string;
  sourceKind?: SourceKind;
  pinned?: boolean;
  createdAt?: string;
  /** File mtime (ms) recorded so future reconciles can detect on-disk edits. */
  indexedMtimeMs: number;
}

/**
 * The search index port. Implemented by SqliteNotebookIndex (FTS5, real app) and by an
 * in-memory fake in tests. Reconcile drives upsert/tombstone; the UI drives search.
 */
export interface NotebookIndex {
  /** All live + tombstoned rows, for reconcile. */
  allRows(): IndexRow[];
  /** Insert or replace a row (used for insert / reindex / revive actions). */
  upsert(row: IndexUpsert): void;
  /** Mark a row tombstoned (file gone from disk). */
  tombstone(id: string): void;
  /** Full-text search over live (non-tombstoned) rows. */
  search(query: string): SearchHit[];
  /** All live notes for the sidebar (pinned first, then newest). */
  list(): NoteSummary[];
  /** Full body of one note, or null. */
  getBody(id: string): string | null;
  /** Rename a note. */
  setTitle(id: string, title: string): void;
  /** Pin/unpin a note. */
  setPinned(id: string, pinned: boolean): void;
  /** Update a note's body (in-app edit). */
  updateBody(id: string, body: string): void;
  /** Release resources (close the DB handle). */
  close?(): void;
}
