import React, { useEffect, useRef, useState, useCallback } from 'react';
import ReactDOM from 'react-dom/client';
import { BrandIcon } from './model-icon';
// Deep per-icon imports (the lucide-react barrel pulls in all ~1000 icons / ~700KB).
import NotebookText from 'lucide-react/dist/esm/icons/notebook-text';
import Crop from 'lucide-react/dist/esm/icons/crop';
import ScanText from 'lucide-react/dist/esm/icons/scan-text';
import Bug from 'lucide-react/dist/esm/icons/bug';
import Languages from 'lucide-react/dist/esm/icons/languages';
import PenLine from 'lucide-react/dist/esm/icons/pen-line';
import AlignLeft from 'lucide-react/dist/esm/icons/align-left';
import Paperclip from 'lucide-react/dist/esm/icons/paperclip';
import CornerDownLeft from 'lucide-react/dist/esm/icons/corner-down-left';
import ArrowUpRight from 'lucide-react/dist/esm/icons/arrow-up-right';
import Check from 'lucide-react/dist/esm/icons/check';
import X from 'lucide-react/dist/esm/icons/x';
import './panel.css';

interface PanelQueryRequest {
  kind: 'text' | 'image';
  presetId?: string;
  freeText?: string;
  selection?: string;
  sourceApp?: string;
  imagePath?: string;
  userSelectedModel?: string;
  attachments?: string[];
}
interface PanelQueryResult { ok: boolean; answer?: string; model?: string; entryId?: string; error?: string }
interface PanelCaptured { selection: string; sourceApp?: string; empty: boolean; error?: string }
interface LlamasAPI {
  runQuery: (req: PanelQueryRequest) => Promise<PanelQueryResult>;
  captureScreenshot: () => Promise<string | null>;
  ocrCapture: () => Promise<{ text: string; cancelled?: boolean; error?: string }>;
  listModels: () => Promise<string[]>;
  openNotebook: () => void;
  openSettings: () => void;
  pickFiles: () => Promise<Array<{ path: string; name: string }>>;
  requestCapture: () => Promise<{ selection: string; sourceApp?: string; empty: boolean; error?: string }>;
  close: () => void;
  setInteractive: (on: boolean) => void;
  onCaptured: (cb: (data: PanelCaptured) => void) => () => void;
  onExpand: (cb: () => void) => () => void;
  onCollapse: (cb: () => void) => () => void;
}
declare global { interface Window { llamasAPI: LlamasAPI } }

