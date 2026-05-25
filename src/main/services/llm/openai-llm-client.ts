// OpenAI chat client implementing the LlmClient port (text only). Streams SSE.
// The API key comes from settings (injected getter) so it's read fresh each call.

import axios from 'axios';
import type { LlmClient } from '../notch/notch-controller';

export class OpenAiLlmClient implements LlmClient {
  constructor(private readonly getKey: () => string | undefined) {}

  async generate(opts: { model: string; prompt: string; onToken?: (partial: string) => void }): Promise<string> {
    const key = this.getKey();
    if (!key) throw new Error('No OpenAI API key — add one in Settings.');
    try {
      const res = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        { model: opts.model, messages: [{ role: 'user', content: opts.prompt }], stream: true },
        { headers: { Authorization: `Bearer ${key}` }, responseType: 'stream', timeout: 120000 },
      );
      return await new Promise<string>((resolve, reject) => {
        let full = '';
        let buffer = '';
        res.data.on('data', (chunk: Buffer) => {
          buffer += chunk.toString();
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';
          for (const line of lines) {
            const t = line.trim();
            if (!t.startsWith('data:')) continue;
            const payload = t.slice(5).trim();
            if (payload === '[DONE]') { resolve(full); return; }
            try {
              const delta = JSON.parse(payload)?.choices?.[0]?.delta?.content;
              if (typeof delta === 'string') { full += delta; opts.onToken?.(full); }
            } catch { /* skip */ }
          }
        });
        res.data.on('end', () => resolve(full));
        res.data.on('error', (e: Error) => reject(new Error(`OpenAI stream error: ${e.message}`)));
      });
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401) throw new Error('OpenAI rejected the API key (401).');
        throw new Error(`OpenAI API error: ${error.message}`);
      }
      throw error;
    }
  }
}
