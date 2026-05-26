// The TipTap extension set for the notebook editor. Shared by the React editor component
// and the headless serializer tests so on-disk Markdown fidelity is verified against the
// exact schema the user edits in.

import StarterKit from '@tiptap/starter-kit';
import { Markdown } from '@tiptap/markdown';
import type { AnyExtension } from '@tiptap/core';
import { AiBlock } from './ai-block';

/** Extensions for the notebook editor: standard rich text (StarterKit), Markdown
 *  serialization (Markdown), and the custom AI block (AiBlock). */
export function notebookExtensions(): AnyExtension[] {
  return [StarterKit, Markdown, AiBlock];
}
