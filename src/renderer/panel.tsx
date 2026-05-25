import React, { useEffect, useRef, useState, useCallback } from 'react';
import ReactDOM from 'react-dom/client';
import { BrandIcon } from './model-icon';
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
interface PanelCaptured { selection: string; sourceApp?: string; empty: boolean; error?: string }
interface LlamasAPI {
  runQuery: (req: PanelQueryRequest) => Promise<PanelQueryResult>;
  captureScreenshot: () => Promise<string | null>;
  listModels: () => Promise<string[]>;
  openNotebook: () => void;
  openSettings: () => void;
  requestCapture: () => Promise<{ selection: string; sourceApp?: string; empty: boolean; error?: string }>;
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

// Circular "context" meter: a ring that fills with the queued selection's size and shows
// the percent inside (like a cursor download/progress ring).
function CircleMeter({ pct, size = 22 }: { pct: number; size?: number }) {
  const stroke = 2.5;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - Math.max(0, Math.min(100, pct)) / 100);
  const center = size / 2;
  return (
    <span className="meter" title={`${pct}% of context budget queued`}>
      <svg width={size} height={size}>
        <circle cx={center} cy={center} r={r} fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth={stroke} />
        <circle
          cx={center} cy={center} r={r} fill="none" stroke="var(--accent)" strokeWidth={stroke}
          strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round"
          transform={`rotate(-90 ${center} ${center})`}
        />
      </svg>
      <span className="meter-pct">{pct}</span>
    </span>
  );
}

function Panel() {
  const [expanded, setExpanded] = useState(false);
  const [selection, setSelection] = useState('');
  const [sourceApp, setSourceApp] = useState<string | undefined>();
  const [freeText, setFreeText] = useState('');
  const [models, setModels] = useState<string[]>([]);
  const [model, setModel] = useState(localStorage.getItem('lr-model') || '');
  const [modelOpen, setModelOpen] = useState(false);
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState('');
  const islandRef = useRef<HTMLDivElement>(null);
  const modelPickerRef = useRef<HTMLDivElement>(null);

  const refreshModels = useCallback(() => {
    window.llamasAPI.listModels().then((m) => {
      setModels(m);
      setModel((cur) => (cur && m.includes(cur)) ? cur : (m[0] ?? cur));
    }).catch(() => {});
  }, []);

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
    if (wasCollapsed) {
      refreshModels(); // pick up models pulled / keys added in Settings since last open
      if (doCapture) {
        window.llamasAPI.requestCapture().then((r) => {
          setSelection(r.selection);
          setSourceApp(r.sourceApp);
          if (r.error) { setError(r.error); setStatus('error'); }
        }).catch(() => {});
      }
    }
  }, [setInteractive, refreshModels]);

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

  // Close the model dropdown on an outside click.
  useEffect(() => {
    if (!modelOpen) return;
    function onDown(e: MouseEvent) {
      if (modelPickerRef.current && !modelPickerRef.current.contains(e.target as Node)) setModelOpen(false);
    }
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [modelOpen]);

  useEffect(() => {
    refreshModels();
    const offCap = window.llamasAPI.onCaptured((data) => {
      setSelection(data.selection);
      setSourceApp(data.sourceApp);
      if (data.error) { setError(data.error); setStatus('error'); }
      else { setStatus('idle'); setError(''); }
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
  const selChars = selection.trim().length;
  // % of a rough context budget (~8000 chars) the selection fills; min 1% when non-empty.
  const ctxPct = hasSelection ? Math.max(1, Math.min(100, Math.round((selChars / 8000) * 100))) : 0;
  const busy = status === 'running';

  return (
    <div className="stage">
      <div
        ref={islandRef}
        className={`island${expanded ? ' expanded' : ''}${modelOpen ? ' menu-open' : ''}`}
        onMouseEnter={() => { cancelCollapse(); if (!expandedRef.current) open(); }}
        onMouseLeave={scheduleCollapse}
      >
        {/* Collapsed: current model logo (left); right shows a context counter of the
            queued selection (chars), else the idle waveform (notch sits between). */}
        <div className="collapsed">
          <span className="c-left">{model ? <BrandIcon model={model} size={16} /> : <span className="dot" />}</span>
          <span className="c-right">
            <CircleMeter pct={ctxPct} />
          </span>
        </div>

        {/* Expanded: compact launcher */}
        <div className="panel">
          <div className="hdr">
            <div className="model-picker" ref={modelPickerRef}>
              <button className="model-btn" onClick={() => setModelOpen((v) => !v)} title="Model">
                {model && <BrandIcon model={model} size={15} />}
                <span className="model-name">{model || 'default model'}</span>
                <span className="chev">▾</span>
              </button>
              {modelOpen && (
                <div className="model-menu">
                  {models.length === 0 && <div className="model-opt muted">no models installed</div>}
                  {models.map((m) => (
                    <button
                      key={m}
                      className={`model-opt${m === model ? ' on' : ''}`}
                      onClick={() => { setModel(m); localStorage.setItem('lr-model', m); setModelOpen(false); }}
                    >
                      <BrandIcon model={m} size={15} />
                      <span className="model-name">{m}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <span className={`sel-indicator${hasSelection ? ' on' : ''}`}>
              {hasSelection ? `Selected${sourceApp ? ` · ${sourceApp}` : ''}` : 'No selection'}
            </span>
            <span className="spacer" />
            <button className="ghost-btn" onClick={() => window.llamasAPI.openNotebook()} title="Open notebook">▤ Notebook</button>
            <button className="ghost-btn icon-only" onClick={() => window.llamasAPI.openSettings()} title="Settings">⚙</button>
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
