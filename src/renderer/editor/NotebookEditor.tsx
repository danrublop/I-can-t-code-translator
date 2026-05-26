// NotebookEditor: the TipTap-based note editor with inline `/` generation.
//
// Additive component — not yet swapped into notebook.tsx. Verify with `npm run dev` before
// replacing the contentEditable editor.
//
//   user types `/` -> slash menu (filterCommands) -> pick -> insert empty AiBlock(blockId)
//        |                                                         |
//        +- selection text ----------------------------------------+
//   notebookAPI.generate({blockId, commandId, selection}) -> onGen* (by blockId) ->
//        setAiBlockText(cumulative) / setAiBlockAttrs(state)   [see doc-helpers.ts]
//
// Markdown is the on-disk format: load via setContent(md, markdown), save via getMarkdown().

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useEditor, EditorContent, ReactNodeViewRenderer } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Markdown } from '@tiptap/markdown';
import { AiBlock } from './ai-block';
import { AiBlockView } from './ai-block-view';
import { setAiBlockText, setAiBlockAttrs } from './doc-helpers';
import { mergeCommands, filterCommands, type SlashCommand } from '../../main/services/presets/slash-commands';

// The inline-generation slice of window.notebookAPI (preload-notebook.ts).
interface GenerateApi {
  generate: (req: { blockId: string; commandId?: string; freeText?: string; selection?: string; userSelectedModel?: string }) => Promise<{ ok: boolean; error?: string }>;
  onGenStart: (cb: (p: { blockId: string; model: string }) => void) => () => void;
  onGenToken: (cb: (p: { blockId: string; delta: string }) => void) => () => void;
  onGenDone: (cb: (p: { blockId: string; answer: string; model: string }) => void) => () => void;
  onGenError: (cb: (p: { blockId: string; message: string }) => void) => () => void;
}
function genApi(): GenerateApi {
  return (window as unknown as { notebookAPI: GenerateApi }).notebookAPI;
}

const AiBlockWithView = AiBlock.extend({
  addNodeView() {
    return ReactNodeViewRenderer(AiBlockView);
  },
});

export interface NotebookEditorProps {
  /** Initial body as Markdown. */
  markdown: string;
  /** Model id to use for generation (per-note / picker selection). */
  model?: string;
  /** User-defined slash commands (from settings); merged after the built-ins. */
  userCommands?: SlashCommand[];
  /** Called (debounced) when the body changes, with the current Markdown. */
  onChange?: (markdown: string) => void;
}

interface MenuState {
  open: boolean;
  query: string;
  /** caret screen coords for positioning. */
  left: number;
  top: number;
  index: number;
  /** doc position of the `/` that opened the menu. */
  from: number;
}

const CLOSED: MenuState = { open: false, query: '', left: 0, top: 0, index: 0, from: 0 };

