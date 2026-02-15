import { Edge, Node } from 'reactflow';
import { runAutoLayout } from '@/lib/diagr/layout/dagre';
import { resolveTheme } from '@/lib/diagr/theme/presets';
import { DiagrCoreDocument, NormalizedGraph } from '@/lib/diagr/types';
import { buildReactFlowEdges } from '@/lib/diagr/diagram-engine/adapter/edges';
import { buildReactFlowNodes, buildCaptionNodes, buildTitleNode } from '@/lib/diagr/diagram-engine/adapter/nodes';
import { buildRects } from '@/lib/diagr/diagram-engine/adapter/rects';
import { applyRootRelayout, createRootResolver } from '@/lib/diagr/diagram-engine/adapter/roots';
import { Rect } from '@/lib/diagr/diagram-engine/adapter/types';

function applyMeasuredNodeSizes(
  graph: NormalizedGraph,
  measuredNodeSizes?: Record<string, { width: number; height: number }>,
): NormalizedGraph {
  if (!measuredNodeSizes || Object.keys(measuredNodeSizes).length === 0) {
    return graph;
  }

  return {
    ...graph,
    nodes: graph.nodes.map((node) => {
      const measured = measuredNodeSizes[node.instanceId];
      if (!measured || node.isContainer || node.renderer === 'groupCard') {
        return node;
      }

      return {
        ...node,
        width: Math.max(1, Math.round(measured.width)),
        height: Math.max(1, Math.round(measured.height)),
      };
    }),
  };
}

export function toReactFlowElements(
  graph: NormalizedGraph,
  doc: DiagrCoreDocument,
  measuredNodeSizes?: Record<string, { width: number; height: number }>,
): { nodes: Node[]; edges: Edge[] } {
  const measuredGraph = applyMeasuredNodeSizes(graph, measuredNodeSizes);
  const theme = resolveTheme(doc.theme);
  const spacing = {
    paddingX: theme.groupContentPaddingX,
    paddingTop: theme.groupContentPaddingTop,
    paddingBottom: theme.groupContentPaddingBottom,
  };

  const positionedPass1 = runAutoLayout(measuredGraph, doc);
  const instanceById = new Map(measuredGraph.nodes.map((node) => [node.instanceId, node]));
  const firstPass = buildRects(positionedPass1, instanceById, spacing);
  const rects = new Map<string, Rect>([...firstPass.rects.entries()].map(([id, rect]) => [id, { ...rect }]));
  const rootOf = createRootResolver(instanceById);

  applyRootRelayout(graph, measuredGraph, doc, rects, rootOf);

  const renderNodes = buildReactFlowNodes(
    measuredGraph.nodes,
    doc,
    theme,
    rects,
    firstPass.localPositions,
    instanceById,
  );
  const captionNodes = buildCaptionNodes(measuredGraph.nodes, rects);
  const titleNode = buildTitleNode(doc, measuredGraph.nodes, rects);
  const edges = buildReactFlowEdges(graph, measuredGraph.nodes, doc, theme, rects, rootOf);

  return { nodes: [...titleNode, ...renderNodes, ...captionNodes], edges };
}
