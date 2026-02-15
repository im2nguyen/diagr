'use client';

import { CSSProperties } from 'react';
import {
  BaseEdge,
  EdgeLabelRenderer,
  EdgeProps,
  EdgeTypes,
  Position,
  getSmoothStepPath,
} from 'reactflow';

type DiagrEdgeData = {
  sourceBottomClearancePx?: number;
  targetBottomClearancePx?: number;
  sourceSide?: 'l' | 'r' | 't' | 'b';
  targetSide?: 'l' | 'r' | 't' | 'b';
  lane?: 'top' | 'middle' | 'bottom';
};

function toPadding(value: unknown, fallback: [number, number]): [number, number] {
  if (!Array.isArray(value) || value.length < 2) {
    return fallback;
  }
  const x = Number(value[0]);
  const y = Number(value[1]);
  if (!Number.isFinite(x) || !Number.isFinite(y)) {
    return fallback;
  }
  return [x, y];
}

export function DiagrSmoothStepEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  markerStart,
  markerEnd,
  style,
  selected,
  data,
  label,
  labelStyle,
  labelShowBg,
  labelBgPadding,
  labelBgBorderRadius,
  labelBgStyle,
  interactionWidth,
  pathOptions,
  ...rest
}: EdgeProps<DiagrEdgeData>) {
  const sourceClearance =
    sourcePosition === Position.Bottom && typeof data?.sourceBottomClearancePx === 'number'
      ? data.sourceBottomClearancePx
      : 0;
  const targetClearance =
    targetPosition === Position.Bottom && typeof data?.targetBottomClearancePx === 'number'
      ? data.targetBottomClearancePx
      : 0;

  const adjustedSourceY = sourceY + sourceClearance;
  const adjustedTargetY = targetY + targetClearance;

  const [path, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY: adjustedSourceY,
    sourcePosition,
    targetX,
    targetY: adjustedTargetY,
    targetPosition,
    borderRadius: pathOptions?.borderRadius ?? 8,
    offset: pathOptions?.offset ?? 24,
  });

  const [bgPadX, bgPadY] = toPadding(labelBgPadding, [6, 3]);
  const labelOffsetY = Number((rest as { labelY?: number }).labelY ?? 0);
  const text = typeof label === 'string' ? label : '';
  const textVisible = text.trim().length > 0;
  const rawBgStyle = (labelBgStyle ?? {}) as CSSProperties & { fill?: string; fillOpacity?: number };
  const chipBackground = rawBgStyle.backgroundColor ?? rawBgStyle.fill ?? 'var(--diagr-canvas-bg)';

  return (
    <>
      <BaseEdge
        id={id}
        path={path}
        markerStart={markerStart}
        markerEnd={markerEnd}
        style={style}
        interactionWidth={interactionWidth}
      />
      {textVisible ? (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY + labelOffsetY}px)`,
              pointerEvents: 'none',
              fontSize: 12,
              fontWeight: 600,
              lineHeight: 1.1,
              color: 'var(--diagr-edge-label-text, var(--diagr-text-primary, #1f2937))',
              whiteSpace: 'nowrap',
              ...(labelStyle as CSSProperties),
              ...(labelShowBg
                ? {
                    padding: `${bgPadY}px ${bgPadX}px`,
                    borderRadius: Number(labelBgBorderRadius ?? 6),
                    backgroundColor: chipBackground,
                  }
                : {}),
              zIndex: 100,
            }}
            className="nodrag nopan"
          >
            {text}
          </div>
        </EdgeLabelRenderer>
      ) : null}
    </>
  );
}

export const edgeTypes: EdgeTypes = {
  diagrSmoothStep: DiagrSmoothStepEdge,
};
