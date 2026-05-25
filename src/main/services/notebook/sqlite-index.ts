// SQLite FTS5 implementation of NotebookIndex (real app only).
//
// NOT imported by tests: vitest runs under Node and better-sqlite3 is a native module
// built for the Electron ABI in the packaged app. The store's logic is tested headless
// via an in-memory fake (see notebook-store.test.ts); this file is exercised at runtime.
//
// Schema:
//   entries       canonical rows (mirrors the markdown files, incl. tombstones, title, pinned)
//   entries_fts   FTS5 over body + tags, kept in sync manually; tombstoned rows removed.

import Database from 'better-sqlite3';
import type { IndexRow } from './reconcile';
import type { IndexUpsert, NotebookIndex, NoteSummary, SearchHit } from './types';

const CREATE_ENTRIES = `
  CREATE TABLE IF NOT EXISTS entries (
    id TEXT PRIMARY KEY,
    title TEXT,
    body TEXT NOT NULL,
    tags TEXT NOT NULL DEFAULT '[]',
    model TEXT,
    source_app TEXT,
    source_kind TEXT,
    created_at TEXT,
    pinned INTEGER NOT NULL DEFAULT 0,
    indexed_mtime_ms REAL NOT NULL DEFAULT 0,
    tombstoned INTEGER NOT NULL DEFAULT 0
  )`;

const CREATE_FTS = `CREATE VIRTUAL TABLE IF NOT EXISTS entries_fts USING fts5(id UNINDEXED, body, tags)`;

function stripHtml(s: string): string {
  return s.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
}

function deriveTitle(title: string | null, body: string): string {
  if (title && title.trim()) return title.trim();
  return stripHtml(body).slice(0, 60) || 'Untitled';
}

export class SqliteNotebookIndex implements NotebookIndex {
  private readonly db: Database.Database;

  constructor(dbPath: string) {
    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL');
    this.db.prepare(CREATE_ENTRIES).run();
    this.db.prepare(CREATE_FTS).run();
  }

  allRows(): IndexRow[] {
    const rows = this.db
      .prepare('SELECT id, tags, indexed_mtime_ms AS m, tombstoned FROM entries')
      .all() as Array<{ id: string; tags: string; m: number; tombstoned: number }>;
    return rows.map((r) => ({ id: r.id, tags: safeParseTags(r.tags), indexedMtimeMs: r.m, tombstoned: r.tombstoned === 1 }));
  }

  upsert(row: IndexUpsert): void {
    const tx = this.db.transaction(() => {
      this.db
        .prepare(
          `INSERT INTO entries (id, title, body, tags, model, source_app, source_kind, created_at, pinned, indexed_mtime_ms, tombstoned)
           VALUES (@id, @title, @body, @tags, @model, @source_app, @source_kind, @created_at, COALESCE(@pinned, 0), @mtime, 0)
           ON CONFLICT(id) DO UPDATE SET
             body=@body, tags=@tags, indexed_mtime_ms=@mtime, tombstoned=0,
             title=COALESCE(@title, entries.title),
             pinned=COALESCE(@pinned, entries.pinned),
             model=COALESCE(@model, entries.model),
             source_app=COALESCE(@source_app, entries.source_app),
             source_kind=COALESCE(@source_kind, entries.source_kind),
             created_at=COALESCE(@created_at, entries.created_at)`,
        )
        .run({
          id: row.id,
          title: row.title ?? null,
          body: row.body,
          tags: JSON.stringify(row.tags),
          model: row.model ?? null,
          source_app: row.sourceApp ?? null,
          source_kind: row.sourceKind ?? null,
          created_at: row.createdAt ?? null,
          pinned: row.pinned === undefined ? null : row.pinned ? 1 : 0,
          mtime: row.indexedMtimeMs,
        });
      this.db.prepare('DELETE FROM entries_fts WHERE id = ?').run(row.id);
      this.db.prepare('INSERT INTO entries_fts (id, body, tags) VALUES (?, ?, ?)').run(row.id, row.body, row.tags.join(' '));
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
        `SELECT f.id AS id, snippet(entries_fts, 1, '[', ']', '…', 10) AS snippet, e.tags AS tags
         FROM entries_fts f JOIN entries e ON e.id = f.id
         WHERE entries_fts MATCH ? AND e.tombstoned = 0
         ORDER BY rank LIMIT 50`,
      )
      .all(query) as Array<{ id: string; snippet: string; tags: string }>;
    return rows.map((r) => ({ id: r.id, snippet: r.snippet, tags: safeParseTags(r.tags) }));
  }

  list(): NoteSummary[] {
    const rows = this.db
      .prepare(
        `SELECT id, title, body, source_app AS sourceApp, pinned, created_at AS createdAt
         FROM entries WHERE tombstoned = 0
         ORDER BY pinned DESC, created_at DESC LIMIT 500`,
      )
      .all() as Array<{ id: string; title: string | null; body: string; sourceApp: string | null; pinned: number; createdAt: string | null }>;
    return rows.map((r) => ({
      id: r.id,
      title: deriveTitle(r.title, r.body),
      snippet: stripHtml(r.body).slice(0, 80),
      sourceApp: r.sourceApp ?? undefined,
      pinned: r.pinned === 1,
      createdAt: r.createdAt ?? '',
    }));
  }

  getBody(id: string): string | null {
    const row = this.db.prepare('SELECT body FROM entries WHERE id = ? AND tombstoned = 0').get(id) as { body: string } | undefined;
    return row?.body ?? null;
  }

  setTitle(id: string, title: string): void {
    this.db.prepare('UPDATE entries SET title = ? WHERE id = ?').run(title, id);
  }

  setPinned(id: string, pinned: boolean): void {
    this.db.prepare('UPDATE entries SET pinned = ? WHERE id = ?').run(pinned ? 1 : 0, id);
  }

  updateBody(id: string, body: string): void {
    const tx = this.db.transaction(() => {
      this.db.prepare('UPDATE entries SET body = ? WHERE id = ?').run(body, id);
      const tags = (this.db.prepare('SELECT tags FROM entries WHERE id = ?').get(id) as { tags: string } | undefined)?.tags ?? '[]';
      this.db.prepare('DELETE FROM entries_fts WHERE id = ?').run(id);
      this.db.prepare('INSERT INTO entries_fts (id, body, tags) VALUES (?, ?, ?)').run(id, body, safeParseTags(tags).join(' '));
    });
    tx();
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
