import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { interpolateColor, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useT } from '@/i18n';
import { estimateStrength, STRENGTH_LABEL_KEYS } from '@/lib/strength';
import { radius, type as typo, useTheme } from '@/theme';

/** Animated strength bar: width and color glide between levels. */
export function StrengthMeter({ password }: { password: string }) {
  const theme = useTheme();
  const t = useT();
  const { level, bits } = estimateStrength(password);
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withSpring(password ? (level + 1) / 5 : 0, { damping: 18, stiffness: 160 });
  }, [level, password, progress]);

  const barStyle = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%`,
    backgroundColor: interpolateColor(
      progress.value,
      [0.2, 0.4, 0.6, 0.8, 1],
      ['#FB7185', '#FB923C', '#FBBF24', '#34D399', '#67E8F9'],
    ),
  }));

  return (
    <View style={styles.container}>
      <View style={[styles.track, { backgroundColor: theme.colors.surfaceAlt }]}>
        <Animated.View style={[styles.bar, barStyle]} />
      </View>
      {password.length > 0 && (
        <Text style={[typo.caption, { color: theme.colors.textSecondary }]}>
          {t(STRENGTH_LABEL_KEYS[level])} · {bits} bit
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 6 },
  track: {
    height: 6,
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  bar: {
    height: '100%',
    borderRadius: radius.full,
  },
});
