import React from 'react';
// Import the leaf icon components (components/Color or Mono) directly. The icon's index.js
// attaches .Avatar/.Combine variants that pull @lobehub/ui -> antd (a React-19 / antd dep
// we don't use), so we bypass it and import the raw SVG components, which only depend on
// React. We map Ollama model names to brands ourselves; everything else falls back to the
// Ollama mark (all models run via Ollama).
import OllamaMono from '@lobehub/icons/es/Ollama/components/Mono';
import MistralColor from '@lobehub/icons/es/Mistral/components/Color';
import MetaColor from '@lobehub/icons/es/Meta/components/Color';
import QwenColor from '@lobehub/icons/es/Qwen/components/Color';
import GemmaColor from '@lobehub/icons/es/Gemma/components/Color';
import GoogleColor from '@lobehub/icons/es/Google/components/Color';
import MicrosoftColor from '@lobehub/icons/es/Microsoft/components/Color';
import DeepSeekColor from '@lobehub/icons/es/DeepSeek/components/Color';
import CohereColor from '@lobehub/icons/es/Cohere/components/Color';

/* eslint-disable @typescript-eslint/no-explicit-any */
type IconComp = React.ComponentType<{ size?: number }>;

// First matching rule wins; falls back to the Ollama mark.
const RULES: Array<[RegExp, IconComp]> = [
  [/mi[sx]tral|mixtral|codestral|ministral/i, MistralColor as any],
  [/qwen/i, QwenColor as any],
  [/gemma/i, GemmaColor as any],
  [/gemini/i, GoogleColor as any],
  [/phi[-\s]?\d|\bphi\b/i, MicrosoftColor as any],
  [/deepseek/i, DeepSeekColor as any],
  [/command[-\s]?r|cohere|\baya\b/i, CohereColor as any],
  [/llava|bakllava|llama|codellama|vicuna/i, MetaColor as any],
];

export function BrandIcon({ model, size = 15 }: { model: string; size?: number }) {
  const Comp: IconComp = RULES.find(([re]) => re.test(model))?.[1] ?? (OllamaMono as any);
  return <Comp size={size} />;
}
