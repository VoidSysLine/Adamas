import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GlassCard } from '@/components/ui/GlassCard';
import { GradientButton } from '@/components/ui/GradientButton';
import { PressableScale, triggerHaptic } from '@/components/ui/PressableScale';
import { useToast } from '@/components/ui/Toast';
import { useT } from '@/i18n';
import { matchTotpToLogins, parseOtpauthExport, type TotpMatchResult } from '@/lib/importers/totp';
import { useVault } from '@/store/vaultStore';
import { radius, spacing, type as typo, useTheme } from '@/theme';

/**
 * TOTP seed import from authenticator exports (Ente Auth plain text, Aegis
 * txt, … — any file containing otpauth:// URIs). Matched seeds land in the
 * totpSeed field of existing logins so the live code works right away.
 */
export default function ImportTotpScreen() {
  const theme = useTheme();
  const t = useT();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const entries = useVault((s) => s.entries);
  const importTotp = useVault((s) => s.importTotp);

  const [result, setResult] = useState<TotpMatchResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const pickFile = async () => {
    setError(null);
    setBusy(true);
    try {
      const picked = await DocumentPicker.getDocumentAsync({
        type: ['text/plain', 'application/json', 'public.plain-text', '*/*'],
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (picked.canceled || !picked.assets?.[0]) return;

      const content = await new File(picked.assets[0].uri).text();
      const items = parseOtpauthExport(content);
      if (items.length === 0) {
        setResult(null);
        setError(t('totpImport.nothingFound'));
        triggerHaptic('error');
        return;
      }
      setResult(matchTotpToLogins(items, entries));
      triggerHaptic('success');
    } catch {
      setResult(null);
      setError(t('totpImport.readError'));
      triggerHaptic('error');
    } finally {
      setBusy(false);
    }
  };

  const runImport = () => {
    if (!result) return;
    const { updated, created } = importTotp(
      result.matches.map((m) => ({ entryId: m.entryId, seed: m.item.seed })),
      result.unmatched.map((item) => ({
        title: item.issuer,
        account: item.account,
        seed: item.seed,
      })),
    );
    triggerHaptic('success');
    toast({
      message: t('totpImport.done', { updated, created }),
      icon: 'shield-checkmark-outline',
      tone: 'success',
    });
    router.back();
  };

  const total = result ? result.matches.length + result.unmatched.length : 0;

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <View style={[styles.nav, { paddingTop: insets.top + spacing.sm }]}>
        <PressableScale haptic="light" style={styles.navButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={theme.colors.text} />
        </PressableScale>
        <Text style={[typo.headline, { color: theme.colors.text }]}>{t('totpImport.title')}</Text>
        <View style={styles.navButton} />
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xl }]}>
        <Animated.View entering={FadeInDown.springify().damping(18)}>
          <GlassCard style={styles.card}>
            <View style={[styles.brandBadge, { backgroundColor: theme.colors.accentSoft }]}>
              <Ionicons name="timer-outline" size={26} color={theme.colors.accent} />
            </View>
            <Text style={[typo.headline, { color: theme.colors.text, textAlign: 'center' }]}>
              {t('totpImport.heading')}
            </Text>
            <Text style={[typo.caption, styles.intro, { color: theme.colors.textSecondary }]}>
              {t('totpImport.intro')}
            </Text>
            <GradientButton
              label={busy ? t('importer.reading') : t('totpImport.pickFile')}
              onPress={() => void pickFile()}
              loading={busy}
              haptic="medium"
            />
            {error && <Text style={[typo.caption, styles.error, { color: theme.colors.danger }]}>{error}</Text>}
          </GlassCard>
        </Animated.View>

        {result && (
          <Animated.View entering={FadeInDown.springify().damping(18)}>
            <GlassCard style={styles.card}>
              <Text style={[typo.micro, { color: theme.colors.textTertiary }]}>
                {t('totpImport.previewTitle', { count: total })}
              </Text>

              {result.matches.map((match) => (
                <View key={match.entryId} style={styles.matchRow}>
                  <Ionicons name="link-outline" size={16} color={theme.colors.success} />
                  <Text style={[typo.caption, { color: theme.colors.textSecondary, flex: 1 }]} numberOfLines={1}>
                    {match.item.issuer}
                    {'  '}
                    <Text style={{ color: theme.colors.textTertiary }}>→</Text>
                    {'  '}
                    <Text style={{ color: theme.colors.text }}>{match.entryTitle}</Text>
                  </Text>
                </View>
              ))}

              {result.unmatched.length > 0 && (
                <View style={styles.matchRow}>
                  <Ionicons name="add-circle-outline" size={16} color={theme.colors.accent} />
                  <Text style={[typo.caption, { color: theme.colors.textSecondary, flex: 1 }]}>
                    {t('totpImport.newEntries', { count: result.unmatched.length })}
                  </Text>
                </View>
              )}
              {result.alreadySet > 0 && (
                <View style={styles.matchRow}>
                  <Ionicons name="checkmark-done-outline" size={16} color={theme.colors.textTertiary} />
                  <Text style={[typo.caption, { color: theme.colors.textSecondary, flex: 1 }]}>
                    {t('totpImport.alreadySet', { count: result.alreadySet })}
                  </Text>
                </View>
              )}

              {total > 0 ? (
                <GradientButton label={t('totpImport.import', { count: total })} onPress={runImport} haptic="none" />
              ) : (
                <Text style={[typo.caption, { color: theme.colors.textSecondary, textAlign: 'center' }]}>
                  {t('totpImport.nothingNew')}
                </Text>
              )}
            </GlassCard>
          </Animated.View>
        )}
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
  content: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  card: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  brandBadge: {
    width: 52,
    height: 52,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  intro: {
    textAlign: 'center',
    lineHeight: 19,
  },
  error: {
    textAlign: 'center',
  },
  matchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
});
