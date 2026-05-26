// Slash-command registry: the catalog behind the notebook editor's `/` menu.
//
// Built-in commands are the pure-data BUILT_IN_PRESETS (Explain/Summarize/…). Users can
// add their own (Exp-5, "custom slash commands") — same Preset shape, persisted in
// settings and passed in here. This module is the pure logic that merges the two, filters
// for the menu as the user types, and validates a user-authored command before it's saved.
// No I/O, no Electron — persistence lives in the settings service.
//
//   built-in presets ─┐
//                     ├─ mergeCommands ─▶ ordered catalog ─▶ filterCommands(query,kind) ─▶ menu rows
//   user presets ─────┘   (skips invalid / id-colliding user entries)

import { BUILT_IN_PRESETS, canHandle, type Preset, type CaptureKind } from './presets';

/** A command shown in the slash menu. Built-ins and user presets share the Preset shape;
 *  `source` lets the UI badge user commands and the settings editor list only editable ones. */
export interface SlashCommand extends Preset {
  source: 'builtin' | 'user';
}

const ID_RE = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/;
const MAX_NAME = 40;

export type ValidateResult =
  | { ok: true; preset: Preset }
  | { ok: false; error: string };

/**
 * Validate a user-authored command before saving. Rejects bad ids, name/template that are
 * empty or too long, and ids that collide with an existing command (built-in or another
 * user one). Returns a normalized Preset on success.
 */
export function validateUserPreset(input: Partial<Preset>, existingIds: ReadonlySet<string>): ValidateResult {
  const id = (input.id ?? '').trim();
  const name = (input.name ?? '').trim();
  const promptTemplate = (input.promptTemplate ?? '').trim();
  const accepts = input.accepts ?? 'both';

  if (!ID_RE.test(id)) return { ok: false, error: 'id must be kebab-case (a-z, 0-9, dashes)' };
  if (existingIds.has(id)) return { ok: false, error: `id "${id}" is already in use` };
  if (!name) return { ok: false, error: 'name is required' };
  if (name.length > MAX_NAME) return { ok: false, error: `name must be ≤ ${MAX_NAME} characters` };
  if (!promptTemplate) return { ok: false, error: 'prompt template is required' };
  if (accepts !== 'text' && accepts !== 'image' && accepts !== 'both') {
    return { ok: false, error: 'accepts must be text, image, or both' };
  }

  return { ok: true, preset: { id, name, promptTemplate, accepts, defaultModel: input.defaultModel } };
}

/**
 * Merge built-in and user presets into the ordered slash-command catalog. Built-ins come
 * first (stable, familiar order); user commands follow. A user preset whose id collides
 * with a built-in is dropped (built-in wins) so the catalog can't be shadowed.
 */
export function mergeCommands(
  user: readonly Preset[] = [],
  builtIn: readonly Preset[] = BUILT_IN_PRESETS,
): SlashCommand[] {
  const out: SlashCommand[] = builtIn.map((p) => ({ ...p, source: 'builtin' }));
  const taken = new Set(builtIn.map((p) => p.id));
  for (const p of user) {
    if (taken.has(p.id)) continue; // never let a user entry shadow a built-in
    taken.add(p.id);
    out.push({ ...p, source: 'user' });
  }
  return out;
}

/**
 * Filter + rank commands for the `/` menu as the user types. Matches `query` against the
 * command name (case-insensitive, substring); prefix matches rank above mid-string matches,
 * ties keep catalog order. When `kind` is given, only commands valid for that capture kind
 * are shown (the editor menu runs on text, so it passes 'text'). Empty query → all (filtered
 * by kind), in catalog order.
 */
export function filterCommands(
  commands: readonly SlashCommand[],
  query: string,
  kind?: CaptureKind,
): SlashCommand[] {
  const byKind = kind ? commands.filter((c) => canHandle(c, kind)) : [...commands];
  const q = query.trim().toLowerCase();
  if (!q) return byKind;

  const scored = byKind
    .map((c, i) => {
      const name = c.name.toLowerCase();
      const idx = name.indexOf(q);
      return { c, i, idx };
    })
    .filter((s) => s.idx !== -1);

  scored.sort((a, b) => {
    // prefix matches (idx 0) first, then earlier matches, then original order
    if ((a.idx === 0) !== (b.idx === 0)) return a.idx === 0 ? -1 : 1;
    if (a.idx !== b.idx) return a.idx - b.idx;
    return a.i - b.i;
  });

  return scored.map((s) => s.c);
}
