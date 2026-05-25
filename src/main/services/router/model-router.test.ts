import { describe, it, expect } from 'vitest';
import { routeModel, type RouterConfig } from './model-router';
import type { Preset } from '../presets/presets';

const config: RouterConfig = { defaultTextModel: 'llama3.2', visionModel: 'llava' };

const preset = (over: Partial<Preset> = {}): Preset => ({
  id: 'explain',
  name: 'Explain',
  promptTemplate: '{selection}',
  accepts: 'both',
  ...over,
});

describe('routeModel', () => {
  it('routes any image input to the vision model', () => {
    expect(routeModel({ kind: 'image' }, config).model).toBe('llava');
    // Even with a text-default preset, an image still goes to vision.
    expect(routeModel({ kind: 'image', preset: preset({ defaultModel: 'mistral' }) }, config).model).toBe('llava');
  });

  it('prefers the preset default model for text', () => {
    const r = routeModel({ kind: 'text', preset: preset({ defaultModel: 'qwen2.5-coder' }), userSelectedModel: 'mistral' }, config);
    expect(r.model).toBe('qwen2.5-coder');
  });

  it('falls back to the user-selected model when the preset has none', () => {
    const r = routeModel({ kind: 'text', preset: preset(), userSelectedModel: 'mistral' }, config);
    expect(r.model).toBe('mistral');
  });

  it('falls back to the global default text model when nothing else applies', () => {
    expect(routeModel({ kind: 'text' }, config).model).toBe('llama3.2');
  });

  it('always returns a reason', () => {
    expect(routeModel({ kind: 'text' }, config).reason).toBeTruthy();
    expect(routeModel({ kind: 'image' }, config).reason).toBeTruthy();
  });
});
