// Tests for API-key persistence. Keys are encrypted at rest via Electron safeStorage and
// kept plaintext in memory. The two paths that can silently lose a user's key are the
// legacy-plaintext migration and the decrypt-failure fallback — both are covered here.
//
// safeStorage is mocked as a reversible "ENC:" prefix so encrypt/decrypt is deterministic
// under vitest's node environment (the real one needs the OS keychain).

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { readFileSync, writeFileSync, existsSync, rmSync, mkdtempSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

let encryptionAvailable = true;

vi.mock('electron', () => ({
  safeStorage: {
    isEncryptionAvailable: () => encryptionAvailable,
    encryptString: (s: string) => Buffer.from(`ENC:${s}`, 'utf8'),
    decryptString: (buf: Buffer) => {
      const s = buf.toString('utf8');
      if (!s.startsWith('ENC:')) throw new Error('not decryptable');
      return s.slice(4);
    },
  },
}));

// Imported after the mock is registered.
import { SettingsService } from './settings-service';

let dir: string;
let file: string;

beforeEach(() => {
  encryptionAvailable = true;
  dir = mkdtempSync(join(tmpdir(), 'lr-settings-'));
  file = join(dir, 'settings.json');
});
afterEach(() => {
  if (existsSync(dir)) rmSync(dir, { recursive: true, force: true });
});

describe('SettingsService', () => {
  it('redacts keys for the renderer (boolean "set", never the value)', () => {
    const s = new SettingsService(file);
    expect(s.getRedacted()).toEqual({ openaiKeySet: false, anthropicKeySet: false });
    s.setKey('openai', 'sk-secret');
    expect(s.getRedacted()).toEqual({ openaiKeySet: true, anthropicKeySet: false });
  });

  it('persists keys encrypted at rest and decrypts them on reload', () => {
    new SettingsService(file).setKey('anthropic', 'sk-ant-123');
    const onDisk = JSON.parse(readFileSync(file, 'utf8'));
    expect(onDisk.anthropicKey).toMatch(/^enc:/); // not plaintext
    expect(onDisk.anthropicKey).not.toContain('sk-ant-123');
    // A fresh instance reads + decrypts it back to plaintext for the LLM clients.
    expect(new SettingsService(file).get().anthropicKey).toBe('sk-ant-123');
  });

  it('migrates legacy plaintext keys to encrypted on first load', () => {
    writeFileSync(file, JSON.stringify({ openaiKey: 'sk-legacy-plain' }), 'utf8');
    const s = new SettingsService(file); // constructor detects plaintext and re-saves encrypted
    expect(s.get().openaiKey).toBe('sk-legacy-plain'); // still usable in memory
    expect(JSON.parse(readFileSync(file, 'utf8')).openaiKey).toMatch(/^enc:/); // now encrypted on disk
  });

  it('clears a key when set to empty/whitespace', () => {
    const s = new SettingsService(file);
    s.setKey('openai', 'sk-x');
    s.setKey('openai', '   ');
    expect(s.get().openaiKey).toBeUndefined();
    expect(s.getRedacted().openaiKeySet).toBe(false);
  });

  it('falls back to plaintext when encryption is unavailable', () => {
    encryptionAvailable = false;
    new SettingsService(file).setKey('openai', 'sk-plain-fallback');
    expect(JSON.parse(readFileSync(file, 'utf8')).openaiKey).toBe('sk-plain-fallback');
  });

  // Documents a real failure mode (review finding): if a stored ciphertext can't be
  // decrypted (keychain rotated, corrupt file), the key is silently dropped rather than
  // surfacing an error. Captured in TODOS.md for a future "key unreadable" UX.
  it('silently drops an undecryptable key (current behavior)', () => {
    writeFileSync(file, JSON.stringify({ openaiKey: `enc:${Buffer.from('garbage').toString('base64')}` }), 'utf8');
    const s = new SettingsService(file);
    expect(s.get().openaiKey).toBeUndefined();
  });
});
