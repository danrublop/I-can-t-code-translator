import React, { useEffect, useRef, useState, useCallback } from 'react';
import ReactDOM from 'react-dom/client';
import { BrandIcon } from './model-icon';
import { SettingsView } from './settings-view';
import { ModelsView } from './models-view';
import { NotebookEditor } from './editor/NotebookEditor';
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
  hide: (id: string) => Promise<void>;
  restore: (id: string) => Promise<void>;
  remove: (id: string) => Promise<void>;
  signalReady: () => void;
  onShowSettings: (cb: () => void) => () => void;
  onSaved: (cb: (id: string) => void) => () => void;
  onStart: (cb: (meta: NotebookMeta) => void) => () => void;
  onToken: (cb: (delta: string) => void) => () => void;
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
  pin: <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M14.4 2.6a1 1 0 0 0-1.4 0l-.7.7a1 1 0 0 0-.1 1.3l.2.3-3.9 3.9-2.8.5a1 1 0 0 0-.5 1.7l3 3L4 21l4.8-4 3 3a1 1 0 0 0 1.7-.5l.5-2.8 3.9-3.9.3.2a1 1 0 0 0 1.3-.1l.7-.7a1 1 0 0 0 0-1.4z" /></svg>,
  trash: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>,
  copy: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>,
  download: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>,
};

