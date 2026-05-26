import React, { useCallback, useEffect, useState } from 'react';
import type { DetailedModel, CatalogEntry, ModelsList, ModelFit } from './settings-view';
import './settings.css';

const GB = 1024 ** 3;
const fmtSize = (b: number) => (b >= GB ? `${(b / GB).toFixed(1)} GB` : b > 0 ? `${Math.round(b / (1024 * 1024))} MB` : '');

// Fit badge → label + class (colors live in settings.css).
const FIT: Record<ModelFit, { label: string; cls: string }> = {
  comfortable: { label: 'Runs comfortably', cls: 'fit-ok' },
  tight: { label: 'Tight on RAM', cls: 'fit-tight' },
  'wont-fit': { label: "Won't fit", cls: 'fit-no' },
  cloud: { label: 'Cloud', cls: 'fit-cloud' },
};

function Badge({ fit }: { fit: ModelFit }) {
  const f = FIT[fit];
  return <span className={`fit-badge ${f.cls}`}>{f.label}</span>;
}

/**
 * Models page: see every model, whether it fits this machine's RAM, set your default
 * text + vision model, pull recommended models, and delete local ones.
 *
 *   listDetailed() ─▶ installed (+ cloud)        catalog() ─▶ recommended-to-pull
 *        │                                            │
 *        ▼                                            ▼
 *   RAM-fit badge + default pickers + delete     fit badge + Pull (progress)
 */
export function ModelsView() {
  const [data, setData] = useState<ModelsList | null>(null);
  const [catalog, setCatalog] = useState<CatalogEntry[]>([]);
  const [busy, setBusy] = useState<string | null>(null); // model id currently pulling/deleting
  const [progress, setProgress] = useState('');
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    try {
      const [d, c] = await Promise.all([window.settingsAPI.listModelsDetailed(), window.settingsAPI.modelCatalog()]);
      setData(d);
      setCatalog(c);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load models');
    }
  }, []);

  useEffect(() => {
    refresh();
    const off = window.settingsAPI.onPullProgress((p) => setProgress(`${p.status} ${p.percent ? p.percent + '%' : ''}`.trim()));
    return off;
  }, [refresh]);

  async function pull(id: string) {
    setError(''); setBusy(id); setProgress('starting…');
    const res = await window.settingsAPI.pullModel(id);
    setBusy(null); setProgress('');
    if (res.ok) refresh();
    else setError(res.error ?? 'Pull failed');
  }

  async function del(id: string) {
    setError(''); setBusy(id);
    const res = await window.settingsAPI.deleteModel(id);
    setBusy(null);
    if (res.ok) refresh();
    else setError(res.error ?? 'Delete failed');
  }

  async function setDefault(kind: 'text' | 'vision', id: string) {
    await window.settingsAPI.setDefaultModel(kind, id);
    refresh();
  }

  const totalGB = data ? (data.totalRamBytes / GB).toFixed(0) : '?';
  const installed = data?.models ?? [];
  const notInstalled = catalog.filter((c) => !c.installed);

  return (
    <div className="settings models-page">
      <header className="settings-head">
        <h1>Models</h1>
        <p className="hint">Your machine has <strong>{totalGB} GB</strong> of RAM. Badges estimate whether a model
          fits when the machine is otherwise idle — a model marked “tight” may still run out of memory if other
          apps are using a lot of RAM.</p>
      </header>

      {error && <div className="settings-error">{error}</div>}

      <section className="settings-card">
        <h2>Installed</h2>
        {installed.length === 0 && <span className="hint">No models yet — install one from the list below.</span>}
        <div className="model-list">
          {installed.map((m) => (
            <div key={m.id} className="model-row">
              <div className="model-main">
                <span className="model-id">{m.id}</span>
                <span className="model-meta">
                  {m.provider === 'cloud' ? 'cloud' : fmtSize(m.sizeBytes)}
                  {m.vision && <span className="vision-tag">vision</span>}
                </span>
              </div>
              <Badge fit={m.fit} />
              <div className="model-actions">
                <button
                  className={`chip-btn${data?.defaultTextModel === m.id ? ' on' : ''}`}
                  onClick={() => setDefault('text', m.id)}
                  title="Use as default for text queries"
                >Text{data?.defaultTextModel === m.id ? ' ✓' : ''}</button>
                {m.vision && (
                  <button
                    className={`chip-btn${data?.defaultVisionModel === m.id ? ' on' : ''}`}
                    onClick={() => setDefault('vision', m.id)}
                    title="Use as default for screenshots / vision"
                  >Vision{data?.defaultVisionModel === m.id ? ' ✓' : ''}</button>
                )}
                {m.provider === 'ollama' && (
                  <button className="chip-btn danger" disabled={busy === m.id} onClick={() => del(m.id)} title="Delete this model">
                    {busy === m.id ? '…' : 'Delete'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="settings-card">
        <h2>Recommended to install</h2>
        {notInstalled.length === 0 && <span className="hint">You have all the recommended models.</span>}
        <div className="model-list">
          {notInstalled.map((c) => (
            <div key={c.id} className="model-row">
              <div className="model-main">
                <span className="model-id">{c.label}</span>
                <span className="model-meta">
                  ~{fmtSize(c.sizeBytes)}
                  {c.vision && <span className="vision-tag">vision</span>}
                </span>
                <span className="model-note">{c.note}</span>
              </div>
              <Badge fit={c.fit} />
              <div className="model-actions">
                <button className="chip-btn primary" disabled={busy === c.id || c.fit === 'wont-fit'} onClick={() => pull(c.id)} title={c.fit === 'wont-fit' ? "Won't fit in this machine's RAM" : `Download ${c.id}`}>
                  {busy === c.id ? (progress || 'Pulling…') : 'Install'}
                </button>
              </div>
            </div>
          ))}
        </div>
        {busy && progress && <div className="pull-progress">{busy}: {progress}</div>}
      </section>
    </div>
  );
}
