// Canonical HTML -> Markdown converter (main process).
//
// Why this exists: note bodies were historically stored as sanitized HTML (the old
// contentEditable editor saved `DOMPurify.sanitize(editor)` verbatim — see the v1
// `notebook.tsx` updateBody path). The TipTap rewrite makes Markdown the on-disk body
// format, so existing HTML-bodied `.md` files must be migrated. This module is the one
// place that turns the editor's known HTML tag set into Markdown, and it runs in the
// main process (no DOM), so it parses with node-html-parser instead of the live DOM.
//
// Scope: it handles the LIMITED tag set the old editor could produce —
//   block:  p, div, h1-h3, blockquote, pre, ul, ol, li, hr, br
//   inline: strong/b, em/i, code, a[href]
// Unknown tags degrade to their text content (never throw, never drop user text).
//
//   HTML string ──parse──▶ node tree ──walk──▶ block lines ──join──▶ Markdown
//                                       │
//                                       └─ inline() handles emphasis/code/links/text

import { parse, type HTMLElement, type Node } from 'node-html-parser';

// node-html-parser node type ids (mirrors DOM): 1 = element, 3 = text.
const NODE_ELEMENT = 1;
const NODE_TEXT = 3;

function isElement(node: Node): node is HTMLElement {
  return node.nodeType === NODE_ELEMENT;
}

/** Collapse runs of whitespace the way HTML rendering would, but keep single spaces. */
function normalizeText(text: string): string {
  return text.replace(/\s+/g, ' ');
}

/** Render inline content (emphasis, code, links, text) of a node to Markdown. */
function inline(node: Node): string {
  if (node.nodeType === NODE_TEXT) return normalizeText(node.rawText ? decodeEntities(node.rawText) : node.text);
  if (!isElement(node)) return '';
  const el = node;
  const inner = el.childNodes.map(inline).join('');
  switch (el.rawTagName?.toLowerCase()) {
    case 'strong':
    case 'b':
      return inner.trim() ? `**${inner}**` : '';
    case 'em':
    case 'i':
      return inner.trim() ? `*${inner}*` : '';
    case 'code':
      // Code spans never carry nested markup; read their text directly so parser
      // text-element config can't blank them out.
      return `\`${decodeEntities(el.text)}\``;
    case 'a': {
      const href = el.getAttribute('href') ?? '';
      return href ? `[${inner}](${href})` : inner;
    }
    case 'br':
      return '  \n';
    default:
      return inner;
  }
}

/** node-html-parser leaves entities encoded in rawText; decode the common ones. */
function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

function listItems(el: HTMLElement, ordered: boolean): string[] {
  const lines: string[] = [];
  let i = 1;
  for (const li of el.childNodes) {
    if (!isElement(li) || li.rawTagName?.toLowerCase() !== 'li') continue;
    const text = inline(li).trim();
    lines.push(ordered ? `${i++}. ${text}` : `- ${text}`);
  }
  return lines;
}

/** Convert a single block-level element to its Markdown line(s). */
function block(node: Node, out: string[]): void {
  if (node.nodeType === NODE_TEXT) {
    const t = normalizeText(decodeEntities(node.rawText ?? node.text)).trim();
    if (t) out.push(t, '');
    return;
  }
  if (!isElement(node)) return;
  const el = node;
  switch (el.rawTagName?.toLowerCase()) {
    case 'h1': out.push(`# ${inline(el).trim()}`, ''); break;
    case 'h2': out.push(`## ${inline(el).trim()}`, ''); break;
    case 'h3': out.push(`### ${inline(el).trim()}`, ''); break;
    case 'blockquote': out.push(`> ${inline(el).trim()}`, ''); break;
    case 'pre': out.push('```', decodeEntities(el.text).replace(/\n+$/, ''), '```', ''); break;
    case 'ul': out.push(...listItems(el, false), ''); break;
    case 'ol': out.push(...listItems(el, true), ''); break;
    case 'hr': out.push('---', ''); break;
    case 'p':
    case 'div': {
      const t = inline(el).trim();
      if (t) out.push(t, '');
      break;
    }
    default: {
      const t = inline(el).trim();
      if (t) out.push(t, '');
    }
  }
}

/**
 * Convert an HTML body string to Markdown. Safe on arbitrary input: unknown tags
 * degrade to their text, and it never throws.
 */
export function htmlToMarkdown(html: string): string {
  const root = parse(html);
  const out: string[] = [];
  for (const child of root.childNodes) block(child, out);
  return out.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

/**
 * Heuristic: does this body actually contain HTML markup that needs converting?
 * Notch-saved entries store the model's raw text/Markdown (no tags) and must be left
 * untouched; only contentEditable-saved entries hold HTML. We treat the presence of a
 * known block/inline tag as the signal. Conservative: anything ambiguous is left as-is.
 */
export function looksLikeHtml(body: string): boolean {
  return /<(p|div|h[1-3]|ul|ol|li|blockquote|pre|code|strong|em|b|i|a|br|hr)(\s[^>]*)?>/i.test(body);
}
