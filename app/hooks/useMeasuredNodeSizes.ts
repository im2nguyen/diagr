'use client';

import { useState } from 'react';

type NodeSizeMap = Record<string, { width: number; height: number }>;
const SIZE_TOLERANCE_PX = 1;

export function hasMaterialSizeChanges(prev: NodeSizeMap, next: NodeSizeMap, tolerance = SIZE_TOLERANCE_PX): boolean {
  const prevKeys = Object.keys(prev);
  const nextKeys = Object.keys(next);
  if (prevKeys.length !== nextKeys.length) {
    return true;
  }

  for (const key of nextKeys) {
    const prevSize = prev[key];
    const nextSize = next[key];
    if (!prevSize || !nextSize) {
      return true;
    }
    const widthDiff = Math.abs(prevSize.width - nextSize.width);
    const heightDiff = Math.abs(prevSize.height - nextSize.height);
    if (widthDiff > tolerance || heightDiff > tolerance) {
      return true;
    }
  }

  return false;
}

export function useMeasuredNodeSizes() {
  const [measuredNodeSizes, setMeasuredNodeSizes] = useState<NodeSizeMap>({});

  const handleMeasureNodeSizes = (next: NodeSizeMap) => {
    setMeasuredNodeSizes((prev) => {
      if (!hasMaterialSizeChanges(prev, next)) {
        return prev;
      }
      return next;
    });
  };

  const resetMeasuredNodeSizes = () => {
    setMeasuredNodeSizes({});
  };

  return {
    measuredNodeSizes,
    handleMeasureNodeSizes,
    resetMeasuredNodeSizes,
  };
}
