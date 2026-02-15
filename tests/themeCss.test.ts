import { describe, expect, it } from 'vitest';
import { validateAndScopeThemeCss } from '@/lib/diagr/theme/cssOverrides';

describe('validateAndScopeThemeCss', () => {
  it('accepts allowed selectors and scopes them', () => {
    const result = validateAndScopeThemeCss('.diagr-node-markdown h2 { color: #7aa2ff; }');
    expect(result.ok).toBe(true);
    expect(result.css).toContain('#diagr-diagram-canvas .diagr-node-markdown h2');
  });

  it('rejects global selectors', () => {
    const result = validateAndScopeThemeCss('body { color: red; }');
    expect(result.ok).toBe(false);
    expect(result.diagnostics.some((item) => item.code === 'THEME_CSS_SELECTOR_ERROR')).toBe(true);
  });

  it('rejects non-diagr selectors', () => {
    const variantResult = validateAndScopeThemeCss('.variant-title { color: red; }');
    expect(variantResult.ok).toBe(false);
    expect(variantResult.diagnostics.some((item) => item.code === 'THEME_CSS_SELECTOR_ERROR')).toBe(true);

    const reactFlowResult = validateAndScopeThemeCss('.react-flow__edge-path { stroke: red; }');
    expect(reactFlowResult.ok).toBe(false);
    expect(reactFlowResult.diagnostics.some((item) => item.code === 'THEME_CSS_SELECTOR_ERROR')).toBe(true);
  });

  it('rejects forbidden at-rules', () => {
    const result = validateAndScopeThemeCss('@import "https://example.com/x.css";');
    expect(result.ok).toBe(false);
    expect(result.diagnostics.some((item) => item.code === 'THEME_CSS_SCOPE_ERROR')).toBe(true);
  });

  it('keeps existing root selectors scoped once', () => {
    const result = validateAndScopeThemeCss('#diagr-diagram-canvas .diagr-group-header { background: #222; }');
    expect(result.ok).toBe(true);
    expect(result.css).toContain('#diagr-diagram-canvas .diagr-group-header');
    expect(result.css.includes('#diagr-diagram-canvas #diagr-diagram-canvas')).toBe(false);
  });
});
