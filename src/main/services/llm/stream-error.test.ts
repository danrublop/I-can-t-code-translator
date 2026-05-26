import { describe, it, expect } from 'vitest';
import { Readable } from 'stream';
import { extractMessage, readStreamErrorMessage } from './stream-error';

describe('extractMessage', () => {
  it('reads Ollama flat { error } shape', () => {
    expect(extractMessage('{"error":"model \'x\' not found"}')).toBe("model 'x' not found");
  });

  it('reads OpenAI/Anthropic nested { error: { message } } shape', () => {
    expect(extractMessage('{"error":{"message":"model does not support images","type":"invalid_request_error"}}'))
      .toBe('model does not support images');
  });

  it('reads a top-level { message } shape', () => {
    expect(extractMessage('{"message":"rate limit exceeded"}')).toBe('rate limit exceeded');
  });

  it('falls back to truncated raw text when not JSON', () => {
    const raw = 'a'.repeat(500);
    expect(extractMessage(raw)).toBe('a'.repeat(200));
  });

  it('falls back to raw when JSON parses but has no message (e.g. {error:{code}})', () => {
    expect(extractMessage('{"error":{"code":429}}')).toBe('{"error":{"code":429}}');
  });

  it('returns empty string for empty input', () => {
    expect(extractMessage('')).toBe('');
    expect(extractMessage('   ')).toBe('');
  });
});

describe('readStreamErrorMessage', () => {
  it('resolves the provider message from a stream body', async () => {
    const s = Readable.from([Buffer.from('{"error":{"message":"bad request"}}')]);
    expect(await readStreamErrorMessage(s)).toBe('bad request');
  });

  it('resolves empty string when given a non-stream', async () => {
    expect(await readStreamErrorMessage(undefined)).toBe('');
    expect(await readStreamErrorMessage({})).toBe('');
  });
});
