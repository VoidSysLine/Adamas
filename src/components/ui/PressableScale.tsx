import * as Haptics from 'expo-haptics';
import React from 'react';
import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export type HapticKind = 'light' | 'medium' | 'heavy' | 'selection' | 'success' | 'warning' | 'error' | 'none';

export function triggerHaptic(kind: HapticKind) {
  switch (kind) {
    case 'light':
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      break;
    case 'medium':
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      break;
    case 'heavy':
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      break;
    case 'selection':
      void Haptics.selectionAsync();
      break;
    case 'success':
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      break;
    case 'warning':
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      break;
    case 'error':
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      break;
    case 'none':
      break;
  }
}

interface Props extends PressableProps {
  /** Scale factor while pressed. */
  pressedScale?: number;
  haptic?: HapticKind;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}

/**
 * The standard Adamas touchable: a gentle spring scale-down with a subtle
 * dim, plus haptic feedback on press — used by every interactive surface so
 * the whole app shares one tactile identity.
 */
export function PressableScale({ pressedScale = 0.97, haptic = 'light', style, onPress, children, ...rest }: Props) {
  const scale = useSharedValue(1);
  const dim = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: dim.value,
  }));

  return (
    <AnimatedPressable
      {...rest}
      style={[style, animatedStyle]}
      onPressIn={(e) => {
        scale.value = withSpring(pressedScale, { damping: 18, stiffness: 380 });
        dim.value = withTiming(0.85, { duration: 80 });
        rest.onPressIn?.(e);
      }}
      onPressOut={(e) => {
        scale.value = withSpring(1, { damping: 14, stiffness: 320 });
        dim.value = withTiming(1, { duration: 140 });
        rest.onPressOut?.(e);
      }}
      onPress={(e) => {
        triggerHaptic(haptic);
        onPress?.(e);
      }}
    >
      {children}
    </AnimatedPressable>
  );
}
