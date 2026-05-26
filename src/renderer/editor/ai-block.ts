// AiBlock: a TipTap node wrapping a model-generated answer inside a note.
//
// In the editor it renders as a contained region (left rule + model label) the user can
// re-run. On disk it must NOT pollute the human-readable Markdown, so it serializes to an
// invisible anchor comment `<!--ai:<blockId>-->` followed by its inner Markdown. The anchor
// keys into the sidecar `<id>.meta.json` (prompt/model) — see services/notebook/sidecar.ts.
//
//   editor node  ──renderMarkdown──▶  <!--ai:01ABC-->\n<inner markdown>
//   (attrs: blockId, model)            ▲ binds to sidecar metadata by blockId
//
// Note: the reverse direction (Markdown → AiBlock) is reconstructed at load time by
// scanning anchors and wrapping the following block with sidecar metadata, NOT by Markdown
// parsing — an HTML comment carries no content boundary marked.js can rely on.

import { Node, mergeAttributes } from '@tiptap/core';

export interface AiBlockAttrs {
  blockId: string | null;
  model: string | null;
}

export const AiBlock = Node.create({
  name: 'aiBlock',
  group: 'block',
  content: 'block+',
  defining: true,
  selectable: true,

  addAttributes() {
    return {
      blockId: {
        default: null,
        parseHTML: (el) => (el as HTMLElement).getAttribute('data-block-id'),
        renderHTML: (attrs) => (attrs.blockId ? { 'data-block-id': attrs.blockId } : {}),
      },
      model: {
        default: null,
        parseHTML: (el) => (el as HTMLElement).getAttribute('data-model'),
        renderHTML: (attrs) => (attrs.model ? { 'data-model': attrs.model } : {}),
      },
      // Re-run inputs — held in the live doc so re-run is self-contained; persisted to the
      // sidecar on save (cross-session re-run). NONE are serialized to Markdown.
      prompt: { default: null, rendered: false },     // resolved/display prompt
      commandId: { default: null, rendered: false },  // slash command (preset) id, if any
      selection: { default: null, rendered: false },  // the text the command ran on
      // Transient generation state for the NodeView; never persisted.
      state: { default: 'done', rendered: false },
    };
  },

  // The React editor sets onRerun here after construction; the NodeView calls it. Kept in
  // storage (not options) so the headless serializer needs no React dependency.
  addStorage() {
    return { onRerun: null as ((blockId: string) => void) | null };
  },

  parseHTML() {
    return [{ tag: 'div[data-ai-block]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-ai-block': '' }), 0];
  },

  // Markdown serialization: an invisible HTML-comment PAIR wrapping the block's inner
  // Markdown. The pair gives a parseable boundary (an open comment alone is dropped by the
  // markdown parser with no way to know where the block ends), while staying invisible in
  // any rendered Markdown viewer. The open marker carries the blockId that keys the sidecar.
  // Reconstruction (markdown -> AiBlock) is done from the raw text by markdownToDoc()
  // (reconstruct.ts), since the parser strips comments. If the markers are lost (external
  // edit), the inner Markdown simply renders as plain prose — graceful degradation.
  renderMarkdown(node: { attrs?: { blockId?: string | null } }, helpers: { renderChildren: (n: unknown) => string }) {
    const id = node.attrs?.blockId ?? '';
    const inner = helpers.renderChildren(node).trim();
    return `<!--ai:${id}-->\n${inner}\n<!--/ai-->`;
  },
} as Parameters<typeof Node.create>[0]);
