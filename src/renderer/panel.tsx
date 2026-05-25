import React, { useEffect, useRef, useState, useCallback } from 'react';
import ReactDOM from 'react-dom/client';
import './panel.css';

interface PanelQueryRequest {
  kind: 'text' | 'image';
  presetId?: string;
  freeText?: string;
  selection?: string;
  sourceApp?: string;
  imagePath?: string;
  userSelectedModel?: string;
}
interface PanelQueryResult { ok: boolean; answer?: string; model?: string; entryId?: string; error?: string }
interface PanelCaptured { selection: string; sourceApp?: string; empty: boolean }
interface LlamasAPI {
  runQuery: (req: PanelQueryRequest) => Promise<PanelQueryResult>;
  captureScreenshot: () => Promise<string | null>;
  listModels: () => Promise<string[]>;
  openNotebook: () => void;
  requestCapture: () => Promise<{ selection: string; sourceApp?: string; empty: boolean }>;
  close: () => void;
  setInteractive: (on: boolean) => void;
  onCaptured: (cb: (data: PanelCaptured) => void) => () => void;
  onExpand: (cb: () => void) => () => void;
  onCollapse: (cb: () => void) => () => void;
}
declare global { interface Window { llamasAPI: LlamasAPI } }

// Action shortcuts (preset id -> label). "Debug" = find-bugs, "Rephrase" = rewrite.
const ACTIONS = [
  { id: 'explain', name: 'Explain' },
  { id: 'find-bugs', name: 'Debug' },
  { id: 'translate', name: 'Translate' },
  { id: 'rewrite', name: 'Rephrase' },
  { id: 'summarize', name: 'Summarize' },
];

type Status = 'idle' | 'running' | 'done' | 'error';

