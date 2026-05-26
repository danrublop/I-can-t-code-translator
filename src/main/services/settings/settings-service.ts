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
  /** User-chosen default model for text queries (overrides the built-in default). */
  defaultTextModel?: string;
  /** User-chosen default model for image/vision queries (overrides the built-in default). */
  defaultVisionModel?: string;
}

export class SettingsService {
  private settings: AppSettings = {};

  constructor(private readonly file: string) {
    try {
      if (existsSync(file)) {
        const raw = JSON.parse(readFileSync(file, 'utf8')) as AppSettings;
        this.settings = {
          openaiKey: decrypt(raw.openaiKey),
          anthropicKey: decrypt(raw.anthropicKey),
          defaultTextModel: raw.defaultTextModel,
          defaultVisionModel: raw.defaultVisionModel,
        };
        // Migrate any legacy plaintext keys to encrypted at rest, once.
        const hasLegacyPlaintext = [raw.openaiKey, raw.anthropicKey].some((v) => v && !v.startsWith('enc:'));
        if (hasLegacyPlaintext) this.save();
      }
    } catch {
      this.settings = {};
    }
  }

  get(): AppSettings {
    return { ...this.settings };
  }

  /** Returns a redacted view (keys -> boolean "set") plus default model picks for the renderer. */
  getRedacted(): { openaiKeySet: boolean; anthropicKeySet: boolean; defaultTextModel?: string; defaultVisionModel?: string } {
    return {
      openaiKeySet: !!this.settings.openaiKey,
      anthropicKeySet: !!this.settings.anthropicKey,
      defaultTextModel: this.settings.defaultTextModel,
      defaultVisionModel: this.settings.defaultVisionModel,
    };
  }

  setKey(provider: 'openai' | 'anthropic', key: string): void {
    const trimmed = key.trim();
    if (provider === 'openai') this.settings.openaiKey = trimmed || undefined;
    else this.settings.anthropicKey = trimmed || undefined;
    this.save();
  }

  /** Persist a default model pick. Empty string clears it (back to the built-in default). */
  setDefaultModel(kind: 'text' | 'vision', model: string): void {
    const trimmed = model.trim() || undefined;
    if (kind === 'text') this.settings.defaultTextModel = trimmed;
    else this.settings.defaultVisionModel = trimmed;
    this.save();
  }

  private save(): void {
    try {
      if (!existsSync(dirname(this.file))) mkdirSync(dirname(this.file), { recursive: true });
      // Encrypt keys before writing; model picks are not secrets, stored plaintext.
      const onDisk: AppSettings = {
        openaiKey: encrypt(this.settings.openaiKey),
        anthropicKey: encrypt(this.settings.anthropicKey),
        defaultTextModel: this.settings.defaultTextModel,
        defaultVisionModel: this.settings.defaultVisionModel,
      };
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
