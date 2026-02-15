import { isMap, isScalar, parseDocument, YAMLMap } from 'yaml';

function asMap(source: string): YAMLMap<unknown, unknown> | null {
  const document = parseDocument(source);
  if (document.errors.length > 0 || !isMap(document.contents)) {
    return null;
  }
  return document.contents;
}

function getPairKey(pair: unknown): string | undefined {
  if (!pair || typeof pair !== 'object' || !('key' in pair)) {
    return undefined;
  }

  const key = (pair as { key: unknown }).key;
  if (typeof key === 'string') {
    return key;
  }
  if (isScalar(key) && typeof key.value === 'string') {
    return key.value;
  }
  return undefined;
}

function getStringValue(value: unknown): string | undefined {
  if (typeof value === 'string') {
    return value;
  }
  if (isScalar(value) && typeof value.value === 'string') {
    return value.value;
  }
  return undefined;
}

export function readThemeFromYaml(source: string): string | undefined {
  const map = asMap(source);
  if (!map) {
    return undefined;
  }

  for (const item of map.items) {
    if (getPairKey(item) !== 'theme') {
      continue;
    }
    return getStringValue((item as { value?: unknown }).value);
  }

  return undefined;
}

export function setThemeInYaml(source: string, theme: string): { source: string; changed: boolean } {
  const document = parseDocument(source);

  if (document.errors.length > 0 || !isMap(document.contents)) {
    return { source, changed: false };
  }

  const map = document.contents as YAMLMap<unknown, unknown> & { items: Array<{ value?: unknown }> };
  const themePairIndex = map.items.findIndex((item) => getPairKey(item) === 'theme');

  if (themePairIndex >= 0) {
    const pair = map.items[themePairIndex];
    const currentTheme = getStringValue(pair.value);
    if (currentTheme === theme) {
      return { source, changed: false };
    }
    pair.value = document.createNode(theme);
  } else {
    const insertAt = map.items.findIndex((item) => getPairKey(item) === 'title');
    const nextPair = document.createPair('theme', theme);

    if (insertAt >= 0) {
      map.items.splice(insertAt + 1, 0, nextPair as unknown as { value?: unknown });
    } else {
      map.items.unshift(nextPair as unknown as { value?: unknown });
    }
  }

  const nextSource = document.toString();
  return { source: nextSource, changed: nextSource !== source };
}