const countWords = (text: string): number => {
  const m = text.trim().match(/\S+/g);
  return m ? m.length : 0;
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
  const [view, setView] = useState<'notes' | 'settings' | 'models'>('notes'); // right pane: editor / settings / models
  const [image, setImage] = useState<string | null>(null); // capture data URL for the selected note
  const [words, setWords] = useState(0); // live word count
  const [toast, setToast] = useState<{ msg: string; undo?: () => void } | null>(null);

  // Markdown that seeds the TipTap editor for the selected/new note. editorKey forces a
  // remount (and re-seed) whenever the note changes — useEditor only reads `content` once.
  const [editorMarkdown, setEditorMarkdown] = useState('');
  const [editorKey, setEditorKey] = useState(0);
  const liveMarkdown = useRef(''); // latest editor markdown, for copy/export/word count

  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingDelete = useRef<{ id: string; timer: ReturnType<typeof setTimeout> } | null>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const streamRef = useRef<HTMLDivElement>(null); // read-only pane for a streaming notch answer
  const searchRef = useRef<HTMLInputElement>(null);
  const selectedRef = useRef<string | null>(null);
  const streamingRef = useRef(false);
  selectedRef.current = selectedId;

  // --- streaming notch answer (read-only pane) ----------------------------------------
  const setStream = (text: string) => { if (streamRef.current) streamRef.current.textContent = text; setWords(countWords(text)); };
  const appendStream = (delta: string) => {
    if (!streamRef.current) return;
    streamRef.current.appendChild(document.createTextNode(delta));
  };

  const refresh = useCallback(async () => setNotes(await window.notebookAPI.list()), []);

  // Seed the TipTap editor with a note's markdown body (remount via editorKey).
  const loadEditor = useCallback((markdown: string) => {
    liveMarkdown.current = markdown;
    setEditorMarkdown(markdown);
    setWords(countWords(markdown));
    setEditorKey((k) => k + 1);
  }, []);

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
    loadEditor(body ?? '');
    setImage(img);
  }, [notes, loadEditor]);

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
      setImage(null);
      setStream('');
    });
    // onToken carries the new chunk (delta) for the streaming notch answer — append it.
    const offToken = window.notebookAPI.onToken((p) => { if (streamingRef.current) appendStream(p); });
    // onDone carries the full answer; replace the accumulated deltas (corrects any dropped chunk).
    const offDone = window.notebookAPI.onDone((a) => { if (streamingRef.current) setStream(a); });
    const offErr = window.notebookAPI.onError((msg) => { streamingRef.current = false; setStreaming('error'); setStreamErr(msg); });
    const offSaved = window.notebookAPI.onSaved(async (id) => {
      streamingRef.current = false; setStreaming('idle');
      const list = await window.notebookAPI.list();
      setNotes(list);
      selectNote(id, list); // load the freshly-saved note into the editor
    });
    const offSettings = window.notebookAPI.onShowSettings(() => setView('settings'));
    // Listeners are attached — tell main to flush any answer buffered while we loaded.
    window.notebookAPI.signalReady();
    return () => { offStart(); offToken(); offDone(); offErr(); offSaved(); offSettings(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keyboard shortcuts: ⌘N new note, ⌘F focus search.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.altKey) return;
      const k = e.key.toLowerCase();
      if (k === 'n') { e.preventDefault(); newNote(); }
      else if (k === 'f') { e.preventDefault(); setView('notes'); searchRef.current?.focus(); searchRef.current?.select(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
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

  // Commit any pending (toast-window) delete for real — removes the file.
  const commitDelete = useCallback(() => {
    const p = pendingDelete.current;
    if (!p) return;
    clearTimeout(p.timer);
    pendingDelete.current = null;
    window.notebookAPI.remove(p.id).catch(() => {});
  }, []);

  // Finalize a pending (toast-window) delete if the window closes before the timer fires.
  useEffect(() => commitDelete, [commitDelete]);

  // Brief auto-dismissing status toast (no Undo button).
  const showInfo = useCallback((msg: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ msg });
    toastTimer.current = setTimeout(() => setToast(null), 2400);
  }, []);

  function noteAsMarkdown(): string {
    return (title.trim() ? `# ${title.trim()}\n\n` : '') + liveMarkdown.current;
  }

  async function copyNote() {
    try { await navigator.clipboard.writeText(noteAsMarkdown()); showInfo('Copied as Markdown'); }
    catch { showInfo('Copy failed'); }
  }

  function exportNote() {
    const md = noteAsMarkdown();
    const blob = new Blob([md + '\n'], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(title.trim() || 'note').replace(/[^\w.-]+/g, '-').slice(0, 60)}.md`;
    a.click();
    URL.revokeObjectURL(url);
    showInfo('Exported Markdown');
  }

  async function deleteNote(e: React.MouseEvent, n: NoteSummary) {
    e.stopPropagation();
    commitDelete(); // finalize any earlier delete before starting a new one
    await window.notebookAPI.hide(n.id).catch(() => {}); // reversible: file stays on disk
    setNotes((ns) => ns.filter((x) => x.id !== n.id));
    setResults((r) => (r ? r.filter((x) => x.id !== n.id) : r));
    if (selectedRef.current === n.id) {
      const rest = notes.filter((x) => x.id !== n.id);
      if (rest.length) selectNote(rest[0].id, rest); else newNote();
    }
    const timer = setTimeout(() => { setToast(null); commitDelete(); }, 6000);
    pendingDelete.current = { id: n.id, timer };
    setToast({
      msg: `Deleted “${n.title || 'Untitled'}”`,
      undo: async () => {
        const p = pendingDelete.current;
        if (p) { clearTimeout(p.timer); pendingDelete.current = null; }
        await window.notebookAPI.restore(n.id).catch(() => {});
        setNotes(await window.notebookAPI.list());
        setToast(null);
      },
    });
  }

  // The editor changed (debounced inside NotebookEditor). Persist the markdown body for the
  // selected note and keep a live copy for copy/export + word count.
  const onEditorChange = useCallback((markdown: string) => {
    liveMarkdown.current = markdown;
    setWords(countWords(markdown));
    const id = selectedRef.current;
    if (id && !streamingRef.current) {
      window.notebookAPI.updateBody(id, markdown).then(refresh).catch(() => {});
    }
  }, [refresh]);

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
    loadEditor('');
  }

  const renderRow = (n: NoteSummary) => (
    <div key={n.id} className={`note-row${selectedId === n.id ? ' selected' : ''}`} onClick={() => selectNote(n.id)}>
      {n.model && <span className="row-icon"><BrandIcon model={n.model} size={16} /></span>}
      <div className="body">
        <div className="title">{n.title || 'Untitled'}</div>
        <div className="meta">{n.createdAt && relTime(n.createdAt) ? `${relTime(n.createdAt)} · ` : ''}{n.snippet}</div>
      </div>
      <span className="row-actions">
        <button className={`pin${n.pinned ? ' on' : ''}`} onClick={(e) => togglePin(e, n)} title={n.pinned ? 'Unpin' : 'Pin'}>{Ico.pin}</button>
        <button className="row-del" onClick={(e) => deleteNote(e, n)} title="Delete note">{Ico.trash}</button>
      </span>
    </div>
  );

  const pinned = notes.filter((n) => n.pinned);
  const recents = notes.filter((n) => !n.pinned);

  // Metadata for the header line under the title (only for a saved, selected note).
  const current = selectedId ? notes.find((n) => n.id === selectedId) : null;
  const relTime = (iso: string) => {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    const s = Math.round((Date.now() - d.getTime()) / 1000);
    if (s < 45) return 'just now';
    const m = Math.round(s / 60);
    if (m < 60) return `${m}m ago`;
    const h = Math.round(m / 60);
    if (h < 24) return `${h}h ago`;
    const day = Math.round(h / 24);
    if (day === 1) return 'Yesterday';
    if (day < 7) return `${day}d ago`;
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: d.getFullYear() === new Date().getFullYear() ? undefined : 'numeric' });
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
          <input ref={searchRef} className="search-input" placeholder="Search notes…" value={query} onChange={(e) => onSearch(e.target.value)} />
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
          <button className={`account-row models-row${view === 'models' ? ' active' : ''}`} onClick={() => setView('models')} title="Models — what runs on your machine">
            <span className="avatar models-avatar">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></svg>
            </span>
            <span className="account-body">
              <div className="account-name">Models</div>
              <div className="account-sub">What runs on your Mac</div>
            </span>
          </button>
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
        <div className="main-top">
          {view === 'notes' && streaming !== 'streaming' && (words > 0 || selectedId) && (
            <div className="main-actions">
              <button onClick={copyNote} title="Copy as Markdown">{Ico.copy}</button>
              <button onClick={exportNote} title="Export as Markdown (.md)">{Ico.download}</button>
            </div>
          )}
        </div>
        {view === 'settings' || view === 'models' ? (
          <div className="settings-pane">
            <button className="settings-back" onClick={() => setView('notes')} title="Back to notes">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg>
              Back to notes
            </button>
            {view === 'settings' ? <SettingsView /> : <ModelsView />}
          </div>
        ) : (
        <>
        <input className="title-input" placeholder="Untitled" value={title} onChange={(e) => onTitleChange(e.target.value)} />
        {current && streaming !== 'streaming' && (current.model || current.sourceApp || current.createdAt) && (
          <div className="note-meta">
            {current.model && <span className="nm-model"><BrandIcon model={current.model} size={14} /> {current.model}</span>}
            {current.sourceApp && <><span className="nm-dot">·</span><span>{current.sourceApp}</span></>}
            {current.createdAt && relTime(current.createdAt) && <><span className="nm-dot">·</span><span>{relTime(current.createdAt)}</span></>}
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
        <div className="editor-wrap" style={{ fontFamily: font, fontSize: `${size}px` }}>
          {streaming === 'streaming' ? (
            // Read-only pane while a notch answer streams in (becomes a saved note on done).
            <div ref={streamRef} className="editor streaming-pane" />
          ) : (
            <NotebookEditor
              key={editorKey}
              markdown={editorMarkdown}
              model={current?.model}
              onChange={onEditorChange}
            />
          )}
        </div>
        {streaming === 'error' && <div className="streaming-tag err">{streamErr}</div>}
        <div className="toolbar">
          <span className="meta">{streaming === 'streaming' ? 'streaming…' : `${words} ${words === 1 ? 'word' : 'words'}`}</span>
          <span className="sep" />
          <span className="toolbar-hint">Type <code>/</code> for AI · Markdown shortcuts (#, -, &gt;, ```)</span>
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

      {toast && (
        <div className="toast" role="status">
          <span className="toast-msg">{toast.msg}</span>
          <button className="toast-undo" onClick={toast.undo}>Undo</button>
        </div>
      )}
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(<Notebook />);
