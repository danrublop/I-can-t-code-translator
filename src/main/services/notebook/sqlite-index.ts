// SQLite FTS5 implementation of NotebookIndex (real app only).
//
// NOT imported by tests: vitest runs under Node and better-sqlite3 is a native module
// built for the Electron ABI in the packaged app. The store's logic is tested headless
// via an in-memory fake (see notebook-store.test.ts); this file is exercised at runtime.
//
// Schema:
//   entries       canonical rows (mirrors the markdown files, incl. tombstones)
//   entries_fts   FTS5 over body + tags, kept in sync manually; tombstoned rows are
//                 removed from FTS so they never show up in search.

import Database from 'better-sqlite3';
import type { IndexRow } from './reconcile';
import type { IndexUpsert, NotebookIndex, SearchHit } from './types';

const CREATE_ENTRIES = `
  CREATE TABLE IF NOT EXISTS entries (
    id TEXT PRIMARY KEY,
    body TEXT NOT NULL,
    tags TEXT NOT NULL DEFAULT '[]',
    model TEXT,
    source_app TEXT,
    source_kind TEXT,
    created_at TEXT,
    indexed_mtime_ms REAL NOT NULL DEFAULT 0,
    tombstoned INTEGER NOT NULL DEFAULT 0
  )`;

const CREATE_FTS = `CREATE VIRTUAL TABLE IF NOT EXISTS entries_fts USING fts5(id UNINDEXED, body, tags)`;

export class SqliteNotebookIndex implements NotebookIndex {
  private readonly db: Database.Database;

  constructor(dbPath: string) {
    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL');
    // DDL runs as single statements via prepare().run() (one statement each).
    this.db.prepare(CREATE_ENTRIES).run();
    this.db.prepare(CREATE_FTS).run();
  }

  allRows(): IndexRow[] {
    const rows = this.db
      .prepare('SELECT id, tags, indexed_mtime_ms AS m, tombstoned FROM entries')
      .all() as Array<{ id: string; tags: string; m: number; tombstoned: number }>;
    return rows.map((r) => ({
      id: r.id,
      tags: safeParseTags(r.tags),
      indexedMtimeMs: r.m,
      tombstoned: r.tombstoned === 1,
    }));
  }

  upsert(row: IndexUpsert): void {
    const tagsJson = JSON.stringify(row.tags);
    const tx = this.db.transaction(() => {
      this.db
        .prepare(
          `INSERT INTO entries (id, body, tags, model, source_app, source_kind, created_at, indexed_mtime_ms, tombstoned)
           VALUES (@id, @body, @tags, @model, @source_app, @source_kind, @created_at, @mtime, 0)
           ON CONFLICT(id) DO UPDATE SET
             body=@body, tags=@tags, indexed_mtime_ms=@mtime, tombstoned=0,
             model=COALESCE(@model, entries.model),
             source_app=COALESCE(@source_app, entries.source_app),
             source_kind=COALESCE(@source_kind, entries.source_kind),
             created_at=COALESCE(@created_at, entries.created_at)`,
        )
        .run({
          id: row.id,
          body: row.body,
          tags: tagsJson,
          model: row.model ?? null,
          source_app: row.sourceApp ?? null,
          source_kind: row.sourceKind ?? null,
          created_at: row.createdAt ?? null,
          mtime: row.indexedMtimeMs,
        });
      // Refresh FTS: remove any stale copy, then insert the current body/tags.
      this.db.prepare('DELETE FROM entries_fts WHERE id = ?').run(row.id);
      this.db
        .prepare('INSERT INTO entries_fts (id, body, tags) VALUES (?, ?, ?)')
        .run(row.id, row.body, row.tags.join(' '));
    });
    tx();
  }

  tombstone(id: string): void {
    const tx = this.db.transaction(() => {
      this.db.prepare('UPDATE entries SET tombstoned = 1 WHERE id = ?').run(id);
      this.db.prepare('DELETE FROM entries_fts WHERE id = ?').run(id);
    });
    tx();
  }

  search(query: string): SearchHit[] {
    if (!query.trim()) return [];
    const rows = this.db
      .prepare(
        `SELECT f.id AS id,
                snippet(entries_fts, 1, '[', ']', '…', 10) AS snippet,
                e.tags AS tags
         FROM entries_fts f
         JOIN entries e ON e.id = f.id
         WHERE entries_fts MATCH ? AND e.tombstoned = 0
         ORDER BY rank
         LIMIT 50`,
      )
      .all(query) as Array<{ id: string; snippet: string; tags: string }>;
    return rows.map((r) => ({ id: r.id, snippet: r.snippet, tags: safeParseTags(r.tags) }));
  }

  close(): void {
    this.db.close();
  }
}

function safeParseTags(json: string): string[] {
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? (parsed as string[]) : [];
  } catch {
    return [];
  }
}
