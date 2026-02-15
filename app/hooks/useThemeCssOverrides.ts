'use client';

import { useEffect, useMemo, useState } from 'react';
import { validateAndScopeThemeCss } from '@/lib/diagr/theme/cssOverrides';

const THEME_STORAGE_KEY = 'diagr:theme';

export function useThemeCssOverrides(starterThemeCss: string) {
  const [themeSource, setThemeSource] = useState(starterThemeCss);
  const [appliedThemeCss, setAppliedThemeCss] = useState('');

  useEffect(() => {
    const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (storedTheme) {
      const trimmed = storedTheme.trim();
      if (trimmed.startsWith('{')) {
        setThemeSource('');
      } else {
        setThemeSource(storedTheme);
      }
    }
  }, []);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      window.localStorage.setItem(THEME_STORAGE_KEY, themeSource);
    }, 200);

    return () => window.clearTimeout(handle);
  }, [themeSource]);

  const themeCssValidation = useMemo(() => validateAndScopeThemeCss(themeSource), [themeSource]);

  useEffect(() => {
    if (themeCssValidation.ok) {
      setAppliedThemeCss(themeCssValidation.css);
    }
  }, [themeCssValidation]);

  const handleResetThemePreset = () => {
    setThemeSource(starterThemeCss);
  };

  return {
    themeSource,
    setThemeSource,
    appliedThemeCss,
    themeCssValidation,
    handleResetThemePreset,
  };
}
