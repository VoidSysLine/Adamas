import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useT } from '@/i18n';
import { spacing, type as typo, useTheme } from '@/theme';
import type { VaultEntry } from '@/types/vault';
import { GlassCard } from '@/components/ui/GlassCard';
import { PressableScale } from '@/components/ui/PressableScale';
import { FaviconBadge } from './FaviconBadge';

interface Props {
  entry: VaultEntry;
  index: number;
  onPress: () => void;
}

function subtitle(entry: VaultEntry): string {
  switch (entry.kind) {
    case 'login':
      return entry.data.username || entry.data.email || entry.data.url || '';
    case 'identity':
      return [entry.data.firstName, entry.data.lastName].filter(Boolean).join(' ');
    case 'creditCard':
      return entry.data.number ? `•••• ${entry.data.number.replace(/\s/g, '').slice(-4)}` : '';
    case 'bankAccount':
      return entry.data.iban ? `${entry.data.iban.slice(0, 4)} •••• ${entry.data.iban.replace(/\s/g, '').slice(-4)}` : '';
    case 'crypto': {
      const address = entry.data.address?.trim();
      const short = address && address.length > 14 ? `${address.slice(0, 8)}…${address.slice(-5)}` : address;
      return [entry.data.blockchain, short].filter(Boolean).join(' · ');
    }
    case 'wifi':
      return entry.data.ssid ?? '';
    case 'sim':
      return entry.data.phoneNumber ?? '';
    case 'server':
      return entry.data.host ?? '';
    case 'note':
      return entry.data.body?.split('\n')[0] ?? '';
    default:
      return '';
  }
}

export function EntryListItem({ entry, index, onPress }: Props) {
  const theme = useTheme();
  const t = useT();
  const sub = subtitle(entry) || t(`kinds.${entry.kind}`);

  return (
    <Animated.View entering={FadeInDown.delay(Math.min(index, 12) * 40).springify().damping(18)}>
      <PressableScale onPress={onPress} haptic="light">
        <GlassCard style={styles.card}>
          <FaviconBadge entry={entry} />
          <View style={styles.textColumn}>
            <Text style={[typo.headline, { color: theme.colors.text }]} numberOfLines={1}>
              {entry.title}
            </Text>
            <Text style={[typo.caption, { color: theme.colors.textSecondary }]} numberOfLines={1}>
              {sub}
            </Text>
          </View>
          {entry.favorite && <Ionicons name="star" size={15} color={theme.colors.gold} />}
          <Ionicons name="chevron-forward" size={17} color={theme.colors.textTertiary} />
        </GlassCard>
      </PressableScale>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm + 2,
  },
  textColumn: {
    flex: 1,
    gap: 3,
  },
});
