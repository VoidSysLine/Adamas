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
import { isDuplicateLogin, parseBitwardenExport, type ImportedLogin } from '@/lib/importers/bitwarden';
import { useVault } from '@/store/vaultStore';
import { radius, spacing, type as typo, useTheme } from '@/theme';

interface Preview {
  fresh: ImportedLogin[];
  duplicates: number;
  skippedOther: number;
}

/** Bitwarden import: pick the unencrypted .json export, preview, then import. */
export default function ImportScreen() {
  const theme = useTheme();
  const t = useT();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const entries = useVault((s) => s.entries);
  const importLogins = useVault((s) => s.importLogins);

  const [preview, setPreview] = useState<Preview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const pickFile = async () => {
    setError(null);
    setBusy(true);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/json', 'text/plain', 'public.json', '*/*'],
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (result.canceled || !result.assets?.[0]) return;

      const content = await new File(result.assets[0].uri).text();
      const parsed = parseBitwardenExport(content);
      if (!parsed.ok) {
        setPreview(null);
        setError(t(parsed.reason === 'encrypted' ? 'importer.encryptedError' : 'importer.invalidError'));
        triggerHaptic('error');
        return;
      }

      const existing = entries.map((e) => ({
        kind: e.kind,
        title: e.title,
        data: e.data as Record<string, string | undefined>,
      }));
      const fresh = parsed.logins.filter((login) => !isDuplicateLogin(login, existing));
      setPreview({
        fresh,
        duplicates: parsed.logins.length - fresh.length,
        skippedOther: parsed.skippedOther,
      });
      triggerHaptic('success');
    } catch {
      setPreview(null);
      setError(t('importer.invalidError'));
      triggerHaptic('error');
    } finally {
      setBusy(false);
    }
  };

  const runImport = () => {
    if (!preview || preview.fresh.length === 0) return;
    const count = importLogins(preview.fresh);
    triggerHaptic('success');
    toast({
      message: t('importer.imported', { count }),
      icon: 'checkmark-circle-outline',
      tone: 'success',
    });
    router.back();
  };

  const summaryRow = (icon: string, color: string, label: string) => (
    <View style={styles.summaryRow}>
      <Ionicons name={icon as never} size={18} color={color} />
      <Text style={[typo.body, { color: theme.colors.text, flex: 1 }]}>{label}</Text>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <View style={[styles.nav, { paddingTop: insets.top + spacing.sm }]}>
        <PressableScale haptic="light" style={styles.navButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={theme.colors.text} />
        </PressableScale>
        <Text style={[typo.headline, { color: theme.colors.text }]}>{t('importer.title')}</Text>
        <View style={styles.navButton} />
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xl }]}>
        <Animated.View entering={FadeInDown.springify().damping(18)}>
          <GlassCard style={styles.card}>
            <View style={[styles.brandBadge, { backgroundColor: '#175DDC' }]}>
              <Ionicons name="shield-half-outline" size={26} color="#FFFFFF" />
            </View>
            <Text style={[typo.headline, { color: theme.colors.text, textAlign: 'center' }]}>
              {t('importer.bitwarden')}
            </Text>
            <Text style={[typo.caption, styles.intro, { color: theme.colors.textSecondary }]}>
              {t('importer.intro')}
            </Text>
            <GradientButton
              label={busy ? t('importer.reading') : t('importer.pickFile')}
              onPress={() => void pickFile()}
              loading={busy}
              haptic="medium"
            />
            {error && (
              <Text style={[typo.caption, styles.error, { color: theme.colors.danger }]}>{error}</Text>
            )}
          </GlassCard>
        </Animated.View>

        {preview && (
          <Animated.View entering={FadeInDown.springify().damping(18)}>
            <GlassCard style={styles.card}>
              <Text style={[typo.micro, { color: theme.colors.textTertiary }]}>
                {t('importer.previewTitle')}
              </Text>
              {summaryRow(
                'globe-outline',
                theme.colors.success,
                t('importer.foundLogins', { count: preview.fresh.length }),
              )}
              {preview.duplicates > 0 &&
                summaryRow(
                  'copy-outline',
                  theme.colors.warning,
                  t('importer.duplicates', { count: preview.duplicates }),
                )}
              {preview.skippedOther > 0 &&
                summaryRow(
                  'remove-circle-outline',
                  theme.colors.textTertiary,
                  t('importer.skippedItems', { count: preview.skippedOther }),
                )}
              {preview.fresh.length > 0 ? (
                <GradientButton
                  label={t('importer.import', { count: preview.fresh.length })}
                  onPress={runImport}
                  haptic="none"
                />
              ) : (
                <Text style={[typo.caption, { color: theme.colors.textSecondary, textAlign: 'center' }]}>
                  {t('importer.nothingNew')}
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
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
});
