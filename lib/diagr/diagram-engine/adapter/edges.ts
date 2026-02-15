import { Edge, MarkerType } from 'reactflow';
import { DiagrCoreDocument, NodeInstance, NormalizedGraph } from '@/lib/diagr/types';
import { DiagrThemeTokens } from '@/lib/diagr/types';
import {
  CAPTION_EDGE_CLEARANCE_PAD,
  CAPTION_GAP,
  CAPTION_HEIGHT,
  Lane,
  LaneAssignment,
  NodeSide,
  Rect,
  RenderedEdgeDef,
  SideSelection,
} from '@/lib/diagr/diagram-engine/adapter/types';

function pairKeyOf(a: string, b: string): string {
  return a < b ? `${a}::${b}` : `${b}::${a}`;
}

function laneHandle(side: NodeSide, lane: Lane, role: 'source' | 'target'): string {
  return `${side}-${lane}-${role}`;
}

function sideAnchor(rect: Rect, side: NodeSide, bottomClearance = 0): { x: number; y: number } {
  const cx = rect.x + rect.width / 2;
  const cy = rect.y + rect.height / 2;
  switch (side) {
    case 'l':
      return { x: rect.x, y: cy };
    case 'r':
      return { x: rect.x + rect.width, y: cy };
    case 't':
      return { x: cx, y: rect.y };
    case 'b':
      return { x: cx, y: rect.y + rect.height + Math.max(0, bottomClearance) };
    default:
      return { x: cx, y: cy };
  }
}

function preferredFacingSide(from: { x: number; y: number }, to: { x: number; y: number }): NodeSide {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  if (Math.abs(dx) >= Math.abs(dy)) {
    return dx >= 0 ? 'r' : 'l';
  }
  return dy >= 0 ? 'b' : 't';
}

function centerOf(rect?: Rect): { x: number; y: number } {
  if (!rect) {
    return { x: 0, y: 0 };
  }
  return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
}

function laneForIndex(index: number): Lane {
  const laneCycle: Lane[] = ['p1', 'p2', 'p3', 'p4', 'p5'];
  return laneCycle[index % laneCycle.length];
}

function laneIndex(lane: Lane): number {
  const map: Record<Lane, number> = {
    p1: 0,
    p2: 1,
    p3: 2,
    p4: 3,
    p5: 4,
  };
  return map[lane];
}

function lanePattern(total: number): number[] {
  if (total <= 1) return [2];
  if (total === 2) return [1, 3];
  if (total === 3) return [0, 2, 4];
  if (total === 4) return [0, 1, 2, 3];
  return [0, 1, 2, 3, 4];
}

function selectSidesForEdge(
  source: string,
  target: string,
  sourceRect?: Rect,
  targetRect?: Rect,
  direction: 'LR' | 'TB' | 'RL' | 'BT' = 'LR',
  sourceBottomClearance = 0,
  targetBottomClearance = 0,
): SideSelection {
  const sRect = sourceRect ?? { x: 0, y: 0, width: 200, height: 120 };
  const tRect = targetRect ?? { x: 0, y: 0, width: 200, height: 120 };
  const sourceCenter = centerOf(sRect);
  const targetCenter = centerOf(tRect);
  const preferredSource = preferredFacingSide(sourceCenter, targetCenter);
  const preferredTarget = preferredFacingSide(targetCenter, sourceCenter);
  const allSides: NodeSide[] = ['l', 'r', 't', 'b'];

  let best: { sourceSide: NodeSide; targetSide: NodeSide; score: number } | undefined;
  allSides.forEach((sourceSide) => {
    allSides.forEach((targetSide) => {
      const sourcePoint = sideAnchor(sRect, sourceSide, sourceSide === 'b' ? sourceBottomClearance : 0);
      const targetPoint = sideAnchor(tRect, targetSide, targetSide === 'b' ? targetBottomClearance : 0);
      const dx = targetPoint.x - sourcePoint.x;
      const dy = targetPoint.y - sourcePoint.y;
      const distance = Math.hypot(dx, dy);
      const sourceFacingPenalty = sourceSide === preferredSource ? 0 : 36;
      const targetFacingPenalty = targetSide === preferredTarget ? 0 : 36;
      const horizontalPenalty = sourceSide === 't' || sourceSide === 'b' || targetSide === 't' || targetSide === 'b' ? 90 : 0;
      const verticalPenalty = sourceSide === 'l' || sourceSide === 'r' || targetSide === 'l' || targetSide === 'r' ? 90 : 0;
      const directionPenalty =
        direction === 'TB' || direction === 'BT'
          ? verticalPenalty
          : direction === 'LR' || direction === 'RL'
          ? horizontalPenalty
          : 0;
      const score = distance + sourceFacingPenalty + targetFacingPenalty + directionPenalty;
      if (!best || score < best.score) {
        best = { sourceSide, targetSide, score };
      }
    });
  });

  return {
    sourceSide: best?.sourceSide ?? 'r',
    targetSide: best?.targetSide ?? 'l',
  };
}

