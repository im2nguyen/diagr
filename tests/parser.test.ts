import { describe, expect, it } from 'vitest';
import { parseDiagrDocument } from '@/lib/diagr/parser';
import { parseEdgesBlock } from '@/lib/diagr/parser/edges';
import { starterDiagram } from '@/lib/diagr/parser/template';

describe('parseDiagrDocument', () => {
  it('parses a valid starter document', () => {
    const result = parseDiagrDocument(starterDiagram);
    expect(result.ok).toBe(true);
  });

  it('reports invalid YAML', () => {
    const result = parseDiagrDocument('title: broken\nnodes:\n  - id: a\n    label: A\n  bad: [');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.diagnostics[0].code).toBe('YAML_PARSE_ERROR');
    }
  });

  it('reports unknown edge references', () => {
    const result = parseDiagrDocument(`edges: |\n  a --> missing\n\nnodes:\n  - id: a\n    label: A`);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.diagnostics.some((item) => item.code === 'EDGE_REFERENCE_ERROR')).toBe(true);
    }
  });

  it('accepts explicit renderer values and ids composition', () => {
    const result = parseDiagrDocument(
      `edges: |\n  n1 --> n2\n\nnodes:\n  - id: n1\n    label: A\n    renderer: statusPill\n  - id: n2\n    label: B\n    renderer: default\n  - id: panel\n    label: P\n    renderer: groupCard\n    ids: [n1, n2]`,
    );
    expect(result.ok).toBe(true);
  });

  it('accepts nodes without label', () => {
    const result = parseDiagrDocument(`edges: |\n  a --> b\n\nnodes:\n  - id: a\n  - id: b\n    label: B`);
    expect(result.ok).toBe(true);
  });

  it('accepts explicit empty labels', () => {
    const result = parseDiagrDocument(`edges: |\n  a --> b\n\nnodes:\n  - id: a\n    label: ""\n  - id: b\n    label: ""`);
    expect(result.ok).toBe(true);
  });

  it('accepts filename at the top level', () => {
    const result = parseDiagrDocument(
      `title: Example\nfilename: export-name\nedges: |\n  a --> b\n\nnodes:\n  - id: a\n  - id: b`,
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.doc.filename).toBe('export-name');
    }
  });

  it('rejects top-level groups', () => {
    const result = parseDiagrDocument(`edges: |\n  a --> b\n\ngroups:\n  - id: g1\n    label: G1\n\nnodes:\n  - id: a\n  - id: b`);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.diagnostics.some((item) => item.message.includes('top-level groups'))).toBe(true);
    }
  });

  it('rejects nodes and ids together on the same node', () => {
    const result = parseDiagrDocument(
      `edges: |\n  a --> b\n\nnodes:\n  - id: a\n  - id: b\n  - id: panel\n    renderer: groupCard\n    ids: [a]\n    nodes:\n      - id: c`,
    );
    expect(result.ok).toBe(false);
  });

  it('rejects composition cycles', () => {
    const result = parseDiagrDocument(
      `edges: |\n  a --> b\n\nnodes:\n  - id: a\n    ids: [b]\n  - id: b\n    ids: [a]`,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.diagnostics.some((item) => item.message.includes('cycle'))).toBe(true);
    }
  });
});

describe('parseEdgesBlock', () => {
  it('expands chained edges', () => {
    const output = parseEdgesBlock('a --> b --> c');
    expect(output.edges).toHaveLength(2);
  });

  it('expands bidirectional edges', () => {
    const output = parseEdgesBlock('a <--> b');
    expect(output.edges).toHaveLength(2);
  });

  it('parses edge labels', () => {
    const output = parseEdgesBlock('normalize <--> target [label="this is text"]');
    expect(output.edges).toHaveLength(2);
    expect(output.edges[0]?.label).toBe('this is text');
    expect(output.edges[1]?.label).toBe('this is text');
  });

  it('parses edge color and stroke type attributes', () => {
    const output = parseEdgesBlock('source --> target [label="sync", color="tomato", type=dash]');
    expect(output.edges).toHaveLength(1);
    expect(output.edges[0]?.label).toBe('sync');
    expect(output.edges[0]?.color).toBe('tomato');
    expect(output.edges[0]?.strokeType).toBe('dash');
  });

  it('rejects legacy label syntax hard-cut', () => {
    const output = parseEdgesBlock('normalize <--> target ("this is text")');
    expect(output.edges).toHaveLength(0);
    expect(output.diagnostics.some((item) => item.message.includes('Legacy edge label syntax'))).toBe(true);
  });
});
