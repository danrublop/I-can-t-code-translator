// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { Editor } from '@tiptap/core';
import { notebookExtensions } from './extensions';
import { findAiBlock, setAiBlockText, setAiBlockAttrs } from './doc-helpers';

function editorWithBlock(blockId: string) {
  return new Editor({
    extensions: notebookExtensions(),
    content: {
      type: 'doc',
      content: [
        { type: 'paragraph', content: [{ type: 'text', text: 'intro' }] },
        { type: 'aiBlock', attrs: { blockId, model: 'llama3.2', state: 'generating' }, content: [{ type: 'paragraph' }] },
      ],
    },
  });
}

describe('findAiBlock', () => {
  it('locates an aiBlock by id', () => {
    const e = editorWithBlock('B1');
    const hit = findAiBlock(e, 'B1');
    expect(hit).not.toBeNull();
    expect(hit?.attrs.model).toBe('llama3.2');
    e.destroy();
  });

  it('returns null for a missing id', () => {
    const e = editorWithBlock('B1');
    expect(findAiBlock(e, 'nope')).toBeNull();
    e.destroy();
  });
});

describe('setAiBlockText (cumulative streaming)', () => {
  it('replaces the block content with the cumulative text', () => {
    const e = editorWithBlock('B1');
    expect(setAiBlockText(e, 'B1', 'Hello')).toBe(true);
    expect(setAiBlockText(e, 'B1', 'Hello world')).toBe(true); // cumulative update
    const md = e.getMarkdown();
    expect(md).toContain('<!--ai:B1-->');
    expect(md).toContain('Hello world');
    expect(md).not.toContain('Hello world world'); // not appending deltas
    e.destroy();
  });

  it('is a no-op (false) when the block was removed mid-stream', () => {
    const e = editorWithBlock('B1');
    expect(setAiBlockText(e, 'gone', 'late token')).toBe(false);
    e.destroy();
  });

  it('leaves surrounding prose intact', () => {
    const e = editorWithBlock('B1');
    setAiBlockText(e, 'B1', 'answer');
    expect(e.getMarkdown()).toContain('intro');
    e.destroy();
  });
});

describe('setAiBlockAttrs', () => {
  it('patches transient state without throwing', () => {
    const e = editorWithBlock('B1');
    expect(setAiBlockAttrs(e, 'B1', { state: 'error' })).toBe(true);
    expect(findAiBlock(e, 'B1')?.attrs.state).toBe('error');
    e.destroy();
  });
});
