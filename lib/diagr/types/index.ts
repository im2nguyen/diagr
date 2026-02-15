export type Direction = 'LR' | 'TB' | 'RL' | 'BT';

export type DiagrThemeTokens = {
  canvasBg: string;
  gridDot: string;
  panelBg: string;
  panelBorder: string;
  headerBg: string;
  textPrimary: string;
  textMuted: string;
  edgeColor: string;
  accent: string;
  radius: number;
  groupContentPaddingX: number;
  groupContentPaddingTop: number;
  groupContentPaddingBottom: number;
};

export type DiagrRenderDefaults = {
  autoLayout: true;
  autoFit: true;
  autoTheme: true;
  direction: Direction;
  xGap: number;
  yGap: number;
};

export type NodeSpec = {
  id: string;
  renderer?: string;
  label?: string;
  parentId?: string;
  width?: number;
  height?: number;
  ids?: string[];
  nodes?: NodeSpec[];
  data?: Record<string, unknown>;
};

export type NodeInstance = Omit<NodeSpec, 'nodes' | 'ids' | 'parentId'> & {
  instanceId: string;
  defId: string;
  parentInstanceId?: string;
  isContainer: boolean;
};

export type DiagrCoreDocument = {
  title?: string;
  filename?: string;
  theme?: string;
  nodes?: NodeSpec[];
  layout?: Partial<DiagrRenderDefaults> & {
    overrides?: Record<string, { x: number; y: number }>;
  };
  edges: string;
};

export type DiagrDiagnostic = {
  code: string;
  severity: 'error' | 'warning';
  message: string;
  line: number;
  column: number;
  suggestion?: string;
};

export type ParseResult =
  | {
      ok: true;
      doc: DiagrCoreDocument;
      diagnostics: [];
    }
  | {
      ok: false;
      diagnostics: DiagrDiagnostic[];
    };

export type NormalizedEdge = {
  id: string;
  source: string;
  target: string;
  bidirectional?: boolean;
  label?: string;
  color?: string;
  strokeType?: 'solid' | 'dot' | 'dash';
};

export type NormalizedGraph = {
  nodes: NodeInstance[];
  edges: NormalizedEdge[];
};

export type ExportRequest = {
  source: string;
  format: 'png' | 'svg';
  scale?: number;
  background?: string;
};

export type PluginContext = {
  registerNodeType: (name: string, component: unknown) => void;
  registerEdgeType: (name: string, component: unknown) => void;
  registerGroupType: (name: string, component: unknown) => void;
  extendSchema: (fragment: unknown) => void;
  registerLayoutHook: (hook: (graph: NormalizedGraph) => NormalizedGraph) => void;
};

export type DiagrPlugin = {
  id: string;
  version: string;
  register: (ctx: PluginContext) => void;
};
