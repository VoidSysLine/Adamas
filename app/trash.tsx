import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GlassCard } from '@/components/ui/GlassCard';
import { PressableScale, triggerHaptic } from '@/components/ui/PressableScale';
import { useToast } from '@/components/ui/Toast';
import { FaviconBadge } from '@/components/vault/FaviconBadge';
import { resolveLanguage, useT } from '@/i18n';
import { formatTimestamp } from '@/lib/dates';
import { useSettings } from '@/store/settingsStore';
import { TRASH_RETENTION_DAYS, useVault } from '@/store/vaultStore';
import { radius, spacing, type as typo, useTheme } from '@/theme';

/** Trash: soft-deleted entries; restore or permanently delete before auto-purge. */
export default function TrashScreen() {
  const theme = useTheme();
  const t = useT();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const trash = useVault((s) => s.trash);
  const restoreEntry = useVault((s) => s.restoreEntry);
  const purgeEntry = useVault((s) => s.purgeEntry);
  const emptyTrash = useVault((s) => s.emptyTrash);
  const language = resolveLanguage(useSettings((s) => s.language));

  const confirmPurge = (id: string, title: string) => {
    triggerHaptic('warning');
    Alert.alert(t('trash.deleteForever'), t('detail.deleteMessage', { title }), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.delete'), style: 'destructive', onPress: () => purgeEntry(id) },
    ]);
  };

  const confirmEmpty = () => {
    triggerHaptic('warning');
    Alert.alert(t('trash.emptyTrash'), t('trash.emptyConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.delete'), style: 'destructive', onPress: () => emptyTrash() },
    ]);
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <View style={[styles.nav, { paddingTop: insets.top + spacing.sm }]}>
        <PressableScale haptic="light" style={styles.navButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={theme.colors.text} />
        </PressableScale>
        <Text style={[typo.headline, { color: theme.colors.text }]}>{t('trash.title')}</Text>
        {trash.length > 0 ? (
          <PressableScale haptic="none" style={styles.navButton} onPress={confirmEmpty}>
            <Ionicons name="trash-bin-outline" size={20} color={theme.colors.danger} />
          </PressableScale>
        ) : (
          <View style={styles.navButton} />
        )}
      </View>

      {trash.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="trash-outline" size={44} color={theme.colors.textTertiary} />
          <Text style={[typo.headline, { color: theme.colors.textSecondary }]}>{t('trash.empty')}</Text>
          <Text style={[typo.caption, { color: theme.colors.textTertiary, textAlign: 'center' }]}>
            {t('trash.retention', { days: TRASH_RETENTION_DAYS })}
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xl }]}>
          {trash.map((entry, index) => (
            <Animated.View key={entry.id} entering={FadeInDown.delay(Math.min(index, 10) * 40).springify().damping(18)}>
              <GlassCard style={styles.row}>
                <FaviconBadge entry={entry} />
                <View style={styles.text}>
                  <Text style={[typo.headline, { color: theme.colors.text }]} numberOfLines={1}>
                    {entry.title}
                  </Text>
                  <Text style={[typo.caption, { color: theme.colors.textTertiary }]}>
                    {t('trash.deletedOn', { date: formatTimestamp(entry.deletedAt ?? 0, language) })}
                  </Text>
                </View>
                <PressableScale
                  haptic="light"
                  style={styles.action}
                  onPress={() => {
                    restoreEntry(entry.id);
                    triggerHaptic('success');
                    toast({ message: t('trash.restored'), icon: 'refresh-outline', tone: 'success' });
                  }}
                >
                  <Ionicons name="arrow-undo-outline" size={20} color={theme.colors.accent} />
                </PressableScale>
                <PressableScale haptic="none" style={styles.action} onPress={() => confirmPurge(entry.id, entry.title)}>
                  <Ionicons name="trash-outline" size={19} color={theme.colors.danger} />
                </PressableScale>
              </GlassCard>
            </Animated.View>
          ))}
        </ScrollView>
      )}
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
  navButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  content: { padding: spacing.lg, gap: spacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
  },
  text: { flex: 1, gap: 3 },
  action: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.xl,
  },
});
