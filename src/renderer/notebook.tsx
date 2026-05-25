import React, { useEffect, useRef, useState, useCallback } from 'react';
import ReactDOM from 'react-dom/client';
import DOMPurify from 'dompurify';
import { BrandIcon } from './model-icon';
import { SettingsView } from './settings-view';
import './notebook.css';

interface NotebookMeta { prompt: string; selection: string; sourceApp?: string; model: string }
interface NoteSummary { id: string; title: string; snippet: string; sourceApp?: string; model?: string; imagePath?: string; pinned: boolean; createdAt: string }
interface NotebookAPI {
  openSettings: () => void;
  list: () => Promise<NoteSummary[]>;
  search: (query: string) => Promise<Array<{ id: string; snippet: string; tags: string[] }>>;
  getBody: (id: string) => Promise<string | null>;
  getImage: (id: string) => Promise<string | null>;
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

const FONTS = [
  // Sans-serif
  'Inter', 'system-ui', 'Helvetica Neue', 'Arial', 'Avenir', 'Avenir Next',
  'Futura', 'Gill Sans', 'Optima', 'Verdana', 'Trebuchet MS', 'Tahoma', 'Geneva',
  // Serif
  'Georgia', 'Charter', 'Iowan Old Style', 'Palatino', 'Baskerville',
  'Times New Roman', 'Hoefler Text', 'Didot', 'Cochin', 'Big Caslon', 'Athelas',
  // Slab / typewriter
  'American Typewriter', 'Rockwell', 'Courier New',
  // Monospace
  'Menlo', 'Monaco', 'SF Mono', 'JetBrains Mono', 'Andale Mono',
  // Display / handwriting
  'Impact', 'Copperplate', 'Comic Sans MS', 'Bradley Hand', 'Marker Felt',
  'Chalkboard SE', 'Noteworthy', 'Snell Roundhand', 'Papyrus',
];
const SIZES = ['12', '14', '16', '18', '20', '24', '28', '32'];

// Monochrome line icons (currentColor) for a consistent toolbar — no emoji.
const Ico = {
  quote: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 5h13M3 12h13M3 19h13M20 5v6a3 3 0 0 1-3 3" /></svg>,
  bullet: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="9" y1="6" x2="20" y2="6" /><line x1="9" y1="12" x2="20" y2="12" /><line x1="9" y1="18" x2="20" y2="18" /><circle cx="4" cy="6" r="1.4" fill="currentColor" stroke="none" /><circle cx="4" cy="12" r="1.4" fill="currentColor" stroke="none" /><circle cx="4" cy="18" r="1.4" fill="currentColor" stroke="none" /></svg>,
  ordered: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="10" y1="6" x2="20" y2="6" /><line x1="10" y1="12" x2="20" y2="12" /><line x1="10" y1="18" x2="20" y2="18" /><path d="M4 4.5 5.2 4v4M3.8 16.5h2.4l-2.4 3h2.4" strokeWidth="1.6" /></svg>,
  code: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" /></svg>,
  link: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.07 0l3-3a5 5 0 0 0-7.07-7.07l-1.7 1.7" /><path d="M14 11a5 5 0 0 0-7.07 0l-3 3a5 5 0 0 0 7.07 7.07l1.7-1.7" /></svg>,
  pin: <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M14.4 2.6a1 1 0 0 0-1.4 0l-.7.7a1 1 0 0 0-.1 1.3l.2.3-3.9 3.9-2.8.5a1 1 0 0 0-.5 1.7l3 3L4 21l4.8-4 3 3a1 1 0 0 0 1.7-.5l.5-2.8 3.9-3.9.3.2a1 1 0 0 0 1.3-.1l.7-.7a1 1 0 0 0 0-1.4z" /></svg>,
};

function Notebook() {
  const [notes, setNotes] = useState<NoteSummary[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [streaming, setStreaming] = useState<'idle' | 'streaming' | 'error'>('idle');
  const [streamErr, setStreamErr] = useState('');
  const [font, setFont] = useState(localStorage.getItem('nb-font') || 'Inter');
  const [size, setSize] = useState(localStorage.getItem('nb-size') || '16');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<NoteSummary[] | null>(null); // null = not searching
  const [view, setView] = useState<'notes' | 'settings'>('notes'); // right pane: editor vs settings
  const [image, setImage] = useState<string | null>(null); // capture data URL for the selected note
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const selectedRef = useRef<string | null>(null);
  const streamingRef = useRef(false);
  selectedRef.current = selectedId;

  // Plain text into the editor (used while streaming).
  const setEditor = (text: string) => { if (editorRef.current) editorRef.current.textContent = text; };
  // Render a stored body as sanitized HTML so rich formatting (bold/italic/headings)
  // persists. DOMPurify guards against injected markup from captured text / model output;
  // we use a DocumentFragment + replaceChildren rather than innerHTML.
  const renderBody = (body: string) => {
    if (!editorRef.current) return;
    const frag = DOMPurify.sanitize(body, { RETURN_DOM_FRAGMENT: true });
    editorRef.current.replaceChildren(frag);
  };

  const refresh = useCallback(async () => setNotes(await window.notebookAPI.list()), []);

  const selectNote = useCallback(async (id: string, fromList?: NoteSummary[]) => {
    streamingRef.current = false;
    setStreaming('idle');
    setView('notes');
    setSelectedId(id);
    selectedRef.current = id; // keep the ref in lockstep so the async load can detect re-selection
    const list = fromList ?? notes;
    setTitle(list.find((n) => n.id === id)?.title ?? '');
    setImage(null);
    const [body, img] = await Promise.all([
      window.notebookAPI.getBody(id),
      window.notebookAPI.getImage(id),
    ]);
    if (selectedRef.current !== id) return; // selection changed while loading
    renderBody(body ?? '');
    setImage(img);
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
      setView('notes');
      setSelectedId(null);
      selectedRef.current = null;
      setTitle(m.prompt);
      setEditor('');
      setImage(null);
    });
    const offToken = window.notebookAPI.onToken((p) => { if (streamingRef.current) setEditor(p); });
    const offDone = window.notebookAPI.onDone((a) => { if (streamingRef.current) setEditor(a); });
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
      // Sanitize the edited content to a clean HTML string (DOMPurify reads the node and
      // returns safe HTML) so formatting persists without an innerHTML round-trip.
      const html = DOMPurify.sanitize(editorRef.current);
      window.notebookAPI.updateBody(selectedRef.current, html).then(refresh).catch(() => {});
    }
  }

