import { z } from 'zod';
import { DiagrCoreDocument, DiagrDiagnostic, NodeSpec } from '@/lib/diagr/types';

const nodeSchema: z.ZodType<NodeSpec> = z.lazy(() =>
  z.object({
    id: z.string().min(1),
    renderer: z.string().optional(),
    label: z.string().optional(),
    width: z.number().positive().optional(),
    height: z.number().positive().optional(),
    ids: z.array(z.string().min(1)).optional(),
    nodes: z.array(nodeSchema).optional(),
    data: z.record(z.unknown()).optional(),
  }),
);

const layoutSchema = z
  .object({
    direction: z.enum(['LR', 'TB', 'RL', 'BT']).optional(),
    xGap: z.number().positive().optional(),
    yGap: z.number().positive().optional(),
    overrides: z.record(z.object({ x: z.number(), y: z.number() })).optional(),
  })
  .optional();

const rawDocSchema = z
  .object({
    title: z.string().optional(),
    filename: z.string().min(1).optional(),
    theme: z.string().optional(),
    nodes: z.array(nodeSchema).optional(),
    layout: layoutSchema,
    edges: z.string().min(1).optional(),
    groups: z.unknown().optional(),
  })
  .passthrough();

function diagnosticFromIssue(issue: z.ZodIssue): DiagrDiagnostic {
  return {
    code: 'SCHEMA_ERROR',
    severity: 'error',
    message: `${issue.path.join('.') || 'document'}: ${issue.message}`,
    line: 1,
    column: 1,
  };
}

function getCompositionIds(node: NodeSpec): string[] {
  if (Array.isArray(node.ids)) {
    return node.ids.filter((id): id is string => typeof id === 'string');
  }

  const dataIds = (node.data as { ids?: unknown } | undefined)?.ids;
  if (Array.isArray(dataIds)) {
    return dataIds.filter((id): id is string => typeof id === 'string');
  }

  return [];
}

function collectNodes(nodes: NodeSpec[], out: NodeSpec[] = []): NodeSpec[] {
  nodes.forEach((node) => {
    out.push(node);
    if (node.nodes?.length) {
      collectNodes(node.nodes, out);
    }
  });
  return out;
}

function findCycle(definitions: NodeSpec[]): string[] | null {
  const byId = new Map(definitions.map((node) => [node.id, node]));
  const state = new Map<string, 0 | 1 | 2>();
  const stack: string[] = [];

  const dfs = (id: string): string[] | null => {
    const visitState = state.get(id) ?? 0;
    if (visitState === 1) {
      const at = stack.indexOf(id);
      return at >= 0 ? stack.slice(at).concat(id) : [id, id];
    }
    if (visitState === 2) {
      return null;
    }

    state.set(id, 1);
    stack.push(id);

    const node = byId.get(id);
    const refs = node ? getCompositionIds(node) : [];
    for (const ref of refs) {
      if (!byId.has(ref)) {
        continue;
      }
      const cycle = dfs(ref);
      if (cycle) {
        return cycle;
      }
    }

    stack.pop();
    state.set(id, 2);
    return null;
  };

  for (const node of definitions) {
    if ((state.get(node.id) ?? 0) === 0) {
      const cycle = dfs(node.id);
      if (cycle) {
        return cycle;
      }
    }
  }

  return null;
}

export function validateDocument(input: unknown):
  | { ok: true; doc: DiagrCoreDocument }
  | { ok: false; diagnostics: DiagrDiagnostic[] } {
  const result = rawDocSchema.safeParse(input);

  if (!result.success) {
    return {
      ok: false,
      diagnostics: result.error.issues.map(diagnosticFromIssue),
    };
  }

  const diagnostics: DiagrDiagnostic[] = [];
  const doc = result.data;
  const edgesBlock = doc.edges;

  if (!edgesBlock) {
    diagnostics.push({
      code: 'SCHEMA_ERROR',
      severity: 'error',
      message: 'document: edges is required.',
      line: 1,
      column: 1,
    });
  }

  if ('groups' in doc && doc.groups !== undefined) {
    diagnostics.push({
      code: 'SCHEMA_ERROR',
      severity: 'error',
      message: 'document: top-level groups is unsupported; use nodes with renderer "groupCard".',
      line: 1,
      column: 1,
    });
  }

  const topLevelNodes = doc.nodes ?? [];
  if (topLevelNodes.length === 0) {
    diagnostics.push({
      code: 'SCHEMA_ERROR',
      severity: 'error',
      message: 'document: At least one top-level node definition must exist.',
      line: 1,
      column: 1,
    });
  }

  const topLevelById = new Map<string, NodeSpec>();
  topLevelNodes.forEach((node) => {
    if (topLevelById.has(node.id)) {
      diagnostics.push({
        code: 'NODE_ID_DUPLICATE',
        severity: 'error',
        message: `Duplicate top-level node id: ${node.id}`,
        line: 1,
        column: 1,
      });
      return;
    }
    topLevelById.set(node.id, node);
  });

  const allNodes = collectNodes(topLevelNodes);
  const seen = new Set<string>();
  allNodes.forEach((node) => {
    if (seen.has(node.id)) {
      diagnostics.push({
        code: 'NODE_ID_DUPLICATE',
        severity: 'error',
        message: `Duplicate node id: ${node.id}`,
        line: 1,
        column: 1,
      });
    }
    seen.add(node.id);

    const refs = getCompositionIds(node);
    if (node.nodes?.length && refs.length > 0) {
      diagnostics.push({
        code: 'SCHEMA_ERROR',
        severity: 'error',
        message: `node ${node.id}: nodes and ids cannot be used together.`,
        line: 1,
        column: 1,
      });
    }

    refs.forEach((ref) => {
      if (!topLevelById.has(ref)) {
        diagnostics.push({
          code: 'SCHEMA_ERROR',
          severity: 'error',
          message: `node ${node.id}: ids references unknown top-level node "${ref}".`,
          line: 1,
          column: 1,
        });
      }
    });
  });

  const cycle = findCycle(topLevelNodes);
  if (cycle) {
    diagnostics.push({
      code: 'SCHEMA_ERROR',
      severity: 'error',
      message: `document: composition cycle detected (${cycle.join(' -> ')}).`,
      line: 1,
      column: 1,
    });
  }

  if (diagnostics.length > 0) {
    return { ok: false, diagnostics };
  }

  return {
    ok: true,
    doc: {
      title: doc.title,
      filename: doc.filename,
      theme: doc.theme,
      nodes: topLevelNodes,
      layout: doc.layout,
      edges: edgesBlock ?? '',
    },
  };
}
