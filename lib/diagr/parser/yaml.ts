import { parseDocument } from 'yaml';
import { DiagrCoreDocument, DiagrDiagnostic } from '@/lib/diagr/types';

function toYamlDiagnostic(error: unknown): DiagrDiagnostic {
  const text = error instanceof Error ? error.message : 'Unknown YAML parse failure';

  const line =
    typeof error === 'object' && error !== null && 'linePos' in error
      ? Number(((error as { linePos?: Array<{ line: number; col: number }> }).linePos?.[0]?.line ?? 1))
      : 1;

  const column =
    typeof error === 'object' && error !== null && 'linePos' in error
      ? Number(((error as { linePos?: Array<{ line: number; col: number }> }).linePos?.[0]?.col ?? 1))
      : 1;

  return {
    code: 'YAML_PARSE_ERROR',
    severity: 'error',
    message: text,
    line,
    column,
  };
}

export function parseYamlDocument(source: string):
  | { ok: true; doc: DiagrCoreDocument }
  | { ok: false; diagnostics: DiagrDiagnostic[] } {
  try {
    const document = parseDocument(source);

    if (document.errors.length > 0) {
      return {
        ok: false,
        diagnostics: document.errors.map((error) => toYamlDiagnostic(error)),
      };
    }

    const parsed = document.toJS({ mapAsMap: false }) as unknown;

    if (typeof parsed !== 'object' || parsed === null) {
      return {
        ok: false,
        diagnostics: [
          {
            code: 'YAML_PARSE_ERROR',
            severity: 'error',
            message: 'YAML root must be a mapping/object.',
            line: 1,
            column: 1,
          },
        ],
      };
    }

    return {
      ok: true,
      doc: parsed as DiagrCoreDocument,
    };
  } catch (error) {
    return {
      ok: false,
      diagnostics: [toYamlDiagnostic(error)],
    };
  }
}
