'use client';

import { useMemo } from 'react';
import { DiagrDiagnostic, ParseResult } from '@/lib/diagr/types';
import { readThemeFromYaml, setThemeInYaml } from '@/lib/diagr/theme/yamlThemeSync';
import { themePresets } from '@/lib/diagr/theme/presets';

const FALLBACK_THEME = 'light';

function isKnownThemePreset(value: string | undefined): value is keyof typeof themePresets {
  if (!value) {
    return false;
  }
  return Object.prototype.hasOwnProperty.call(themePresets, value);
}

export function useThemeSync(
  draftSource: string,
  draftParsed: ParseResult,
  setDraftSource: (next: string) => void,
  commitSourceCandidate: (candidate?: string) => boolean,
) {
  const yamlTheme = useMemo(
    () => (draftParsed.ok ? draftParsed.doc.theme : readThemeFromYaml(draftSource)),
    [draftParsed, draftSource],
  );
  const selectedThemePreset = useMemo(
    () => (isKnownThemePreset(yamlTheme) ? yamlTheme : FALLBACK_THEME),
    [yamlTheme],
  );

  const unknownThemeDiagnostics = useMemo<DiagrDiagnostic[]>(
    () =>
      draftParsed.ok && yamlTheme && !isKnownThemePreset(yamlTheme)
        ? [
            {
              code: 'THEME_UNKNOWN_PRESET',
              severity: 'warning',
              message: `Unknown theme "${yamlTheme}". Using fallback "${FALLBACK_THEME}". Allowed: light, dark.`,
              line: 1,
              column: 1,
            },
          ]
        : [],
    [draftParsed, yamlTheme],
  );

  const handleSelectThemePreset = (nextPreset: string) => {
    if (!isKnownThemePreset(nextPreset)) {
      return;
    }
    const next = setThemeInYaml(draftSource, nextPreset);
    if (next.changed) {
      setDraftSource(next.source);
      commitSourceCandidate(next.source);
    }
  };

  return {
    yamlTheme,
    selectedThemePreset,
    unknownThemeDiagnostics,
    handleSelectThemePreset,
  };
}
