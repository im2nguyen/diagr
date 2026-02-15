'use client';

import { useEffect, useMemo } from 'react';
import { CSSProperties } from 'react';
import ReactFlow, {
  Background,
  ReactFlowProvider,
  useReactFlow,
  Edge,
  Node,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { edgeTypes, nodeTypes } from '@/lib/diagr/diagram-engine/defaults';
import { DiagrThemeTokens } from '@/lib/diagr/types';

type InnerCanvasProps = {
  nodes: Node[];
  edges: Edge[];
  theme: DiagrThemeTokens;
  onMeasureNodeSizes?: (sizes: Record<string, { width: number; height: number }>) => void;
};

function InnerCanvas({ nodes, edges, theme, onMeasureNodeSizes }: InnerCanvasProps) {
  const instance = useReactFlow();
  const measuredNodeIdsSignature = useMemo(
    () =>
      nodes
        .filter((node) => node.type === 'diagrNode')
        .map((node) => node.id)
        .sort()
        .join('|'),
    [nodes],
  );

  useEffect(() => {
    if (nodes.length > 0) {
      requestAnimationFrame(() => {
        instance.fitView({ padding: 0.15, duration: 400 });
      });
    }
  }, [instance, nodes, edges]);

  useEffect(() => {
    if (!onMeasureNodeSizes) {
      return;
    }

    const measure = () => {
      const elements = document.querySelectorAll<HTMLElement>(
        '#diagr-diagram-canvas .react-flow__node.react-flow__node-diagrNode',
      );
      const sizes: Record<string, { width: number; height: number }> = {};

      elements.forEach((element) => {
        const id = element.getAttribute('data-id');
        if (!id) {
          return;
        }

        const shell = element.querySelector<HTMLElement>('.diagr-node-content');
        const widthSource = shell ?? element;
        const heightSource = shell ?? element;
        const measuredWidth = Math.max(widthSource.offsetWidth, widthSource.scrollWidth);
        const measuredHeight = Math.max(heightSource.offsetHeight, heightSource.scrollHeight);

        sizes[id] = {
          width: measuredWidth,
          height: measuredHeight,
        };
      });

      onMeasureNodeSizes(sizes);
      return elements;
    };

    let frame = requestAnimationFrame(() => {
      const elements = measure();
      if (typeof ResizeObserver === 'undefined') {
        return;
      }

      const observer = new ResizeObserver(() => {
        if (frame) {
          cancelAnimationFrame(frame);
        }
        frame = requestAnimationFrame(() => {
          measure();
        });
      });

      elements.forEach((element) => {
        const content = element.querySelector<HTMLElement>('.diagr-node-content');
        observer.observe(content ?? element);
      });

      cleanupObserver = () => observer.disconnect();
    });

    let cleanupObserver: (() => void) | undefined;

    return () => {
      cancelAnimationFrame(frame);
      cleanupObserver?.();
    };
  }, [measuredNodeIdsSignature, onMeasureNodeSizes]);

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      fitView
      minZoom={0.2}
      maxZoom={2}
      proOptions={{ hideAttribution: true }}
      style={{ background: 'var(--diagr-canvas-bg)' }}
      nodesDraggable={false}
      nodesConnectable={false}
      elementsSelectable={false}
      panOnScroll
      panActivationKeyCode={null}
    >
      <Background color={theme.gridDot} gap={24} size={1.2} />
    </ReactFlow>
  );
}

type DiagramCanvasProps = {
  nodes: Node[];
  edges: Edge[];
  theme: DiagrThemeTokens;
  themeVars?: CSSProperties;
  themeCssOverrides?: string;
  onMeasureNodeSizes?: (sizes: Record<string, { width: number; height: number }>) => void;
};

export function DiagramCanvas({ nodes, edges, theme, themeVars, themeCssOverrides, onMeasureNodeSizes }: DiagramCanvasProps) {
  return (
    <div className="canvas-shell" id="diagr-diagram-canvas" style={themeVars}>
      {themeCssOverrides ? <style data-diagr-theme-overrides>{themeCssOverrides}</style> : null}
      <ReactFlowProvider>
        <InnerCanvas nodes={nodes} edges={edges} theme={theme} onMeasureNodeSizes={onMeasureNodeSizes} />
      </ReactFlowProvider>
    </div>
  );
}
