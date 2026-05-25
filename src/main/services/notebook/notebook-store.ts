// Notebook store: orchestrates the markdown source-of-truth + the search index.
//
//   save(entry)      -> write <id>.md, upsert the index row (mtime recorded)
//   syncFromDisk()   -> reconcile index against disk (drives the tested reconcileAll):
//                       insert new files, reindex edited ones (body wins), tombstone
//                       deleted ones, revive re-created ones
//   search(query)    -> delegate to the index
//
// All decision logic lives in reconcile.ts (pure, tested). This file only does I/O
// orchestration, so it stays thin.

import { statSync } from 'fs';
import { reconcileAll } from './reconcile';
import type { MarkdownStore } from './markdown-store';
import type { NotebookEntry, NotebookIndex, NoteSummary, SearchHit } from './types';

export interface SyncSummary {
  inserted: number;
  reindexed: number;
  tombstoned: number;
  revived: number;
}

export class NotebookStore {
  constructor(
    private readonly files: MarkdownStore,
    private readonly index: NotebookIndex,
  ) {}

  /** Persist a new/edited entry: write the file, then mirror it into the index. */
  save(entry: NotebookEntry): void {
    const path = this.files.write(entry);
    const mtimeMs = statSync(path).mtimeMs;
    this.index.upsert({
      id: entry.id,
      title: entry.title,
      body: entry.body,
      tags: entry.tags,
      model: entry.model,
      sourceApp: entry.sourceApp,
      sourceKind: entry.sourceKind,
      pinned: entry.pinned,
      createdAt: entry.createdAt,
      indexedMtimeMs: mtimeMs,
    });
  }

  /** Notes for the sidebar (pinned first, newest next). */
  list(): NoteSummary[] {
    return this.index.list();
  }

  /** Full body of a note. */
  getBody(id: string): string | null {
    return this.index.getBody(id);
  }

  /** Rename a note (index + mirror to the markdown file's frontmatter). */
  rename(id: string, title: string): void {
    this.index.setTitle(id, title);
    this.rewriteFile(id);
  }

  /** Pin/unpin a note. */
  setPinned(id: string, pinned: boolean): void {
    this.index.setPinned(id, pinned);
    this.rewriteFile(id);
  }

  /** Update a note body from an in-app edit (index + markdown file). */
  updateBody(id: string, body: string): void {
    this.index.updateBody(id, body);
    this.rewriteFile(id, body);
  }

  // Re-mirror the index row back to its markdown file so on-disk frontmatter/body stay
  // in sync with in-app edits. Best-effort.
  private rewriteFile(id: string, bodyOverride?: string): void {
    const existing = this.files.read(id);
    const body = bodyOverride ?? this.index.getBody(id) ?? existing?.body ?? '';
    const summary = this.index.list().find((n) => n.id === id);
    try {
      this.files.write({
        id,
        title: summary?.title ?? existing?.title ?? '',
        body,
        tags: existing?.tags ?? [],
        model: '',
        sourceApp: summary?.sourceApp ?? '',
        sourceKind: 'text',
        pinned: summary?.pinned ?? existing?.pinned ?? false,
        createdAt: summary?.createdAt || new Date().toISOString(),
      });
    } catch {
      // ignore mirror failures
    }
  }

  /** Delete an entry from disk; the next syncFromDisk will tombstone the index row. */
  delete(id: string): void {
    this.files.delete(id);
  }

  /**
   * Reconcile the index against the on-disk markdown files. Run on launch and whenever
   * files may have changed underneath us (user edited/synced/deleted .md files).
   */
  syncFromDisk(): SyncSummary {
    const rows = this.index.allRows();
    const disk = this.files.listDiskEntries();
    const actions = reconcileAll(rows, disk);

    const summary: SyncSummary = { inserted: 0, reindexed: 0, tombstoned: 0, revived: 0 };
    for (const action of actions) {
      switch (action.kind) {
        case 'insert':
        case 'reindex':
        case 'revive': {
          this.index.upsert({
            id: action.id,
            body: action.body ?? '',
            tags: action.tags ?? [],
            indexedMtimeMs: action.mtimeMs ?? 0,
          });
          if (action.kind === 'insert') summary.inserted++;
          else if (action.kind === 'reindex') summary.reindexed++;
          else summary.revived++;
          break;
        }
        case 'tombstone': {
          this.index.tombstone(action.id);
          summary.tombstoned++;
          break;
        }
      }
    }
    return summary;
  }

  search(query: string): SearchHit[] {
    return this.index.search(query);
  }
}
