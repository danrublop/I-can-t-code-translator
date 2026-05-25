import React, { useEffect, useRef, useState, useCallback } from 'react';
import ReactDOM from 'react-dom/client';
import './notebook.css';

interface NotebookMeta { prompt: string; selection: string; sourceApp?: string; model: string }
interface NoteSummary { id: string; title: string; snippet: string; sourceApp?: string; pinned: boolean; createdAt: string }
interface NotebookAPI {
  list: () => Promise<NoteSummary[]>;
  getBody: (id: string) => Promise<string | null>;
  rename: (id: string, title: string) => Promise<void>;
  setPinned: (id: string, pinned: boolean) => Promise<void>;
  updateBody: (id: string, body: string) => Promise<void>;
  onSaved: (cb: (id: string) => void) => () => void;
  onStart: (cb: (meta: NotebookMeta) => void) => () => void;
  onToken: (cb: (partial: string) => void) => () => void;
  onDone: (cb: (answer: string) => void) => () => void;
  onError: (cb: (message: string) => void) => () => void;
}
declare global { interface Window { notebookAPI: NotebookAPI } }

const FONTS = ['Inter', 'Georgia', 'Charter', 'Menlo', 'system-ui'];
const SIZES = ['14', '16', '18', '20'];

function Notebook() {
  const [notes, setNotes] = useState<NoteSummary[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [streaming, setStreaming] = useState<'idle' | 'streaming' | 'error'>('idle');
  const [streamErr, setStreamErr] = useState('');
  const [font, setFont] = useState(localStorage.getItem('nb-font') || 'Inter');
  const [size, setSize] = useState(localStorage.getItem('nb-size') || '16');
  const editorRef = useRef<HTMLDivElement>(null);
  const selectedRef = useRef<string | null>(null);
  const streamingRef = useRef(false);
  selectedRef.current = selectedId;

  // Editor content is set/read via textContent/innerText only (no innerHTML) — the notes
  // can contain captured text + model output, so we never inject HTML. Formatting buttons
  // affect the live editor via execCommand; persisting rich formatting safely (sanitizer)
  // is a follow-up.
  const setEditor = (text: string) => { if (editorRef.current) editorRef.current.textContent = text; };

  const refresh = useCallback(async () => setNotes(await window.notebookAPI.list()), []);

  const selectNote = useCallback(async (id: string, fromList?: NoteSummary[]) => {
    streamingRef.current = false;
    setStreaming('idle');
    setSelectedId(id);
    const list = fromList ?? notes;
    setTitle(list.find((n) => n.id === id)?.title ?? '');
    const body = await window.notebookAPI.getBody(id);
    setEditor(body ?? '');
  }, [notes]);

  useEffect(() => {
    (async () => {
      const list = await window.notebookAPI.list();
      setNotes(list);
      if (list.length) selectNote(list[0].id, list);
    })();
    const offStart = window.notebookAPI.onStart((m) => {
      streamingRef.current = true;
      setStreaming('streaming'); setStreamErr('');
      setSelectedId(null);
      setTitle(m.prompt);
      setEditor('');
    });
    const offToken = window.notebookAPI.onToken((p) => { if (streamingRef.current) setEditor(p); });
    const offDone = window.notebookAPI.onDone((a) => setEditor(a));
    const offErr = window.notebookAPI.onError((msg) => { streamingRef.current = false; setStreaming('error'); setStreamErr(msg); });
    const offSaved = window.notebookAPI.onSaved(async (id) => {
      streamingRef.current = false; setStreaming('idle');
      const list = await window.notebookAPI.list();
      setNotes(list);
      selectNote(id, list);
    });
    return () => { offStart(); offToken(); offDone(); offErr(); offSaved(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onTitleChange(v: string) {
    setTitle(v);
    if (selectedId) window.notebookAPI.rename(selectedId, v).then(refresh).catch(() => {});
  }

  function togglePin(e: React.MouseEvent, n: NoteSummary) {
    e.stopPropagation();
    window.notebookAPI.setPinned(n.id, !n.pinned).then(refresh).catch(() => {});
  }

  function saveBody() {
    if (selectedRef.current && !streamingRef.current && editorRef.current) {
      window.notebookAPI.updateBody(selectedRef.current, editorRef.current.innerText).then(refresh).catch(() => {});
    }
  }

  function format(cmd: string, value?: string) {
    editorRef.current?.focus();
    document.execCommand(cmd, false, value);
  }

  function applyFont(f: string) { setFont(f); localStorage.setItem('nb-font', f); }
  function applySize(s: string) { setSize(s); localStorage.setItem('nb-size', s); }

  function newNote() {
    streamingRef.current = false; setStreaming('idle');
    setSelectedId(null); setTitle('');
    setEditor('');
    editorRef.current?.focus();
  }

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="sidebar-top" />
        <div className="sidebar-head">
          <h2>Notes</h2>
          <button className="new-btn" onClick={newNote} title="New note">+</button>
        </div>
        <div className="note-list">
          {notes.length === 0 && <div className="empty-list">No notes yet.<br />Capture text and pick an action.</div>}
          {notes.map((n) => (
            <div key={n.id} className={`note-row${selectedId === n.id ? ' selected' : ''}`} onClick={() => selectNote(n.id)}>
              <div className="body">
                <div className="title">{n.title}</div>
                <div className="meta">{n.sourceApp ? `${n.sourceApp} · ` : ''}{n.snippet}</div>
              </div>
              <button className={`pin${n.pinned ? ' on' : ''}`} onClick={(e) => togglePin(e, n)} title={n.pinned ? 'Unpin' : 'Pin'}>📌</button>
            </div>
          ))}
        </div>
      </aside>

      <main className="main">
        <div className="main-top" />
        <input className="title-input" placeholder="Untitled" value={title} onChange={(e) => onTitleChange(e.target.value)} />
        <div className="toolbar">
          <button className="b" onClick={() => format('bold')} title="Bold">B</button>
          <button className="i" onClick={() => format('italic')} title="Italic">I</button>
          <button onClick={() => format('formatBlock', 'h2')} title="Heading">H</button>
          <button onClick={() => format('insertUnorderedList')} title="Bullet list">•</button>
          <span className="sep" />
          <select value={font} onChange={(e) => applyFont(e.target.value)} title="Font">
            {FONTS.map((f) => <option key={f} value={f}>{f}</option>)}
          </select>
          <select value={size} onChange={(e) => applySize(e.target.value)} title="Size">
            {SIZES.map((s) => <option key={s} value={s}>{s}px</option>)}
          </select>
          {streaming === 'streaming' && <span className="meta">streaming…</span>}
        </div>
        <div
          ref={editorRef}
          className="editor"
          contentEditable={streaming !== 'streaming'}
          suppressContentEditableWarning
          onBlur={saveBody}
          style={{ fontFamily: font, fontSize: `${size}px` }}
        />
        {streaming === 'error' && <div className="streaming-tag err">{streamErr}</div>}
      </main>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(<Notebook />);
