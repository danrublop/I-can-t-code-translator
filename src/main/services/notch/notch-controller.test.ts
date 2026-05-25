import { describe, it, expect, vi } from 'vitest';
import { NotchController, type LlmClient, type NotchControllerDeps } from './notch-controller';
import { BUILT_IN_PRESETS } from '../presets/presets';
import type { NotebookEntry } from '../notebook/types';

function setup(over: Partial<NotchControllerDeps> = {}) {
  const saved: NotebookEntry[] = [];
  const llm: LlmClient = {
    generate: vi.fn(async (opts) => {
      opts.onToken?.('partial');
      return `answer for ${opts.model}`;
    }),
  };
  const deps: NotchControllerDeps = {
    llm,
    notebook: { save: (e) => saved.push(e) },
    routerConfig: { defaultTextModel: 'llama3.2', visionModel: 'llava' },
    presets: BUILT_IN_PRESETS,
    newId: () => 'id-1',
    now: () => '2026-05-25T00:00:00Z',
    ...over,
  };
  return { controller: new NotchController(deps), saved, llm };
}

describe('NotchController.runQuery', () => {
  it('runs a preset query: builds the prompt, routes the model, persists the answer', async () => {
    const { controller, saved, llm } = setup();
    const res = await controller.runQuery({
      kind: 'text',
      presetId: 'explain',
      capture: { text: 'const x = 1', sourceApp: 'VSCode', via: 'clipboard' },
      language: 'javascript',
    });

    expect(res.answer).toBe('answer for llama3.2');
    expect(res.model).toBe('llama3.2');
    // Prompt assembled from the Explain template + the selection.
    const promptArg = (llm.generate as any).mock.calls[0][0].prompt as string;
    expect(promptArg).toContain('Explain');
    expect(promptArg).toContain('const x = 1');
    // Persisted with tags from source app + language.
    expect(saved).toHaveLength(1);
    expect(saved[0]).toMatchObject({ id: 'id-1', model: 'llama3.2', sourceApp: 'VSCode', tags: ['VSCode', 'javascript'] });
  });

  it('routes image queries to the vision model and passes the image path', async () => {
    const { controller, llm } = setup();
    const res = await controller.runQuery({ kind: 'image', presetId: 'explain', imagePath: '/tmp/shot.png' });
    expect(res.model).toBe('llava');
    expect((llm.generate as any).mock.calls[0][0].imagePath).toBe('/tmp/shot.png');
  });

  it('supports freeform questions with no preset', async () => {
    const { controller, llm } = setup();
    await controller.runQuery({
      kind: 'text',
      freeText: 'what does this do?',
      capture: { text: 'foo()', sourceApp: 'Safari', via: 'clipboard' },
    });
    const prompt = (llm.generate as any).mock.calls[0][0].prompt as string;
    expect(prompt).toBe('what does this do?\n\nfoo()');
  });

  it('appends a typed follow-up to a preset prompt', async () => {
    const { controller, llm } = setup();
    await controller.runQuery({
      kind: 'text',
      presetId: 'explain',
      freeText: 'in one sentence',
      capture: { text: 'x', sourceApp: 'A', via: 'clipboard' },
    });
    const prompt = (llm.generate as any).mock.calls[0][0].prompt as string;
    expect(prompt.endsWith('in one sentence')).toBe(true);
  });

  it('throws on empty input so the caller can show the paste/type state', async () => {
    const { controller, saved } = setup();
    await expect(controller.runQuery({ kind: 'text', capture: { text: '', via: 'none' } })).rejects.toThrow(/Nothing to ask/);
    expect(saved).toHaveLength(0);
  });

  it('rejects an unknown preset', async () => {
    const { controller } = setup();
    await expect(controller.runQuery({ kind: 'text', presetId: 'nope', capture: { text: 'x', via: 'clipboard' } })).rejects.toThrow(/Unknown preset/);
  });

  it('rejects a text-only preset used on an image', async () => {
    const { controller } = setup();
    await expect(controller.runQuery({ kind: 'image', presetId: 'rewrite', imagePath: '/tmp/s.png' })).rejects.toThrow(/does not accept image/);
  });
});
