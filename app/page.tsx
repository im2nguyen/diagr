'use client';

import Image from 'next/image';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useDiagramSourceState } from '@/app/hooks/useDiagramSourceState';
import { useMeasuredNodeSizes } from '@/app/hooks/useMeasuredNodeSizes';
import { useThemeCssOverrides } from '@/app/hooks/useThemeCssOverrides';
import { useThemeSync } from '@/app/hooks/useThemeSync';
import { DiagramCanvas } from '@/components/canvas/DiagramCanvas';
import { DiagramEditor } from '@/components/editor/DiagramEditor';
import { ThemeEditor } from '@/components/editor/ThemeEditor';
import { ExportPanel } from '@/components/panels/ExportPanel';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { exportCanvasToPng, toPngFilename } from '@/lib/diagr/export/client';
import { diagramExamples, starterDiagram } from '@/lib/diagr/parser/template';
import { toReactFlowElements } from '@/lib/diagr/diagram-engine/adapter';
import { registerCustomRenderers } from '@/lib/diagr/diagram-engine/customRenderers';
import { resolveTheme } from '@/lib/diagr/theme/presets';
import { themeTokensToCssVars } from '@/lib/diagr/theme/cssOverrides';
import { toNormalizedGraph } from '@/lib/diagr/transform/graph';
import { DiagrDiagnostic } from '@/lib/diagr/types';

const starterThemeCss = `/* Diagram-scoped CSS overrides.
   Allowed selectors: .diagr-* */

/* Example
.diagr-node-markdown h2 {
  color: #7aa2ff;
}
*/`;

const themePresetOptions = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

const exampleOptions = [
  ...diagramExamples.map((item) => ({ value: item.id, label: item.label })),
  { value: '__custom__', label: 'Custom' },
];

