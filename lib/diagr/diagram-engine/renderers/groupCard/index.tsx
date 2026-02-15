'use client';

import type { DiagrNodeRenderer } from '@/lib/diagr/diagram-engine/registry';

export const GroupCardRenderer: DiagrNodeRenderer = ({ label, data }) => {
  const displayLabel = typeof label === 'string' ? label : '';
  const caption = typeof data?.caption === 'string' ? data.caption : '';
  return (
    <div className="diagr-group-node">
      <div className="diagr-group-header">{displayLabel}</div>
      {caption ? <div className="diagr-group-caption">{caption}</div> : null}
    </div>
  );
};
