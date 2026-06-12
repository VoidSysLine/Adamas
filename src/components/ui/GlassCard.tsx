import { BlurView } from 'expo-blur';
import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { radius, useTheme } from '@/theme';

interface Props {
  style?: StyleProp<ViewStyle>;
  /** Blur intensity; 0 renders a plain translucent surface (cheaper in lists). */
  intensity?: number;
  children?: React.ReactNode;
}

/** Frosted-glass surface — the core material of the Adamas design language. */
export function GlassCard({ style, intensity = 0, children }: Props) {
  const theme = useTheme();
  const surface = {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
  };

  if (intensity > 0) {
    return (
      <BlurView
        intensity={intensity}
        tint={theme.colors.tabBarBlurTint}
        style={[styles.card, surface, style]}
      >
        {children}
      </BlurView>
    );
  }
  return <View style={[styles.card, surface, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
});
