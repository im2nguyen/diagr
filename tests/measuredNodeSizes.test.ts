import { describe, expect, it } from 'vitest';
import { hasMaterialSizeChanges } from '@/app/hooks/useMeasuredNodeSizes';

describe('hasMaterialSizeChanges', () => {
  it('returns false when size differences are within tolerance', () => {
    const prev = {
      a: { width: 100, height: 80 },
      b: { width: 220, height: 140 },
    };
    const next = {
      a: { width: 101, height: 80 },
      b: { width: 220, height: 141 },
    };

    expect(hasMaterialSizeChanges(prev, next)).toBe(false);
  });

  it('returns true when size differences exceed tolerance', () => {
    const prev = {
      a: { width: 100, height: 80 },
    };
    const next = {
      a: { width: 103, height: 80 },
    };

    expect(hasMaterialSizeChanges(prev, next)).toBe(true);
  });

  it('returns true when node ids change', () => {
    const prev = {
      a: { width: 100, height: 80 },
    };
    const next = {
      b: { width: 100, height: 80 },
    };

    expect(hasMaterialSizeChanges(prev, next)).toBe(true);
  });
});
