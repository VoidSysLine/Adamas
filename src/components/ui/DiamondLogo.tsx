import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from '@/theme';
import { PrismGem } from './PrismGem';

/**
 * The Adamas app mark: the Prisma gem on an obsidian squircle tile with a
 * slow breathing glow — the same "IconTile" lockup as the corporate design.
 */
export function DiamondLogo({ size = 96 }: { size?: number }) {
  const theme = useTheme();
  const glow = useSharedValue(0.4);

  useEffect(() => {
    glow.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1800, easing: Easing.inOut(Easing.sin) }),
        withTiming(0.4, { duration: 1800, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
    );
  }, [glow]);

  const glowStyle = useAnimatedStyle(() => ({
    shadowOpacity: glow.value * 0.7,
    transform: [{ scale: 0.98 + glow.value * 0.03 }],
  }));

  const tileColors = theme.dark
    ? (['#1B2030', '#0D1018', '#06070D'] as const)
    : (['#FCFDFF', '#EEF2F7', '#E2E8F1'] as const);
  const radius = Math.round(size * 0.225);
  const pad = Math.round(size * 0.085);

  return (
    <Animated.View
      style={[
        glowStyle,
        {
          shadowColor: '#5566EE',
          shadowRadius: 28,
          shadowOffset: { width: 0, height: 0 },
          elevation: 16,
          borderRadius: radius,
        },
      ]}
    >
      <LinearGradient
        colors={tileColors}
        start={{ x: 0.3, y: 0 }}
        end={{ x: 0.7, y: 1 }}
        style={[
          styles.tile,
          {
            width: size,
            height: size,
            borderRadius: radius,
            padding: pad,
            borderColor: theme.dark ? 'rgba(255,255,255,0.06)' : 'rgba(20,30,60,0.06)',
          },
        ]}
      >
        <PrismGem size={size - pad * 2} glow={theme.dark} />
      </LinearGradient>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  tile: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
});
