// App settings persisted to userData/settings.json.
//
// Holds cloud-provider API keys (OpenAI / Anthropic) so the user can use hosted models
// alongside local Ollama ones. NOTE: keys are stored in plaintext JSON in the app's user
// data dir. That's acceptable for a local single-user app, but it is NOT OS-keychain
// secure — revisit with keytar/safeStorage if this ships widely.

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';

export interface AppSettings {
  openaiKey?: string;
  anthropicKey?: string;
}

export class SettingsService {
  private settings: AppSettings = {};

  constructor(private readonly file: string) {
    try {
      if (existsSync(file)) this.settings = JSON.parse(readFileSync(file, 'utf8')) as AppSettings;
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
      writeFileSync(this.file, JSON.stringify(this.settings, null, 2), 'utf8');
    } catch (e) {
      console.error('Failed to save settings:', e);
    }
  }
}

/** Default settings path under Electron userData. */
export function settingsPath(userDataDir: string): string {
  return join(userDataDir, 'settings.json');
}
