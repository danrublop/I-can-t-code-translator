import { describe, it, expect } from 'vitest';
import { htmlToMarkdown, looksLikeHtml } from './html-to-markdown';

describe('htmlToMarkdown', () => {
  it('converts headings', () => {
    expect(htmlToMarkdown('<h1>Title</h1><h2>Sub</h2><h3>Small</h3>')).toBe('# Title\n\n## Sub\n\n### Small');
  });

  it('converts paragraphs with inline emphasis', () => {
    expect(htmlToMarkdown('<p>Hello <strong>bold</strong> and <em>italic</em></p>')).toBe('Hello **bold** and *italic*');
  });

  it('converts inline code and links', () => {
    expect(htmlToMarkdown('<p>Run <code>npm test</code> see <a href="https://x.com">docs</a></p>')).toBe(
      'Run `npm test` see [docs](https://x.com)',
    );
  });

  it('converts unordered and ordered lists', () => {
    expect(htmlToMarkdown('<ul><li>one</li><li>two</li></ul>')).toBe('- one\n- two');
    expect(htmlToMarkdown('<ol><li>first</li><li>second</li></ol>')).toBe('1. first\n2. second');
  });

  it('converts blockquote and hr', () => {
    expect(htmlToMarkdown('<blockquote>quoted</blockquote><hr>')).toBe('> quoted\n\n---');
  });

  it('converts a code block preserving inner text', () => {
    expect(htmlToMarkdown('<pre>const x = 1;\nconst y = 2;</pre>')).toBe('```\nconst x = 1;\nconst y = 2;\n```');
  });

  it('escalates the code fence when the content contains a backtick run (no early break)', () => {
    const md = htmlToMarkdown('<pre>const s = `a ${b}`;\n```fenced inside```</pre>');
    // outer fence must be longer than the 3-backtick run inside
    expect(md.startsWith('````')).toBe(true);
    expect(md).toContain('```fenced inside```');
    expect(md.trimEnd().endsWith('````')).toBe(true);
  });

  it('decodes HTML entities in text', () => {
    expect(htmlToMarkdown('<p>a &amp; b &lt; c</p>')).toBe('a & b < c');
  });

  it('degrades unknown tags to their text content, never dropping text', () => {
    expect(htmlToMarkdown('<section><span>kept</span></section>')).toBe('kept');
  });

  it('handles a realistic mixed body', () => {
    const html = '<h2>Notes</h2><p>Some <strong>important</strong> text.</p><ul><li>a</li><li>b</li></ul>';
    expect(htmlToMarkdown(html)).toBe('## Notes\n\nSome **important** text.\n\n- a\n- b');
  });

  it('returns empty string for empty input', () => {
    expect(htmlToMarkdown('')).toBe('');
  });
});

describe('looksLikeHtml', () => {
  it('detects HTML-bodied content', () => {
    expect(looksLikeHtml('<p>hi</p>')).toBe(true);
    expect(looksLikeHtml('<ul><li>x</li></ul>')).toBe(true);
    expect(looksLikeHtml('  \n<div>wrapped</div>')).toBe(true); // leading whitespace ok
    expect(looksLikeHtml('<h2>Heading</h2><p>body</p>')).toBe(true);
  });

  it('leaves plain text / markdown untouched (notch-saved bodies)', () => {
    expect(looksLikeHtml('Just a plain answer from the model.')).toBe(false);
    expect(looksLikeHtml('# A markdown heading\n\n- a list item')).toBe(false);
    expect(looksLikeHtml('Use a < b to compare')).toBe(false); // bare < is not a tag
  });

  // Regression (review finding #1): notch answers are Markdown that frequently MENTIONS
  // tags in prose or code. Migrating those flattens real Markdown — they must be skipped.
  it('does NOT flag Markdown bodies that merely mention HTML tags', () => {
    expect(looksLikeHtml('Wrap the text in a `<div>` element for layout.')).toBe(false);
    expect(looksLikeHtml('The `<a>` tag needs an href. Use `<br>` for line breaks.')).toBe(false);
    expect(looksLikeHtml('# Notes\n\nUse a <section> to group content.')).toBe(false);
    expect(looksLikeHtml('```html\n<p>example in a code block</p>\n```')).toBe(false);
  });
});
