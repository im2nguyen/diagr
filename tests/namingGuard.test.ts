import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '..');
const BLOCKED = /\becho\b|\bEcho\b|echoNode|\/lib\/echo\b/;
const INCLUDED_EXT = new Set([
  '.ts',
  '.tsx',
  '.js',
  '.mjs',
  '.cjs',
  '.css',
  '.md',
  '.yml',
  '.yaml',
]);

function listFiles(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === '.next' || entry.name === 'node_modules' || entry.name === '.git') {
      continue;
    }
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      listFiles(full, out);
      continue;
    }
    if (!INCLUDED_EXT.has(path.extname(entry.name))) {
      continue;
    }
    out.push(full);
  }
  return out;
}

function listAuditRoots(): string[] {
  const candidates = ['app', 'bin', 'components', 'docs', 'lib', 'tests', 'README.md'];
  return candidates
    .map((item) => path.join(ROOT, item))
    .filter((item) => fs.existsSync(item));
}

describe('naming guard', () => {
  it('contains no legacy echo identifiers in tracked source/docs/tests', () => {
    const roots = listAuditRoots();
    const files = roots.flatMap((target) => {
      const stat = fs.statSync(target);
      if (stat.isDirectory()) {
        return listFiles(target);
      }
      return INCLUDED_EXT.has(path.extname(target)) ? [target] : [];
    });
    const hits: Array<{ file: string; line: number; text: string }> = [];

    for (const file of files) {
      if (file.endsWith(path.join('tests', 'namingGuard.test.ts'))) {
        continue;
      }
      const content = fs.readFileSync(file, 'utf8');
      const lines = content.split('\n');
      lines.forEach((line, index) => {
        if (BLOCKED.test(line)) {
          hits.push({
            file: path.relative(ROOT, file),
            line: index + 1,
            text: line.trim(),
          });
        }
      });
    }

    expect(hits).toEqual([]);
  });

  it('guard pattern catches known legacy token in fixture text', () => {
    expect(BLOCKED.test('type: echoNode')).toBe(true);
  });
});
