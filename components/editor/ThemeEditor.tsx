'use client';

import Editor from '@monaco-editor/react';
import { Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardAction, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { DiagrDiagnostic } from '@/lib/diagr/types';

type ThemeEditorProps = {
  value: string;
  onChange: (value: string) => void;
  diagnostics: DiagrDiagnostic[];
  onResetPreset: () => void;
};

function downloadTextFile(filename: string, content: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function ThemeEditor({ value, onChange, diagnostics, onResetPreset }: ThemeEditorProps) {
  const handleDownloadCss = () => {
    downloadTextFile('override.css', value, 'text/css;charset=utf-8');
  };

  return (
    <Card size="sm" className="flex h-full min-h-0 flex-col">
      <CardHeader>
        <div className="flex items-center gap-2">
          <CardTitle>CSS overrides</CardTitle>
          <Button
            size="icon-xs"
            variant="ghost"
            className="h-6 w-6"
            aria-label="Download CSS overrides"
            onClick={handleDownloadCss}
          >
            <Save />
          </Button>
        </div>
        <CardAction>
          <Button variant="outline" size="sm" onClick={onResetPreset}>
            Reset Overrides
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 flex-col">
        <div className="min-h-0 flex-1">
          <Editor
            height="100%"
            language="css"
          value={value}
          onChange={(nextValue) => onChange(nextValue ?? '')}
          options={{
            minimap: { enabled: false },
            fontSize: 13,
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
            lineNumbersMinChars: 3,
            wordWrap: 'on',
            tabSize: 2,
            smoothScrolling: true,
            scrollBeyondLastLine: false,
          }}
          />
        </div>
      </CardContent>
      <CardFooter>
        {diagnostics.length === 0 ? (
          <div className="diagnostic-ok">No theme errors.</div>
        ) : (
          diagnostics.map((item, index) => (
            <div key={`${item.code}-${index}`} className="diagnostic-item">
              <strong>{item.code}</strong>: {item.message}
            </div>
          ))
        )}
      </CardFooter>
    </Card>
  );
}
