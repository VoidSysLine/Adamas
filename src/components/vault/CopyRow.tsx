import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { fonts, spacing, type as typo, useTheme } from '@/theme';
import { PressableScale, triggerHaptic } from '@/components/ui/PressableScale';
import { useCopy } from '@/components/ui/Toast';

interface Props {
  label: string;
  value: string;
  secure?: boolean;
  mono?: boolean;
  multiline?: boolean;
}

/**
 * Detail-view row: tap anywhere to copy; secure values are masked with a
 * dot pattern and can be revealed via the eye toggle.
 */
export function CopyRow({ label, value, secure, mono, multiline }: Props) {
  const theme = useTheme();
  const copy = useCopy();
  const [revealed, setRevealed] = useState(false);

  const masked = secure && !revealed;
  const display = masked ? '•'.repeat(Math.min(Math.max(value.length, 8), 14)) : value;

  return (
    <View style={styles.row}>
      <PressableScale haptic="none" style={styles.copyArea} onPress={() => copy(label, value)}>
        <Text style={[typo.micro, { color: theme.colors.textTertiary }]}>{label}</Text>
        <Text
          style={[
            typo.body,
            styles.value,
            { color: theme.colors.text },
            (mono || secure) && { fontFamily: fonts.mono, letterSpacing: masked ? 2 : 0.5 },
          ]}
          numberOfLines={multiline && revealed ? undefined : multiline ? 3 : 1}
        >
          {display}
        </Text>
      </PressableScale>
      {secure && (
        <PressableScale
          haptic="none"
          style={styles.iconButton}
          onPress={() => {
            triggerHaptic('selection');
            setRevealed((r) => !r);
          }}
        >
          <Ionicons
            name={revealed ? 'eye-off-outline' : 'eye-outline'}
            size={19}
            color={theme.colors.textSecondary}
          />
        </PressableScale>
      )}
      <PressableScale haptic="none" style={styles.iconButton} onPress={() => copy(label, value)}>
        <Ionicons name="copy-outline" size={18} color={theme.colors.accent} />
      </PressableScale>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md - 2,
    gap: spacing.xs,
  },
  copyArea: {
    flex: 1,
    gap: 3,
  },
  value: {
    fontSize: 16,
  },
  iconButton: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
