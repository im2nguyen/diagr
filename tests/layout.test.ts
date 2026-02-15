import { describe, expect, it } from 'vitest';
import { runAutoLayout } from '@/lib/diagr/layout/dagre';
import { toNormalizedGraph } from '@/lib/diagr/transform/graph';
import { toReactFlowElements } from '@/lib/diagr/diagram-engine/adapter';
import { DiagrCoreDocument } from '@/lib/diagr/types';

const sampleDoc: DiagrCoreDocument = {
  title: 'layout-test',
  nodes: [
    { id: 'a', label: 'A' },
    { id: 'b', label: 'B' },
  ],
  edges: 'a --> b',
  layout: {
    direction: 'LR',
    xGap: 100,
    yGap: 80,
    overrides: {
      b: { x: 700, y: 210 },
    },
  },
};

describe('runAutoLayout', () => {
  it('applies manual overrides when provided', () => {
    const graph = toNormalizedGraph(sampleDoc);
    const positioned = runAutoLayout(graph, sampleDoc);
    const nodeB = positioned.find((node) => node.defId === 'b');

    expect(nodeB).toBeDefined();
    expect(nodeB?.x).toBe(700);
    expect(nodeB?.y).toBe(210);
  });

  it('expands edges across cloned instances', () => {
    const doc: DiagrCoreDocument = {
      edges: 'a --> b',
      nodes: [
        { id: 'a', label: 'A' },
        { id: 'b', label: 'B' },
        { id: 'left', renderer: 'groupCard', data: { ids: ['a', 'b'] } },
        { id: 'right', renderer: 'groupCard', data: { ids: ['a', 'b'] } },
      ],
    };

    const graph = toNormalizedGraph(doc);
    expect(graph.nodes.length).toBeGreaterThan(0);
    expect(graph.edges).toHaveLength(4);
  });

  it('keeps child nodes contained within groupCard content bounds', () => {
    const doc: DiagrCoreDocument = {
      edges: '',
      nodes: [
        { id: 'imageChild', renderer: 'image', label: 'Image Child' },
        { id: 'panel', renderer: 'groupCard', label: 'Panel', data: { ids: ['imageChild'] } },
      ],
    };

    const graph = toNormalizedGraph(doc);
    const rendered = toReactFlowElements(graph, doc);
    const panel = rendered.nodes.find((node) => node.type === 'groupCard' && node.data?.label === 'Panel');
    const child = rendered.nodes.find((node) => node.type === 'diagrNode' && node.parentNode === panel?.id);

    expect(panel).toBeDefined();
    expect(child).toBeDefined();

    const panelWidth = Number(panel?.style?.width ?? 0);
    const panelHeight = Number(panel?.style?.height ?? 0);
    const childWidth = Number(child?.style?.width ?? 0);
    const childHeight = Number(child?.style?.height ?? 0);
    const childX = Number(child?.position?.x ?? 0);
    const childY = Number(child?.position?.y ?? 0);

    expect(childX).toBeGreaterThanOrEqual(0);
    expect(childY).toBeGreaterThanOrEqual(0);
    expect(childX + childWidth).toBeLessThanOrEqual(panelWidth);
    expect(childY + childHeight).toBeLessThanOrEqual(panelHeight);
  });

  it('wraps multiple children and keeps nested widths bounded by parent', () => {
    const doc: DiagrCoreDocument = {
      edges: '',
      nodes: [
        { id: 'a', renderer: 'code', data: { code: 'const a = 1;\\n'.repeat(8) } },
        { id: 'b', renderer: 'image' },
        { id: 'c', renderer: 'cards', data: { cards: [{ label: 'One', icons: 12 }] } },
        { id: 'panel', renderer: 'groupCard', data: { ids: ['a', 'b', 'c'] } },
      ],
    };

    const graph = toNormalizedGraph(doc);
    const rendered = toReactFlowElements(graph, doc);
    const panel = rendered.nodes.find((node) => node.type === 'groupCard' && node.id.startsWith('panel__'));
    const children = rendered.nodes.filter((node) => node.parentNode === panel?.id && node.type === 'diagrNode');

    expect(panel).toBeDefined();
    expect(children.length).toBe(3);
    const panelWidth = Number(panel?.style?.width ?? 0);
    children.forEach((child) => {
      const width = Number(child.style?.width ?? 0);
      expect(width).toBeLessThanOrEqual(panelWidth);
      expect(width).toBeGreaterThan(0);
    });
  });

  it('renders uncrowded bidirectional root-level edges as two directed arrows', () => {
    const doc: DiagrCoreDocument = {
      edges: 'source --> normalize\nnormalize <--> target',
      nodes: [
        { id: 'source', renderer: 'cards', data: { cards: [{ label: 'S', icons: 1 }] } },
        { id: 'normalize', renderer: 'code', data: { code: 'type A = string;' } },
        { id: 'target', renderer: 'image' },
        { id: 'providers', renderer: 'groupCard', data: { ids: ['source'] } },
        { id: 'workos', renderer: 'groupCard', data: { ids: ['normalize'] } },
        { id: 'app', renderer: 'groupCard', data: { ids: ['target'] } },
      ],
    };

    const graph = toNormalizedGraph(doc);
    const rendered = toReactFlowElements(graph, doc);
    const edgesToApp = rendered.edges.filter((edge) => edge.source === edge.target ? false : true);

    // 1 forward (source->normalize) + 2 between normalize<->target
    expect(edgesToApp.length).toBeGreaterThanOrEqual(3);
    const hasDoubleHeaded = edgesToApp.some((edge) => edge.markerStart && edge.markerEnd);
    expect(hasDoubleHeaded).toBe(false);
    const leftToRight = edgesToApp.some(
      (edge) => edge.sourceHandle?.startsWith('r-') && edge.targetHandle?.startsWith('l-'),
    );
    const rightToLeft = edgesToApp.some(
      (edge) => edge.sourceHandle?.startsWith('l-') && edge.targetHandle?.startsWith('r-'),
    );
    expect(leftToRight).toBe(true);
    expect(rightToLeft).toBe(true);
  });

  it('keeps two labels for uncrowded bidirectional edges', () => {
    const doc: DiagrCoreDocument = {
      edges: 'a <--> b [label="sync"]',
      nodes: [
        { id: 'a', renderer: 'code', label: 'A', data: { code: 'type A = string;' } },
        { id: 'b', renderer: 'image', label: 'B' },
      ],
      layout: { direction: 'LR' },
    };

    const graph = toNormalizedGraph(doc);
    const rendered = toReactFlowElements(graph, doc);
    const aNodeId = rendered.nodes.find((node) => node.type === 'diagrNode' && node.data?.label === 'A')?.id;
    const bNodeId = rendered.nodes.find((node) => node.type === 'diagrNode' && node.data?.label === 'B')?.id;
    const pairEdges = rendered.edges.filter(
      (edge) =>
        (edge.source === aNodeId && edge.target === bNodeId) || (edge.source === bNodeId && edge.target === aNodeId),
    );
    const labeled = pairEdges.filter((edge) => typeof edge.label === 'string' && String(edge.label).trim().length > 0);

    expect(pairEdges).toHaveLength(2);
    expect(labeled).toHaveLength(2);
    expect(pairEdges.every((edge) => edge.markerStart === undefined)).toBe(true);
  });

  it('keeps workers-alerts as one combined bidirectional edge in crowded layout', () => {
    const doc: DiagrCoreDocument = {
      edges: 'workers --> warehouse [label="load"]\nworkers <--> alerts [label="notify"]',
      nodes: [
        { id: 'workers', renderer: 'code', label: 'Workers', data: { code: 'interface Event { id: string; }' } },
        { id: 'warehouse', renderer: 'image', label: 'Warehouse' },
        { id: 'alerts', renderer: 'markdown', label: 'Alerts', data: { markdown: '- alert' } },
      ],
      layout: { direction: 'LR' },
    };

    const graph = toNormalizedGraph(doc);
    const rendered = toReactFlowElements(graph, doc);
    const workersId = rendered.nodes.find((node) => node.type === 'diagrNode' && node.data?.label === 'Workers')?.id;
    const alertsId = rendered.nodes.find((node) => node.type === 'diagrNode' && node.data?.label === 'Alerts')?.id;
    const workerEdges = rendered.edges.filter((edge) => edge.source === workersId);
    const pairEdges = rendered.edges.filter(
      (edge) =>
        (edge.source === workersId && edge.target === alertsId) || (edge.source === alertsId && edge.target === workersId),
    );
    const notifyLabels = pairEdges.filter((edge) => String(edge.label ?? '') === 'notify');

    expect(pairEdges).toHaveLength(1);
    expect(notifyLabels).toHaveLength(1);
    expect(pairEdges[0]?.markerStart).toBeDefined();
    expect(pairEdges[0]?.markerEnd).toBeDefined();
    expect(workerEdges.length).toBeGreaterThanOrEqual(1);
  });

  it('assigns handles and label decisions deterministically across runs', () => {
    const doc: DiagrCoreDocument = {
      edges: 'workers --> warehouse [label="load"]\nworkers <--> alerts [label="notify"]',
      nodes: [
        { id: 'workers', renderer: 'code', label: 'Workers', data: { code: 'interface Event { id: string; }' } },
        { id: 'warehouse', renderer: 'image', label: 'Warehouse' },
        { id: 'alerts', renderer: 'markdown', label: 'Alerts', data: { markdown: '- alert' } },
      ],
      layout: { direction: 'LR' },
    };

    const graph = toNormalizedGraph(doc);
    const runA = toReactFlowElements(graph, doc).edges
      .map((edge) => ({
        id: edge.id,
        sourceHandle: edge.sourceHandle,
        targetHandle: edge.targetHandle,
        label: edge.label,
      }))
      .sort((a, b) => a.id.localeCompare(b.id));
    const runB = toReactFlowElements(graph, doc).edges
      .map((edge) => ({
        id: edge.id,
        sourceHandle: edge.sourceHandle,
        targetHandle: edge.targetHandle,
        label: edge.label,
      }))
      .sort((a, b) => a.id.localeCompare(b.id));

    expect(runA).toEqual(runB);
  });

  it('uses bottom-to-top handles for TB layouts when nodes are vertically arranged', () => {
    const doc: DiagrCoreDocument = {
      edges: 'a --> b',
      nodes: [
        { id: 'a', renderer: 'cards', label: 'A', data: { cards: [{ label: 'A', icons: 1 }] } },
        { id: 'b', renderer: 'image', label: 'B' },
      ],
      layout: { direction: 'TB' },
    };

    const graph = toNormalizedGraph(doc);
    const rendered = toReactFlowElements(graph, doc);
    const edge = rendered.edges[0];

    expect(edge).toBeDefined();
    expect(edge.sourceHandle).toBe('b-p3-source');
    expect(edge.targetHandle).toBe('t-p3-target');
  });

  it('uses middle handles for single-edge LR layouts', () => {
    const doc: DiagrCoreDocument = {
      edges: 'a --> b',
      nodes: [
        { id: 'a', renderer: 'cards', label: 'A', data: { cards: [{ label: 'A', icons: 1 }] } },
        { id: 'b', renderer: 'image', label: 'B' },
      ],
      layout: { direction: 'LR' },
    };

    const graph = toNormalizedGraph(doc);
    const rendered = toReactFlowElements(graph, doc);
    const edge = rendered.edges[0];

    expect(edge).toBeDefined();
    expect(edge.sourceHandle).toBe('r-p3-source');
    expect(edge.targetHandle).toBe('l-p3-target');
  });

  it('emits bottom caption clearance for TB edges from captioned groupCards', () => {
    const doc: DiagrCoreDocument = {
      edges: 'source --> normalize',
      layout: { direction: 'TB' },
      nodes: [
        { id: 'source', renderer: 'cards', label: 'Source', data: { cards: [{ label: 'S', icons: 1 }] } },
        { id: 'normalize', renderer: 'code', label: 'Normalize', data: { code: 'type A = string;' } },
        { id: 'providers', renderer: 'groupCard', label: 'Providers', data: { ids: ['source'], caption: 'Caption A' } },
        { id: 'workos', renderer: 'groupCard', label: 'WorkOS', data: { ids: ['normalize'], caption: 'Caption B' } },
      ],
    };

    const graph = toNormalizedGraph(doc);
    const rendered = toReactFlowElements(graph, doc);
    const edge = rendered.edges[0] as typeof rendered.edges[0] & {
      data?: { sourceBottomClearancePx?: number; targetBottomClearancePx?: number };
    };

    expect(edge).toBeDefined();
    expect(edge.sourceHandle).toBe('b-p3-source');
    expect(Number(edge.data?.sourceBottomClearancePx ?? 0)).toBeGreaterThan(0);
  });

  it('does not emit bottom caption clearance when caption is absent', () => {
    const doc: DiagrCoreDocument = {
      edges: 'source --> normalize',
      layout: { direction: 'TB' },
      nodes: [
        { id: 'source', renderer: 'cards', label: 'Source', data: { cards: [{ label: 'S', icons: 1 }] } },
        { id: 'normalize', renderer: 'code', label: 'Normalize', data: { code: 'type A = string;' } },
        { id: 'providers', renderer: 'groupCard', label: 'Providers', data: { ids: ['source'] } },
        { id: 'workos', renderer: 'groupCard', label: 'WorkOS', data: { ids: ['normalize'] } },
      ],
    };

    const graph = toNormalizedGraph(doc);
    const rendered = toReactFlowElements(graph, doc);
    const edge = rendered.edges[0] as typeof rendered.edges[0] & {
      data?: { sourceBottomClearancePx?: number; targetBottomClearancePx?: number };
    };

    expect(edge).toBeDefined();
    expect(edge.sourceHandle).toBe('b-p3-source');
    expect(edge.data?.sourceBottomClearancePx).toBeUndefined();
  });

  it('expands groupCard width to fit wide nested child', () => {
    const doc: DiagrCoreDocument = {
      edges: '',
      nodes: [
        {
          id: 'wide',
          renderer: 'markdown',
          label: 'Wide',
          data: { markdown: '# Heading\n' + 'x'.repeat(500) },
        },
        {
          id: 'panel',
          renderer: 'groupCard',
          label: 'Panel',
          data: { ids: ['wide'] },
        },
      ],
    };

    const graph = toNormalizedGraph(doc);
    const rendered = toReactFlowElements(graph, doc);
    const panel = rendered.nodes.find((node) => node.type === 'groupCard' && node.data?.label === 'Panel');
    const child = rendered.nodes.find((node) => node.parentNode === panel?.id && node.type === 'diagrNode');

    expect(panel).toBeDefined();
    expect(child).toBeDefined();
    const panelWidth = Number(panel?.style?.width ?? 0);
    const childWidth = Number(child?.style?.width ?? 0);
    expect(panelWidth).toBeGreaterThanOrEqual(childWidth);
    expect(panelWidth).toBeGreaterThan(500);
  });

  it('distributes side connection points across five lanes', () => {
    const makeDoc = (targetCount: number): DiagrCoreDocument => {
      const targetIds = Array.from({ length: targetCount }, (_, index) => `t${index + 1}`);
      const overrides: Record<string, { x: number; y: number }> = {
        s: { x: 100, y: 260 },
      };
      targetIds.forEach((id, index) => {
        overrides[id] = { x: 700, y: 120 + index * 120 };
      });
      return {
        edges: targetIds.map((id) => `s --> ${id}`).join('\n'),
        layout: { direction: 'LR', overrides },
        nodes: [
          { id: 's', renderer: 'code', label: 'S', data: { code: 'type S = string;' } },
          ...targetIds.map((id) => ({ id, renderer: 'image', label: id })),
        ],
      };
    };

    const extractSourceLanes = (targetCount: number): string[] => {
      const graph = toNormalizedGraph(makeDoc(targetCount));
      const rendered = toReactFlowElements(graph, makeDoc(targetCount));
      return rendered.edges
        .filter((edge) => edge.sourceHandle?.startsWith('r-'))
        .map((edge) => edge.sourceHandle ?? '')
        .sort();
    };

    expect(extractSourceLanes(1)).toEqual(['r-p3-source']);
    expect(extractSourceLanes(2)).toEqual(['r-p2-source', 'r-p4-source']);
    expect(extractSourceLanes(3)).toEqual(['r-p1-source', 'r-p3-source', 'r-p5-source']);
    expect(extractSourceLanes(4)).toEqual(['r-p1-source', 'r-p2-source', 'r-p3-source', 'r-p4-source']);
    expect(extractSourceLanes(5)).toEqual(['r-p1-source', 'r-p2-source', 'r-p3-source', 'r-p4-source', 'r-p5-source']);
  });
});
