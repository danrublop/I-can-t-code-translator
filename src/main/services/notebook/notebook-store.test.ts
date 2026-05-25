import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync, statSync, utimesSync, existsSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { MarkdownStore, makeEntry, serializeEntry } from './markdown-store';
import { NotebookStore } from './notebook-store';
import type { IndexRow } from './reconcile';
import type { IndexUpsert, NotebookIndex, NoteSummary, SearchHit } from './types';

// In-memory NotebookIndex fake — stands in for the SQLite FTS5 index so the store logic
// is tested headless (no native module). Search is a naive case-insensitive substring.
class FakeIndex implements NotebookIndex {
  rows = new Map<string, { title?: string; body: string; tags: string[]; pinned: boolean; mtime: number; tombstoned: boolean }>();

  allRows(): IndexRow[] {
    return [...this.rows.entries()].map(([id, r]) => ({
      id,
      tags: r.tags,
      indexedMtimeMs: r.mtime,
      tombstoned: r.tombstoned,
    }));
  }
  upsert(row: IndexUpsert): void {
    const prev = this.rows.get(row.id);
    this.rows.set(row.id, { title: row.title ?? prev?.title, body: row.body, tags: row.tags, pinned: row.pinned ?? prev?.pinned ?? false, mtime: row.indexedMtimeMs, tombstoned: false });
  }
  tombstone(id: string): void {
    const r = this.rows.get(id);
    if (r) r.tombstoned = true;
  }
  search(query: string): SearchHit[] {
    const q = query.toLowerCase();
    return [...this.rows.entries()]
      .filter(([, r]) => !r.tombstoned && r.body.toLowerCase().includes(q))
      .map(([id, r]) => ({ id, snippet: r.body.slice(0, 40), tags: r.tags }));
  }
  list(): NoteSummary[] {
    return [...this.rows.entries()].filter(([, r]) => !r.tombstoned).map(([id, r]) => ({ id, title: r.title ?? r.body.slice(0, 40), snippet: r.body.slice(0, 80), pinned: r.pinned, createdAt: '' }));
  }
  getBody(id: string): string | null { const r = this.rows.get(id); return r && !r.tombstoned ? r.body : null; }
  setTitle(id: string, title: string): void { const r = this.rows.get(id); if (r) r.title = title; }
  setPinned(id: string, pinned: boolean): void { const r = this.rows.get(id); if (r) r.pinned = pinned; }
  updateBody(id: string, body: string): void { const r = this.rows.get(id); if (r) r.body = body; }
}

let dir: string;
let files: MarkdownStore;
let index: FakeIndex;
let store: NotebookStore;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'notebook-test-'));
  files = new MarkdownStore(dir);
  index = new FakeIndex();
  store = new NotebookStore(files, index);
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

/** Force a file's mtime forward so reconcile sees it as newer than the index. */
function bumpMtime(path: string, msAhead = 5000): number {
  const future = new Date(Date.now() + msAhead);
  utimesSync(path, future, future);
  return statSync(path).mtimeMs;
}

describe('NotebookStore', () => {
  it('save() writes a markdown file and indexes it; search finds it', () => {
    store.save(makeEntry({ id: 'e1', body: 'The regex matches digits', tags: ['code'], model: 'llama3.2', sourceApp: 'VSCode' }));

    expect(existsSync(join(dir, 'e1.md'))).toBe(true);
    const hits = store.search('regex');
    expect(hits.map((h) => h.id)).toEqual(['e1']);
    expect(hits[0].tags).toEqual(['code']);
  });

  it('round-trips frontmatter (id, tags, body) through disk', () => {
    store.save(makeEntry({ id: 'e2', body: 'line one\nline two', tags: ['safari', 'note'], model: 'm', sourceApp: 'Safari' }));
    const disk = files.listDiskEntries();
    expect(disk).toHaveLength(1);
    expect(disk[0]).toMatchObject({ id: 'e2', body: 'line one\nline two', frontmatterTags: ['safari', 'note'] });
  });

  // The data-loss path end-to-end: a user edits the .md outside the app; sync must let
  // the markdown body win and refresh the index.
  it('syncFromDisk reindexes when a file is edited on disk (body wins)', () => {
    store.save(makeEntry({ id: 'e3', body: 'original', tags: ['t'], model: 'm', sourceApp: 'A' }));

    // Simulate an external edit: rewrite the file with new body + a newer mtime.
    const path = join(dir, 'e3.md');
    writeFileSync(path, serializeEntry(makeEntry({ id: 'e3', body: 'edited on disk', tags: ['t'], model: 'm', sourceApp: 'A' })), 'utf8');
    bumpMtime(path);

    const summary = store.syncFromDisk();
    expect(summary.reindexed).toBe(1);
    expect(store.search('edited').map((h) => h.id)).toEqual(['e3']);
    expect(store.search('original')).toHaveLength(0); // old body gone
  });

  it('syncFromDisk tombstones an entry whose file was deleted', () => {
    store.save(makeEntry({ id: 'e4', body: 'soon gone', tags: [], model: 'm', sourceApp: 'A' }));
    store.delete('e4');

    const summary = store.syncFromDisk();
    expect(summary.tombstoned).toBe(1);
    expect(store.search('gone')).toHaveLength(0);
  });

  it('syncFromDisk inserts a file that appeared on disk outside the app', () => {
    writeFileSync(
      join(dir, 'e5.md'),
      serializeEntry(makeEntry({ id: 'e5', body: 'dropped in by the user', tags: ['external'], model: 'm', sourceApp: 'Finder' })),
      'utf8',
    );

    const summary = store.syncFromDisk();
    expect(summary.inserted).toBe(1);
    expect(store.search('dropped').map((h) => h.id)).toEqual(['e5']);
  });

  it('syncFromDisk is a no-op when nothing changed', () => {
    store.save(makeEntry({ id: 'e6', body: 'stable', tags: [], model: 'm', sourceApp: 'A' }));
    const summary = store.syncFromDisk();
    expect(summary).toEqual({ inserted: 0, reindexed: 0, tombstoned: 0, revived: 0 });
  });
});
