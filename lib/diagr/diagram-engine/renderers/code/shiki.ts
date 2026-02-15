import { createHighlighter } from 'shiki';

let highlighterPromise: ReturnType<typeof createHighlighter> | null = null;

async function getHighlighter() {
  if (!highlighterPromise) {
    highlighterPromise = createHighlighter({
      themes: ['github-light', 'github-dark'],
      langs: ['typescript', 'ts', 'javascript', 'js', 'json', 'yaml', 'yml'],
    });
  }

  return highlighterPromise;
}

export async function highlightCode(
  code: string,
  lang = 'typescript',
  theme: 'github-light' | 'github-dark' = 'github-light',
): Promise<string> {
  const highlighter = await getHighlighter();
  const supported = new Set(['typescript', 'ts', 'javascript', 'js', 'json', 'yaml', 'yml']);
  const normalizedLang = supported.has(lang) ? lang : 'typescript';

  return highlighter.codeToHtml(code, {
    lang: normalizedLang as any,
    theme,
  });
}
