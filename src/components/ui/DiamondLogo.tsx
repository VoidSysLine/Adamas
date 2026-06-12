import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from '@/theme';

/** The Adamas mark: a gradient diamond with a slow breathing glow. */
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
    shadowOpacity: glow.value * 0.8,
    transform: [{ scale: 0.98 + glow.value * 0.04 }],
  }));

  return (
    <Animated.View
      style={[
        glowStyle,
        {
          shadowColor: theme.colors.heroGradient[1],
          shadowRadius: 28,
          shadowOffset: { width: 0, height: 0 },
          elevation: 16,
        },
      ]}
    >
      <LinearGradient
        colors={[...theme.colors.heroGradient]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.badge, { width: size, height: size, borderRadius: size * 0.3 }]}
      >
        <Ionicons name="diamond" size={size * 0.5} color="rgba(8,10,18,0.88)" />
      </LinearGradient>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
