import { Node } from 'reactflow';
import { DiagrCoreDocument, NodeInstance } from '@/lib/diagr/types';
import { DiagrThemeTokens } from '@/lib/diagr/types';
import { CAPTION_GAP, TITLE_GAP, TITLE_HEIGHT, Rect } from '@/lib/diagr/diagram-engine/adapter/types';

function orderInstancesByDepth(nodes: NodeInstance[], instanceById: Map<string, NodeInstance>): NodeInstance[] {
  const depthCache = new Map<string, number>();
  const depthOf = (instance: NodeInstance): number => {
    const cached = depthCache.get(instance.instanceId);
    if (typeof cached === 'number') {
      return cached;
    }
    if (!instance.parentInstanceId) {
      depthCache.set(instance.instanceId, 0);
      return 0;
    }
    const parent = instanceById.get(instance.parentInstanceId);
    if (!parent) {
      depthCache.set(instance.instanceId, 0);
      return 0;
    }
    const depth = depthOf(parent) + 1;
    depthCache.set(instance.instanceId, depth);
    return depth;
  };

  return [...nodes].sort((a, b) => depthOf(a) - depthOf(b));
}

export function buildReactFlowNodes(
  measuredGraphNodes: NodeInstance[],
  doc: DiagrCoreDocument,
  theme: DiagrThemeTokens,
  rects: Map<string, Rect>,
  localPositions: Map<string, { x: number; y: number }>,
  instanceById: Map<string, NodeInstance>,
): Node[] {
  const childrenByParent = new Map<string, string[]>();
  measuredGraphNodes.forEach((node) => {
    if (!node.parentInstanceId) {
      return;
    }
    childrenByParent.set(node.parentInstanceId, [...(childrenByParent.get(node.parentInstanceId) ?? []), node.instanceId]);
  });

  const orderedInstances = orderInstancesByDepth(measuredGraphNodes, instanceById);

  return orderedInstances.map((instance) => {
    const rect = rects.get(instance.instanceId) ?? { x: 0, y: 0, width: 280, height: 120 };
    const parentRect = instance.parentInstanceId ? rects.get(instance.parentInstanceId) : undefined;
    const explicitLocal = localPositions.get(instance.instanceId);
    const localPosition = explicitLocal
      ? { x: Math.round(explicitLocal.x), y: Math.round(explicitLocal.y) }
      : parentRect
      ? { x: Math.round(rect.x - parentRect.x), y: Math.round(rect.y - parentRect.y) }
      : { x: Math.round(rect.x), y: Math.round(rect.y) };

    const isContainer =
      instance.renderer === 'groupCard' ||
      instance.isContainer ||
      (childrenByParent.get(instance.instanceId)?.length ?? 0) > 0;
    const nodeType = isContainer ? 'groupCard' : 'diagrNode';
    const baseRenderer = instance.renderer || (isContainer ? 'groupCard' : 'default');
    const parentInstance = instance.parentInstanceId ? instanceById.get(instance.parentInstanceId) : undefined;
    const inGroupCard = parentInstance?.renderer === 'groupCard';
    const basePayload = instance.data && typeof instance.data === 'object' ? instance.data : {};

    return {
      id: instance.instanceId,
      type: nodeType,
      className: isContainer
        ? 'diagr-node diagr-node-group-card'
        : `diagr-node diagr-node-${baseRenderer}${inGroupCard ? ' diagr-in-group-card' : ''}`,
      data: {
        label: typeof instance.label === 'string' ? instance.label : '',
        subtitle: instance.renderer,
        renderer: baseRenderer,
        payload: {
          ...basePayload,
          __diagramTheme: typeof doc.theme === 'string' ? doc.theme : 'light',
        },
      },
      parentNode: instance.parentInstanceId,
      extent: instance.parentInstanceId ? 'parent' : undefined,
      position: localPosition,
      style: isContainer
        ? {
            width: rect.width,
            height: rect.height,
            borderRadius: theme.radius,
            border: `1px solid ${theme.panelBorder}`,
            background: theme.panelBg,
            boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)',
            overflow: 'hidden',
          }
        : {
            width: rect.width,
            height: rect.height,
            borderRadius: 14,
            border: 'none',
            background: 'transparent',
            color: theme.textPrimary,
            boxShadow: 'none',
          },
      draggable: false,
      selectable: false,
    };
  });
}

export function buildCaptionNodes(measuredGraphNodes: NodeInstance[], rects: Map<string, Rect>): Node[] {
  return measuredGraphNodes
    .filter((node) => node.isContainer && typeof (node.data as { caption?: unknown } | undefined)?.caption === 'string')
    .map((node) => {
      const caption = String((node.data as { caption?: string } | undefined)?.caption ?? '');
      const rect = rects.get(node.instanceId) ?? { x: 0, y: 0, width: 300, height: 200 };
      return {
        id: `${node.instanceId}__caption`,
        type: 'groupCaption',
        data: { label: caption },
        position: { x: rect.x, y: rect.y + rect.height + CAPTION_GAP },
        style: {
          width: rect.width,
          background: 'transparent',
          border: 'none',
          pointerEvents: 'none',
        },
        draggable: false,
        selectable: false,
      };
    });
}

export function buildTitleNode(doc: DiagrCoreDocument, measuredGraphNodes: NodeInstance[], rects: Map<string, Rect>): Node[] {
  const titleText = typeof doc.title === 'string' ? doc.title.trim() : '';
  if (titleText.length === 0) {
    return [];
  }

  const rootRects = measuredGraphNodes
    .filter((node) => !node.parentInstanceId)
    .map((node) => rects.get(node.instanceId))
    .filter((rect): rect is Rect => Boolean(rect));

  if (rootRects.length === 0) {
    return [];
  }

  const minX = Math.min(...rootRects.map((rect) => rect.x));
  const minY = Math.min(...rootRects.map((rect) => rect.y));
  const maxX = Math.max(...rootRects.map((rect) => rect.x + rect.width));
  const diagramWidth = Math.max(220, Math.round(maxX - minX));
  const titleX = Math.round(minX);
  const titleY = Math.round(minY - TITLE_HEIGHT - TITLE_GAP);

  return [
    {
      id: '__diagram_title__',
      type: 'diagramTitle',
      data: { label: titleText },
      position: { x: titleX, y: titleY },
      style: {
        width: diagramWidth,
        height: TITLE_HEIGHT,
        background: 'transparent',
        border: 'none',
        pointerEvents: 'none',
      },
      draggable: false,
      selectable: false,
    },
  ];
}
