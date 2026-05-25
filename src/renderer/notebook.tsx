import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import './notebook.css';

interface NotebookMeta { prompt: string; selection: string; sourceApp?: string; model: string }
interface NotebookAPI {
  onStart: (cb: (meta: NotebookMeta) => void) => () => void;
  onToken: (cb: (partial: string) => void) => () => void;
  onDone: (cb: (answer: string) => void) => () => void;
  onError: (cb: (message: string) => void) => () => void;
}
declare global { interface Window { notebookAPI: NotebookAPI } }

type Status = 'empty' | 'streaming' | 'done' | 'error';

function Notebook() {
  const [meta, setMeta] = useState<NotebookMeta | null>(null);
  const [answer, setAnswer] = useState('');
  const [status, setStatus] = useState<Status>('empty');
  const [error, setError] = useState('');

  useEffect(() => {
    const offStart = window.notebookAPI.onStart((m) => { setMeta(m); setAnswer(''); setError(''); setStatus('streaming'); });
    const offToken = window.notebookAPI.onToken((p) => { setAnswer(p); setStatus('streaming'); });
    const offDone = window.notebookAPI.onDone((a) => { setAnswer(a); setStatus('done'); });
    const offErr = window.notebookAPI.onError((m) => { setError(m); setStatus('error'); });
    return () => { offStart(); offToken(); offDone(); offErr(); };
  }, []);

  if (status === 'empty' && !meta) {
    return <div className="nb"><div className="nb-empty">Your answers will appear here.<br />Capture text and pick an action from the notch.</div></div>;
  }

  return (
    <div className="nb">
      <div className="nb-eyebrow">
        {meta?.model && <span>{meta.model}</span>}
        {meta?.sourceApp && <span>{meta.sourceApp}</span>}
      </div>
      {meta?.prompt && <div className="nb-prompt">{meta.prompt}</div>}
      {meta?.selection?.trim() && <div className="nb-selection">{meta.selection}</div>}
      <div className="nb-answer">{status === 'error' ? '' : answer}</div>
      {status === 'streaming' && <div className="nb-status streaming">streaming</div>}
      {status === 'done' && <div className="nb-status">✓ saved to notebook</div>}
      {status === 'error' && <div className="nb-status error">{error}</div>}
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(<Notebook />);
