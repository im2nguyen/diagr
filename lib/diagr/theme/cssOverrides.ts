import { CSSProperties } from 'react';
import { DiagrDiagnostic, DiagrThemeTokens } from '@/lib/diagr/types';

export type ThemeCssValidationResult = {
  ok: boolean;
  css: string;
  diagnostics: DiagrDiagnostic[];
};

const ROOT_SELECTOR = '#diagr-diagram-canvas';

function diag(code: string, message: string): DiagrDiagnostic {
  return {
    code,
    severity: 'error',
    message,
    line: 1,
    column: 1,
  };
}

function stripComments(css: string): string {
  return css.replace(/\/\*[\s\S]*?\*\//g, '');
}

function isAllowedSelector(selector: string): boolean {
  const normalized = selector.trim();
  if (!normalized) {
    return false;
  }
  if (/\b(html|body)\b/i.test(normalized) || /:root\b/i.test(normalized)) {
    return false;
  }
  if ((normalized === '*' || normalized.startsWith('*')) && !normalized.includes(ROOT_SELECTOR)) {
    return false;
  }

  return (
    normalized.includes(ROOT_SELECTOR) ||
    normalized.includes('.diagr-')
  );
}

function scopeSelector(selector: string): string {
  const normalized = selector.trim();
  if (!normalized) {
    return normalized;
  }
  if (normalized.includes(ROOT_SELECTOR)) {
    return normalized;
  }
  return `${ROOT_SELECTOR} ${normalized}`;
}

export function validateAndScopeThemeCss(source: string): ThemeCssValidationResult {
  const diagnostics: DiagrDiagnostic[] = [];
  const input = source.trim();

  if (!input) {
    return { ok: true, css: '', diagnostics };
  }

  const withoutComments = stripComments(source);

  if (/@import\b/i.test(withoutComments) || /@font-face\b/i.test(withoutComments)) {
    diagnostics.push(diag('THEME_CSS_SCOPE_ERROR', 'Disallowed at-rule. @import and @font-face are not allowed.'));
  }
  if (/url\(\s*['"]?(https?:|\/\/)/i.test(withoutComments)) {
    diagnostics.push(diag('THEME_CSS_SCOPE_ERROR', 'External url() values are not allowed in theme CSS.'));
  }

  const blockPattern = /([^{}]+)\{([^{}]*)\}/g;
  const scopedBlocks: string[] = [];
  let cursor = 0;
  let match: RegExpExecArray | null;

  while ((match = blockPattern.exec(withoutComments)) !== null) {
    const pre = withoutComments.slice(cursor, match.index).trim();
    if (pre.length > 0) {
      diagnostics.push(diag('THEME_CSS_PARSE_ERROR', 'Invalid CSS syntax near unexpected content.'));
    }
    cursor = blockPattern.lastIndex;

    const selectorChunk = match[1].trim();
    const body = match[2].trim();
    if (!selectorChunk || !body) {
      diagnostics.push(diag('THEME_CSS_PARSE_ERROR', 'Invalid CSS rule block.'));
      continue;
    }

    const selectors = selectorChunk.split(',').map((item) => item.trim()).filter(Boolean);
    if (selectors.length === 0) {
      diagnostics.push(diag('THEME_CSS_PARSE_ERROR', 'Invalid selector list.'));
      continue;
    }

    const invalidSelector = selectors.find((selector) => !isAllowedSelector(selector));
    if (invalidSelector) {
      diagnostics.push(
        diag(
          'THEME_CSS_SELECTOR_ERROR',
          `Selector "${invalidSelector}" is not allowed. Use .diagr-* selectors only.`,
        ),
      );
      continue;
    }

    const scopedSelectors = selectors.map((selector) => scopeSelector(selector));
    scopedBlocks.push(`${scopedSelectors.join(', ')} {\n${body}\n}`);
  }

  const tail = withoutComments.slice(cursor).trim();
  if (tail.length > 0) {
    diagnostics.push(diag('THEME_CSS_PARSE_ERROR', 'Invalid CSS syntax: unmatched braces or trailing content.'));
  }

  if (diagnostics.length > 0) {
    return { ok: false, css: '', diagnostics };
  }

  return { ok: true, css: scopedBlocks.join('\n\n'), diagnostics };
}

export function themeTokensToCssVars(theme: DiagrThemeTokens): CSSProperties {
  return {
    ['--diagr-canvas-bg' as string]: theme.canvasBg,
    ['--diagr-grid-dot' as string]: theme.gridDot,
    ['--diagr-panel-bg' as string]: theme.panelBg,
    ['--diagr-panel-border' as string]: theme.panelBorder,
    ['--diagr-header-bg' as string]: theme.headerBg,
    ['--diagr-text-primary' as string]: theme.textPrimary,
    ['--diagr-text-muted' as string]: theme.textMuted,
    ['--diagr-edge-color' as string]: theme.edgeColor,
    ['--diagr-edge-label-text' as string]: theme.textPrimary,
    ['--diagr-accent' as string]: theme.accent,
    ['--diagr-radius' as string]: `${theme.radius}px`,
    ['--diagr-group-padding-x' as string]: `${theme.groupContentPaddingX}px`,
    ['--diagr-group-padding-top' as string]: `${theme.groupContentPaddingTop}px`,
    ['--diagr-group-padding-bottom' as string]: `${theme.groupContentPaddingBottom}px`,
  };
}
