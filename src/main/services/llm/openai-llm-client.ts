// OpenAI chat client implementing the LlmClient port (text only). Streams SSE.
// The API key comes from settings (injected getter) so it's read fresh each call.

import axios from 'axios';
import { readFileSync } from 'fs';
import { extname } from 'path';
import type { LlmClient } from '../notch/notch-controller';
import { readStreamErrorMessage } from './stream-error';

/** OpenAI message content: plain text, or a text+image multimodal array when an image is attached. */
function buildContent(prompt: string, imagePath?: string): unknown {
  if (!imagePath) return prompt;
  const ext = extname(imagePath).slice(1).toLowerCase() || 'png';
  const mime = ext === 'jpg' ? 'jpeg' : ext;
  const b64 = readFileSync(imagePath).toString('base64');
  return [
    { type: 'text', text: prompt },
    { type: 'image_url', image_url: { url: `data:image/${mime};base64,${b64}` } },
  ];
}

export class OpenAiLlmClient implements LlmClient {
  constructor(private readonly getKey: () => string | undefined) {}

  async generate(opts: { model: string; prompt: string; imagePath?: string; onToken?: (delta: string) => void; signal?: AbortSignal }): Promise<string> {
    const key = this.getKey();
    if (!key) throw new Error('No OpenAI API key — add one in Settings.');
    try {
      const res = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        { model: opts.model, messages: [{ role: 'user', content: buildContent(opts.prompt, opts.imagePath) }], stream: true },
        { headers: { Authorization: `Bearer ${key}` }, responseType: 'stream', timeout: 120000, signal: opts.signal },
      );
      const stream = res.data;
      return await new Promise<string>((resolve, reject) => {
        let full = '';
        let buffer = '';
        let settled = false;
        // Destroy the socket + detach listeners on the terminal event so a trailing SSE chunk
        // after [DONE] can't keep calling onToken once we've resolved.
        const finish = (fn: () => void) => {
          if (settled) return;
          settled = true;
          stream.removeListener('data', onData);
          stream.removeListener('end', onEnd);
          stream.removeListener('error', onError);
          stream.destroy();
          fn();
        };
        const onData = (chunk: Buffer) => {
          buffer += chunk.toString();
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';
          for (const line of lines) {
            const t = line.trim();
            if (!t.startsWith('data:')) continue;
            const payload = t.slice(5).trim();
            if (payload === '[DONE]') { finish(() => resolve(full)); return; }
            try {
              const delta = JSON.parse(payload)?.choices?.[0]?.delta?.content;
              if (typeof delta === 'string') { full += delta; opts.onToken?.(delta); } // delta, not cumulative
            } catch { /* skip */ }
          }
        };
        // Connection closed without the [DONE] sentinel: the stream was cut short, so don't
        // pass a truncated answer back as a successful completion.
        const onEnd = () => finish(() => (full
          ? reject(new Error('OpenAI stream ended before completion (truncated response).'))
          : reject(new Error('No response received from OpenAI'))));
        const onError = (e: Error) => finish(() => reject(opts.signal?.aborted ? new Error('cancelled') : new Error(`OpenAI stream error: ${e.message}`)));
        stream.on('data', onData);
        stream.on('end', onEnd);
        stream.on('error', onError);
      });
    } catch (error) {
      if (axios.isCancel(error)) throw new Error('cancelled');
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401) throw new Error('OpenAI rejected the API key (401).');
        // The body is a stream (responseType: 'stream'); read it for the real reason,
        // e.g. "model does not support images" or "rate limit exceeded".
        const detail = await readStreamErrorMessage(error.response?.data);
        const status = error.response?.status;
        throw new Error(`OpenAI API error${status ? ` (${status})` : ''}: ${detail || error.message}`);
      }
      throw error;
    }
  }
}
