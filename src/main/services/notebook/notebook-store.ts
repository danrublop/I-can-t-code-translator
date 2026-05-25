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
import type { NotebookEntry, NotebookIndex, SearchHit } from './types';

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
      body: entry.body,
      tags: entry.tags,
      model: entry.model,
      sourceApp: entry.sourceApp,
      sourceKind: entry.sourceKind,
      createdAt: entry.createdAt,
      indexedMtimeMs: mtimeMs,
    });
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