function buildBottomClearanceByRoot(nodes: NodeInstance[]): Map<string, number> {
  const bottomClearanceByRoot = new Map<string, number>();
  nodes.forEach((node) => {
    if (node.parentInstanceId || !node.isContainer) {
      return;
    }
    const caption = (node.data as { caption?: unknown } | undefined)?.caption;
    if (typeof caption === 'string' && caption.trim().length > 0) {
      bottomClearanceByRoot.set(node.instanceId, CAPTION_GAP + CAPTION_HEIGHT + CAPTION_EDGE_CLEARANCE_PAD);
    }
  });
  return bottomClearanceByRoot;
}

function buildRootPairState(
  graph: NormalizedGraph,
  rootOf: (instanceId: string) => string,
): Map<
  string,
  {
    left: string;
    right: string;
    leftToRight: boolean;
    rightToLeft: boolean;
    leftToRightLabel?: string;
    rightToLeftLabel?: string;
    leftToRightColor?: string;
    rightToLeftColor?: string;
    leftToRightStrokeType?: 'solid' | 'dot' | 'dash';
    rightToLeftStrokeType?: 'solid' | 'dot' | 'dash';
  }
> {
  const rootPairState = new Map<
    string,
    {
      left: string;
      right: string;
      leftToRight: boolean;
      rightToLeft: boolean;
      leftToRightLabel?: string;
      rightToLeftLabel?: string;
      leftToRightColor?: string;
      rightToLeftColor?: string;
      leftToRightStrokeType?: 'solid' | 'dot' | 'dash';
      rightToLeftStrokeType?: 'solid' | 'dot' | 'dash';
    }
  >();

  graph.edges.forEach((edge) => {
    const sourceRoot = rootOf(edge.source);
    const targetRoot = rootOf(edge.target);
    if (sourceRoot === targetRoot) {
      return;
    }
    const [left, right] = sourceRoot < targetRoot ? [sourceRoot, targetRoot] : [targetRoot, sourceRoot];
    const key = `${left}::${right}`;
    const state = rootPairState.get(key) ?? {
      left,
      right,
      leftToRight: false,
      rightToLeft: false,
      leftToRightLabel: undefined,
      rightToLeftLabel: undefined,
      leftToRightColor: undefined,
      rightToLeftColor: undefined,
      leftToRightStrokeType: undefined,
      rightToLeftStrokeType: undefined,
    };

    if (sourceRoot === left) {
      state.leftToRight = true;
      if (!state.leftToRightLabel && typeof edge.label === 'string') {
        state.leftToRightLabel = edge.label;
      }
      if (!state.leftToRightColor && typeof edge.color === 'string') {
        state.leftToRightColor = edge.color;
      }
      if (!state.leftToRightStrokeType && edge.strokeType) {
        state.leftToRightStrokeType = edge.strokeType;
      }
    } else {
      state.rightToLeft = true;
      if (!state.rightToLeftLabel && typeof edge.label === 'string') {
        state.rightToLeftLabel = edge.label;
      }
      if (!state.rightToLeftColor && typeof edge.color === 'string') {
        state.rightToLeftColor = edge.color;
      }
      if (!state.rightToLeftStrokeType && edge.strokeType) {
        state.rightToLeftStrokeType = edge.strokeType;
      }
    }
    rootPairState.set(key, state);
  });

  return rootPairState;
}

