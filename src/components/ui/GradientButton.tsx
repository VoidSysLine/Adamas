import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { ActivityIndicator, StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';
import { AURORA_LOCATIONS, radius, type as typo, useTheme } from '@/theme';
import { PressableScale, type HapticKind } from './PressableScale';

interface Props {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  haptic?: HapticKind;
  style?: StyleProp<ViewStyle>;
}

/** Primary call-to-action with the Adamas "diamond fire" gradient. */
export function GradientButton({ label, onPress, loading, disabled, haptic = 'medium', style }: Props) {
  const theme = useTheme();
  const inactive = disabled || loading;
  return (
    <PressableScale
      onPress={onPress}
      disabled={inactive}
      haptic={haptic}
      style={[{ opacity: inactive ? 0.55 : 1 }, style]}
    >
      <LinearGradient
        colors={theme.colors.heroGradient}
        locations={[...AURORA_LOCATIONS]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={styles.gradient}
      >
        {loading ? (
          <ActivityIndicator color={theme.colors.onAccent} />
        ) : (
          <Text style={[typo.headline, { color: theme.colors.onAccent }]}>{label}</Text>
        )}
      </LinearGradient>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  gradient: {
    height: 54,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
});
