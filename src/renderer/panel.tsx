import React, { useEffect, useRef, useState, useCallback } from 'react';
import ReactDOM from 'react-dom/client';
import './panel.css';

// Bridge exposed by preload-panel.ts.
interface PanelQueryRequest {
  kind: 'text' | 'image';
  presetId?: string;
  freeText?: string;
  selection?: string;
  sourceApp?: string;
  imagePath?: string;
}
interface PanelQueryResult { ok: boolean; answer?: string; model?: string; entryId?: string; error?: string }
interface PanelCaptured { selection: string; sourceApp?: string; empty: boolean }
interface LlamasAPI {
  runQuery: (req: PanelQueryRequest) => Promise<PanelQueryResult>;
  captureScreenshot: () => Promise<string | null>;
  search: (q: string) => Promise<Array<{ id: string; snippet: string; tags: string[] }>>;
  close: () => void;
  setInteractive: (on: boolean) => void;
  onToken: (cb: (partial: string) => void) => () => void;
  onCaptured: (cb: (data: PanelCaptured) => void) => () => void;
  onExpand: (cb: () => void) => () => void;
  onCollapse: (cb: () => void) => () => void;
}
declare global { interface Window { llamasAPI: LlamasAPI } }

const PRESETS = [
  { id: 'explain', name: 'Explain' },
  { id: 'summarize', name: 'Summarize' },
  { id: 'rewrite', name: 'Rewrite' },
  { id: 'translate', name: 'Translate' },
  { id: 'find-bugs', name: 'Find bugs' },
];

type Status = 'idle' | 'loading' | 'done' | 'error' | 'empty';

function Panel() {
  const [expanded, setExpanded] = useState(false);
  const [selection, setSelection] = useState('');
  const [sourceApp, setSourceApp] = useState<string | undefined>();
  const [freeText, setFreeText] = useState('');
  const [answer, setAnswer] = useState('');
  const [model, setModel] = useState('mistral');
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState('');
  const [activePreset, setActivePreset] = useState<string | undefined>();
  const islandRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const expandedRef = useRef(false);
  const interactiveRef = useRef(false);

  expandedRef.current = expanded;

  const setInteractive = useCallback((on: boolean) => {
    if (interactiveRef.current === on) return;
    interactiveRef.current = on;
    window.llamasAPI.setInteractive(on);
  }, []);

  // Pointer-driven click-through: the window is interactive only when the pointer is over
  // the island or the panel is expanded; otherwise it's click-through so it never blocks
  // the screen. Move events are forwarded by the main process even when click-through.
  useEffect(() => {
    function onMove(e: MouseEvent) {
      if (expandedRef.current) { setInteractive(true); return; }
      const r = islandRef.current?.getBoundingClientRect();
      const pad = 6;
      const over = !!r && e.clientX >= r.left - pad && e.clientX <= r.right + pad && e.clientY <= r.bottom + pad;
      setInteractive(over);
    }
    document.addEventListener('mousemove', onMove);
    return () => document.removeEventListener('mousemove', onMove);
  }, [setInteractive]);

  useEffect(() => {
    const offToken = window.llamasAPI.onToken((partial) => { setStatus('loading'); setAnswer(partial); });
    const offCap = window.llamasAPI.onCaptured((data) => {
      setSelection(data.selection);
      setSourceApp(data.sourceApp);
      setAnswer(''); setError(''); setActivePreset(undefined);
      setStatus(data.empty ? 'empty' : 'idle');
    });
    const offExpand = window.llamasAPI.onExpand(() => { setExpanded(true); setInteractive(true); setTimeout(() => inputRef.current?.focus(), 50); });
    const offCollapse = window.llamasAPI.onCollapse(() => { setExpanded(false); setInteractive(false); });
    return () => { offToken(); offCap(); offExpand(); offCollapse(); };
  }, [setInteractive]);

  async function run(req: PanelQueryRequest) {
    setError(''); setAnswer(''); setStatus('loading');
    const res = await window.llamasAPI.runQuery(req);
    if (res.ok) { setAnswer(res.answer ?? ''); if (res.model) setModel(res.model); setStatus('done'); }
    else { setError(res.error ?? 'Something went wrong'); setStatus('error'); }
  }

  function runPreset(presetId: string) {
    setActivePreset(presetId);
    run({ kind: 'text', presetId, selection, sourceApp, freeText: freeText.trim() || undefined });
  }

  function onAskKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter') run({ kind: 'text', presetId: activePreset, freeText: freeText.trim() || undefined, selection, sourceApp });
    if (e.key === 'Escape') collapse();
  }

  function collapse() { setExpanded(false); window.llamasAPI.close(); }

  function expandFromIsland() {
    setExpanded(true);
    setInteractive(true);
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  async function screenshot() {
    const path = await window.llamasAPI.captureScreenshot();
    if (path) run({ kind: 'image', presetId: 'explain', imagePath: path });
  }

  return (
    <div className="stage">
      <div
        ref={islandRef}
        className={`island${expanded ? ' expanded' : ''}`}
        onClick={() => { if (!expanded) expandFromIsland(); }}
      >
        {/* Collapsed pill */}
        <div className="collapsed">
          <span className="dot" />
          <span className="bars"><i /><i /><i /><i /></span>
        </div>

        {/* Expanded panel */}
        <div className="content">
          <div className="ask-row">
            <span className="model-chip">{model}</span>
            <input
              ref={inputRef}
              className="ask-input"
              placeholder={status === 'empty' ? 'Select text or type a question' : 'Ask…'}
              value={freeText}
              onChange={(e) => setFreeText(e.target.value)}
              onKeyDown={onAskKey}
            />
            <span className="run-hint">↵</span>
          </div>

          <div className="pills">
            {PRESETS.map((p) => (
              <button key={p.id} className={`pill${activePreset === p.id ? ' active' : ''}`} onClick={() => runPreset(p.id)}>
                {p.name}
              </button>
            ))}
            <button className="pill" onClick={screenshot}>Screenshot</button>
          </div>

          {selection.trim() && (
            <div className="captured">
              <div className="quote">{selection.slice(0, 280)}</div>
              {sourceApp && <span className="src">{sourceApp}</span>}
            </div>
          )}

          <div className={`answer${status === 'idle' || status === 'empty' ? ' empty' : ''}`}>
            {status === 'error' && <span className="error">{error}</span>}
            {status === 'loading' && !answer && <span className="shimmer">Thinking…</span>}
            {(status === 'loading' || status === 'done') && answer}
            {status === 'idle' && 'Pick an action or ask a question.'}
            {status === 'empty' && "Couldn't read a selection — paste or type your question above."}
          </div>

          <div className="footer">
            {status === 'done' && <span className="saved">✓ saved to notebook</span>}
            <span className="spacer" />
            <button onClick={collapse}>esc close</button>
          </div>
        </div>
      </div>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(<Panel />);
