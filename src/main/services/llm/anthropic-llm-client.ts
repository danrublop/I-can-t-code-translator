// Anthropic (Claude) chat client implementing the LlmClient port (text only). Streams SSE.

import axios from 'axios';
import type { LlmClient } from '../notch/notch-controller';

export class AnthropicLlmClient implements LlmClient {
  constructor(private readonly getKey: () => string | undefined) {}

  async generate(opts: { model: string; prompt: string; onToken?: (partial: string) => void }): Promise<string> {
    const key = this.getKey();
    if (!key) throw new Error('No Anthropic API key — add one in Settings.');
    try {
      const res = await axios.post(
        'https://api.anthropic.com/v1/messages',
        { model: opts.model, max_tokens: 4096, stream: true, messages: [{ role: 'user', content: opts.prompt }] },
        {
          headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
          responseType: 'stream',
          timeout: 120000,
        },
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
            try {
              const evt = JSON.parse(t.slice(5).trim());
              if (evt.type === 'content_block_delta' && typeof evt.delta?.text === 'string') {
                full += evt.delta.text;
                opts.onToken?.(full);
              } else if (evt.type === 'message_stop') {
                resolve(full);
                return;
              }
            } catch { /* skip */ }
          }
        });
        res.data.on('end', () => resolve(full));
        res.data.on('error', (e: Error) => reject(new Error(`Anthropic stream error: ${e.message}`)));
      });
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401) throw new Error('Anthropic rejected the API key (401).');
        throw new Error(`Anthropic API error: ${error.message}`);
      }
      throw error;
    }
  }
}