  function format(cmd: string, value?: string) {
    editorRef.current?.focus();
    document.execCommand(cmd, false, value);
  }

  function addLink() {
    const url = window.prompt('Link URL');
    if (url) format('createLink', url.trim());
  }

  function applyFont(f: string) { setFont(f); localStorage.setItem('nb-font', f); }
  function applySize(s: string) { setSize(s); localStorage.setItem('nb-size', s); }

  function onSearch(q: string) {
    setQuery(q);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (!q.trim()) { setResults(null); return; }
    searchTimer.current = setTimeout(async () => {
      const hits = await window.notebookAPI.search(q);
      // Map FTS hits to sidebar rows, pulling titles from the loaded list where available.
      const byId = new Map(notes.map((n) => [n.id, n]));
      setResults(hits.map((h) => {
        const n = byId.get(h.id);
        return { id: h.id, title: n?.title ?? h.snippet, snippet: h.snippet, sourceApp: n?.sourceApp, model: n?.model, pinned: n?.pinned ?? false, createdAt: n?.createdAt ?? '' };
      }));
    }, 180);
  }

  function newNote() {
    streamingRef.current = false; setStreaming('idle');
    setView('notes');
    setSelectedId(null); selectedRef.current = null; setTitle('');
    setEditor('');
    setImage(null);
    editorRef.current?.focus();
  }

  const renderRow = (n: NoteSummary) => (
    <div key={n.id} className={`note-row${selectedId === n.id ? ' selected' : ''}`} onClick={() => selectNote(n.id)}>
      {n.model && <span className="row-icon"><BrandIcon model={n.model} size={16} /></span>}
      <div className="body">
        <div className="title">{n.title || 'Untitled'}</div>
        <div className="meta">{n.sourceApp ? `${n.sourceApp} · ` : ''}{n.snippet}</div>
      </div>
      <button className={`pin${n.pinned ? ' on' : ''}`} onClick={(e) => togglePin(e, n)} title={n.pinned ? 'Unpin' : 'Pin'}>{Ico.pin}</button>
    </div>
  );

  const pinned = notes.filter((n) => n.pinned);
  const recents = notes.filter((n) => !n.pinned);

