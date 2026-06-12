import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedProps, useSharedValue, withTiming, Easing } from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import { totpCode, totpSecondsRemaining, TOTP_PERIOD } from '@/crypto/totp';
import { fonts, spacing, type as typo, useTheme } from '@/theme';
import { PressableScale } from '@/components/ui/PressableScale';
import { useCopy } from '@/components/ui/Toast';
import { useT } from '@/i18n';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const RING_SIZE = 36;
const STROKE = 3.5;
const RADIUS = (RING_SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/** Live RFC-6238 code with an animated countdown ring; tap to copy. */
export function TotpRing({ seed }: { seed: string }) {
  const theme = useTheme();
  const t = useT();
  const copy = useCopy();
  const [code, setCode] = useState(() => totpCode(seed));
  const [remaining, setRemaining] = useState(() => totpSecondsRemaining());
  const progress = useSharedValue(totpSecondsRemaining() / TOTP_PERIOD);

  useEffect(() => {
    const tick = () => {
      setCode(totpCode(seed));
      const secs = totpSecondsRemaining();
      setRemaining(secs);
      progress.value = withTiming((secs - 1) / TOTP_PERIOD, { duration: 1000, easing: Easing.linear });
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [seed, progress]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: CIRCUMFERENCE * (1 - progress.value),
  }));

  if (!code) return null;
  const urgent = remaining <= 5;
  const ringColor = urgent ? theme.colors.danger : theme.colors.accent;

  return (
    <PressableScale haptic="none" onPress={() => copy(t('detail.totpCode'), code)} style={styles.row}>
      <View>
        <Text style={[typo.micro, { color: theme.colors.textTertiary }]}>{t('detail.totpCode')}</Text>
        <Text style={[styles.code, { color: theme.colors.text, fontFamily: fonts.mono }]}>
          {code.slice(0, 3)} {code.slice(3)}
        </Text>
      </View>
      <View style={styles.ring}>
        <Svg width={RING_SIZE} height={RING_SIZE}>
          <Circle
            cx={RING_SIZE / 2}
            cy={RING_SIZE / 2}
            r={RADIUS}
            stroke={theme.colors.surfaceAlt}
            strokeWidth={STROKE}
            fill="none"
          />
          <AnimatedCircle
            cx={RING_SIZE / 2}
            cy={RING_SIZE / 2}
            r={RADIUS}
            stroke={ringColor}
            strokeWidth={STROKE}
            strokeLinecap="round"
            fill="none"
            strokeDasharray={`${CIRCUMFERENCE}`}
            animatedProps={animatedProps}
            transform={`rotate(-90 ${RING_SIZE / 2} ${RING_SIZE / 2})`}
          />
        </Svg>
        <Text style={[styles.seconds, { color: urgent ? theme.colors.danger : theme.colors.textSecondary }]}>
          {remaining}
        </Text>
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
  },
  code: {
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: 2,
    marginTop: 2,
  },
  ring: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  seconds: {
    position: 'absolute',
    fontSize: 11,
    fontWeight: '700',
  },
});
