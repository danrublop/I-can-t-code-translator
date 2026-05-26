// One-time migration: HTML note bodies -> Markdown.
//
// v1 stored note bodies as sanitized HTML in each `<id>.md` file. The TipTap rewrite
// makes Markdown the canonical body format. This pass runs once on launch (before the
// SQLite reconcile, so the index is rebuilt from migrated Markdown), converting any
// HTML-bodied file in place. It is:
//
//   - BACKUP-FIRST : every file it rewrites is first copied to `<dir>/.pre-md-backup/`
//                    so a bad conversion is recoverable.
//   - IDEMPOTENT   : a `<dir>/.body-format-v2` marker short-circuits subsequent runs;
//                    within a run, only bodies that `looksLikeHtml` are touched.
//   - NON-FATAL    : a malformed or unreadable file is logged and skipped, never thrown,
//                    so one bad file can't block launch.
//
//   .md files ─┬─ marker present? ──yes──▶ skip all (already migrated)
//              └─ no ─▶ for each file: looksLikeHtml? ─yes─▶ backup ─▶ convert ─▶ rewrite
//                                                      └─no──▶ leave as-is (notch text/MD)
//                       ─▶ write marker

import { readdirSync, readFileSync, writeFileSync, copyFileSync, existsSync, mkdirSync, renameSync } from 'fs';
import { join } from 'path';
import { parseEntry, serializeEntry } from './markdown-store';
import { htmlToMarkdown, looksLikeHtml } from './html-to-markdown';

const MARKER = '.body-format-v2';
const BACKUP_DIR = '.pre-md-backup';

export interface MigrationResult {
  migrated: number;
  skipped: number;
  failed: number;
  alreadyDone: boolean;
}

export interface MigrationDeps {
  /** Structured log sink; defaults to console. Swap for electron-log in main. */
  log?: (level: 'info' | 'warn', msg: string) => void;
}

/**
 * Migrate every HTML-bodied `.md` file in `dir` to Markdown. Safe to call on every
 * launch: returns immediately if the marker exists. Returns counts for observability.
 */
export function migrateHtmlBodies(dir: string, deps: MigrationDeps = {}): MigrationResult {
  const log = deps.log ?? ((lvl, m) => (lvl === 'warn' ? console.warn(m) : console.log(m)));
  const result: MigrationResult = { migrated: 0, skipped: 0, failed: 0, alreadyDone: false };

  if (!existsSync(dir)) return result;
  if (existsSync(join(dir, MARKER))) {
    result.alreadyDone = true;
    return result;
  }

  const backupDir = join(dir, BACKUP_DIR);
  for (const file of readdirSync(dir)) {
    if (!file.endsWith('.md')) continue;
    const full = join(dir, file);
    let raw: string;
    try {
      raw = readFileSync(full, 'utf8');
    } catch (err) {
      result.failed++;
      log('warn', `migrate: cannot read ${file}: ${String(err)}`);
      continue;
    }
    const entry = parseEntry(raw);
    if (!entry) {
      result.skipped++;
      log('warn', `migrate: unparseable frontmatter, skipping ${file}`);
      continue;
    }
    if (!looksLikeHtml(entry.body)) {
      result.skipped++;
      continue;
    }
    try {
      if (!existsSync(backupDir)) mkdirSync(backupDir, { recursive: true });
      copyFileSync(full, join(backupDir, file));
      const migrated = { ...entry, body: htmlToMarkdown(entry.body) };
      // Atomic write (temp + rename) — a crash mid-write must not truncate the user's note.
      const tmp = `${full}.tmp`;
      writeFileSync(tmp, serializeEntry(migrated), 'utf8');
      renameSync(tmp, full);
      result.migrated++;
    } catch (err) {
      result.failed++;
      log('warn', `migrate: failed to convert ${file}: ${String(err)}`);
    }
  }

  // Only stamp the marker when every file succeeded. A transient failure (EACCES, disk
  // full) leaves the marker unset so the next launch retries the abandoned files (they
  // still hold their original HTML body + a backup). A clean pass marks done so a healthy
  // launch never retries.
  if (result.failed === 0) {
    writeFileSync(join(dir, MARKER), new Date().toISOString(), 'utf8');
  }
  log('info', `migrate: ${result.migrated} migrated, ${result.skipped} skipped, ${result.failed} failed`);
  return result;
}
