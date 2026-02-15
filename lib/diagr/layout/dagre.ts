import dagre from 'dagre';
import { defaultRenderDefaults } from '@/lib/diagr/theme/presets';
import { DiagrCoreDocument, NodeInstance, NormalizedGraph } from '@/lib/diagr/types';

export type PositionedNode = {
  id: string;
  defId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  explicitWidth?: number;
  explicitHeight?: number;
  parentInstanceId?: string;
  isContainer: boolean;
  data?: Record<string, unknown>;
};

function minLenForLabel(label: string | undefined, ranksep: number): number {
  if (!label) {
    return 1;
  }

  // Target roughly: label width is ~75% of edge span.
  const estimatedLabelWidth = Math.max(48, label.length * 7 + 24);
  const desiredSpan = estimatedLabelWidth / 0.90;
  return Math.max(1, Math.ceil(desiredSpan / Math.max(1, ranksep)));
}

function defaultSizeForNode(node: NodeInstance): { width: number; height: number } {
  if (node.width && node.height) {
    return { width: node.width, height: node.height };
  }

  const payload = node.data as Record<string, unknown> | undefined;

  if (node.isContainer || node.renderer === 'groupCard') {
    return { width: 40, height: 40 };
  }

  const renderer = node.renderer;
  if (renderer === 'cards') {
    const cards = Array.isArray(payload?.cards) ? payload.cards : [];
    if (cards.length === 0) {
      return { width: 150, height: 98 };
    }
    if (cards.length === 1) {
      const first = cards[0] as Record<string, unknown>;
      const iconCount = typeof first?.icons === 'number' ? first.icons : 12;
      if (iconCount <= 1) {
        return { width: 126, height: 94 };
      }
      if (iconCount <= 4) {
        return { width: 162, height: 116 };
      }
      return { width: 184, height: 132 };
    }
    if (cards.length === 2) {
      return { width: 212, height: 138 };
    }
    return { width: 246, height: 160 };
  }
  if (renderer === 'code') {
    const code = typeof payload?.code === 'string' ? payload.code : '';
    const lines = Math.max(1, code.split('\n').length);
    const longest = Math.max(12, ...code.split('\n').map((line) => line.length));
    const width = Math.max(220, Math.min(390, 76 + longest * 7));
    const height = Math.max(108, Math.min(240, 38 + lines * 16));
    return { width, height };
  }
  if (renderer === 'image') {
    return { width: 244, height: 228 };
  }
  if (renderer === 'markdown') {
    const markdown = typeof payload?.markdown === 'string' ? payload.markdown : '';
    const lines = Math.max(3, markdown.split('\n').length);
    const longest = Math.max(18, ...markdown.split('\n').map((line) => line.length));
    const width = Math.max(260, Math.min(520, 92 + longest * 6));
    const height = Math.max(130, Math.min(320, 58 + lines * 14));
    return { width, height };
  }
  return { width: 280, height: 120 };
}

export function runAutoLayout(graph: NormalizedGraph, doc: DiagrCoreDocument): PositionedNode[] {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));

  const direction = doc.layout?.direction ?? defaultRenderDefaults.direction;
  const xGap = doc.layout?.xGap ?? defaultRenderDefaults.xGap;
  const yGap = doc.layout?.yGap ?? defaultRenderDefaults.yGap;
  const isHorizontal = direction === 'LR' || direction === 'RL';
  const ranksep = isHorizontal ? xGap : yGap;
  const nodesep = isHorizontal ? yGap : xGap;

  g.setGraph({
    rankdir: direction,
    ranksep,
    nodesep,
  });

  graph.nodes.forEach((node) => {
    const defaultSize = defaultSizeForNode(node);

    g.setNode(node.instanceId, {
      width: node.width ?? defaultSize.width,
      height: node.height ?? defaultSize.height,
    });
  });

  graph.edges.forEach((edge) => {
    g.setEdge(edge.source, edge.target, {
      minlen: minLenForLabel(edge.label, ranksep),
      weight: edge.label ? 2 : 1,
    });
  });

  dagre.layout(g);

  return graph.nodes.map((node) => {
    const pos = g.node(node.instanceId) as { x: number; y: number; width: number; height: number };
    const override = doc.layout?.overrides?.[node.instanceId] ?? doc.layout?.overrides?.[node.defId];

    if (override) {
      const defaultSize = defaultSizeForNode(node);

      return {
        id: node.instanceId,
        defId: node.defId,
        x: override.x,
        y: override.y,
        width: node.width ?? defaultSize.width,
        height: node.height ?? defaultSize.height,
        explicitWidth: node.width,
        explicitHeight: node.height,
        parentInstanceId: node.parentInstanceId,
        isContainer: node.isContainer,
        data: node.data,
      };
    }

    return {
      id: node.instanceId,
      defId: node.defId,
      x: pos.x - pos.width / 2,
      y: pos.y - pos.height / 2,
      width: pos.width,
      height: pos.height,
      explicitWidth: node.width,
      explicitHeight: node.height,
      parentInstanceId: node.parentInstanceId,
      isContainer: node.isContainer,
      data: node.data,
    };
  });
}
