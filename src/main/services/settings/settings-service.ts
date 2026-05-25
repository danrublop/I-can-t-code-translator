// App settings persisted to userData/settings.json.
//
// Holds cloud-provider API keys (OpenAI / Anthropic). Keys are encrypted at rest with
// Electron safeStorage (OS keychain-backed) and stored as `enc:<base64>`. In memory they
// are plaintext for use by the LLM clients. If encryption is unavailable (rare), we fall
// back to plaintext and migrate to encrypted on the next save.

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { safeStorage } from 'electron';

export interface AppSettings {
  openaiKey?: string;
  anthropicKey?: string;
}

export class SettingsService {
  private settings: AppSettings = {};

  constructor(private readonly file: string) {
    try {
      if (existsSync(file)) {
        const raw = JSON.parse(readFileSync(file, 'utf8')) as AppSettings;
        this.settings = { openaiKey: decrypt(raw.openaiKey), anthropicKey: decrypt(raw.anthropicKey) };
      }
    } catch {
      this.settings = {};
    }
  }

  get(): AppSettings {
    return { ...this.settings };
  }

  /** Returns a redacted view (keys -> boolean "set") for the renderer. */
  getRedacted(): { openaiKeySet: boolean; anthropicKeySet: boolean } {
    return {
      openaiKeySet: !!this.settings.openaiKey,
      anthropicKeySet: !!this.settings.anthropicKey,
    };
  }

  setKey(provider: 'openai' | 'anthropic', key: string): void {
    const trimmed = key.trim();
    if (provider === 'openai') this.settings.openaiKey = trimmed || undefined;
    else this.settings.anthropicKey = trimmed || undefined;
    this.save();
  }

  private save(): void {
    try {
      if (!existsSync(dirname(this.file))) mkdirSync(dirname(this.file), { recursive: true });
      // Encrypt keys before writing to disk.
      const onDisk: AppSettings = { openaiKey: encrypt(this.settings.openaiKey), anthropicKey: encrypt(this.settings.anthropicKey) };
      writeFileSync(this.file, JSON.stringify(onDisk, null, 2), 'utf8');
    } catch (e) {
      console.error('Failed to save settings:', e);
    }
  }
}

function encrypt(value?: string): string | undefined {
  if (!value) return undefined;
  try {
    if (safeStorage.isEncryptionAvailable()) return `enc:${safeStorage.encryptString(value).toString('base64')}`;
  } catch { /* fall through */ }
  return value; // plaintext fallback
}

function decrypt(value?: string): string | undefined {
  if (!value) return undefined;
  if (value.startsWith('enc:')) {
    try {
      return safeStorage.decryptString(Buffer.from(value.slice(4), 'base64'));
    } catch {
      return undefined; // corrupt/unreadable — treat as unset
    }
  }
  return value; // legacy plaintext (re-encrypted on next save)
}

/** Default settings path under Electron userData. */
export function settingsPath(userDataDir: string): string {
  return join(userDataDir, 'settings.json');
}
