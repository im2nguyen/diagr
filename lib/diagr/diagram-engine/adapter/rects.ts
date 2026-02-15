import { PositionedNode } from '@/lib/diagr/layout/dagre';
import { NodeInstance } from '@/lib/diagr/types';
import {
  GROUPCARD_MIN_HEIGHT,
  GROUPCARD_MIN_WIDTH,
  HEADER_CONTENT_OFFSET,
  NESTED_ITEM_GAP_X,
  NESTED_ITEM_GAP_Y,
  Rect,
} from '@/lib/diagr/diagram-engine/adapter/types';

export function toRect(node: PositionedNode): Rect {
  return { x: node.x, y: node.y, width: node.width, height: node.height };
}

export function minGroupCardWidth(explicitWidth?: number): number {
  if (typeof explicitWidth === 'number') {
    return explicitWidth;
  }
  return GROUPCARD_MIN_WIDTH;
}

export function buildRects(
  positioned: PositionedNode[],
  instancesById: Map<string, NodeInstance>,
  spacing: {
    paddingX: number;
    paddingTop: number;
    paddingBottom: number;
  },
): {
  rects: Map<string, Rect>;
  localPositions: Map<string, { x: number; y: number }>;
} {
  const byId = new Map(positioned.map((node) => [node.id, node]));
  const childMap = new Map<string, string[]>();
  positioned.forEach((node) => {
    if (!node.parentInstanceId) {
      return;
    }
    childMap.set(node.parentInstanceId, [...(childMap.get(node.parentInstanceId) ?? []), node.id]);
  });

  const rects = new Map<string, Rect>();
  const localPositions = new Map<string, { x: number; y: number }>();

  const shiftSubtree = (id: string, dx: number, dy: number): void => {
    const current = rects.get(id);
    if (current) {
      rects.set(id, { ...current, x: current.x + dx, y: current.y + dy });
    }
    const children = childMap.get(id) ?? [];
    children.forEach((childId) => shiftSubtree(childId, dx, dy));
  };

  const resolve = (id: string): Rect => {
    const existing = rects.get(id);
    if (existing) {
      return existing;
    }

    const current = byId.get(id);
    if (!current) {
      const fallback = { x: 0, y: 0, width: 200, height: 120 };
      rects.set(id, fallback);
      return fallback;
    }

    const children = childMap.get(id) ?? [];
    if (children.length === 0 || !current.isContainer) {
      if (current.isContainer) {
        const containerInstance = instancesById.get(id);
        const minWidth =
          containerInstance?.renderer === 'groupCard'
            ? minGroupCardWidth(current.explicitWidth)
            : typeof current.explicitWidth === 'number'
            ? current.explicitWidth
            : GROUPCARD_MIN_WIDTH;
        const minHeight = typeof current.explicitHeight === 'number' ? current.explicitHeight : GROUPCARD_MIN_HEIGHT;
        const rect = {
          x: current.x,
          y: current.y,
          width: Math.max(current.width, minWidth),
          height: Math.max(current.height, minHeight),
        };
        rects.set(id, rect);
        return rect;
      }
      const rect = toRect(current);
      rects.set(id, rect);
      return rect;
    }

    const instance = instancesById.get(id);
    if (instance?.renderer === 'groupCard') {
      const groupBottomPadding = Math.min(spacing.paddingBottom, spacing.paddingTop);
      const childRects = children.map((childId) => resolve(childId));
      const childSpecs = children.map((childId, index) => ({
        id: childId,
        rect: childRects[index],
      }));
      const clampedWidths = childSpecs.map((item) => item.rect.width);
      const minContentWidth = Math.max(0, minGroupCardWidth(current.explicitWidth) - spacing.paddingX * 2);
      const rowMaxWidth = Math.max(...clampedWidths, minContentWidth);
      const rows: Array<{ width: number; height: number; items: Array<{ id: string; width: number; height: number; x: number }> }> = [];
      let currentRow: { width: number; height: number; items: Array<{ id: string; width: number; height: number; x: number }> } = {
        width: 0,
        height: 0,
        items: [],
      };

      childSpecs.forEach((child) => {
        const itemWidth = child.rect.width;
        const itemHeight = child.rect.height;
        const nextWidth = currentRow.items.length === 0 ? itemWidth : currentRow.width + NESTED_ITEM_GAP_X + itemWidth;

        if (currentRow.items.length > 0 && nextWidth > rowMaxWidth) {
          rows.push(currentRow);
          currentRow = { width: 0, height: 0, items: [] };
        }

        const x = currentRow.items.length === 0 ? 0 : currentRow.width + NESTED_ITEM_GAP_X;
        currentRow.items.push({ id: child.id, width: itemWidth, height: itemHeight, x });
        currentRow.width = currentRow.items.length === 1 ? itemWidth : currentRow.width + NESTED_ITEM_GAP_X + itemWidth;
        currentRow.height = Math.max(currentRow.height, itemHeight);
      });

      if (currentRow.items.length > 0) {
        rows.push(currentRow);
      }

      const usedWidth = rows.length > 0 ? Math.max(...rows.map((row) => row.width)) : 0;
      const usedHeight =
        rows.length > 0
          ? rows.reduce((sum, row, rowIndex) => sum + row.height + (rowIndex > 0 ? NESTED_ITEM_GAP_Y : 0), 0)
          : 0;

      const computedWidth = usedWidth + spacing.paddingX * 2;
      const computedHeight = HEADER_CONTENT_OFFSET + spacing.paddingTop + groupBottomPadding + usedHeight;
      const explicitWidth = current.explicitWidth;
      const explicitHeight = current.explicitHeight;
      const minWidth = minGroupCardWidth(explicitWidth);
      const minHeight = typeof explicitHeight === 'number' ? explicitHeight : GROUPCARD_MIN_HEIGHT;
      const rect = {
        x: current.x,
        y: current.y,
        width: Math.max(computedWidth, minWidth),
        height: Math.max(computedHeight, minHeight),
      };

      const contentWidth = Math.max(0, rect.width - spacing.paddingX * 2);
      const contentHeight = Math.max(0, rect.height - HEADER_CONTENT_OFFSET - spacing.paddingTop - groupBottomPadding);
      const verticalOffset = Math.max(0, Math.round((contentHeight - usedHeight) / 2));
      let rowCursorY = HEADER_CONTENT_OFFSET + spacing.paddingTop + verticalOffset;
      rows.forEach((row) => {
        const rowStartX = spacing.paddingX + Math.max(0, Math.round((contentWidth - row.width) / 2));
        row.items.forEach((item) => {
          localPositions.set(item.id, {
            x: rowStartX + item.x,
            y: rowCursorY,
          });
        });
        rowCursorY += row.height + NESTED_ITEM_GAP_Y;
      });

      rects.set(id, rect);
      childSpecs.forEach((child) => {
        const local = localPositions.get(child.id);
        if (!local) {
          return;
        }
        const targetX = rect.x + local.x;
        const targetY = rect.y + local.y;
        const dx = targetX - child.rect.x;
        const dy = targetY - child.rect.y;
        if (dx !== 0 || dy !== 0) {
          shiftSubtree(child.id, dx, dy);
        }
      });
      return rect;
    }

    const childRects = children.map((childId) => resolve(childId));
    const minX = Math.min(...childRects.map((item) => item.x));
    const minY = Math.min(...childRects.map((item) => item.y));
    const maxX = Math.max(...childRects.map((item) => item.x + item.width));
    const maxY = Math.max(...childRects.map((item) => item.y + item.height));

    const computedWidth = maxX - minX + spacing.paddingX * 2;
    const computedHeight = maxY - minY + spacing.paddingTop * 2 + HEADER_CONTENT_OFFSET;
    const explicitWidth = current.explicitWidth;
    const explicitHeight = current.explicitHeight;
    const minWidth = typeof explicitWidth === 'number' ? explicitWidth : GROUPCARD_MIN_WIDTH;
    const minHeight = typeof explicitHeight === 'number' ? explicitHeight : GROUPCARD_MIN_HEIGHT;
    const rect = {
      x: minX - spacing.paddingX,
      y: minY - spacing.paddingTop - HEADER_CONTENT_OFFSET,
      width: Math.max(computedWidth, minWidth),
      height: Math.max(computedHeight, minHeight),
    };

    rects.set(id, rect);
    return rect;
  };

  positioned.forEach((node) => {
    resolve(node.id);
  });

  return { rects, localPositions };
}