export function NotebookEditor({ markdown, model, userCommands = [], onChange }: NotebookEditorProps) {
  const [menu, setMenu] = useState<MenuState>(CLOSED);
  const buffers = useRef<Map<string, string>>(new Map());
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const commands = mergeCommands(userCommands);
  const results = menu.open ? filterCommands(commands, menu.query, 'text') : [];

  const editor = useEditor({
    extensions: [StarterKit, Markdown, AiBlockWithView],
    content: markdown,
    contentType: 'markdown' as never,
    onUpdate: ({ editor }) => {
      if (onChange) {
        if (saveTimer.current) clearTimeout(saveTimer.current);
        saveTimer.current = setTimeout(() => onChange(editor.getMarkdown()), 400);
      }
      detectSlash();
    },
    onSelectionUpdate: () => detectSlash(),
  });

  // ---- slash detection -----------------------------------------------------------------
  const detectSlash = useCallback(() => {
    if (!editor) return;
    const { state } = editor;
    const { $from, empty } = state.selection;
    if (!empty) return setMenu(CLOSED);
    const textBefore = $from.parent.textBetween(0, $from.parentOffset, undefined, '￼');
    const m = /(?:^|\s)\/(\S*)$/.exec(textBefore);
    if (!m) return setMenu(CLOSED);
    const query = m[1];
    const slashFrom = $from.pos - query.length - 1; // position of the '/'
    const coords = editor.view.coordsAtPos($from.pos);
    setMenu((prev) => ({ open: true, query, left: coords.left, top: coords.bottom, index: prev.open ? prev.index : 0, from: slashFrom }));
  }, [editor]);

  // ---- run a command -------------------------------------------------------------------
  const runCommand = useCallback((cmd: SlashCommand) => {
    if (!editor) return;
    const { state } = editor;
    const sel = state.selection;
    const selection = sel.empty ? '' : state.doc.textBetween(sel.from, sel.to, '\n');
    const blockId = crypto.randomUUID();

    editor
      .chain()
      .focus()
      .deleteRange({ from: menu.from, to: state.selection.$from.pos })
      .insertContent({
        type: 'aiBlock',
        attrs: { blockId, model: model ?? null, commandId: cmd.id, prompt: cmd.name, selection, state: 'generating' },
        content: [{ type: 'paragraph' }],
      })
      .run();

    setMenu(CLOSED);
    buffers.current.set(blockId, '');
    void genApi().generate({ blockId, commandId: cmd.id, selection, userSelectedModel: model });
  }, [editor, menu.from, model]);

  // ---- re-run (from the NodeView) ------------------------------------------------------
  useEffect(() => {
    if (!editor) return;
    (editor.storage as { aiBlock?: { onRerun?: (id: string) => void } }).aiBlock!.onRerun = (blockId: string) => {
      let attrs: Record<string, unknown> | null = null;
      editor.state.doc.descendants((node) => {
        if (node.type.name === 'aiBlock' && node.attrs.blockId === blockId) { attrs = { ...node.attrs }; return false; }
        return true;
      });
      if (!attrs) return;
      const a = attrs as { commandId?: string; selection?: string };
      setAiBlockAttrs(editor, blockId, { state: 'generating' });
      buffers.current.set(blockId, '');
      void genApi().generate({ blockId, commandId: a.commandId, selection: a.selection ?? '', userSelectedModel: model });
    };
  }, [editor, model]);

  // ---- streaming wiring ----------------------------------------------------------------
  useEffect(() => {
    if (!editor) return;
    const api = genApi();
    const offStart = api.onGenStart(({ blockId, model: m }) => {
      buffers.current.set(blockId, '');
      setAiBlockAttrs(editor, blockId, { state: 'generating', model: m });
    });
    const offToken = api.onGenToken(({ blockId, delta }) => {
      const cur = (buffers.current.get(blockId) ?? '') + delta;
      buffers.current.set(blockId, cur);
      setAiBlockText(editor, blockId, cur);
    });
    const offDone = api.onGenDone(({ blockId, answer, model: m }) => {
      setAiBlockText(editor, blockId, answer || (buffers.current.get(blockId) ?? ''));
      setAiBlockAttrs(editor, blockId, { state: 'done', model: m });
      buffers.current.delete(blockId);
      if (onChange) onChange(editor.getMarkdown());
    });
    const offErr = api.onGenError(({ blockId }) => {
      setAiBlockAttrs(editor, blockId, { state: 'error' });
      buffers.current.delete(blockId);
    });
    return () => { offStart(); offToken(); offDone(); offErr(); };
  }, [editor, onChange]);

  // ---- menu keyboard nav ---------------------------------------------------------------
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!menu.open || results.length === 0) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setMenu((p) => ({ ...p, index: (p.index + 1) % results.length })); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setMenu((p) => ({ ...p, index: (p.index - 1 + results.length) % results.length })); }
    else if (e.key === 'Enter') { e.preventDefault(); runCommand(results[menu.index]); }
    else if (e.key === 'Escape') { e.preventDefault(); setMenu(CLOSED); }
  };

  return (
    <div className="nb-editor" onKeyDown={onKeyDown}>
      <EditorContent editor={editor} className="nb-editor__content" />
      {menu.open && results.length > 0 && (
        <div className="slash-menu" style={{ position: 'fixed', left: menu.left, top: menu.top + 4 }} role="listbox">
          {results.map((c, i) => (
            <button
              key={c.id}
              type="button"
              role="option"
              aria-selected={i === menu.index}
              className={`slash-item${i === menu.index ? ' is-active' : ''}`}
              onMouseDown={(e) => { e.preventDefault(); runCommand(c); }}
              onMouseEnter={() => setMenu((p) => ({ ...p, index: i }))}
            >
              <span className="slash-item__name">{c.name}</span>
              {c.source === 'user' && <span className="slash-item__badge">custom</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
