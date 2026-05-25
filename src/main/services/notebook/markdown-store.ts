// Markdown file store: the source of truth for entry bodies.
//
// Each entry is one `<id>.md` file with a small YAML frontmatter block followed by the
// answer body. We own both the writer and reader, so we use a minimal frontmatter
// (de)serializer for our known fields rather than pulling in a YAML dependency. Tags are
// a flow list (`tags: [a, b]`); everything else is a scalar.
//
//   ---
//   id: 01J...
//   created_at: 2026-05-25T17:00:00Z
//   model: llama3.2
//   source_app: Safari
//   source_kind: text
//   tags: [code, safari]
//   ---
//   <markdown body>

import { readdirSync, readFileSync, writeFileSync, statSync, existsSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import type { DiskEntry } from './reconcile';
import type { NotebookEntry, SourceKind } from './types';

function esc(value: string): string {
  // Quote scalars that could confuse the minimal parser.
  return /[:#\n]/.test(value) ? JSON.stringify(value) : value;
}

function unesc(raw: string): string {
  const v = raw.trim();
  if (v.startsWith('"') && v.endsWith('"')) {
    try {
      return JSON.parse(v) as string;
    } catch {
      return v.slice(1, -1);
    }
  }
  return v;
}

export function serializeEntry(entry: NotebookEntry): string {
  const tags = entry.tags.map(esc).join(', ');
  const fm = [
    '---',
    `id: ${esc(entry.id)}`,
    `title: ${esc(entry.title)}`,
    `created_at: ${esc(entry.createdAt)}`,
    `model: ${esc(entry.model)}`,
    `source_app: ${esc(entry.sourceApp)}`,
    `source_kind: ${entry.sourceKind}`,
    `pinned: ${entry.pinned ? 'true' : 'false'}`,
    `tags: [${tags}]`,
    '---',
    '',
  ].join('\n');
  return `${fm}${entry.body}\n`;
}

interface ParsedFile {
  id: string;
  title: string;
  tags: string[];
  pinned: boolean;
  body: string;
}

/** Parse our own frontmatter format. Returns null if the block is missing/malformed. */
export function parseEntry(text: string): ParsedFile | null {
  if (!text.startsWith('---')) return null;
  const end = text.indexOf('\n---', 3);
  if (end === -1) return null;

  const header = text.slice(3, end).trim();
  const body = text.slice(end + 4).replace(/^\n/, '');

  let id = '';
  let title = '';
  let pinned = false;
  let tags: string[] = [];
  for (const line of header.split('\n')) {
    const idx = line.indexOf(':');
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    const val = line.slice(idx + 1).trim();
    if (key === 'id') id = unesc(val);
    else if (key === 'title') title = unesc(val);
    else if (key === 'pinned') pinned = val === 'true';
    else if (key === 'tags') {
      const inner = val.replace(/^\[/, '').replace(/\]$/, '').trim();
      tags = inner.length ? inner.split(',').map((t) => unesc(t)).filter(Boolean) : [];
    }
  }
  if (!id) return null;
  return { id, title, pinned, tags, body: body.replace(/\n$/, '') };
}

export class MarkdownStore {
  constructor(private readonly dir: string) {
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  }

  private pathFor(id: string): string {
    return join(this.dir, `${id}.md`);
  }

  /** Write (or overwrite) an entry's file. Returns the file path. */
  write(entry: NotebookEntry): string {
    const path = this.pathFor(entry.id);
    writeFileSync(path, serializeEntry(entry), 'utf8');
    return path;
  }

  /** Delete an entry's file if present. */
  delete(id: string): void {
    const path = this.pathFor(id);
    if (existsSync(path)) rmSync(path);
  }

  /** Read one entry's raw parsed content, or null if absent/malformed. */
  read(id: string): ParsedFile | null {
    const path = this.pathFor(id);
    if (!existsSync(path)) return null;
    return parseEntry(readFileSync(path, 'utf8'));
  }

  /** List every valid `.md` entry on disk as a DiskEntry (id, body, tags, mtime). */
  listDiskEntries(): DiskEntry[] {
    if (!existsSync(this.dir)) return [];
    const out: DiskEntry[] = [];
    for (const file of readdirSync(this.dir)) {
      if (!file.endsWith('.md')) continue;
      const full = join(this.dir, file);
      const parsed = parseEntry(readFileSync(full, 'utf8'));
      if (!parsed) continue;
      out.push({
        id: parsed.id,
        body: parsed.body,
        frontmatterTags: parsed.tags,
        mtimeMs: statSync(full).mtimeMs,
      });
    }
    return out;
  }
}

/** Tiny helper so callers don't repeat the SourceKind union literal. */
export function makeEntry(
  fields: Omit<NotebookEntry, 'createdAt' | 'sourceKind' | 'title' | 'pinned'> & {
    createdAt?: string;
    sourceKind?: SourceKind;
    title?: string;
    pinned?: boolean;
  },
): NotebookEntry {
  return {
    ...fields,
    title: fields.title ?? '',
    pinned: fields.pinned ?? false,
    sourceKind: fields.sourceKind ?? 'text',
    createdAt: fields.createdAt ?? new Date().toISOString(),
  };
}