function computeLaneArtifacts(
  defs: RenderedEdgeDef[],
  rects: Map<string, Rect>,
  direction: 'LR' | 'TB' | 'RL' | 'BT',
  bottomClearanceByRoot: Map<string, number>,
) {
  const ordered = [...defs].sort((a, b) => a.id.localeCompare(b.id));
  const sideSelections = new Map<string, SideSelection>();
  ordered.forEach((edge) => {
    sideSelections.set(
      edge.id,
      selectSidesForEdge(
        edge.sourceRoot,
        edge.targetRoot,
        rects.get(edge.sourceRoot),
        rects.get(edge.targetRoot),
        direction,
        bottomClearanceByRoot.get(edge.sourceRoot) ?? 0,
        bottomClearanceByRoot.get(edge.targetRoot) ?? 0,
      ),
    );
  });

  const laneAssignments = new Map<string, LaneAssignment>();
  const endpointGroups = new Map<
    string,
    Array<{ edgeId: string; role: 'source' | 'target'; oppositeY: number; oppositeX: number }>
  >();
  ordered.forEach((edge) => {
    const selection = sideSelections.get(edge.id) ?? { sourceSide: 'r' as const, targetSide: 'l' as const };
    const sourceCenter = centerOf(rects.get(edge.sourceRoot));
    const targetCenter = centerOf(rects.get(edge.targetRoot));
    const sourceKey = `${edge.sourceRoot}:${selection.sourceSide}`;
    const targetKey = `${edge.targetRoot}:${selection.targetSide}`;
    endpointGroups.set(sourceKey, [
      ...(endpointGroups.get(sourceKey) ?? []),
      { edgeId: edge.id, role: 'source', oppositeY: targetCenter.y, oppositeX: targetCenter.x },
    ]);
    endpointGroups.set(targetKey, [
      ...(endpointGroups.get(targetKey) ?? []),
      { edgeId: edge.id, role: 'target', oppositeY: sourceCenter.y, oppositeX: sourceCenter.x },
    ]);
  });

  const endpointLaneByEdge = new Map<string, { source?: { lane: Lane; index: number }; target?: { lane: Lane; index: number } }>();
  endpointGroups.forEach((items, key) => {
    const side = (key.split(':')[1] as NodeSide) ?? 'r';
    const sorted = [...items].sort((a, b) => {
      const aPrimary = side === 'l' || side === 'r' ? a.oppositeY : a.oppositeX;
      const bPrimary = side === 'l' || side === 'r' ? b.oppositeY : b.oppositeX;
      const aSecondary = side === 'l' || side === 'r' ? a.oppositeX : a.oppositeY;
      const bSecondary = side === 'l' || side === 'r' ? b.oppositeX : b.oppositeY;
      return aPrimary - bPrimary || aSecondary - bSecondary || a.edgeId.localeCompare(b.edgeId);
    });
    sorted.forEach((item, index) => {
      const current = endpointLaneByEdge.get(item.edgeId) ?? {};
      const pattern = lanePattern(sorted.length);
      const lanePosition = pattern[index % pattern.length];
      const assignment =
        sorted.length === 1
          ? { lane: 'p3' as Lane, index: 0 }
          : { lane: laneForIndex(lanePosition), index };
      endpointLaneByEdge.set(
        item.edgeId,
        item.role === 'source' ? { ...current, source: assignment } : { ...current, target: assignment },
      );
    });
  });

  const sideUsage = new Map<string, number>();
  ordered.forEach((edge) => {
    const selection = sideSelections.get(edge.id) ?? { sourceSide: 'r' as const, targetSide: 'l' as const };
    const endpointLane = endpointLaneByEdge.get(edge.id);
    const sourceLane = endpointLane?.source?.lane ?? 'p3';
    const targetLane = endpointLane?.target?.lane ?? 'p3';
    const lane = {
      sourceSide: selection.sourceSide,
      targetSide: selection.targetSide,
      sourceLane,
      targetLane,
      laneIndex: Math.max(endpointLane?.source?.index ?? 0, endpointLane?.target?.index ?? 0),
    };
    laneAssignments.set(edge.id, lane);
    const sourceKey = `${edge.sourceRoot}:${lane.sourceSide}`;
    const targetKey = `${edge.targetRoot}:${lane.targetSide}`;
    sideUsage.set(sourceKey, (sideUsage.get(sourceKey) ?? 0) + 1);
    sideUsage.set(targetKey, (sideUsage.get(targetKey) ?? 0) + 1);
  });

  return { ordered, laneAssignments, sideUsage };
}

