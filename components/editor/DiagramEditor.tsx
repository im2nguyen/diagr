'use client';

import { useEffect, useRef } from 'react';
import { useState } from 'react';
import Editor from '@monaco-editor/react';
import { Save, X } from 'lucide-react';
import { isScalar, parseDocument } from 'yaml';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DiagrDiagnostic } from '@/lib/diagr/types';

type DiagramEditorProps = {
  draftValue: string;
  onDraftChange: (value: string) => void;
  onCommit: () => void;
  diagnostics: DiagrDiagnostic[];
  exampleOptions: Array<{ value: string; label: string }>;
  selectedExample: string;
  onSelectExample: (value: string) => void;
};

function sanitizeFilename(value: string): string {
  return value
    .trim()
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[.\-\s]+|[.\-\s]+$/g, '');
}

function resolveYamlFilename(source: string): string {
  try {
    const document = parseDocument(source);
    if (document.errors.length > 0) {
      return 'diagr.yaml';
    }
    const filenameNode = document.get('filename', true);
    const rawValue =
      typeof filenameNode === 'string'
        ? filenameNode
        : isScalar(filenameNode) && typeof filenameNode.value === 'string'
        ? filenameNode.value
        : '';
    const cleaned = sanitizeFilename(rawValue);
    if (!cleaned) {
      return 'diagr.yaml';
    }
    const base = cleaned.replace(/\.[a-z0-9]+$/i, '');
    return `${base || 'diagr'}.yaml`;
  } catch {
    return 'diagr.yaml';
  }
}

function downloadTextFile(filename: string, content: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function DiagramEditor({
  draftValue,
  onDraftChange,
  onCommit,
  diagnostics,
  exampleOptions,
  selectedExample,
  onSelectExample,
}: DiagramEditorProps) {
  const [showCommitHint, setShowCommitHint] = useState(true);
  const disposablesRef = useRef<Array<{ dispose: () => void }>>([]);
  const lastLineRef = useRef<number | null>(null);
  const lastCommitAtRef = useRef(0);
  const onCommitRef = useRef(onCommit);

  useEffect(() => {
    onCommitRef.current = onCommit;
  }, [onCommit]);

  const commitWithThrottle = () => {
    const now = Date.now();
    if (now - lastCommitAtRef.current < 100) {
      return;
    }
    lastCommitAtRef.current = now;
    onCommitRef.current();
  };

  useEffect(() => {
    return () => {
      disposablesRef.current.forEach((disposable) => disposable.dispose());
      disposablesRef.current = [];
    };
  }, []);

  const handleDownloadSource = () => {
    const filename = resolveYamlFilename(draftValue);
    downloadTextFile(filename, draftValue, 'application/x-yaml;charset=utf-8');
  };

  return (
    <Card size="sm" className="flex h-full min-h-0 flex-col">
      <CardHeader className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <CardTitle>Diagram Source</CardTitle>
          <Button
            size="icon-xs"
            variant="ghost"
            className="h-6 w-6"
            aria-label="Download diagram source YAML"
            onClick={handleDownloadSource}
          >
            <Save />
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground text-xs font-medium leading-none">Example</span>
          <Select value={selectedExample} onValueChange={onSelectExample}>
            <SelectTrigger size="sm" className="w-[200px]">
              <SelectValue placeholder="Select example" />
            </SelectTrigger>
            <SelectContent>
              {exampleOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      {showCommitHint ? (
        <div className="bg-muted/60 text-muted-foreground flex items-center justify-between border-y px-3 py-1.5 text-[11px]">
          <span>Diagram updates when you move to a different line or unfocus the editor.</span>
          <Button
            size="icon-xs"
            variant="ghost"
            className="h-5 w-5"
            aria-label="Dismiss update hint"
            onClick={() => setShowCommitHint(false)}
          >
            <X />
          </Button>
        </div>
      ) : null}
      <CardContent className="flex min-h-0 flex-1 flex-col">
        <div className="min-h-0 flex-1">
          <Editor
            height="100%"
            language="yaml"
            value={draftValue}
            onMount={(editor) => {
              lastLineRef.current = editor.getPosition()?.lineNumber ?? null;

              const cursorDisposable = editor.onDidChangeCursorPosition((event) => {
                const nextLine = event.position.lineNumber;
                if (lastLineRef.current === null) {
                  lastLineRef.current = nextLine;
                  return;
                }
                if (nextLine !== lastLineRef.current) {
                  lastLineRef.current = nextLine;
                  commitWithThrottle();
                }
              });

              const blurDisposable = editor.onDidBlurEditorText(() => {
                commitWithThrottle();
              });

              disposablesRef.current.push(cursorDisposable, blurDisposable);
            }}
            onChange={(nextValue) => onDraftChange(nextValue ?? '')}
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
          <div className="diagnostic-ok">No parse errors.</div>
        ) : (
          diagnostics.map((item, index) => (
            <div key={`${item.code}-${index}`} className="diagnostic-item">
              <strong>{item.code}</strong>: {item.message} (line {item.line}, col {item.column})
            </div>
          ))
        )}
      </CardFooter>
    </Card>
  );
}
