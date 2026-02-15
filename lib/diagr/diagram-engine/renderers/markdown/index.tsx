'use client';

import { Fragment, ReactNode } from 'react';
import type { DiagrNodeRenderer } from '@/lib/diagr/diagram-engine/registry';
import styles from './index.module.css';

type Block =
  | { type: 'heading'; level: number; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'blockquote'; text: string }
  | { type: 'ul'; items: string[] }
  | { type: 'ol'; items: string[] }
  | { type: 'code'; code: string };

function parseBlocks(markdown: string): Block[] {
  const lines = markdown.replace(/\r\n?/g, '\n').split('\n');
  const blocks: Block[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i].trimEnd();
    const trimmed = line.trim();

    if (!trimmed) {
      i += 1;
      continue;
    }

    if (trimmed.startsWith('```')) {
      const codeLines: string[] = [];
      i += 1;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i += 1;
      }
      if (i < lines.length) {
        i += 1;
      }
      blocks.push({ type: 'code', code: codeLines.join('\n') });
      continue;
    }

    const heading = trimmed.match(/^(#{1,4})\s+(.+)$/);
    if (heading) {
      blocks.push({ type: 'heading', level: heading[1].length, text: heading[2] });
      i += 1;
      continue;
    }

    if (trimmed.startsWith('>')) {
      blocks.push({ type: 'blockquote', text: trimmed.replace(/^>\s?/, '') });
      i += 1;
      continue;
    }

    if (/^[-*]\s+/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length) {
        const t = lines[i].trim();
        const m = t.match(/^[-*]\s+(.+)$/);
        if (!m) {
          break;
        }
        items.push(m[1]);
        i += 1;
      }
      blocks.push({ type: 'ul', items });
      continue;
    }

    if (/^\d+\.\s+/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length) {
        const t = lines[i].trim();
        const m = t.match(/^\d+\.\s+(.+)$/);
        if (!m) {
          break;
        }
        items.push(m[1]);
        i += 1;
      }
      blocks.push({ type: 'ol', items });
      continue;
    }

    const paragraphLines: string[] = [trimmed];
    i += 1;
    while (i < lines.length) {
      const t = lines[i].trim();
      if (!t || t.startsWith('#') || t.startsWith('>') || t.startsWith('```') || /^[-*]\s+/.test(t) || /^\d+\.\s+/.test(t)) {
        break;
      }
      paragraphLines.push(t);
      i += 1;
    }
    blocks.push({ type: 'paragraph', text: paragraphLines.join(' ') });
  }

  return blocks;
}

function parseInline(text: string): ReactNode[] {
  const out: ReactNode[] = [];
  const pattern = /(\[[^\]]+\]\([^)]+\)|`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g;
  let cursor = 0;
  let index = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > cursor) {
      out.push(text.slice(cursor, match.index));
    }
    const token = match[0];
    if (token.startsWith('`') && token.endsWith('`')) {
      out.push(<code key={`md-inline-${index}`}>{token.slice(1, -1)}</code>);
    } else if (token.startsWith('**') && token.endsWith('**')) {
      out.push(<strong key={`md-inline-${index}`}>{token.slice(2, -2)}</strong>);
    } else if (token.startsWith('*') && token.endsWith('*')) {
      out.push(<em key={`md-inline-${index}`}>{token.slice(1, -1)}</em>);
    } else {
      const link = token.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      if (link) {
        const href = link[2];
        out.push(
          <a key={`md-inline-${index}`} href={href} target="_blank" rel="noreferrer">
            {link[1]}
          </a>,
        );
      } else {
        out.push(token);
      }
    }
    cursor = match.index + token.length;
    index += 1;
  }

  if (cursor < text.length) {
    out.push(text.slice(cursor));
  }

  return out;
}

function renderBlock(block: Block, index: number): ReactNode {
  if (block.type === 'heading') {
    if (block.level === 1) return <h1 key={`md-${index}`}>{parseInline(block.text)}</h1>;
    if (block.level === 2) return <h2 key={`md-${index}`}>{parseInline(block.text)}</h2>;
    if (block.level === 3) return <h3 key={`md-${index}`}>{parseInline(block.text)}</h3>;
    return <h4 key={`md-${index}`}>{parseInline(block.text)}</h4>;
  }
  if (block.type === 'blockquote') {
    return <blockquote key={`md-${index}`}>{parseInline(block.text)}</blockquote>;
  }
  if (block.type === 'ul') {
    return (
      <ul key={`md-${index}`}>
        {block.items.map((item, itemIndex) => (
          <li key={`md-${index}-${itemIndex}`}>{parseInline(item)}</li>
        ))}
      </ul>
    );
  }
  if (block.type === 'ol') {
    return (
      <ol key={`md-${index}`}>
        {block.items.map((item, itemIndex) => (
          <li key={`md-${index}-${itemIndex}`}>{parseInline(item)}</li>
        ))}
      </ol>
    );
  }
  if (block.type === 'code') {
    return (
      <pre key={`md-${index}`}>
        <code>{block.code}</code>
      </pre>
    );
  }
  return <p key={`md-${index}`}>{parseInline(block.text)}</p>;
}

export const MarkdownRenderer: DiagrNodeRenderer = ({ label, data }) => {
  const markdown =
    typeof data?.markdown === 'string'
      ? data.markdown
      : '## Markdown\nUse `data.markdown` to render formatted text.';
  const displayLabel = typeof label === 'string' ? label : '';
  const hasVariantLabel = displayLabel.trim().length > 0;
  const blocks = parseBlocks(markdown);

  return (
    <div className={`diagr-node-content ${styles.markdown}`}>
      {hasVariantLabel ? <div className="diagr-node-title">{displayLabel}</div> : null}
      <div>
        {blocks.length === 0 ? (
          <p>
            <em>Empty markdown</em>
          </p>
        ) : (
          blocks.map((block, index) => <Fragment key={`md-frag-${index}`}>{renderBlock(block, index)}</Fragment>)
        )}
      </div>
    </div>
  );
};
