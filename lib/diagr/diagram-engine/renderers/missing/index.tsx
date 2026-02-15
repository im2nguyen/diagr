'use client';

import type { DiagrNodeRenderer } from '@/lib/diagr/diagram-engine/registry';

export const MissingRenderer: DiagrNodeRenderer = ({ label, data }) => {
  const renderer = typeof data?.requestedRenderer === 'string' ? data.requestedRenderer : 'unknown';
  return (
    <div className="diagr-node-missing">
      <strong>Missing renderer</strong>
      <span>{renderer}</span>
      <span>{label}</span>
    </div>
  );
};
