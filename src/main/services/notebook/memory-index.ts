// In-memory NotebookIndex fallback.
//
// Used when the native SQLite module (better-sqlite3) hasn't been rebuilt for the current
// Electron ABI yet, so the app still launches and works (search/persistence just don't
// survive a restart). Search is a naive case-insensitive substring match.

import type { IndexRow } from './reconcile';
import type { IndexUpsert, NotebookIndex, NoteSummary, SearchHit } from './types';

interface Row {
  title?: string;
  body: string;
  tags: string[];
  sourceApp?: string;
  createdAt?: string;
  pinned: boolean;
  mtimeMs: number;
  tombstoned: boolean;
}

function stripHtml(s: string): string {
  return s.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
}

function deriveTitle(title: string | undefined, body: string): string {
  if (title && title.trim()) return title.trim();
  return stripHtml(body).slice(0, 60) || 'Untitled';
}

export class MemoryNotebookIndex implements NotebookIndex {
  private rows = new Map<string, Row>();

  allRows(): IndexRow[] {
    return [...this.rows.entries()].map(([id, r]) => ({ id, tags: r.tags, indexedMtimeMs: r.mtimeMs, tombstoned: r.tombstoned }));
  }

  upsert(row: IndexUpsert): void {
    const prev = this.rows.get(row.id);
    this.rows.set(row.id, {
      title: row.title ?? prev?.title,
      body: row.body,
      tags: row.tags,
      sourceApp: row.sourceApp ?? prev?.sourceApp,
      createdAt: row.createdAt ?? prev?.createdAt,
      pinned: row.pinned ?? prev?.pinned ?? false,
      mtimeMs: row.indexedMtimeMs,
      tombstoned: false,
    });
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

  list(): NoteSummary[] {
    return [...this.rows.entries()]
      .filter(([, r]) => !r.tombstoned)
      .sort((a, b) => (Number(b[1].pinned) - Number(a[1].pinned)) || (b[1].createdAt ?? '').localeCompare(a[1].createdAt ?? ''))
      .slice(0, 500)
      .map(([id, r]) => ({
        id,
        title: deriveTitle(r.title, r.body),
        snippet: stripHtml(r.body).slice(0, 80),
        sourceApp: r.sourceApp,
        pinned: r.pinned,
        createdAt: r.createdAt ?? '',
      }));
  }

  getBody(id: string): string | null {
    const r = this.rows.get(id);
    return r && !r.tombstoned ? r.body : null;
  }

  setTitle(id: string, title: string): void {
    const r = this.rows.get(id);
    if (r) r.title = title;
  }

  setPinned(id: string, pinned: boolean): void {
    const r = this.rows.get(id);
    if (r) r.pinned = pinned;
  }

  updateBody(id: string, body: string): void {
    const r = this.rows.get(id);
    if (r) r.body = body;
  }
}
