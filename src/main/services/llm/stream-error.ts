// Shared helper for reading a provider's error body off an axios stream response.
//
// All three LLM clients use `responseType: 'stream'`, so on an HTTP error axios hands
// back `error.response.data` as a readable stream rather than a parsed body. Each provider
// wraps its message differently, so we read the bytes, try the known JSON shapes, and fall
// back to a truncated raw string. Best-effort: never throws, resolves '' if unreadable.
//
//   Ollama     -> { "error": "model 'x' not found" }
//   OpenAI     -> { "error": { "message": "..." } }
//   Anthropic  -> { "error": { "message": "..." }, "type": "error" }

export async function readStreamErrorMessage(stream: unknown): Promise<string> {
  if (!stream || typeof (stream as { on?: unknown }).on !== 'function') return '';
  return await new Promise<string>((resolve) => {
    let data = '';
    let settled = false;
    const s = stream as NodeJS.ReadableStream;
    const finish = () => {
      if (settled) return;
      settled = true;
      resolve(extractMessage(data));
    };
    s.on('data', (c: Buffer) => { data += c.toString(); });
    s.on('end', finish);
    s.on('error', () => { if (!settled) { settled = true; resolve(''); } });
    // Guard against a stream that never ends (don't hang the error path).
    setTimeout(finish, 2000);
  });
}

/** Pull the human message out of a provider error body, trying nested then flat `error`. */
export function extractMessage(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return '';
  try {
    const j = JSON.parse(trimmed);
    // OpenAI / Anthropic: { error: { message } }. Ollama: { error: "..." }.
    if (j?.error?.message && typeof j.error.message === 'string') return j.error.message;
    if (typeof j?.error === 'string') return j.error;
    if (typeof j?.message === 'string') return j.message;
  } catch { /* not JSON — fall through to raw */ }
  return trimmed.slice(0, 200);
}
