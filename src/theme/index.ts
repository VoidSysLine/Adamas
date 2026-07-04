import { Platform } from 'react-native';
import { useSettings } from '@/store/settingsStore';

/**
 * Adamas design language — "Obsidian & Ice" (Corporate Design v1).
 * A near-black obsidian canvas with glass surfaces, the four-facet diamond
 * "Aurora" gradient as the single signature, and gold as the only accent for
 * favorites and gem edges. Light mode is the "Ice" porcelain counterpart.
 */

/** The signature diamond gradient — cyan → azur → indigo → violet. */
export const AURORA = ['#2FE3D6', '#36A8F0', '#5566EE', '#9A4FF2'] as const;
export const AURORA_LOCATIONS = [0, 0.38, 0.68, 1] as const;

export interface Theme {
  dark: boolean;
  colors: {
    background: string;
    /** Elevated card surface. */
    surface: string;
    /** Slightly stronger surface (inputs, pressed states). */
    surfaceAlt: string;
    /** Hairline borders on glass surfaces. */
    border: string;
    text: string;
    textSecondary: string;
    textTertiary: string;
    accent: string;
    accentSoft: string;
    onAccent: string;
    gold: string;
    danger: string;
    warning: string;
    success: string;
    /** The Aurora gradient for hero elements / FAB / primary buttons. */
    heroGradient: readonly [string, string, ...string[]];
    tabBarBlurTint: 'dark' | 'light';
  };
}

export const darkTheme: Theme = {
  dark: true,
  colors: {
    background: '#06070D',
    // Glass tints resolve over the obsidian canvas to ~surface (#0E1119) / raised (#161B27).
    surface: 'rgba(150,168,205,0.055)',
    surfaceAlt: 'rgba(150,168,205,0.10)',
    border: 'rgba(150,168,205,0.14)',
    text: '#EDF1F8',
    textSecondary: 'rgba(237,241,248,0.60)',
    textTertiary: 'rgba(237,241,248,0.36)',
    accent: '#5566EE',
    accentSoft: 'rgba(85,102,238,0.18)',
    onAccent: '#06070D',
    gold: '#E3BE6E',
    danger: '#FB7185',
    warning: '#FBBF24',
    success: '#34D399',
    heroGradient: AURORA,
    tabBarBlurTint: 'dark',
  },
};

export const lightTheme: Theme = {
  dark: false,
  colors: {
    background: '#EEF1F5',
    surface: 'rgba(251,252,254,0.86)',
    surfaceAlt: 'rgba(27,34,48,0.05)',
    border: 'rgba(27,34,48,0.10)',
    text: '#1B2230',
    textSecondary: 'rgba(27,34,48,0.62)',
    textTertiary: 'rgba(27,34,48,0.40)',
    accent: '#4C56E0',
    accentSoft: 'rgba(85,102,238,0.12)',
    onAccent: '#06070D',
    gold: '#B98A3F',
    danger: '#E11D48',
    warning: '#D97706',
    success: '#059669',
    heroGradient: AURORA,
    tabBarBlurTint: 'light',
  },
};

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;

export const radius = { sm: 10, md: 14, lg: 20, xl: 28, full: 999 } as const;

/**
 * Font families. Sora (geometric) carries the wordmark, headings and numbers;
 * Manrope keeps the interface calm and readable. Loaded in the root layout.
 */
export const fontFamily = {
  displaySemi: 'Sora_600SemiBold',
  display: 'Sora_700Bold',
  displayHeavy: 'Sora_800ExtraBold',
  regular: 'Manrope_400Regular',
  medium: 'Manrope_500Medium',
  semibold: 'Manrope_600SemiBold',
  bold: 'Manrope_700Bold',
} as const;

export const fonts = {
  ...fontFamily,
  mono: Platform.select({ ios: 'Menlo', default: 'monospace' }) as string,
};

export const type = {
  display: { fontFamily: fontFamily.displayHeavy, fontSize: 32, letterSpacing: -0.6 },
  title: { fontFamily: fontFamily.display, fontSize: 22, letterSpacing: -0.4 },
  headline: { fontFamily: fontFamily.semibold, fontSize: 17 },
  body: { fontFamily: fontFamily.regular, fontSize: 15 },
  caption: { fontFamily: fontFamily.medium, fontSize: 13 },
  micro: { fontFamily: fontFamily.semibold, fontSize: 11, letterSpacing: 0.6, textTransform: 'uppercase' as const },
} as const;

export function useTheme(): Theme {
  const pref = useSettings((s) => s.theme);
  const system = useSettings((s) => s.systemScheme);
  const resolved = pref === 'system' ? system : pref;
  return resolved === 'light' ? lightTheme : darkTheme;
}