// Preset action shortcuts (preset id -> label + Lucide icon). "Ask" is separate.
const ACTIONS = [
  { id: 'find-bugs', name: 'Debug', Icon: Bug },
  { id: 'translate', name: 'Translate', Icon: Languages },
  { id: 'rewrite', name: 'Rephrase', Icon: PenLine },
  { id: 'summarize', name: 'Summarize', Icon: AlignLeft },
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
        <circle cx={center} cy={center} r={r} fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth={stroke} />
        <circle
          cx={center} cy={center} r={r} fill="none" stroke="#ffffff" strokeWidth={stroke}
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
  const [attachments, setAttachments] = useState<Array<{ path: string; name: string }>>([]);
  const [models, setModels] = useState<string[]>([]);
  const [model, setModel] = useState(localStorage.getItem('lr-model') || '');
  const [modelOpen, setModelOpen] = useState(false);
  const [typing, setTyping] = useState(false);
  const typeInputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState('');
  const [answer, setAnswer] = useState('');
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
    setAttachments([]);
    setFreeText('');
    setAnswer('');
    setTyping(false);
    setModelOpen(false);
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
    setAnswer('');
    setStatus('running');
    const res = await window.llamasAPI.runQuery({
      ...req,
      userSelectedModel: model || undefined,
      attachments: attachments.length ? attachments.map((a) => a.path) : undefined,
    });
    if (res.ok) { setAnswer(res.answer ?? ''); setStatus('done'); }
    else { setError(res.error ?? 'Something went wrong'); setStatus('error'); }
  }

  async function attachFiles() {
    pinnedRef.current = true;
    const picked = await window.llamasAPI.pickFiles();
    if (!picked.length) return;
    // De-dupe by path so re-picking the same file doesn't stack chips.
    setAttachments((prev) => {
      const seen = new Set(prev.map((a) => a.path));
      return [...prev, ...picked.filter((p) => !seen.has(p.path))];
    });
  }

  function runAction(presetId: string) {
    if (!selection.trim() && !freeText.trim() && attachments.length === 0) {
      setError('Select text, attach a file, or type a question'); setStatus('error');
      return;
    }
    fire({ kind: 'text', presetId, selection, sourceApp, freeText: freeText.trim() || undefined });
  }

  async function screenshot() {
    pinnedRef.current = true;
    const path = await window.llamasAPI.captureScreenshot();
    if (path) fire({ kind: 'image', presetId: 'explain', imagePath: path });
  }

  // Grab text from a screen region via on-device OCR (no model). The recognized text
  // becomes the queued selection, so you can then run a preset / ask a text model on it —
  // or just open it in the notebook. No vision model, no RAM cost.
  async function grabText() {
    pinnedRef.current = true;
    const res = await window.llamasAPI.ocrCapture();
    if (res.cancelled) return;
    if (res.error) { setError(res.error); setStatus('error'); return; }
    const text = res.text.trim();
    if (text) { setSelection(res.text); setSourceApp('Screen text'); setError(''); setStatus('idle'); }
    else { setError('No text found in that region.'); setStatus('error'); }
  }

  function cancelCollapse() {
    if (collapseTimer.current) { clearTimeout(collapseTimer.current); collapseTimer.current = null; }
  }

  const hasSelection = selection.trim().length > 0;
  const selChars = selection.trim().length;
  // % of a rough context budget (~8000 chars) the selection fills; min 1% when non-empty.
  const ctxPct = hasSelection ? Math.max(1, Math.min(100, Math.round((selChars / 8000) * 100))) : 0;
  const busy = status === 'running';
  // The arrow-top-right button opens the notebook. Icon-only while working; labelled "Open" once done.
  const openBtn = (label: boolean) => (
    <button className={`box-open${label ? '' : ' icon-only'}`} title="Open in notebook" onClick={() => window.llamasAPI.openNotebook()}>
      {label && <span>Open</span>}<ArrowUpRight size={label ? 14 : 16} />
    </button>
  );

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
              <button className="model-btn" onClick={() => setModelOpen((v) => !v)} title="Choose model">
                {model ? <BrandIcon model={model} size={17} /> : <span className="dot" />}
                <span className="model-chip">{model || 'default model'}</span>
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
            <span className="spacer" />
            <button className="ghost-btn icon-only" onClick={() => window.llamasAPI.openNotebook()} title="Open notebook"><NotebookText size={16} /></button>
            <CircleMeter pct={ctxPct} />
          </div>

          {/* Action buttons — icon-only circles. ? opens an ask input; presets fire on tap. */}
          <div className="actions-row">
            <div className="preset-actions">
              <button
                className={`cbtn ask${typing ? ' on' : ''}`}
                disabled={busy}
                title="Ask a question"
                onClick={() => { setTyping((v) => !v); pinnedRef.current = true; setTimeout(() => typeInputRef.current?.focus(), 60); }}
              ><span className="qm">?</span></button>
              {ACTIONS.map((a) => (
                <button key={a.id} className="cbtn" disabled={busy} title={a.name} onClick={() => runAction(a.id)}>
                  <a.Icon size={16} />
                </button>
              ))}
            </div>
            <span className="spacer" />
            <button className="cbtn" onClick={attachFiles} disabled={busy} title="Attach files"><Paperclip size={16} /></button>
            <button className="cbtn" onClick={grabText} disabled={busy} title="Grab text from a screen region (OCR — no model)"><ScanText size={16} /></button>
            <button className="cbtn" onClick={screenshot} disabled={busy} title="Capture a screen region (ask a vision model)"><Crop size={16} /></button>
          </div>

          {/* Ask input — revealed when ? is tapped. */}
          {typing && (
            <div className="ask-row">
              <input
                ref={typeInputRef}
                className="ask-input"
                placeholder="Ask anything about the selection…"
                value={freeText}
                onChange={(e) => setFreeText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (freeText.trim() || attachments.length || selection.trim())) { fire({ kind: 'text', selection, sourceApp, freeText: freeText.trim() || undefined }); setTyping(false); }
                  if (e.key === 'Escape') setTyping(false);
                }}
              />
              <button
                className="ask-send"
                disabled={busy || !(freeText.trim() || attachments.length || selection.trim())}
                onClick={() => { fire({ kind: 'text', selection, sourceApp, freeText: freeText.trim() || undefined }); setTyping(false); }}
                title="Send"
              ><CornerDownLeft size={14} /></button>
            </div>
          )}

          {/* Preview of what's queued, and where everything surfaces inside the box:
              while working a light travels around the border; when done the response
              fills the box with a small "saved" check; errors show in place. */}
          <div className="preview">
            {attachments.length > 0 && (
              <div className="chips">
                {attachments.map((a) => (
                  <span key={a.path} className="chip" title={a.path}>
                    <Paperclip size={11} />
                    <span className="chip-name">{a.name}</span>
                    <button
                      className="chip-x"
                      onClick={() => setAttachments((prev) => prev.filter((p) => p.path !== a.path))}
                      title="Remove"
                    ><X size={11} /></button>
                  </span>
                ))}
              </div>
            )}
            {(hasSelection || attachments.length === 0 || status !== 'idle') && (
              <div className={`box ${status === 'idle' ? (hasSelection ? 'has-sel' : 'is-empty') : 'active'} s-${status}`}>
                {status === 'running' && openBtn(false)}
                {status === 'done' && openBtn(true)}

                {status === 'running' ? (
                  <div className="sel-hint"><span className="working">Working…</span></div>
                ) : status === 'error' ? (
                  <div className="sel-hint">{error}</div>
                ) : status === 'done' ? (
                  <div className="sel-text">{answer || 'Saved to your notebook.'}</div>
                ) : hasSelection ? (
                  <div className="sel-text">{selection}</div>
                ) : (
                  <div className="sel-hint">No text selected. Select text in any app, attach a file, or tap ? to ask.</div>
                )}

                {status === 'done' && (
                  <div className="box-status">
                    <span className="saved" title="Saved to notebook"><Check size={14} /></span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(<Panel />);
