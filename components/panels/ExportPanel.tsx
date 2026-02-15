'use client';

import { useState } from 'react';
import { flushSync } from 'react-dom';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

type ExportPanelProps = {
  onExportPng: () => Promise<void> | void;
};

export function ExportPanel({ onExportPng }: ExportPanelProps) {
  const [isExporting, setIsExporting] = useState(false);

  const waitForPaint = () =>
    new Promise<void>((resolve) => {
      setTimeout(() => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => resolve());
        });
      }, 0);
    });

  const handleExport = async () => {
    if (isExporting) {
      return;
    }
    flushSync(() => {
      setIsExporting(true);
    });
    try {
      await waitForPaint();
      await onExportPng();
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="flex items-center gap-3 py-2">
      <Button size="sm" onClick={handleExport} disabled={isExporting} aria-busy={isExporting}>
        {isExporting ? <Loader2 className="animate-spin" /> : null}
        {isExporting ? 'Exporting...' : 'Export PNG'}
      </Button>
    </div>
  );
}
