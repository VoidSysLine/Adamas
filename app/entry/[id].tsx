import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GlassCard } from '@/components/ui/GlassCard';
import { PressableScale, triggerHaptic } from '@/components/ui/PressableScale';
import { useToast } from '@/components/ui/Toast';
import { AttachmentsCard } from '@/components/vault/AttachmentsCard';
import { AvatarPicker } from '@/components/vault/AvatarPicker';
import { CopyRow } from '@/components/vault/CopyRow';
import { FaviconBadge } from '@/components/vault/FaviconBadge';
import { PasswordHistoryCard } from '@/components/vault/PasswordHistoryCard';
import { TotpRing } from '@/components/vault/TotpRing';
import { WifiQrCard } from '@/components/vault/WifiQrCard';
import { fieldsOf, kindAllowsAttachments, type FieldDef } from '@/constants/schema';
import { useT, resolveLanguage } from '@/i18n';
import { formatTimestamp, parseFieldDate } from '@/lib/dates';
import { normalizeWebUrl } from '@/lib/favicon';
import { MASKS } from '@/lib/masks';
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
  const duplicateEntry = useVault((s) => s.duplicateEntry);
  const language = resolveLanguage(useSettings((s) => s.language));

  if (!entry) return <View style={{ flex: 1, backgroundColor: theme.colors.background }} />;

  const data = entry.data as Record<string, string | undefined>;
  const fields = fieldsOf(entry.kind).filter((f) => !!data[f.key]);
  const dateLocale = language === 'de' ? 'de-DE' : 'en-US';

  /** Resolves the shown value (localized dates/options) and the raw copy value. */
  const present = (field: FieldDef): { display: string; copyValue?: string } => {
    const raw = (data[field.key] as string).trim();
    if (field.type === 'date') {
      const parsed = parseFieldDate(raw);
      return parsed
        ? { display: parsed.toLocaleDateString(dateLocale, { day: '2-digit', month: 'long', year: 'numeric' }), copyValue: raw }
        : { display: raw };
    }
    if (field.type === 'select' && field.options) {
      const option = field.options.find((o) => o.value === raw);
      return { display: option ? t(`options.${option.label}` as Parameters<typeof t>[0]) : raw };
    }
    // Grouped masks: show the grouped value, copy the unspaced raw form.
    if (field.mask && MASKS[field.mask].copyRaw) {
      return { display: raw, copyValue: MASKS[field.mask].strip(raw) };
    }
    return { display: raw };
  };

  const onDuplicate = () => {
    const newId = duplicateEntry(entry.id, t('detail.copySuffix'));
    triggerHaptic('success');
    toast({ message: t('detail.duplicated'), icon: 'copy-outline', tone: 'success' });
    if (newId) router.replace(`/entry/${newId}`);
  };

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
          {entry.kind === 'identity' ? <AvatarPicker entry={entry} /> : <FaviconBadge entry={entry} size={64} />}
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

        {entry.kind === 'wifi' && (
          <Animated.View entering={FadeInDown.delay(80).springify().damping(18)}>
            <WifiQrCard title={entry.title} data={entry.data} />
          </Animated.View>
        )}

        {fields.length > 0 && (
          <Animated.View entering={FadeInDown.delay(140).springify().damping(18)}>
            <GlassCard style={styles.card}>
              {fields
                .filter((f) => f.type !== 'totp')
                .map((field, index, visible) => {
                  const { display, copyValue } = present(field);
                  const href = field.type === 'url' ? normalizeWebUrl(display) : null;
                  return (
                    <View key={field.key}>
                      <CopyRow
                        label={t(`fields.${field.label}` as Parameters<typeof t>[0])}
                        value={display}
                        copyValue={copyValue}
                        href={href ?? undefined}
                        secure={field.secure}
                        mono={field.type === 'number' || field.type === 'pin' || field.type === 'code' || !!field.mask}
                        multiline={field.type === 'multiline'}
                      />
                      {index < visible.length - 1 && (
                        <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />
                      )}
                    </View>
                  );
                })}
            </GlassCard>
          </Animated.View>
        )}

        {(entry.customFields ?? []).filter((f) => f.value).length > 0 && (
          <Animated.View entering={FadeInDown.delay(160).springify().damping(18)}>
            <GlassCard style={styles.card}>
              {(entry.customFields ?? [])
                .filter((f) => f.value)
                .map((field, index, visible) => {
                  const isDate = field.type === 'date';
                  const parsed = isDate ? parseFieldDate(field.value) : null;
                  const href = field.type === 'url' ? normalizeWebUrl(field.value) : null;
                  return (
                    <View key={field.id}>
                      <CopyRow
                        label={field.label}
                        value={
                          parsed
                            ? parsed.toLocaleDateString(dateLocale, { day: '2-digit', month: 'long', year: 'numeric' })
                            : field.value
                        }
                        copyValue={field.value}
                        href={href ?? undefined}
                        secure={field.type === 'password' || field.type === 'pin'}
                        mono={field.type === 'pin' || field.type === 'number' || field.type === 'code'}
                        multiline={field.type === 'multiline'}
                      />
                      {index < visible.length - 1 && (
                        <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />
                      )}
                    </View>
                  );
                })}
            </GlassCard>
          </Animated.View>
        )}

        {kindAllowsAttachments(entry.kind) && (
          <Animated.View entering={FadeInDown.delay(180).springify().damping(18)}>
            <AttachmentsCard entry={entry} />
          </Animated.View>
        )}

        {entry.passwordHistory && entry.passwordHistory.length > 0 && (
          <Animated.View entering={FadeInDown.delay(190).springify().damping(18)}>
            <PasswordHistoryCard history={entry.passwordHistory} />
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
          <View style={styles.footerActions}>
            <PressableScale haptic="light" style={styles.deleteButton} onPress={onDuplicate}>
              <Ionicons name="copy-outline" size={17} color={theme.colors.accent} />
              <Text style={[typo.caption, { color: theme.colors.accent }]}>{t('detail.duplicate')}</Text>
            </PressableScale>
            <PressableScale haptic="none" style={styles.deleteButton} onPress={onDelete}>
              <Ionicons name="trash-outline" size={17} color={theme.colors.danger} />
              <Text style={[typo.caption, { color: theme.colors.danger }]}>{t('common.delete')}</Text>
            </PressableScale>
          </View>
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
  footerActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
});
