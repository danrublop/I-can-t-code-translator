// React NodeView for an AI block: a contained region with a model label, a generation-
// state indicator, and a re-run affordance. Editing of the generated text stays inline
// (NodeViewContent). Design: graphite monochrome, thin left rule (see notebook.css
// .ai-block) — per the 2026-05-26 design review.
//
// NOTE: this renders only in the live React editor; the headless serializer never mounts
// NodeViews, so ai-block.ts stays React-free and the golden tests don't need this file.

import React from 'react';
import { NodeViewWrapper, NodeViewContent, type NodeViewProps } from '@tiptap/react';

export function AiBlockView({ node, editor }: NodeViewProps) {
  const blockId = String(node.attrs.blockId ?? '');
  const model = String(node.attrs.model ?? 'AI');
  const state = String(node.attrs.state ?? 'done') as 'generating' | 'done' | 'error';

  const rerun = () => {
    const handler = (editor.storage as { aiBlock?: { onRerun?: (id: string) => void } }).aiBlock?.onRerun;
    handler?.(blockId);
  };

  return (
    <NodeViewWrapper className={`ai-block ai-block--${state}`} data-block-id={blockId}>
      <div className="ai-block__bar" contentEditable={false}>
        <span className="ai-block__model">{model}</span>
        {state === 'generating' && <span className="ai-block__dot" aria-label="generating" />}
        {state === 'error' && <span className="ai-block__err">couldn’t reach {model} · </span>}
        {state !== 'generating' && (
          <button className="ai-block__rerun" onClick={rerun} title="Re-run" type="button">
            ⟳ re-run
          </button>
        )}
      </div>
      <NodeViewContent className="ai-block__content" />
    </NodeViewWrapper>
  );
}
