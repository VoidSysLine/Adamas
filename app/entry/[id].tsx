import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GlassCard } from '@/components/ui/GlassCard';
import { PressableScale, triggerHaptic } from '@/components/ui/PressableScale';
import { useToast } from '@/components/ui/Toast';
import { CopyRow } from '@/components/vault/CopyRow';
import { FaviconBadge } from '@/components/vault/FaviconBadge';
import { TotpRing } from '@/components/vault/TotpRing';
import { fieldsOf } from '@/constants/schema';
import { useT, resolveLanguage } from '@/i18n';
import { formatTimestamp } from '@/lib/dates';
import { useSettings } from '@/store/settingsStore';
import { useVault } from '@/store/vaultStore';
import { radius, spacing, type as typo, useTheme } from '@/theme';

export default function EntryDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const t = useT();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const entry = useVault((s) => s.entries.find((e) => e.id === id));
  const toggleFavorite = useVault((s) => s.toggleFavorite);
  const removeEntry = useVault((s) => s.removeEntry);
  const language = resolveLanguage(useSettings((s) => s.language));

  if (!entry) return <View style={{ flex: 1, backgroundColor: theme.colors.background }} />;

  const data = entry.data as Record<string, string | undefined>;
  const fields = fieldsOf(entry.kind).filter((f) => !!data[f.key]);

  const onDelete = () => {
    triggerHaptic('warning');
    Alert.alert(t('detail.deleteTitle'), t('detail.deleteMessage', { title: entry.title }), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: () => {
          removeEntry(entry.id);
          triggerHaptic('success');
          toast({ message: t('toast.deleted'), icon: 'trash-outline', tone: 'danger' });
          router.back();
        },
      },
    ]);
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <View style={[styles.nav, { paddingTop: insets.top + spacing.sm }]}>
        <PressableScale haptic="light" style={styles.navButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={theme.colors.text} />
        </PressableScale>
        <View style={styles.navActions}>
          <PressableScale haptic="selection" style={styles.navButton} onPress={() => toggleFavorite(entry.id)}>
            <Ionicons
              name={entry.favorite ? 'star' : 'star-outline'}
              size={21}
              color={entry.favorite ? theme.colors.gold : theme.colors.textSecondary}
            />
          </PressableScale>
          <PressableScale
            haptic="light"
            style={styles.navButton}
            onPress={() => router.push({ pathname: '/entry/edit', params: { id: entry.id } })}
          >
            <Ionicons name="create-outline" size={22} color={theme.colors.text} />
          </PressableScale>
        </View>
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 48 }]}>
        <Animated.View entering={FadeInDown.springify().damping(18)} style={styles.hero}>
          <FaviconBadge entry={entry} size={64} />
          <Text style={[typo.title, { color: theme.colors.text, textAlign: 'center' }]}>{entry.title}</Text>
          <View style={[styles.kindChip, { backgroundColor: theme.colors.accentSoft }]}>
            <Text style={[typo.caption, { color: theme.colors.accent }]}>{t(`kinds.${entry.kind}`)}</Text>
          </View>
        </Animated.View>

        {entry.kind === 'login' && entry.data.totpSeed && (
          <Animated.View entering={FadeInDown.delay(80).springify().damping(18)}>
            <GlassCard style={styles.card}>
              <TotpRing seed={entry.data.totpSeed} />
            </GlassCard>
          </Animated.View>
        )}

        {fields.length > 0 && (
          <Animated.View entering={FadeInDown.delay(140).springify().damping(18)}>
            <GlassCard style={styles.card}>
              {fields
                .filter((f) => f.type !== 'totp')
                .map((field, index, visible) => (
                  <View key={field.key}>
                    <CopyRow
                      label={t(`fields.${field.label}` as Parameters<typeof t>[0])}
                      value={data[field.key] as string}
                      secure={field.secure}
                      mono={field.type === 'number' || field.type === 'pin'}
                      multiline={field.type === 'multiline'}
                    />
                    {index < visible.length - 1 && (
                      <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />
                    )}
                  </View>
                ))}
            </GlassCard>
          </Animated.View>
        )}

        {entry.notes && (
          <Animated.View entering={FadeInDown.delay(200).springify().damping(18)}>
            <GlassCard style={styles.card}>
              <CopyRow label={t('fields.notes')} value={entry.notes} multiline />
            </GlassCard>
          </Animated.View>
        )}

        <Animated.View entering={FadeInDown.delay(260).springify().damping(18)} style={styles.footer}>
          <Text style={[typo.caption, { color: theme.colors.textTertiary }]}>
            {t('detail.updated', { date: formatTimestamp(entry.updatedAt, language) })}
          </Text>
          <PressableScale haptic="none" style={styles.deleteButton} onPress={onDelete}>
            <Ionicons name="trash-outline" size={17} color={theme.colors.danger} />
            <Text style={[typo.caption, { color: theme.colors.danger }]}>{t('common.delete')}</Text>
          </PressableScale>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  nav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm,
  },
  navButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navActions: {
    flexDirection: 'row',
  },
  content: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  hero: {
    alignItems: 'center',
    gap: spacing.md,
    marginVertical: spacing.lg,
  },
  kindChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
    borderRadius: radius.full,
  },
  card: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
  },
  footer: {
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
});
