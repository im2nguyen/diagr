import { describe, expect, it } from 'vitest';
import { readThemeFromYaml, setThemeInYaml } from '@/lib/diagr/theme/yamlThemeSync';

describe('yamlThemeSync', () => {
  it('reads theme from valid YAML', () => {
    const source = `title: "Example"\ntheme: "dark"\nedges: |\n  a --> b\nnodes:\n  - id: a\n  - id: b\n`;
    expect(readThemeFromYaml(source)).toBe('dark');
  });

  it('updates existing top-level theme in YAML', () => {
    const source = `title: "Example"\ntheme: "dark"\nedges: |\n  a --> b\nnodes:\n  - id: a\n  - id: b\n`;
    const next = setThemeInYaml(source, 'light');

    expect(next.changed).toBe(true);
    expect(readThemeFromYaml(next.source)).toBe('light');
  });

  it('inserts theme after title when missing', () => {
    const source = `title: "Example"\nedges: |\n  a --> b\nnodes:\n  - id: a\n  - id: b\n`;
    const next = setThemeInYaml(source, 'dark');

    expect(next.changed).toBe(true);
    expect(readThemeFromYaml(next.source)).toBe('dark');

    const lines = next.source.split('\n').map((line) => line.trim());
    expect(lines[0]?.startsWith('title:')).toBe(true);
    expect(lines[1]?.startsWith('theme:')).toBe(true);
  });

  it('returns unchanged when theme is already the same', () => {
    const source = `title: "Example"\ntheme: "dark"\nedges: |\n  a --> b\nnodes:\n  - id: a\n  - id: b\n`;
    const next = setThemeInYaml(source, 'dark');

    expect(next.changed).toBe(false);
    expect(next.source).toBe(source);
  });
});