export function buildReactFlowEdges(
  graph: NormalizedGraph,
  measuredGraphNodes: NodeInstance[],
  doc: DiagrCoreDocument,
  theme: DiagrThemeTokens,
  rects: Map<string, Rect>,
  rootOf: (instanceId: string) => string,
): Edge[] {
  const bottomClearanceByRoot = buildBottomClearanceByRoot(measuredGraphNodes);
  const rootPairState = buildRootPairState(graph, rootOf);

  const directionalEdgeDefs: RenderedEdgeDef[] = [...rootPairState.values()].flatMap((pair, index) => {
    const defs: RenderedEdgeDef[] = [];
    if (pair.leftToRight) {
      defs.push({
        id: `root-edge-${index}-${pair.left}-to-${pair.right}`,
        sourceRoot: pair.left,
        targetRoot: pair.right,
        label: pair.leftToRightLabel,
        pairKey: pairKeyOf(pair.left, pair.right),
      });
    }
    if (pair.rightToLeft) {
      defs.push({
        id: `root-edge-${index}-${pair.right}-to-${pair.left}`,
        sourceRoot: pair.right,
        targetRoot: pair.left,
        label: pair.rightToLeftLabel,
        pairKey: pairKeyOf(pair.left, pair.right),
      });
    }
    return defs;
  });

  const preArtifacts = computeLaneArtifacts(
    directionalEdgeDefs,
    rects,
    doc.layout?.direction ?? 'LR',
    bottomClearanceByRoot,
  );
  const directionalByPair = new Map<string, RenderedEdgeDef[]>();
  preArtifacts.ordered.forEach((edge) => {
    directionalByPair.set(edge.pairKey, [...(directionalByPair.get(edge.pairKey) ?? []), edge]);
  });

  const crowdedBidirectionalPairs = new Set<string>();
  directionalByPair.forEach((pairEdges, pairKey) => {
    if (pairEdges.length < 2) {
      return;
    }

    const pairIds = new Set(pairEdges.map((edge) => edge.id));
    const pairSideKeys = new Set<string>();
    pairEdges.forEach((edge) => {
      const lane = preArtifacts.laneAssignments.get(edge.id);
      if (!lane) {
        return;
      }
      pairSideKeys.add(`${edge.sourceRoot}:${lane.sourceSide}`);
      pairSideKeys.add(`${edge.targetRoot}:${lane.targetSide}`);
    });

    const hasNonPairConflict = preArtifacts.ordered.some((edge) => {
      if (pairIds.has(edge.id)) {
        return false;
      }
      const lane = preArtifacts.laneAssignments.get(edge.id);
      if (!lane) {
        return false;
      }
      return pairSideKeys.has(`${edge.sourceRoot}:${lane.sourceSide}`) || pairSideKeys.has(`${edge.targetRoot}:${lane.targetSide}`);
    });
    if (hasNonPairConflict) {
      crowdedBidirectionalPairs.add(pairKey);
    }
  });

  const renderedEdgeDefs: RenderedEdgeDef[] = [...rootPairState.values()].flatMap((pair, index) => {
    const pairKey = pairKeyOf(pair.left, pair.right);
    const defs: RenderedEdgeDef[] = [];
    const isBidirectional = pair.leftToRight && pair.rightToLeft;
    if (isBidirectional && crowdedBidirectionalPairs.has(pairKey)) {
      defs.push({
        id: `root-edge-${index}-${pair.left}<->${pair.right}`,
        sourceRoot: pair.left,
        targetRoot: pair.right,
        label: pair.leftToRightLabel ?? pair.rightToLeftLabel,
        color: pair.leftToRightColor ?? pair.rightToLeftColor,
        strokeType: pair.leftToRightStrokeType ?? pair.rightToLeftStrokeType,
        pairKey,
        bidirectional: true,
      });
      return defs;
    }

    if (pair.leftToRight) {
      defs.push({
        id: `root-edge-${index}-${pair.left}-to-${pair.right}`,
        sourceRoot: pair.left,
        targetRoot: pair.right,
        label: pair.leftToRightLabel,
        color: pair.leftToRightColor,
        strokeType: pair.leftToRightStrokeType,
        pairKey,
      });
    }
    if (pair.rightToLeft) {
      defs.push({
        id: `root-edge-${index}-${pair.right}-to-${pair.left}`,
        sourceRoot: pair.right,
        targetRoot: pair.left,
        label: pair.rightToLeftLabel,
        color: pair.rightToLeftColor,
        strokeType: pair.rightToLeftStrokeType,
        pairKey,
      });
    }
    return defs;
  });

  const artifacts = computeLaneArtifacts(
    renderedEdgeDefs,
    rects,
    doc.layout?.direction ?? 'LR',
    bottomClearanceByRoot,
  );
  const renderedDefsOrdered = artifacts.ordered;
  const laneAssignments = artifacts.laneAssignments;

  return renderedDefsOrdered.map((edge) => {
    const lane = laneAssignments.get(edge.id) ?? {
      sourceSide: 'r',
      targetSide: 'l',
      sourceLane: 'p3',
      targetLane: 'p3',
      laneIndex: 0,
    };
    const sourceHandle = laneHandle(lane.sourceSide, lane.sourceLane, 'source');
    const targetHandle = laneHandle(lane.targetSide, lane.targetLane, 'target');
    const labelText = edge.label;
    const strokeColor = edge.color ?? theme.edgeColor;
    const strokeDasharray =
      edge.strokeType === 'dash' ? '7 5' : edge.strokeType === 'dot' ? '2 6' : undefined;
    const laneDelta = laneIndex(lane.sourceLane) - 2;
    const laneSign = laneDelta < 0 ? -1 : laneDelta > 0 ? 1 : 0;
    const laneMagnitude = laneDelta === 0 ? 0 : 7 + Math.abs(laneDelta) * 5 + Math.min(4, lane.laneIndex) * 2;
    const isVerticalConnection =
      (lane.sourceSide === 't' || lane.sourceSide === 'b') && (lane.targetSide === 't' || lane.targetSide === 'b');
    const laneOffsetBase = isVerticalConnection ? 14 : 24;
    const laneOffsetStep = isVerticalConnection ? 8 : 14;
    const laneOffset = laneOffsetBase + Math.min(5, lane.laneIndex) * laneOffsetStep;
    const labelYOffset = -(12 + laneMagnitude + (laneSign === 1 ? 4 : 0));
    const sourceBottomClearance =
      lane.sourceSide === 'b' ? (bottomClearanceByRoot.get(edge.sourceRoot) ?? 0) : 0;
    const targetBottomClearance =
      lane.targetSide === 'b' ? (bottomClearanceByRoot.get(edge.targetRoot) ?? 0) : 0;

    return {
      id: edge.id,
      source: edge.sourceRoot,
      target: edge.targetRoot,
      sourceHandle,
      targetHandle,
      type: 'diagrSmoothStep',
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: strokeColor,
        width: 18,
        height: 18,
      },
      markerStart: edge.bidirectional
        ? {
            type: MarkerType.ArrowClosed,
            color: strokeColor,
            width: 18,
            height: 18,
          }
        : undefined,
      animated: false,
      style: {
        stroke: strokeColor,
        strokeWidth: 2,
        strokeDasharray,
        strokeLinecap: edge.strokeType === 'dot' ? 'round' : 'butt',
      },
      data: {
        sourceBottomClearancePx: sourceBottomClearance > 0 ? sourceBottomClearance : undefined,
        targetBottomClearancePx: targetBottomClearance > 0 ? targetBottomClearance : undefined,
        sourceSide: lane.sourceSide,
        targetSide: lane.targetSide,
        lane: lane.sourceLane,
      },
      pathOptions: {
        borderRadius: 8,
        offset: laneOffset,
      },
      label: labelText,
      labelShowBg: true,
      labelStyle: {
        fontSize: 12,
        fontWeight: 600,
      },
      labelBgStyle: {
        fill: theme.canvasBg,
        fillOpacity: 0.95,
      },
      labelY: labelYOffset,
      labelBgPadding: [6, 3],
      labelBgBorderRadius: 6,
      zIndex: 10,
      interactionWidth: 8,
      selectable: false,
    };
  });
}
