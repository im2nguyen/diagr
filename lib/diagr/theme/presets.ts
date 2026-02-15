import { DiagrThemeTokens, DiagrRenderDefaults } from '@/lib/diagr/types';

export const lightTheme: DiagrThemeTokens = {
  canvasBg: '#f6f7fb',
  gridDot: '#d7dae5',
  panelBg: '#ffffff',
  panelBorder: '#d7dae5',
  headerBg: '#eef0f6',
  textPrimary: '#26313e',
  textMuted: '#6b7480',
  edgeColor: '#878d9a',
  accent: '#3a7dff',
  radius: 18,
  groupContentPaddingX: 22,
  groupContentPaddingTop: 12,
  groupContentPaddingBottom: 24,
};

export const darkTheme: DiagrThemeTokens = {
  canvasBg: '#0f131a',
  gridDot: '#2a3443',
  panelBg: '#171d27',
  panelBorder: '#2d3a4f',
  headerBg: '#202838',
  textPrimary: '#e7edf7',
  textMuted: '#9ba9be',
  edgeColor: '#90a0bb',
  accent: '#6ba7ff',
  radius: 18,
  groupContentPaddingX: 22,
  groupContentPaddingTop: 12,
  groupContentPaddingBottom: 24,
};

export const defaultRenderDefaults: DiagrRenderDefaults = {
  autoLayout: true,
  autoFit: true,
  autoTheme: true,
  direction: 'LR',
  xGap: 120,
  yGap: 90,
};

export const themePresets: Record<string, DiagrThemeTokens> = {
  light: lightTheme,
  dark: darkTheme,
};

export function resolveTheme(themeName?: string): DiagrThemeTokens {
  if (!themeName) {
    return lightTheme;
  }

  return themePresets[themeName] ?? lightTheme;
}