export default function HomePage() {
  const [activeEditorTab, setActiveEditorTab] = useState<'source' | 'theme'>('source');
  const { measuredNodeSizes, handleMeasureNodeSizes, resetMeasuredNodeSizes } = useMeasuredNodeSizes();
  const {
    themeSource,
    setThemeSource,
    appliedThemeCss,
    themeCssValidation,
    handleResetThemePreset,
  } = useThemeCssOverrides(starterThemeCss);
  const defaultSource = diagramExamples[0]?.source ?? starterDiagram;
  const {
    draftSource,
    setDraftSource,
    commitDraftSource,
    commitSourceCandidate,
    draftParsed,
    committedParsed,
    matchedExampleId,
    customExampleId,
  } = useDiagramSourceState(defaultSource, diagramExamples);
  const { selectedThemePreset, unknownThemeDiagnostics, handleSelectThemePreset } = useThemeSync(
    draftSource,
    draftParsed,
    setDraftSource,
    commitSourceCandidate,
  );

  useEffect(() => {
    registerCustomRenderers();
  }, []);

  const diagnostics = useMemo<DiagrDiagnostic[]>(
    () => (draftParsed.ok ? unknownThemeDiagnostics : draftParsed.diagnostics),
    [draftParsed, unknownThemeDiagnostics],
  );

  const { nodes, edges, theme, themeVars } = useMemo(() => {
    const baseTheme = resolveTheme(selectedThemePreset);
    const vars = themeTokensToCssVars(baseTheme);

    if (!committedParsed.ok) {
      return {
        nodes: [],
        edges: [],
        theme: baseTheme,
        themeVars: vars,
      };
    }

    const normalized = toNormalizedGraph(committedParsed.doc);
    const elements = toReactFlowElements(normalized, committedParsed.doc, measuredNodeSizes);

    return {
      nodes: elements.nodes,
      edges: elements.edges,
      theme: baseTheme,
      themeVars: vars,
    };
  }, [committedParsed, measuredNodeSizes, selectedThemePreset]);

  const graphIdentity = useMemo(() => {
    if (!committedParsed.ok) {
      return '__invalid__';
    }
    const doc = committedParsed.doc;
    const nodeSignature = (doc.nodes ?? [])
      .map((node) => `${node.id}:${node.renderer ?? ''}:${(node.ids ?? []).join(',')}`)
      .join('|');
    return `${doc.edges}::${doc.layout?.direction ?? ''}::${nodeSignature}`;
  }, [committedParsed]);

  const prevGraphIdentityRef = useRef<string | null>(null);
  useEffect(() => {
    if (prevGraphIdentityRef.current && prevGraphIdentityRef.current !== graphIdentity) {
      resetMeasuredNodeSizes();
    }
    prevGraphIdentityRef.current = graphIdentity;
  }, [graphIdentity, resetMeasuredNodeSizes]);

  const handleExportPng = async () => {
    const element = document.getElementById('diagr-diagram-canvas');
    if (!element) {
      return;
    }
    const filename = committedParsed.ok ? toPngFilename(committedParsed.doc.filename) : toPngFilename();
    await exportCanvasToPng(element, filename);
  };

  const handleSelectExample = (nextExampleId: string) => {
    if (nextExampleId === customExampleId) {
      return;
    }
    const nextExample = diagramExamples.find((item) => item.id === nextExampleId);
    if (!nextExample) {
      return;
    }
    setDraftSource(nextExample.source);
    commitSourceCandidate(nextExample.source);
    setThemeSource('themeCss' in nextExample && typeof nextExample.themeCss === 'string' ? nextExample.themeCss : starterThemeCss);
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-[1760px] flex-col gap-5 px-6 py-6 md:py-9">
      <header className="ring-foreground/10 bg-card text-card-foreground flex flex-col gap-3 overflow-hidden rounded-xl py-3 px-4 text-sm ring-1 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center">
          <Image
            src="/diagr.png"
            alt="diagr logo"
            width={66}
            height={66}
            className="size-[33px]"
            priority
          />
          <div className="flex items-baseline gap-2">
            <h1 className="text-base font-semibold leading-tight md:text-lg">diagr</h1>
            <p className="text-muted-foreground text-sm">sharp diagrams from code</p>
          </div>
        </div>
        <ExportPanel onExportPng={handleExportPng} />
      </header>
      <section className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-[minmax(380px,620px)_1fr] lg:gap-5">
        <Tabs
          className="flex h-full min-h-0 flex-col gap-3"
          value={activeEditorTab}
          onValueChange={(value) => setActiveEditorTab(value as 'source' | 'theme')}
        >
          <div className="flex items-center gap-3">
            <TabsList aria-label="Editor tabs">
              <TabsTrigger value="source">Diagram Source</TabsTrigger>
              <TabsTrigger value="theme">Theme overrides</TabsTrigger>
            </TabsList>
            <div className="ml-auto flex items-center gap-2">
              <span className="text-muted-foreground text-xs font-medium leading-none">Theme</span>
              <Select value={selectedThemePreset} onValueChange={handleSelectThemePreset}>
                <SelectTrigger size="sm" className="w-[180px]">
                  <SelectValue placeholder="Select a preset" />
                </SelectTrigger>
                <SelectContent>
                  {themePresetOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <TabsContent value="source" className="min-h-0 flex flex-col">
            <DiagramEditor
              draftValue={draftSource}
              onDraftChange={setDraftSource}
              onCommit={commitDraftSource}
              diagnostics={diagnostics}
              exampleOptions={exampleOptions}
              selectedExample={matchedExampleId}
              onSelectExample={handleSelectExample}
            />
          </TabsContent>
          <TabsContent value="theme" className="min-h-0 flex flex-col">
            <ThemeEditor
              value={themeSource}
              onChange={setThemeSource}
              diagnostics={themeCssValidation.diagnostics}
              onResetPreset={handleResetThemePreset}
            />
          </TabsContent>
        </Tabs>
        <DiagramCanvas
          nodes={nodes}
          edges={edges}
          theme={theme}
          themeVars={themeVars}
          themeCssOverrides={appliedThemeCss}
          onMeasureNodeSizes={handleMeasureNodeSizes}
        />
      </section>
    </main>
  );
}