function Panel() {
  const [expanded, setExpanded] = useState(false);
  const [selection, setSelection] = useState('');
  const [sourceApp, setSourceApp] = useState<string | undefined>();
  const [freeText, setFreeText] = useState('');
  const [models, setModels] = useState<string[]>([]);
  const [model, setModel] = useState(localStorage.getItem('lr-model') || '');
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState('');
  const islandRef = useRef<HTMLDivElement>(null);

  const expandedRef = useRef(false);
  const pinnedRef = useRef(false);
  const interactiveRef = useRef(false);
  const collapseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  expandedRef.current = expanded;

  const setInteractive = useCallback((on: boolean) => {
    if (interactiveRef.current === on) return;
    interactiveRef.current = on;
    window.llamasAPI.setInteractive(on);
  }, []);

  const open = useCallback((doCapture = true) => {
    if (collapseTimer.current) { clearTimeout(collapseTimer.current); collapseTimer.current = null; }
    const wasCollapsed = !expandedRef.current;
    expandedRef.current = true; // set synchronously so rapid mousemoves don't re-open/re-capture
    setExpanded(true);
    setInteractive(true);
    // Grab the selection as we open (source app is still frontmost — the panel becomes
    // mouse-interactive without taking key focus). Skip when main already captured (hotkey).
    if (wasCollapsed && doCapture) {
      window.llamasAPI.requestCapture().then((r) => {
        setSelection(r.selection);
        setSourceApp(r.sourceApp);
      }).catch(() => {});
    }
  }, [setInteractive]);

  const collapseNow = useCallback(() => {
    setExpanded(false);
    setInteractive(false);
    pinnedRef.current = false;
    setStatus('idle');
  }, [setInteractive]);

  const scheduleCollapse = useCallback(() => {
    if (pinnedRef.current) return;
    if (collapseTimer.current) clearTimeout(collapseTimer.current);
    collapseTimer.current = setTimeout(collapseNow, 240);
  }, [collapseNow]);

  useEffect(() => {
    function onMove(e: MouseEvent) {
      if (expandedRef.current) return;
      const r = islandRef.current?.getBoundingClientRect();
      const pad = 4;
      const over = !!r && e.clientX >= r.left - pad && e.clientX <= r.right + pad && e.clientY <= r.bottom + pad;
      if (over) open();
    }
    document.addEventListener('mousemove', onMove);
    return () => document.removeEventListener('mousemove', onMove);
  }, [open]);

  useEffect(() => {
    window.llamasAPI.listModels().then((m) => {
      setModels(m);
      // Keep the persisted choice if it's still installed; otherwise fall back to the first.
      setModel((cur) => (cur && m.includes(cur)) ? cur : (m[0] ?? cur));
    }).catch(() => {});
    const offCap = window.llamasAPI.onCaptured((data) => {
      setSelection(data.selection);
      setSourceApp(data.sourceApp);
      setStatus('idle'); setError('');
    });
    const offExpand = window.llamasAPI.onExpand(() => { pinnedRef.current = true; open(false); });
    const offCollapse = window.llamasAPI.onCollapse(() => collapseNow());
    return () => { offCap(); offExpand(); offCollapse(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, collapseNow]);

  async function fire(req: PanelQueryRequest) {
    pinnedRef.current = true;
    setError('');
    setStatus('running');
    const res = await window.llamasAPI.runQuery({ ...req, userSelectedModel: model || undefined });
    if (res.ok) setStatus('done');
    else { setError(res.error ?? 'Something went wrong'); setStatus('error'); }
  }

  function runAction(presetId: string) {
    if (!selection.trim() && !freeText.trim()) {
      setError('Select text first, or type a question'); setStatus('error');
      return;
    }
    fire({ kind: 'text', presetId, selection, sourceApp, freeText: freeText.trim() || undefined });
  }

  async function screenshot() {
    pinnedRef.current = true;
    const path = await window.llamasAPI.captureScreenshot();
    if (path) fire({ kind: 'image', presetId: 'explain', imagePath: path });
  }

  function cancelCollapse() {
    if (collapseTimer.current) { clearTimeout(collapseTimer.current); collapseTimer.current = null; }
  }

  const hasSelection = selection.trim().length > 0;
  const busy = status === 'running';

  return (
    <div className="stage">
      <div
        ref={islandRef}
        className={`island${expanded ? ' expanded' : ''}`}
        onMouseEnter={() => { cancelCollapse(); if (!expandedRef.current) open(); }}
        onMouseLeave={scheduleCollapse}
      >
        {/* Collapsed: dot left, waveform right (notch between) */}
        <div className="collapsed">
          <span className="dot" />
          <span className="bars"><i /><i /><i /><i /></span>
        </div>

        {/* Expanded: compact launcher */}
        <div className="panel">
          <div className="hdr">
            <select className="model-select" value={model} onChange={(e) => { setModel(e.target.value); localStorage.setItem('lr-model', e.target.value); }} title="Model">
              {models.length === 0 && <option value="">default model</option>}
              {models.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
            <span className={`sel-indicator${hasSelection ? ' on' : ''}`}>
              {hasSelection ? `Selected${sourceApp ? ` · ${sourceApp}` : ''}` : 'No selection'}
            </span>
            <span className="spacer" />
            <button className="ghost-btn" onClick={() => window.llamasAPI.openNotebook()} title="Open notebook">▤ Notebook</button>
          </div>

          <div className="input-row">
            <input
              className="ask-input"
              placeholder={hasSelection ? 'Add a follow-up (optional)…' : 'Type a question…'}
              value={freeText}
              onFocus={() => { pinnedRef.current = true; }}
              onChange={(e) => setFreeText(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') fire({ kind: 'text', selection, sourceApp, freeText: freeText.trim() || undefined }); if (e.key === 'Escape') { collapseNow(); window.llamasAPI.close(); } }}
            />
            <button className="icon-btn" onClick={screenshot} disabled={busy} title="Screenshot a region">⌖</button>
          </div>

          <div className="actions">
            {ACTIONS.map((a) => (
              <button key={a.id} className="action" disabled={busy} onClick={() => runAction(a.id)}>{a.name}</button>
            ))}
          </div>

          <div className="statusbar">
            {status === 'running' && <div className="progress"><div className="bar" /></div>}
            {status === 'done' && <span className="done">✓ saved to notebook</span>}
            {status === 'error' && <span className="err">{error}</span>}
            {status === 'idle' && <span className="hint">Pick an action or ask a question</span>}
            <span className="spacer" />
            {(status === 'running' || status === 'done') && (
              <button className="open-btn" onClick={() => window.llamasAPI.openNotebook()}>Open notebook →</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(<Panel />);
