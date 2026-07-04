import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  interpolateColor,
  useAnimatedProps,
  useAnimatedReaction,
  useSharedValue,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import { fonts, type as typo, useTheme } from '@/theme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface Props {
  /** 0–100 */
  score: number;
  size?: number;
  label?: string;
}

/** Animated security-score gauge: the arc sweeps in and the number counts up. */
export function ScoreRing({ score, size = 170, label }: Props) {
  const theme = useTheme();
  const stroke = 13;
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const progress = useSharedValue(0);
  const [displayed, setDisplayed] = useState(0);

  useEffect(() => {
    progress.value = withTiming(score / 100, { duration: 1100, easing: Easing.out(Easing.cubic) });
  }, [score, progress]);

  useAnimatedReaction(
    () => Math.round(progress.value * 100),
    (value, previous) => {
      if (value !== previous) runOnJS(setDisplayed)(value);
    },
  );

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - progress.value),
    stroke: interpolateColor(progress.value, [0.25, 0.55, 0.85], ['#FB7185', '#FBBF24', '#34D399']),
  }));

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={theme.colors.surfaceAlt}
          strokeWidth={stroke}
          fill="none"
        />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={r}
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${circumference}`}
          animatedProps={animatedProps}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={styles.center}>
        <Text style={[styles.score, { color: theme.colors.text }]}>{displayed}</Text>
        {label && <Text style={[typo.caption, { color: theme.colors.textSecondary }]}>{label}</Text>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    position: 'absolute',
    alignItems: 'center',
  },
  score: {
    fontFamily: fonts.displayHeavy,
    fontSize: 44,
    letterSpacing: -1.5,
  },
});
