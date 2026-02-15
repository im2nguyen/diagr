'use client';

import type { DiagrNodeRenderer } from '@/lib/diagr/diagram-engine/registry';
import styles from './index.module.css';

const DEFAULT_IMAGE_SIZE = 190;

function toSize(value: unknown, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return fallback;
  }
  return Math.max(24, Math.round(value));
}

export const ImageRenderer: DiagrNodeRenderer = ({ label, data }) => {
  const image = typeof data?.image === 'string' ? data.image : undefined;
  const width = toSize((data as { width?: unknown } | undefined)?.width, DEFAULT_IMAGE_SIZE);
  const height = toSize((data as { height?: unknown } | undefined)?.height, DEFAULT_IMAGE_SIZE);
  const displayLabel = typeof label === 'string' ? label : '';
  const hasVariantLabel = displayLabel.trim().length > 0;

  return (
    <div className={`diagr-node-content ${styles.shell}`}>
      {hasVariantLabel ? <div className="diagr-node-title">{displayLabel}</div> : null}
      {image ? (
        <img
          src={image}
          alt={displayLabel}
          className={styles.asset}
          style={{ width: `${width}px`, height: `${height}px` }}
        />
      ) : (
        <div className={styles.missing} style={{ width: `${width}px`, height: `${height}px` }}>
          missing image
        </div>
      )}
    </div>
  );
};
