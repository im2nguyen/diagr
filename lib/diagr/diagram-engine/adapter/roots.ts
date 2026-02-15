import { PositionedNode, runAutoLayout } from '@/lib/diagr/layout/dagre';
import { DiagrCoreDocument, NodeInstance, NormalizedGraph } from '@/lib/diagr/types';
import { Rect } from '@/lib/diagr/diagram-engine/adapter/types';

export function makeChildMap(nodes: NodeInstance[]): Map<string, string[]> {
  const childMap = new Map<string, string[]>();
  nodes.forEach((node) => {
    if (!node.parentInstanceId) {
      return;
    }
    childMap.set(node.parentInstanceId, [...(childMap.get(node.parentInstanceId) ?? []), node.instanceId]);
  });
  return childMap;
}

export function shiftSubtree(
  rects: Map<string, Rect>,
  childMap: Map<string, string[]>,
  id: string,
  dx: number,
  dy: number,
): void {
  const current = rects.get(id);
  if (current) {
    rects.set(id, { ...current, x: current.x + dx, y: current.y + dy });
  }
  const children = childMap.get(id) ?? [];
  children.forEach((childId) => shiftSubtree(rects, childMap, childId, dx, dy));
}

export function createRootResolver(instanceById: Map<string, NodeInstance>) {
  const rootCache = new Map<string, string>();

  return (instanceId: string): string => {
    const cached = rootCache.get(instanceId);
    if (cached) {
      return cached;
    }

    let current = instanceById.get(instanceId);
    if (!current) {
      rootCache.set(instanceId, instanceId);
      return instanceId;
    }

    while (current.parentInstanceId) {
      const parent = instanceById.get(current.parentInstanceId);
      if (!parent) {
        break;
      }
      current = parent;
    }

    rootCache.set(instanceId, current.instanceId);
    return current.instanceId;
  };
}

export function applyRootRelayout(
  graph: NormalizedGraph,
  measuredGraph: NormalizedGraph,
  doc: DiagrCoreDocument,
  rects: Map<string, Rect>,
  rootOf: (instanceId: string) => string,
): void {
  const rootNodes = measuredGraph.nodes
    .filter((node) => !node.parentInstanceId)
    .map((node) => {
      const rect = rects.get(node.instanceId);
      if (!rect) {
        return node;
      }
      return {
        ...node,
        width: Math.max(1, Math.round(rect.width)),
        height: Math.max(1, Math.round(rect.height)),
      };
    });

  const rootEdgeDedupe = new Set<string>();
  const rootEdges = graph.edges.flatMap((edge, index) => {
    const sourceRoot = rootOf(edge.source);
    const targetRoot = rootOf(edge.target);
    if (sourceRoot === targetRoot) {
      return [];
    }
    const key = `${sourceRoot}->${targetRoot}`;
    if (rootEdgeDedupe.has(key)) {
      return [];
    }
    rootEdgeDedupe.add(key);
    return [
      {
        id: `root__${index}__${sourceRoot}__${targetRoot}`,
        source: sourceRoot,
        target: targetRoot,
        label: edge.label,
      },
    ];
  });

  const rootGraph: NormalizedGraph = {
    nodes: rootNodes,
    edges: rootEdges,
  };

  const positionedRoots: PositionedNode[] = runAutoLayout(rootGraph, doc);
  const childMap = makeChildMap(measuredGraph.nodes);
  positionedRoots.forEach((root) => {
    const current = rects.get(root.id);
    if (!current) {
      return;
    }
    const dx = root.x - current.x;
    const dy = root.y - current.y;
    if (dx !== 0 || dy !== 0) {
      shiftSubtree(rects, childMap, root.id, dx, dy);
    }
  });
}
