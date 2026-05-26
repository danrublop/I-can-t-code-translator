import { describe, it, expect } from 'vitest';
import { validateUserPreset, mergeCommands, filterCommands, type SlashCommand } from './slash-commands';
import { BUILT_IN_PRESETS, type Preset } from './presets';

const ids = (cmds: { id: string }[]) => cmds.map((c) => c.id);

describe('validateUserPreset', () => {
  const existing = new Set(BUILT_IN_PRESETS.map((p) => p.id));

  it('accepts a well-formed custom preset', () => {
    const r = validateUserPreset({ id: 'flashcards', name: 'Flashcards', promptTemplate: 'Make flashcards from:\n{selection}' }, existing);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.preset).toMatchObject({ id: 'flashcards', accepts: 'both' });
  });

  it('rejects a non-kebab id', () => {
    expect(validateUserPreset({ id: 'Bad ID', name: 'x', promptTemplate: 'y' }, existing)).toMatchObject({ ok: false });
  });

  it('rejects an id colliding with a built-in', () => {
    const r = validateUserPreset({ id: 'explain', name: 'Mine', promptTemplate: 't' }, existing);
    expect(r).toMatchObject({ ok: false });
    if (!r.ok) expect(r.error).toContain('already in use');
  });

  it('requires name and template', () => {
    expect(validateUserPreset({ id: 'a', name: '', promptTemplate: 't' }, existing)).toMatchObject({ ok: false });
    expect(validateUserPreset({ id: 'a', name: 'A', promptTemplate: '' }, existing)).toMatchObject({ ok: false });
  });

  it('rejects an over-long name', () => {
    expect(validateUserPreset({ id: 'a', name: 'x'.repeat(41), promptTemplate: 't' }, existing)).toMatchObject({ ok: false });
  });
});

describe('mergeCommands', () => {
  it('lists built-ins first, then user commands', () => {
    const user: Preset[] = [{ id: 'flashcards', name: 'Flashcards', promptTemplate: 't', accepts: 'text' }];
    const merged = mergeCommands(user);
    expect(ids(merged).slice(0, BUILT_IN_PRESETS.length)).toEqual(ids([...BUILT_IN_PRESETS]));
    expect(merged.at(-1)).toMatchObject({ id: 'flashcards', source: 'user' });
    expect(merged[0].source).toBe('builtin');
  });

  it('drops a user command whose id shadows a built-in', () => {
    const user: Preset[] = [{ id: 'explain', name: 'Hijack', promptTemplate: 't', accepts: 'both' }];
    const merged = mergeCommands(user);
    const explains = merged.filter((c) => c.id === 'explain');
    expect(explains).toHaveLength(1);
    expect(explains[0].source).toBe('builtin');
  });
});

describe('filterCommands', () => {
  const cmds: SlashCommand[] = mergeCommands([
    { id: 'flashcards', name: 'Flashcards', promptTemplate: 't', accepts: 'text' },
  ]);

  it('returns all (kind-filtered) on empty query', () => {
    expect(filterCommands(cmds, '')).toHaveLength(cmds.length);
  });

  it('matches by name substring, case-insensitive', () => {
    expect(ids(filterCommands(cmds, 'sum'))).toEqual(['summarize']);
    expect(ids(filterCommands(cmds, 'CARD'))).toEqual(['flashcards']);
  });

  it('ranks prefix matches above mid-string matches', () => {
    // "Rewrite" starts with "re"; nothing else here is a prefix "re" match.
    const r = filterCommands(cmds, 're');
    expect(r[0].id).toBe('rewrite');
  });

  it('filters by capture kind (image hides text-only commands)', () => {
    const forImage = filterCommands(cmds, '', 'image');
    // 'rewrite', 'translate', 'find-bugs', 'flashcards' are text-only; should be excluded
    expect(ids(forImage)).not.toContain('rewrite');
    expect(ids(forImage)).not.toContain('flashcards');
    expect(ids(forImage)).toContain('explain'); // accepts 'both'
  });

  it('returns nothing when no name matches', () => {
    expect(filterCommands(cmds, 'zzzzz')).toEqual([]);
  });
});
