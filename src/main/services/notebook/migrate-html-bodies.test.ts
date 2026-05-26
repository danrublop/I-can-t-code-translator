import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync, readFileSync, existsSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { migrateHtmlBodies } from './migrate-html-bodies';
import { serializeEntry, parseEntry } from './markdown-store';
import type { NotebookEntry } from './types';

function entry(over: Partial<NotebookEntry>): NotebookEntry {
  return {
    id: 'id1', title: 'T', body: '', tags: [], model: 'llama3.2',
    sourceApp: 'Safari', sourceKind: 'text', pinned: false,
    createdAt: '2026-05-26T00:00:00Z', ...over,
  };
}

describe('migrateHtmlBodies', () => {
  let dir: string;
  beforeEach(() => { dir = mkdtempSync(join(tmpdir(), 'nb-mig-')); });
  afterEach(() => { rmSync(dir, { recursive: true, force: true }); });

  const write = (e: NotebookEntry) => writeFileSync(join(dir, `${e.id}.md`), serializeEntry(e), 'utf8');
  const readBody = (id: string) => parseEntry(readFileSync(join(dir, `${id}.md`), 'utf8'))!.body;

  it('converts an HTML-bodied entry to markdown and backs it up', () => {
    write(entry({ id: 'a', body: '<h2>Title</h2><p>Hello <strong>world</strong></p>' }));
    const res = migrateHtmlBodies(dir);
    expect(res.migrated).toBe(1);
    expect(readBody('a')).toBe('## Title\n\nHello **world**');
    expect(existsSync(join(dir, '.pre-md-backup', 'a.md'))).toBe(true);
    // backup retains the original HTML
    expect(readFileSync(join(dir, '.pre-md-backup', 'a.md'), 'utf8')).toContain('<strong>world</strong>');
  });

  it('leaves plain-text / markdown bodies (notch-saved) untouched', () => {
    write(entry({ id: 'b', body: '# Already markdown\n\n- a\n- b' }));
    const res = migrateHtmlBodies(dir);
    expect(res.migrated).toBe(0);
    expect(res.skipped).toBe(1);
    expect(readBody('b')).toBe('# Already markdown\n\n- a\n- b');
  });

  it('is idempotent: a second run does nothing', () => {
    write(entry({ id: 'c', body: '<p>convert me</p>' }));
    const first = migrateHtmlBodies(dir);
    expect(first.migrated).toBe(1);
    expect(first.alreadyDone).toBe(false);
    const second = migrateHtmlBodies(dir);
    expect(second.alreadyDone).toBe(true);
    expect(second.migrated).toBe(0);
  });

  it('skips unparseable files without throwing, and still marks done', () => {
    writeFileSync(join(dir, 'junk.md'), 'no frontmatter here', 'utf8');
    write(entry({ id: 'd', body: '<p>ok</p>' }));
    const res = migrateHtmlBodies(dir);
    expect(res.migrated).toBe(1);
    expect(res.skipped).toBe(1); // the junk file
    expect(existsSync(join(dir, '.body-format-v2'))).toBe(true);
  });

  it('returns empty result for a missing directory', () => {
    const res = migrateHtmlBodies(join(dir, 'does-not-exist'));
    expect(res).toEqual({ migrated: 0, skipped: 0, failed: 0, alreadyDone: false });
  });
});
