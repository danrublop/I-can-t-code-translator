import { describe, it, expect } from 'vitest';
import {
  reconcileEntry,
  reconcileAll,
  mergeTags,
  type IndexRow,
  type DiskEntry,
} from './reconcile';

const row = (over: Partial<IndexRow> = {}): IndexRow => ({
  id: 'e1',
  tags: [],
  indexedMtimeMs: 1000,
  tombstoned: false,
  ...over,
});

const disk = (over: Partial<DiskEntry> = {}): DiskEntry => ({
  id: 'e1',
  body: 'hello',
  frontmatterTags: [],
  mtimeMs: 1000,
  ...over,
});

describe('mergeTags', () => {
  it('unions, dedups case-insensitively, preserves first-seen casing and order', () => {
    expect(mergeTags(['Code', 'safari'], ['CODE', 'pdf'])).toEqual(['Code', 'safari', 'pdf']);
  });

  it('drops empty/whitespace tags', () => {
    expect(mergeTags(['a', '  ', ''], [' b '])).toEqual(['a', 'b']);
  });

  it('handles empty inputs', () => {
    expect(mergeTags([], [])).toEqual([]);
  });
});

describe('reconcileEntry', () => {
  it('inserts a new file with no index row', () => {
    const a = reconcileEntry(undefined, disk({ body: 'new', frontmatterTags: ['x'] }));
    expect(a.kind).toBe('insert');
    expect(a.body).toBe('new');
    expect(a.tags).toEqual(['x']);
    expect(a.mtimeMs).toBe(1000);
  });

  // The data-loss path the eng review flagged: when the markdown is newer, the
  // markdown BODY must win and overwrite the index — never the other way around.
  it('reindexes with markdown body winning when disk is newer', () => {
    const a = reconcileEntry(
      row({ tags: ['old'], indexedMtimeMs: 1000 }),
      disk({ body: 'edited on disk', frontmatterTags: ['new'], mtimeMs: 2000 }),
    );
    expect(a.kind).toBe('reindex');
    expect(a.body).toBe('edited on disk'); // body wins
    expect(a.tags).toEqual(['old', 'new']); // tags merge (union)
    expect(a.mtimeMs).toBe(2000);
  });

  it('does nothing when the index is already current', () => {
    expect(reconcileEntry(row({ indexedMtimeMs: 2000 }), disk({ mtimeMs: 2000 })).kind).toBe('noop');
    expect(reconcileEntry(row({ indexedMtimeMs: 2000 }), disk({ mtimeMs: 1500 })).kind).toBe('noop');
  });

  it('tombstones a live row when the file disappears', () => {
    const a = reconcileEntry(row({ tombstoned: false }), undefined);
    expect(a.kind).toBe('tombstone');
    expect(a.id).toBe('e1');
  });

  it('does not re-tombstone an already-tombstoned row with no file', () => {
    expect(reconcileEntry(row({ tombstoned: true }), undefined).kind).toBe('noop');
  });

  it('revives a tombstoned entry when its file reappears with the same id', () => {
    const a = reconcileEntry(
      row({ tombstoned: true, tags: ['kept'] }),
      disk({ body: 'back', frontmatterTags: ['fresh'], mtimeMs: 3000 }),
    );
    expect(a.kind).toBe('revive');
    expect(a.body).toBe('back');
    expect(a.tags).toEqual(['kept', 'fresh']);
    expect(a.mtimeMs).toBe(3000);
  });

  it('noops when there is neither a file nor a row', () => {
    expect(reconcileEntry(undefined, undefined).kind).toBe('noop');
  });
});

describe('reconcileAll', () => {
  it('builds the union of ids and drops noops', () => {
    const rows: IndexRow[] = [
      row({ id: 'current', indexedMtimeMs: 5000 }),
      row({ id: 'gone', indexedMtimeMs: 5000 }),
    ];
    const disks: DiskEntry[] = [
      disk({ id: 'current', mtimeMs: 5000 }), // noop, dropped
      disk({ id: 'fresh', mtimeMs: 100 }), // insert
      // 'gone' has no file -> tombstone
    ];
    const actions = reconcileAll(rows, disks);
    const byId = Object.fromEntries(actions.map((a) => [a.id, a.kind]));
    expect(byId).toEqual({ fresh: 'insert', gone: 'tombstone' });
    expect(actions.find((a) => a.id === 'current')).toBeUndefined();
  });
});
