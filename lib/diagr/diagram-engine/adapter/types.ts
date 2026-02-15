export const HEADER_HEIGHT = 56;
export const CAPTION_GAP = 22;
export const CAPTION_HEIGHT = 18;
export const CAPTION_EDGE_CLEARANCE_PAD = 8;
export const TITLE_GAP = 18;
export const TITLE_HEIGHT = 32;
export const HEADER_CONTENT_OFFSET = Math.round(HEADER_HEIGHT * 0.75);
export const GROUPCARD_MIN_WIDTH = 220;
export const GROUPCARD_MIN_HEIGHT = HEADER_HEIGHT + 24;
export const NESTED_ITEM_GAP_X = 12;
export const NESTED_ITEM_GAP_Y = 12;

export type Rect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type NodeSide = 'l' | 'r' | 't' | 'b';
export type Lane = 'p1' | 'p2' | 'p3' | 'p4' | 'p5';

export type LaneAssignment = {
  sourceSide: NodeSide;
  targetSide: NodeSide;
  sourceLane: Lane;
  targetLane: Lane;
  laneIndex: number;
};

export type SideSelection = {
  sourceSide: NodeSide;
  targetSide: NodeSide;
};

export type RenderedEdgeDef = {
  id: string;
  sourceRoot: string;
  targetRoot: string;
  label?: string;
  color?: string;
  strokeType?: 'solid' | 'dot' | 'dash';
  pairKey: string;
  bidirectional?: boolean;
};
