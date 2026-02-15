'use client';

import type { DiagrNodeRenderer } from '@/lib/diagr/diagram-engine/registry';

export const DefaultRenderer: DiagrNodeRenderer = ({ label, subtitle }) => {
  const displayLabel = typeof label === 'string' ? label : '';
  return (
    <>
      <div className="diagr-node-label">{displayLabel}</div>
      {subtitle ? <div className="diagr-node-subtitle">{subtitle}</div> : null}
    </>
  );
};
