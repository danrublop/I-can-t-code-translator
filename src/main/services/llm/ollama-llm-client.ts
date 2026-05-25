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

  /** Pull a model via /api/pull, streaming progress. Resolves when complete. */
  async pullModel(name: string, onProgress?: (status: string, percent: number) => void): Promise<void> {
    const res = await axios.post(`${BASE_URL}/api/pull`, { name, stream: true }, { responseType: 'stream', timeout: 0 });
    return await new Promise<void>((resolve, reject) => {
      let buffer = '';
      res.data.on('data', (chunk: Buffer) => {
        buffer += chunk.toString();
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';
        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const d = JSON.parse(line);
            const pct = d.total ? Math.round((d.completed ?? 0) / d.total * 100) : 0;
            onProgress?.(String(d.status ?? ''), pct);
            if (d.error) reject(new Error(d.error));
          } catch { /* skip */ }
        }
      });
      res.data.on('end', () => resolve());
      res.data.on('error', (e: Error) => reject(new Error(`Ollama pull error: ${e.message}`)));
    });
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
        // Read Ollama's actual error body (the response is a stream) for a useful message,
        // e.g. "model 'X' not found" or "this model does not support images".
        const detail = await readStreamMessage(error.response?.data);
        const status = error.response?.status;
        throw new Error(`Ollama error${status ? ` (${status})` : ''}: ${detail || error.message}`);
      }
      throw error;
    }
  }
}

/** Best-effort read of an error response stream into Ollama's `{error}` message. */
async function readStreamMessage(stream: unknown): Promise<string> {
  if (!stream || typeof (stream as { on?: unknown }).on !== 'function') return '';
  return await new Promise<string>((resolve) => {
    let data = '';
    const s = stream as NodeJS.ReadableStream;
    const done = () => {
      try {
        const j = JSON.parse(data);
        resolve(typeof j.error === 'string' ? j.error : data.slice(0, 200));
      } catch {
        resolve(data.slice(0, 200));
      }
    };
    s.on('data', (c: Buffer) => { data += c.toString(); });
    s.on('end', done);
    s.on('error', () => resolve(''));
    setTimeout(done, 2000);
  });
}
