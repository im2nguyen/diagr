import { DiagrDiagnostic, NodeInstance, NodeSpec } from '@/lib/diagr/types';

type ExpansionResult = {
  instances: NodeInstance[];
  instanceById: Map<string, NodeInstance>;
  definitionIds: Set<string>;
  definitionRefs: Map<string, string[]>;
  mountedByDefinition: Map<string, string[]>;
  diagnostics: DiagrDiagnostic[];
};

export function getCompositionIds(node: NodeSpec): string[] {
  if (Array.isArray(node.ids)) {
    return node.ids.filter((id): id is string => typeof id === 'string' && id.length > 0);
  }

  const dataIds = (node.data as { ids?: unknown } | undefined)?.ids;
  if (Array.isArray(dataIds)) {
    return dataIds.filter((id): id is string => typeof id === 'string' && id.length > 0);
  }

  return [];
}

function getContainerChildCount(node: NodeSpec): number {
  const refs = getCompositionIds(node);
  if (refs.length > 0) {
    return refs.length;
  }
  return node.nodes?.length ?? 0;
}

export function expandNodeInstances(definitions: NodeSpec[]): ExpansionResult {
  const diagnostics: DiagrDiagnostic[] = [];
  const definitionById = new Map(definitions.map((node) => [node.id, node]));
  const definitionIds = new Set(definitionById.keys());
  const mountedByDefinition = new Map<string, string[]>();
  const instances: NodeInstance[] = [];
  const instanceById = new Map<string, NodeInstance>();
  const definitionRefs = new Map<string, string[]>();
  const referencedDefs = new Set<string>();
  let counter = 0;

  definitionById.forEach((node, id) => {
    const refs = getCompositionIds(node);
    definitionRefs.set(id, refs);
    refs.forEach((ref) => referencedDefs.add(ref));
  });

  const roots = definitions.filter((node) => !referencedDefs.has(node.id)).map((node) => node.id);

  if (roots.length === 0 && definitions.length > 0) {
    diagnostics.push({
      code: 'SCHEMA_ERROR',
      severity: 'error',
      message: 'document: no root nodes available after ids composition.',
      line: 1,
      column: 1,
    });
  }

  const mountDefinition = (defId: string, parentInstanceId?: string, stack: string[] = []): void => {
    const def = definitionById.get(defId);
    if (!def) {
      diagnostics.push({
        code: 'SCHEMA_ERROR',
        severity: 'error',
        message: `document: ids references unknown node "${defId}".`,
        line: 1,
        column: 1,
      });
      return;
    }

    if (stack.includes(defId)) {
      diagnostics.push({
        code: 'SCHEMA_ERROR',
        severity: 'error',
        message: `document: composition cycle detected (${[...stack, defId].join(' -> ')}).`,
        line: 1,
        column: 1,
      });
      return;
    }

    const instanceId = `${defId}__${counter++}`;
    const refs = getCompositionIds(def);
    const inlineChildren = def.nodes ?? [];
    const isContainer = getContainerChildCount(def) > 0 || def.renderer === 'groupCard';

    const instance: NodeInstance = {
      instanceId,
      defId: def.id,
      id: def.id,
      renderer: def.renderer,
      label: def.label,
      width: def.width,
      height: def.height,
      data: def.data,
      parentInstanceId,
      isContainer,
    };

    instances.push(instance);
    instanceById.set(instanceId, instance);
    mountedByDefinition.set(def.id, [...(mountedByDefinition.get(def.id) ?? []), instanceId]);

    const nextStack = [...stack, defId];

    if (refs.length > 0) {
      refs.forEach((refId) => mountDefinition(refId, instanceId, nextStack));
      return;
    }

    inlineChildren.forEach((inlineNode) => mountInline(inlineNode, instanceId, nextStack));
  };

  const mountInline = (node: NodeSpec, parentInstanceId?: string, stack: string[] = []): void => {
    const instanceId = `${node.id}__inline__${counter++}`;
    const refs = getCompositionIds(node);
    const inlineChildren = node.nodes ?? [];
    const isContainer = getContainerChildCount(node) > 0 || node.renderer === 'groupCard';

    const instance: NodeInstance = {
      instanceId,
      defId: node.id,
      id: node.id,
      renderer: node.renderer,
      label: node.label,
      width: node.width,
      height: node.height,
      data: node.data,
      parentInstanceId,
      isContainer,
    };

    instances.push(instance);
    instanceById.set(instanceId, instance);
    mountedByDefinition.set(node.id, [...(mountedByDefinition.get(node.id) ?? []), instanceId]);

    if (refs.length > 0) {
      refs.forEach((refId) => mountDefinition(refId, instanceId, stack));
      return;
    }

    inlineChildren.forEach((child) => mountInline(child, instanceId, stack));
  };

  roots.forEach((id) => mountDefinition(id));

  return {
    instances,
    instanceById,
    definitionIds,
    definitionRefs,
    mountedByDefinition,
    diagnostics,
  };
}
