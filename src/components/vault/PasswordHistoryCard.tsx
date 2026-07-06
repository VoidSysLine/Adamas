import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { GlassCard } from '@/components/ui/GlassCard';
import { PressableScale, triggerHaptic } from '@/components/ui/PressableScale';
import { CopyRow } from '@/components/vault/CopyRow';
import { useT, resolveLanguage } from '@/i18n';
import { formatTimestamp } from '@/lib/dates';
import { useSettings } from '@/store/settingsStore';
import { spacing, type as typo, useTheme } from '@/theme';

interface Props {
  history: { value: string; changedAt: number }[];
}

/** Collapsible list of an entry's previous passwords (secure, copyable). */
export function PasswordHistoryCard({ history }: Props) {
  const theme = useTheme();
  const t = useT();
  const language = resolveLanguage(useSettings((s) => s.language));
  const [open, setOpen] = useState(false);

  if (history.length === 0) return null;

  return (
    <GlassCard style={styles.card}>
      <PressableScale
        haptic="light"
        style={styles.header}
        onPress={() => {
          triggerHaptic('selection');
          setOpen((o) => !o);
        }}
      >
        <Ionicons name="time-outline" size={18} color={theme.colors.textSecondary} />
        <Text style={[typo.headline, { color: theme.colors.text, flex: 1 }]}>
          {t('history.title')}
        </Text>
        <Text style={[typo.caption, { color: theme.colors.textTertiary }]}>{history.length}</Text>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={17} color={theme.colors.textTertiary} />
      </PressableScale>

      {open && (
        <Animated.View entering={FadeIn.duration(160)}>
          {history.map((item, index) => (
            <View key={`${item.changedAt}-${index}`}>
              <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />
              <CopyRow
                label={t('history.changedOn', { date: formatTimestamp(item.changedAt, language) })}
                value={item.value}
                secure
                mono
              />
            </View>
          ))}
        </Animated.View>
      )}
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
  },
});
