'use client';

import { registerNodeRenderer } from '@/lib/diagr/diagram-engine/registry';

let didRegister = false;

export function registerCustomRenderers(): void {
  if (didRegister) {
    return;
  }

  registerNodeRenderer('statusPill', ({ label, data }) => {
    const status = typeof data?.status === 'string' ? data.status : 'ok';

    return (
      <div
        style={{
          display: 'grid',
          placeItems: 'center',
          width: '100%',
          height: '100%',
        }}
      >
        <div
          style={{
            border: '1px solid #cfd7ea',
            borderRadius: 999,
            padding: '10px 18px',
            fontSize: 14,
            background: '#ffffff',
            color: '#243243',
          }}
        >
          {label} - {status}
        </div>
      </div>
    );
  });

  didRegister = true;
}
