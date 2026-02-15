import { parseEdgesBlock } from '@/lib/diagr/parser/edges';
import { DiagrCoreDocument, DiagrDiagnostic, NormalizedEdge, NormalizedGraph } from '@/lib/diagr/types';
import { expandNodeInstances } from '@/lib/diagr/transform/instances';

function expandDocumentEdges(
  doc: DiagrCoreDocument,
  mountedByDefinition: Map<string, string[]>,
): { edges: NormalizedEdge[]; diagnostics: DiagrDiagnostic[] } {
  const parsed = parseEdgesBlock(doc.edges);
  const diagnostics: DiagrDiagnostic[] = [...parsed.diagnostics];
  const edges: NormalizedEdge[] = [];
  const dedupe = new Set<string>();

  parsed.edges.forEach((edge) => {
    const sourceInstances = mountedByDefinition.get(edge.source) ?? [];
    const targetInstances = mountedByDefinition.get(edge.target) ?? [];

    if (sourceInstances.length === 0 || targetInstances.length === 0) {
      diagnostics.push({
        code: 'EDGE_REFERENCE_ERROR',
        severity: 'error',
        message: `Edges references unmapped node(s): ${edge.source} -> ${edge.target}`,
        line: 1,
        column: 1,
      });
      return;
    }

    sourceInstances.forEach((sourceInstance) => {
      targetInstances.forEach((targetInstance) => {
        const key = `${sourceInstance}->${targetInstance}`;
        if (dedupe.has(key)) {
          return;
        }
        dedupe.add(key);
        edges.push({
          id: `${edge.id}__${sourceInstance}__${targetInstance}`,
          source: sourceInstance,
          target: targetInstance,
          bidirectional: edge.bidirectional,
          label: edge.label,
          color: edge.color,
          strokeType: edge.strokeType,
        });
      });
    });
  });

  return { edges, diagnostics };
}

export function toNormalizedGraph(doc: DiagrCoreDocument): NormalizedGraph {
  const expansion = expandNodeInstances(doc.nodes ?? []);
  const edgeExpansion = expandDocumentEdges(doc, expansion.mountedByDefinition);

  if (expansion.diagnostics.length > 0 || edgeExpansion.diagnostics.length > 0) {
    return {
      nodes: [],
      edges: [],
    };
  }

  return {
    nodes: expansion.instances,
    edges: edgeExpansion.edges,
  };
}

export function getGraphDiagnostics(doc: DiagrCoreDocument): DiagrDiagnostic[] {
  const expansion = expandNodeInstances(doc.nodes ?? []);
  const edgeExpansion = expandDocumentEdges(doc, expansion.mountedByDefinition);
  return [...expansion.diagnostics, ...edgeExpansion.diagnostics];
}
