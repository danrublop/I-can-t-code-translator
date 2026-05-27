// The TipTap extension set for the notebook editor. Shared by the React editor component
// and the headless serializer tests so on-disk Markdown fidelity is verified against the
// exact schema the user edits in.

import StarterKit from '@tiptap/starter-kit';
import { Markdown } from '@tiptap/markdown';
import type { AnyExtension } from '@tiptap/core';
import { AiBlock } from './ai-block';

/** Extensions for the notebook editor: standard rich text (StarterKit), Markdown
 *  serialization (Markdown), and the custom AI block (AiBlock).
 *
 *  Note bodies contain model- and clipboard-sourced content, so links in them are
 *  untrusted. StarterKit bundles the Link extension with `openOnClick: true`, which calls
 *  `window.open()` from the renderer on click. We disable that here; external links are
 *  routed through the main process (`shell.openExternal`) via the window's open handler. */
export function notebookExtensions(): AnyExtension[] {
  return [StarterKit.configure({ link: { openOnClick: false } }), Markdown, AiBlock];
}
