// Ollama adapter implementing the NotchController's LlmClient port.
//
// Generic over model + prompt (the notch flow routes the model itself, unlike the legacy
// explanation service which hardcoded mistral). Supports vision by passing a base64 image
// in the `images` field of /api/generate. Streams NDJSON and reports cumulative partials
// via onToken. Thin runtime adapter — verified by running the app, not unit tests.

import axios from 'axios';
import { readFileSync } from 'fs';
import type { LlmClient } from '../notch/notch-controller';

const BASE_URL = 'http://127.0.0.1:11434';
const TIMEOUT_MS = 300000;

export class OllamaLlmClient implements LlmClient {
  /** List locally installed model names (for the panel's model picker). Empty on failure. */
  async listModels(): Promise<string[]> {
    try {
      const { data } = await axios.get(`${BASE_URL}/api/tags`, { timeout: 4000 });
      const models = (data?.models ?? []) as Array<{ name: string }>;
      return models.map((m) => m.name).filter(Boolean);
    } catch {
      return [];
    }
  }

  async generate(opts: {
    model: string;
    prompt: string;
    imagePath?: string;
    onToken?: (partial: string) => void;
  }): Promise<string> {
    const body: Record<string, unknown> = {
      model: opts.model,
      prompt: opts.prompt,
      stream: true,
      options: { temperature: 0.7, top_p: 0.9 },
    };
    if (opts.imagePath) {
      body.images = [readFileSync(opts.imagePath).toString('base64')];
    }

    try {
      const response = await axios.post(`${BASE_URL}/api/generate`, body, {
        timeout: TIMEOUT_MS,
        responseType: 'stream',
      });

      return await new Promise<string>((resolve, reject) => {
        let full = '';
        let buffer = '';
        response.data.on('data', (chunk: Buffer) => {
          buffer += chunk.toString();
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';
          for (const line of lines) {
            if (!line.trim()) continue;
            try {
              const data = JSON.parse(line);
              if (typeof data.response === 'string') {
                full += data.response;
                opts.onToken?.(full);
              }
              if (data.done) resolve(full);
            } catch {
              // skip malformed line
            }
          }
        });
        response.data.on('end', () => {
          if (full) resolve(full);
          else reject(new Error('No response received from Ollama'));
        });
        response.data.on('error', (err: Error) => reject(new Error(`Ollama stream error: ${err.message}`)));
      });
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.code === 'ECONNREFUSED') {
          throw new Error('Ollama is not running. Start it and try again.');
        }
        if (error.code === 'ETIMEDOUT') {
          throw new Error('Ollama request timed out.');
        }
        throw new Error(`Ollama API error: ${error.message}`);
      }
      throw error;
    }
  }
}
