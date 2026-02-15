import { DiagrDiagnostic, NormalizedEdge } from '@/lib/diagr/types';

function diag(message: string, line: number, column = 1): DiagrDiagnostic {
  return {
    code: 'EDGE_PARSE_ERROR',
    severity: 'error',
    message,
    line,
    column,
  };
}

function tokenizeChain(text: string): { nodes: string[]; arrows: string[] } {
  const parts = text.split(/\s+(-->|<-->)\s+/g).filter(Boolean);
  const nodes: string[] = [];
  const arrows: string[] = [];

  for (let i = 0; i < parts.length; i += 1) {
    if (i % 2 === 0) {
      nodes.push(parts[i].trim());
    } else {
      arrows.push(parts[i].trim());
    }
  }

  return { nodes, arrows };
}

type EdgeAttrs = {
  label?: string;
  color?: string;
  strokeType?: 'solid' | 'dot' | 'dash';
};

function unquote(value: string): string {
  const trimmed = value.trim();
  if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
    return trimmed.slice(1, -1).replace(/\\"/g, '"').replace(/\\\\/g, '\\');
  }
  return trimmed;
}

function parseAttrs(attrBody: string, lineNo: number): { attrs: EdgeAttrs; diagnostics: DiagrDiagnostic[] } {
  const diagnostics: DiagrDiagnostic[] = [];
  const attrs: EdgeAttrs = {};
  const pattern = /([a-zA-Z_][a-zA-Z0-9_-]*)\s*=\s*("(?:[^"\\]|\\.)*"|[^,\]]+)/g;
  const segments = attrBody
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);

  segments.forEach((segment) => {
    pattern.lastIndex = 0;
    const match = pattern.exec(segment);
    if (!match || match.index !== 0 || pattern.lastIndex !== segment.length) {
      diagnostics.push(diag(`Invalid edge attribute syntax: ${segment}`, lineNo));
      return;
    }

    const key = match[1];
    const rawValue = match[2];
    const value = unquote(rawValue);

    if (key === 'label') {
      attrs.label = value;
      return;
    }
    if (key === 'color') {
      attrs.color = value;
      return;
    }
    if (key === 'type') {
      if (value === 'solid' || value === 'dot' || value === 'dash') {
        attrs.strokeType = value;
      } else {
        diagnostics.push(diag(`Unsupported edge type "${value}". Use solid, dot, or dash.`, lineNo));
      }
      return;
    }

    diagnostics.push(diag(`Unsupported edge attribute key "${key}". Supported keys: label, color, type.`, lineNo));
  });

  return { attrs, diagnostics };
}

export function parseEdgesBlock(edgesBlock: string): { edges: NormalizedEdge[]; diagnostics: DiagrDiagnostic[] } {
  const diagnostics: DiagrDiagnostic[] = [];
  const edges: NormalizedEdge[] = [];
  const lines = edgesBlock.split('\n');

  lines.forEach((rawLine, index) => {
    const line = rawLine.trim();
    const lineNo = index + 1;

    if (!line || line.startsWith('#')) {
      return;
    }

    if (/\(\s*"[^"]*"\s*\)\s*$/.test(line)) {
      diagnostics.push(diag('Legacy edge label syntax is unsupported. Use [label="..."] attributes.', lineNo));
      return;
    }

    const attrMatch = line.match(/\[([^\]]*)\]\s*$/);
    const parseLine = attrMatch ? line.slice(0, attrMatch.index).trim() : line;
    const parsedAttrs = attrMatch ? parseAttrs(attrMatch[1], lineNo) : { attrs: {}, diagnostics: [] };
    diagnostics.push(...parsedAttrs.diagnostics);

    if (!parseLine.includes('-->') && !parseLine.includes('<-->')) {
      diagnostics.push(diag('Edge line must include --> or <-->', lineNo));
      return;
    }

    const { nodes, arrows } = tokenizeChain(parseLine);

    if (nodes.length < 2) {
      diagnostics.push(diag('Edge connection requires at least two nodes', lineNo));
      return;
    }

    for (let i = 0; i < arrows.length; i += 1) {
      const source = nodes[i];
      const target = nodes[i + 1];

      if (!source || !target) {
        diagnostics.push(diag('Malformed edge chain', lineNo));
        return;
      }

      const edgeId = `${source}-${target}-${lineNo}-${i}`;
      const bidirectional = arrows[i] === '<-->';
      edges.push({
        id: edgeId,
        source,
        target,
        bidirectional,
        label: parsedAttrs.attrs.label,
        color: parsedAttrs.attrs.color,
        strokeType: parsedAttrs.attrs.strokeType,
      });

      if (bidirectional) {
        edges.push({
          id: `${target}-${source}-${lineNo}-${i}`,
          source: target,
          target: source,
          bidirectional,
          label: parsedAttrs.attrs.label,
          color: parsedAttrs.attrs.color,
          strokeType: parsedAttrs.attrs.strokeType,
        });
      }
    }
  });

  return { edges, diagnostics };
}
