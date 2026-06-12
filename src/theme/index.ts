import { Platform } from 'react-native';
import { useSettings } from '@/store/settingsStore';

/**
 * Adamas design language — "Obsidian & Ice".
 * A near-black void canvas with cool diamond-blue accents and warm gold for
 * favorites. Light mode is a soft porcelain counterpart.
 */

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
    /** Gradient for hero elements / FAB / primary buttons. */
    heroGradient: readonly [string, string, string];
    tabBarBlurTint: 'dark' | 'light';
  };
}

export const darkTheme: Theme = {
  dark: true,
  colors: {
    background: '#05060A',
    surface: 'rgba(255,255,255,0.055)',
    surfaceAlt: 'rgba(255,255,255,0.09)',
    border: 'rgba(255,255,255,0.10)',
    text: '#F4F6FB',
    textSecondary: 'rgba(244,246,251,0.62)',
    textTertiary: 'rgba(244,246,251,0.38)',
    accent: '#6E9BFF',
    accentSoft: 'rgba(110,155,255,0.16)',
    onAccent: '#05060A',
    gold: '#F5C66B',
    danger: '#FB7185',
    warning: '#FBBF24',
    success: '#34D399',
    heroGradient: ['#67E8F9', '#6E9BFF', '#A78BFA'],
    tabBarBlurTint: 'dark',
  },
};

export const lightTheme: Theme = {
  dark: false,
  colors: {
    background: '#F2F4FA',
    surface: 'rgba(255,255,255,0.86)',
    surfaceAlt: 'rgba(9,14,32,0.05)',
    border: 'rgba(9,14,32,0.08)',
    text: '#0B1020',
    textSecondary: 'rgba(11,16,32,0.62)',
    textTertiary: 'rgba(11,16,32,0.40)',
    accent: '#3B6CF0',
    accentSoft: 'rgba(59,108,240,0.12)',
    onAccent: '#FFFFFF',
    gold: '#C98F1B',
    danger: '#E11D48',
    warning: '#D97706',
    success: '#059669',
    heroGradient: ['#22D3EE', '#3B6CF0', '#8B5CF6'],
    tabBarBlurTint: 'light',
  },
};

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;

export const radius = { sm: 10, md: 14, lg: 20, xl: 28, full: 999 } as const;

export const fonts = {
  mono: Platform.select({ ios: 'Menlo', default: 'monospace' }) as string,
};

export const type = {
  display: { fontSize: 32, fontWeight: '800' as const, letterSpacing: -0.8 },
  title: { fontSize: 22, fontWeight: '700' as const, letterSpacing: -0.4 },
  headline: { fontSize: 17, fontWeight: '600' as const },
  body: { fontSize: 15, fontWeight: '400' as const },
  caption: { fontSize: 13, fontWeight: '500' as const },
  micro: { fontSize: 11, fontWeight: '600' as const, letterSpacing: 0.6, textTransform: 'uppercase' as const },
};

export function useTheme(): Theme {
  const pref = useSettings((s) => s.theme);
  const system = useSettings((s) => s.systemScheme);
  const resolved = pref === 'system' ? system : pref;
  return resolved === 'light' ? lightTheme : darkTheme;
}
