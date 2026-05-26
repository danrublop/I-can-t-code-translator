// Anthropic (Claude) chat client implementing the LlmClient port (text only). Streams SSE.

import axios from 'axios';
import { readFileSync } from 'fs';
import { extname } from 'path';
import type { LlmClient } from '../notch/notch-controller';
import { readStreamErrorMessage } from './stream-error';

/** Anthropic message content: text string, or a text+image block array when an image is attached. */
function buildContent(prompt: string, imagePath?: string): unknown {
  if (!imagePath) return prompt;
  const ext = extname(imagePath).slice(1).toLowerCase() || 'png';
  const mime = ext === 'jpg' ? 'jpeg' : ext;
  const b64 = readFileSync(imagePath).toString('base64');
  return [
    { type: 'image', source: { type: 'base64', media_type: `image/${mime}`, data: b64 } },
    { type: 'text', text: prompt },
  ];
}

export class AnthropicLlmClient implements LlmClient {
  constructor(private readonly getKey: () => string | undefined) {}

  async generate(opts: { model: string; prompt: string; imagePath?: string; onToken?: (delta: string) => void; signal?: AbortSignal }): Promise<string> {
    const key = this.getKey();
    if (!key) throw new Error('No Anthropic API key — add one in Settings.');
    try {
      const res = await axios.post(
        'https://api.anthropic.com/v1/messages',
        { model: opts.model, max_tokens: 4096, stream: true, messages: [{ role: 'user', content: buildContent(opts.prompt, opts.imagePath) }] },
        {
          headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
          responseType: 'stream',
          timeout: 120000,
          signal: opts.signal,
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
                opts.onToken?.(evt.delta.text); // delta chunk, not cumulative
              } else if (evt.type === 'message_stop') {
                resolve(full);
                return;
              }
            } catch { /* skip */ }
          }
        });
        res.data.on('end', () => resolve(full));
        res.data.on('error', (e: Error) => reject(opts.signal?.aborted ? new Error('cancelled') : new Error(`Anthropic stream error: ${e.message}`)));
      });
    } catch (error) {
      if (axios.isCancel(error)) throw new Error('cancelled');
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401) throw new Error('Anthropic rejected the API key (401).');
        // The body is a stream (responseType: 'stream'); read it for the real reason.
        const detail = await readStreamErrorMessage(error.response?.data);
        const status = error.response?.status;
        throw new Error(`Anthropic API error${status ? ` (${status})` : ''}: ${detail || error.message}`);
      }
      throw error;
    }
  }
}
