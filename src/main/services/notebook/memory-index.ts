// In-memory NotebookIndex fallback.
//
// Used when the native SQLite module (better-sqlite3) hasn't been rebuilt for the current
// Electron ABI yet, so the app still launches and works (search/persistence just don't
// survive a restart). Also handy for the renderer-less smoke path. Search is a naive
// case-insensitive substring match — good enough as a fallback, replaced by FTS5 once
// the native module loads.

import type { IndexRow } from './reconcile';
import type { IndexUpsert, NotebookIndex, SearchHit } from './types';

interface Row {
  body: string;
  tags: string[];
  mtimeMs: number;
  tombstoned: boolean;
}

export class MemoryNotebookIndex implements NotebookIndex {
  private rows = new Map<string, Row>();

  allRows(): IndexRow[] {
    return [...this.rows.entries()].map(([id, r]) => ({
      id,
      tags: r.tags,
      indexedMtimeMs: r.mtimeMs,
      tombstoned: r.tombstoned,
    }));
  }

  upsert(row: IndexUpsert): void {
    this.rows.set(row.id, { body: row.body, tags: row.tags, mtimeMs: row.indexedMtimeMs, tombstoned: false });
  }

  tombstone(id: string): void {
    const r = this.rows.get(id);
    if (r) r.tombstoned = true;
  }

  search(query: string): SearchHit[] {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return [...this.rows.entries()]
      .filter(([, r]) => !r.tombstoned && r.body.toLowerCase().includes(q))
      .slice(0, 50)
      .map(([id, r]) => ({ id, snippet: r.body.slice(0, 80), tags: r.tags }));
  }
}
