# Theme Overrides Guide

Theme overrides are plain CSS injected into the diagram canvas only.

## Scope rules

- Root scope: `#diagr-diagram-canvas`
- Allowed selectors: either include `#diagr-diagram-canvas` or contain `.diagr-`
- Recommended pattern: `#diagr-diagram-canvas .diagr-... { ... }`

Blocked content:

- `@import`
- `@font-face`
- external `url(http...)` / `url(https...)`
- global selectors like `html`, `body`, `:root` (unless fully diagram-scoped)

## Public selector hooks

Diagram shell:

- `#diagr-diagram-canvas`
- `.canvas-shell`
- `.diagr-diagram-title`

Node/container shell:

- `.diagr-node`
- `.diagr-node-group-card`
- `.diagr-node-cards`
- `.diagr-node-code`
- `.diagr-node-image`
- `.diagr-node-markdown`
- `.diagr-node-title`
- `.diagr-node-content`
- `.diagr-in-group-card`

Group card structure:

- `.diagr-group-node`
- `.diagr-group-header`
- `.diagr-group-caption`

State/fallback hooks:

- `.diagr-node-missing`
- `.diagr-edge-label`

Renderer-specific hooks:

- Cards:
  - `.diagr-node-cards`
  - `.diagr-node-cards .icons`
  - `.diagr-node-cards .label`
- Code:
  - `.diagr-node-code`
  - `.diagr-node-code pre`
  - `.diagr-node-code code`
- Image:
  - `.diagr-node-image img`
  - `.diagr-node-image .missing`
- Markdown:
  - `.diagr-node-markdown`
  - `.diagr-node-markdown h1, h2, h3, h4`
  - `.diagr-node-markdown p, ul, ol, li, a, blockquote, code, pre`

## Theme CSS variables

You can override these at `#diagr-diagram-canvas`:

- `--diagr-canvas-bg`
- `--diagr-grid-dot`
- `--diagr-panel-bg`
- `--diagr-panel-border`
- `--diagr-header-bg`
- `--diagr-text-primary`
- `--diagr-text-muted`
- `--diagr-edge-color`
- `--diagr-edge-label-text`
- `--diagr-accent`
- `--diagr-radius`
- `--diagr-group-padding-x`
- `--diagr-group-padding-top`
- `--diagr-group-padding-bottom`

Markdown + renderer vars:

- `--diagr-renderer-text`
- `--diagr-renderer-muted`
- `--diagr-markdown-heading`
- `--diagr-markdown-link`
- `--diagr-markdown-quote-border`
- `--diagr-markdown-quote-text`
- `--diagr-markdown-code-bg`
- `--diagr-markdown-code-border`
- `--diagr-markdown-code-text`
- `--diagr-markdown-pre-bg`
- `--diagr-markdown-pre-border`
- `--diagr-markdown-pre-text`
- `--diagr-image-missing-bg`
- `--diagr-image-missing-border`
- `--diagr-image-missing-text`

## Copy/paste examples

Diagram-only font override:

```css
#diagr-diagram-canvas {
  font-family: "IBM Plex Sans", "Plus Jakarta Sans", sans-serif;
}
```

Dark edge labels:

```css
#diagr-diagram-canvas {
  --diagr-edge-label-text: #d7deec;
}
```

Code typography:

```css
#diagr-diagram-canvas .diagr-node-code {
  font-size: 13px;
  line-height: 1.5;
}
```

Group header style:

```css
#diagr-diagram-canvas .diagr-group-header {
  background: #1f2937;
  color: #e5e7eb;
  letter-spacing: 0;
}
```
