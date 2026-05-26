// Doc helpers for AI-block streaming. Pure ProseMirror/TipTap doc operations, separated
// from the React component so they can be unit-tested headlessly (jsdom) without rendering.

import type { Editor } from '@tiptap/core';

export interface AiBlockHit {
  pos: number;
  /** The node's size (so callers can compute the inner content range). */
  nodeSize: number;
  attrs: Record<string, unknown>;
}

/** Find an aiBlock node by its blockId. Returns its document position + size, or null. */
export function findAiBlock(editor: Editor, blockId: string): AiBlockHit | null {
  let hit: AiBlockHit | null = null;
  editor.state.doc.descendants((node, pos) => {
    if (hit) return false;
    if (node.type.name === 'aiBlock' && node.attrs.blockId === blockId) {
      hit = { pos, nodeSize: node.nodeSize, attrs: { ...node.attrs } };
      return false;
    }
    return true;
  });
  return hit;
}

/**
 * Replace an aiBlock's entire content with `text` as a single paragraph. Used while
 * streaming: callers pass the CUMULATIVE answer so far (not deltas), so the block always
 * shows the full current text. No-op if the block isn't found (it was deleted mid-stream —
 * matches the bridge's "drop tokens for a gone block" rule). Returns whether it applied.
 */
export function setAiBlockText(editor: Editor, blockId: string, text: string): boolean {
  const hit = findAiBlock(editor, blockId);
  if (!hit) return false;
  const { state, view } = editor;
  const inner = text.length ? [state.schema.node('paragraph', null, state.schema.text(text))] : [state.schema.node('paragraph')];
  const fragmentStart = hit.pos + 1; // inside the aiBlock
  const fragmentEnd = hit.pos + hit.nodeSize - 1;
  const tr = state.tr.replaceWith(fragmentStart, fragmentEnd, inner);
  tr.setMeta('addToHistory', false); // streaming updates shouldn't spam undo history
  view.dispatch(tr);
  return true;
}

/** Patch an aiBlock's transient attrs (e.g. state: 'generating' | 'error' | 'done'). */
export function setAiBlockAttrs(editor: Editor, blockId: string, attrs: Record<string, unknown>): boolean {
  const hit = findAiBlock(editor, blockId);
  if (!hit) return false;
  const { state, view } = editor;
  const tr = state.tr.setNodeMarkup(hit.pos, undefined, { ...hit.attrs, ...attrs });
  tr.setMeta('addToHistory', false);
  view.dispatch(tr);
  return true;
}
