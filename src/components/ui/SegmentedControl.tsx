import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { radius, type as typo, useTheme } from '@/theme';
import { PressableScale } from './PressableScale';

interface Props<T extends string> {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}

/** iOS-style segmented control with a spring-animated thumb. */
export function SegmentedControl<T extends string>({ options, value, onChange }: Props<T>) {
  const theme = useTheme();
  const [width, setWidth] = useState(0);
  const index = Math.max(0, options.findIndex((o) => o.value === value));
  const segment = width / options.length;

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: withSpring(index * segment, { damping: 20, stiffness: 280 }) }],
    width: segment,
  }));

  return (
    <View
      onLayout={(e) => setWidth(e.nativeEvent.layout.width - 4)}
      style={[styles.track, { backgroundColor: theme.colors.surfaceAlt, borderColor: theme.colors.border }]}
    >
      {width > 0 && (
        <Animated.View
          style={[
            styles.thumb,
            thumbStyle,
            { backgroundColor: theme.dark ? 'rgba(255,255,255,0.14)' : '#FFFFFF' },
          ]}
        />
      )}
      {options.map((option) => (
        <PressableScale
          key={option.value}
          haptic="selection"
          pressedScale={0.96}
          style={styles.segment}
          onPress={() => onChange(option.value)}
        >
          <Text
            style={[
              typo.caption,
              { color: option.value === value ? theme.colors.text : theme.colors.textSecondary },
            ]}
          >
            {option.label}
          </Text>
        </PressableScale>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 2,
    height: 40,
  },
  thumb: {
    position: 'absolute',
    top: 2,
    left: 2,
    bottom: 2,
    borderRadius: radius.md - 3,
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
