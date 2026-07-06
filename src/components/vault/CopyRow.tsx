import { Ionicons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { fonts, spacing, type as typo, useTheme } from '@/theme';
import { PressableScale, triggerHaptic } from '@/components/ui/PressableScale';
import { useCopy } from '@/components/ui/Toast';
import { useT } from '@/i18n';
import { authenticateForReveal } from '@/lib/revealGuard';

interface Props {
  label: string;
  /** Human-readable value shown in the row. */
  value: string;
  /** Value placed on the clipboard, if different from `value` (e.g. IBAN without spaces). */
  copyValue?: string;
  /** When set, shows an open-in-browser action next to copy. */
  href?: string;
  secure?: boolean;
  mono?: boolean;
  multiline?: boolean;
}

/**
 * Detail-view row: tap anywhere to copy; secure values are masked with a
 * dot pattern and can be revealed via the eye toggle.
 */
export function CopyRow({ label, value, copyValue, href, secure, mono, multiline }: Props) {
  const theme = useTheme();
  const t = useT();
  const copy = useCopy();
  const [revealed, setRevealed] = useState(false);

  const masked = secure && !revealed;
  const display = masked ? '•'.repeat(Math.min(Math.max(value.length, 8), 14)) : value;
  const clipboard = copyValue ?? value;

  // Secure values pass through the optional biometric gate before leaving the row.
  const guardedCopy = async () => {
    if (secure && !(await authenticateForReveal(t('common.authReveal')))) return;
    await copy(label, clipboard);
  };

  const toggleReveal = async () => {
    if (!revealed && secure && !(await authenticateForReveal(t('common.authReveal')))) return;
    triggerHaptic('selection');
    setRevealed((r) => !r);
  };

  const openInBrowser = () => {
    if (!href) return;
    triggerHaptic('light');
    Linking.openURL(href).catch(() => {});
  };

  return (
    <View style={styles.row}>
      <PressableScale haptic="none" style={styles.copyArea} onPress={() => void guardedCopy()}>
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
        <PressableScale haptic="none" style={styles.iconButton} onPress={() => void toggleReveal()}>
          <Ionicons
            name={revealed ? 'eye-off-outline' : 'eye-outline'}
            size={19}
            color={theme.colors.textSecondary}
          />
        </PressableScale>
      )}
      {href && (
        <PressableScale haptic="none" style={styles.iconButton} onPress={openInBrowser}>
          <Ionicons name="open-outline" size={18} color={theme.colors.accent} />
        </PressableScale>
      )}
      <PressableScale haptic="none" style={styles.iconButton} onPress={() => void guardedCopy()}>
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
