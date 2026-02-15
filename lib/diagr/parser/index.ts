import { parseYamlDocument } from '@/lib/diagr/parser/yaml';
import { getGraphDiagnostics } from '@/lib/diagr/transform/graph';
import { validateDocument } from '@/lib/diagr/validate/schema';
import { ParseResult } from '@/lib/diagr/types';

export function parseDiagrDocument(source: string): ParseResult {
  const yamlResult = parseYamlDocument(source);

  if (!yamlResult.ok) {
    return {
      ok: false,
      diagnostics: yamlResult.diagnostics,
    };
  }

  const validation = validateDocument(yamlResult.doc);

  if (!validation.ok) {
    return {
      ok: false,
      diagnostics: validation.diagnostics,
    };
  }

  const combinedDiagnostics = getGraphDiagnostics(validation.doc);

  if (combinedDiagnostics.length > 0) {
    return {
      ok: false,
      diagnostics: combinedDiagnostics,
    };
  }

  return {
    ok: true,
    doc: {
      ...validation.doc,
      nodes: validation.doc.nodes ?? [],
      edges: validation.doc.edges,
    },
    diagnostics: [],
  };
}
