'use client';

import { useEffect, useState } from 'react';
import type { DiagrNodeRenderer } from '@/lib/diagr/diagram-engine/registry';
import { highlightCode } from './shiki';
import styles from './index.module.css';

export const CodeRenderer: DiagrNodeRenderer = ({ label, data }) => {
  const code = typeof data?.code === 'string' ? data.code : 'type Model = {\\n  id: string;\\n};';
  const diagramTheme = typeof data?.__diagramTheme === 'string' ? data.__diagramTheme : 'light';
  const shikiTheme = diagramTheme === 'dark' ? 'github-dark' : 'github-light';
  const displayLabel = typeof label === 'string' ? label : '';
  const hasVariantLabel = displayLabel.trim().length > 0;
  const [highlighted, setHighlighted] = useState<string>('');

  useEffect(() => {
    let cancelled = false;

    highlightCode(code, 'typescript', shikiTheme)
      .then((html) => {
        if (!cancelled) {
          setHighlighted(html);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setHighlighted('');
        }
      });

    return () => {
      cancelled = true;
    };
  }, [code, shikiTheme]);

  return (
    <div className="diagr-node-content">
      {hasVariantLabel ? <div className="diagr-node-title">{displayLabel}</div> : null}
      {highlighted ? (
        <div className={`${styles.code} ${styles.codeShiki}`} dangerouslySetInnerHTML={{ __html: highlighted }} />
      ) : (
        <pre className={`${styles.code} ${styles.codeFallback}`}>{code}</pre>
      )}
    </div>
  );
};
