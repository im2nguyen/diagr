import YAML from 'yaml';

export function applyThemeOverride(source, theme) {
  if (!theme) {
    return source;
  }
  if (theme !== 'light' && theme !== 'dark') {
    throw new Error(`Invalid --theme "${theme}". Allowed values: light, dark.`);
  }

  const doc = YAML.parseDocument(source);
  if (doc.errors.length > 0) {
    throw new Error(`YAML parse failed while applying --theme: ${doc.errors[0].message}`);
  }

  doc.set('theme', theme);
  return String(doc);
}

export function validateThemeCss(source) {
  const diagnostics = [];
  const input = String(source ?? '').trim();
  if (!input) {
    return diagnostics;
  }

  const withoutComments = input.replace(/\/\*[\s\S]*?\*\//g, '');
  if (/@import\b/i.test(withoutComments) || /@font-face\b/i.test(withoutComments)) {
    diagnostics.push({
      code: 'THEME_CSS_SCOPE_ERROR',
      message: 'Disallowed at-rule. @import and @font-face are not allowed.',
      line: 1,
      column: 1,
    });
  }

  const blockPattern = /([^{}]+)\{([^{}]*)\}/g;
  let cursor = 0;
  let match;
  while ((match = blockPattern.exec(withoutComments)) !== null) {
    const pre = withoutComments.slice(cursor, match.index).trim();
    if (pre.length > 0) {
      diagnostics.push({
        code: 'THEME_CSS_PARSE_ERROR',
        message: 'Invalid CSS syntax near unexpected content.',
        line: 1,
        column: 1,
      });
    }
    cursor = blockPattern.lastIndex;
    const selectorChunk = match[1].trim();
    const selectors = selectorChunk.split(',').map((item) => item.trim()).filter(Boolean);
    const invalid = selectors.find((selector) => {
      if (/\b(html|body)\b/i.test(selector) || /:root\b/i.test(selector)) return true;
      if ((selector === '*' || selector.startsWith('*')) && !selector.includes('#diagr-diagram-canvas')) return true;
      return !selector.includes('#diagr-diagram-canvas') && !selector.includes('.diagr-');
    });
    if (invalid) {
      diagnostics.push({
        code: 'THEME_CSS_SELECTOR_ERROR',
        message: `Selector "${invalid}" is not allowed. Use .diagr-* selectors only.`,
        line: 1,
        column: 1,
      });
    }
  }

  const tail = withoutComments.slice(cursor).trim();
  if (tail.length > 0) {
    diagnostics.push({
      code: 'THEME_CSS_PARSE_ERROR',
      message: 'Invalid CSS syntax: unmatched braces or trailing content.',
      line: 1,
      column: 1,
    });
  }

  return diagnostics;
}

export async function validateInput(source, style) {
  const diagnostics = [];
  const yamlDoc = YAML.parseDocument(source);

  if (yamlDoc.errors.length > 0) {
    yamlDoc.errors.forEach((error) => {
      diagnostics.push({
        code: 'YAML_PARSE_ERROR',
        message: error.message,
        line: 1,
        column: 1,
      });
    });
  }

  const parsed = yamlDoc.toJSON();
  if (!parsed || typeof parsed !== 'object') {
    diagnostics.push({
      code: 'SCHEMA_ERROR',
      message: 'Document must be a YAML object.',
      line: 1,
      column: 1,
    });
  } else {
    if (typeof parsed.edges !== 'string' || !parsed.edges.trim()) {
      diagnostics.push({
        code: 'SCHEMA_ERROR',
        message: 'document: edges is required.',
        line: 1,
        column: 1,
      });
    }
    if (!Array.isArray(parsed.nodes) || parsed.nodes.length === 0) {
      diagnostics.push({
        code: 'SCHEMA_ERROR',
        message: 'document: At least one top-level node definition must exist.',
        line: 1,
        column: 1,
      });
    }
  }

  diagnostics.push(...validateThemeCss(style));

  if (diagnostics.length > 0) {
    diagnostics.forEach((item) => {
      console.error(`[${item.code}] ${item.message} (${item.line}:${item.column})`);
    });
    throw new Error('Validation failed.');
  }

  return {
    filename: typeof parsed?.filename === 'string' ? parsed.filename : undefined,
  };
}