  // Metadata for the header line under the title (only for a saved, selected note).
  const current = selectedId ? notes.find((n) => n.id === selectedId) : null;
  const fmtDate = (iso: string) => {
    const d = new Date(iso);
    return isNaN(d.getTime()) ? '' : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="sidebar-top" />
        <button className="new-note" onClick={newNote} title="New note">
          <span className="nn-icon">+</span> New note
        </button>
        <div className="search-wrap">
          <span className="search-icon">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
          </span>
          <input className="search-input" placeholder="Search notes…" value={query} onChange={(e) => onSearch(e.target.value)} />
        </div>
        <div className="note-list">
          {results !== null ? (
            results.length === 0
              ? <div className="empty-list">No matches.</div>
              : results.map(renderRow)
          ) : notes.length === 0 ? (
            <div className="empty-list">No notes yet.<br />Capture text and pick an action.</div>
          ) : (
            <>
              {pinned.length > 0 && <>
                <div className="section-label">Pinned</div>
                {pinned.map(renderRow)}
              </>}
              {recents.length > 0 && <>
                <div className="section-label">Recents</div>
                {recents.map(renderRow)}
              </>}
            </>
          )}
        </div>
        <div className="sidebar-footer">
          <button className={`account-row${view === 'settings' ? ' active' : ''}`} onClick={() => setView('settings')} title="Open settings">
            <span className="avatar">L</span>
            <span className="account-body">
              <div className="account-name">Llamas Remote</div>
              <div className="account-sub">Settings</div>
            </span>
            <span className="account-gear">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>
            </span>
          </button>
        </div>
      </aside>

      <main className="main">
        <div className="main-top" />
        {view === 'settings' ? (
          <div className="settings-pane">
            <button className="settings-back" onClick={() => setView('notes')} title="Back to notes">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg>
              Back to notes
            </button>
            <SettingsView />
          </div>
        ) : (
        <>
        <input className="title-input" placeholder="Untitled" value={title} onChange={(e) => onTitleChange(e.target.value)} />
        {current && streaming !== 'streaming' && (current.model || current.sourceApp || current.createdAt) && (
          <div className="note-meta">
            {current.model && <span className="nm-model"><BrandIcon model={current.model} size={14} /> {current.model}</span>}
            {current.sourceApp && <><span className="nm-dot">·</span><span>{current.sourceApp}</span></>}
            {current.createdAt && fmtDate(current.createdAt) && <><span className="nm-dot">·</span><span>{fmtDate(current.createdAt)}</span></>}
          </div>
        )}
        {image && (
          <figure className="capture">
            <figcaption className="capture-cap">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" /><circle cx="12" cy="13" r="3" /></svg>
              Capture
            </figcaption>
            <img src={image} alt="Screen capture" />
          </figure>
        )}
        <div
          ref={editorRef}
          className="editor"
          contentEditable={streaming !== 'streaming'}
          suppressContentEditableWarning
          onBlur={saveBody}
          style={{ fontFamily: font, fontSize: `${size}px` }}
        />
        {streaming === 'error' && <div className="streaming-tag err">{streamErr}</div>}
        <div className="toolbar">
          {streaming === 'streaming' && <span className="meta">streaming…</span>}
          <button className="b" onClick={() => format('bold')} title="Bold">B</button>
          <button className="i" onClick={() => format('italic')} title="Italic">I</button>
          <button className="u" onClick={() => format('underline')} title="Underline">U</button>
          <span className="sep" />
          <button className="hd" onClick={() => format('formatBlock', 'h1')} title="Heading 1">H1</button>
          <button className="hd" onClick={() => format('formatBlock', 'h2')} title="Heading 2">H2</button>
          <button className="ico" onClick={() => format('formatBlock', 'blockquote')} title="Quote">{Ico.quote}</button>
          <span className="sep" />
          <button className="ico" onClick={() => format('insertUnorderedList')} title="Bullet list">{Ico.bullet}</button>
          <button className="ico" onClick={() => format('insertOrderedList')} title="Numbered list">{Ico.ordered}</button>
          <button className="ico" onClick={() => format('formatBlock', 'pre')} title="Code block">{Ico.code}</button>
          <button className="ico" onClick={addLink} title="Link">{Ico.link}</button>
          <span className="sep" />
          <select value={font} onChange={(e) => applyFont(e.target.value)} title="Font">
            {FONTS.map((f) => <option key={f} value={f} style={{ fontFamily: f }}>{f}</option>)}
          </select>
          <select value={size} onChange={(e) => applySize(e.target.value)} title="Size">
            {SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        </>
        )}
      </main>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(<Notebook />);
