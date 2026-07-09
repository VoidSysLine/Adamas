import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import * as FileSystem from 'expo-file-system/legacy';
import { useRouter } from 'expo-router';
import * as Sharing from 'expo-sharing';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GlassCard } from '@/components/ui/GlassCard';
import { PasswordPromptModal } from '@/components/ui/PasswordPromptModal';
import { PressableScale, triggerHaptic } from '@/components/ui/PressableScale';
import { useToast } from '@/components/ui/Toast';
import { useT } from '@/i18n';
import { readBackup } from '@/lib/backup';
import { useSettings } from '@/store/settingsStore';
import { useVault } from '@/store/vaultStore';
import { radius, spacing, type as typo, useTheme } from '@/theme';

type Prompt = 'export' | 'restore' | null;

/** Encrypted vault backup: export a self-contained .adamas file, or restore one. */
export default function BackupScreen() {
  const theme = useTheme();
  const t = useT();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const entries = useVault((s) => s.entries);
  const exportBackup = useVault((s) => s.exportBackup);
  const importBackup = useVault((s) => s.importBackup);

  const [prompt, setPrompt] = useState<Prompt>(null);
  const [pendingFile, setPendingFile] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const doExport = async (password: string) => {
    setPrompt(null);
    setBusy(true);
    let uri: string | null = null;
    try {
      const json = await exportBackup(password);
      if (!json) return;
      const stamp = new Date().toISOString().slice(0, 10);
      uri = `${FileSystem.cacheDirectory}adamas-backup-${stamp}.adamas`;
      await FileSystem.writeAsStringAsync(uri, json);
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: 'application/json', dialogTitle: t('backup.exportTitle') });
      }
      useSettings.getState().set('lastBackupAt', Date.now());
      triggerHaptic('success');
    } catch {
      triggerHaptic('error');
      toast({ message: t('backup.exportError'), icon: 'alert-circle-outline', tone: 'danger' });
    } finally {
      if (uri) await FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => {});
      setBusy(false);
    }
  };

  const pickBackupFile = async () => {
    try {
      const picked = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
      if (picked.canceled || !picked.assets?.[0]) return;
      const content = await new File(picked.assets[0].uri).text();
      setPendingFile(content);
      setPrompt('restore');
    } catch {
      triggerHaptic('error');
      toast({ message: t('backup.restoreError'), icon: 'alert-circle-outline', tone: 'danger' });
    }
  };

  const doRestore = async (password: string) => {
    if (!pendingFile) return;
    setPrompt(null);
    setBusy(true);
    try {
      const result = await readBackup(password, pendingFile);
      if (!result.ok) {
        triggerHaptic('error');
        toast({
          message: t(result.reason === 'wrongPassword' ? 'backup.wrongPassword' : 'backup.restoreError'),
          icon: 'alert-circle-outline',
          tone: 'danger',
        });
        return;
      }
      const count = await importBackup(result.payload);
      // The picked file proves a backup of this data exists.
      useSettings.getState().set('lastBackupAt', Date.now());
      triggerHaptic('success');
      toast({ message: t('backup.restored', { count }), icon: 'checkmark-circle-outline', tone: 'success' });
      router.back();
    } catch {
      triggerHaptic('error');
      toast({ message: t('backup.restoreError'), icon: 'alert-circle-outline', tone: 'danger' });
    } finally {
      setPendingFile(null);
      setBusy(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <View style={[styles.nav, { paddingTop: insets.top + spacing.sm }]}>
        <PressableScale
          haptic="light"
          style={styles.navButton}
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
          onPress={() => router.back()}
        >
          <Ionicons name="chevron-back" size={24} color={theme.colors.text} />
        </PressableScale>
        <Text style={[typo.headline, { color: theme.colors.text }]}>{t('backup.title')}</Text>
        <View style={styles.navButton} />
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xl }]}>
        <Animated.View entering={FadeInDown.springify().damping(18)}>
          <PressableScale haptic="light" onPress={() => setPrompt('export')} disabled={busy || entries.length === 0}>
            <GlassCard style={styles.card}>
              <View style={[styles.icon, { backgroundColor: theme.colors.accentSoft }]}>
                <Ionicons name="download-outline" size={22} color={theme.colors.accent} />
              </View>
              <View style={styles.text}>
                <Text style={[typo.headline, { color: theme.colors.text }]}>{t('backup.export')}</Text>
                <Text style={[typo.caption, { color: theme.colors.textSecondary }]}>{t('backup.exportSub')}</Text>
              </View>
              <Ionicons name="chevron-forward" size={17} color={theme.colors.textTertiary} />
            </GlassCard>
          </PressableScale>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(80).springify().damping(18)}>
          <PressableScale haptic="light" onPress={() => void pickBackupFile()} disabled={busy}>
            <GlassCard style={styles.card}>
              <View style={[styles.icon, { backgroundColor: theme.colors.accentSoft }]}>
                <Ionicons name="cloud-upload-outline" size={22} color={theme.colors.accent} />
              </View>
              <View style={styles.text}>
                <Text style={[typo.headline, { color: theme.colors.text }]}>{t('backup.restore')}</Text>
                <Text style={[typo.caption, { color: theme.colors.textSecondary }]}>{t('backup.restoreSub')}</Text>
              </View>
              <Ionicons name="chevron-forward" size={17} color={theme.colors.textTertiary} />
            </GlassCard>
          </PressableScale>
        </Animated.View>

        <View style={[styles.warning, { borderColor: theme.colors.border }]}>
          <Ionicons name="warning-outline" size={18} color={theme.colors.warning} />
          <Text style={[typo.caption, { color: theme.colors.textSecondary, flex: 1 }]}>{t('backup.warning')}</Text>
        </View>
      </ScrollView>

      <PasswordPromptModal
        visible={prompt === 'export'}
        title={t('backup.exportTitle')}
        hint={t('backup.exportHint')}
        submitLabel={t('backup.export')}
        confirm
        minLength={8}
        onCancel={() => setPrompt(null)}
        onSubmit={(pw) => void doExport(pw)}
      />
      <PasswordPromptModal
        visible={prompt === 'restore'}
        title={t('backup.restoreTitle')}
        hint={t('backup.restoreHint')}
        submitLabel={t('backup.restore')}
        onCancel={() => {
          setPrompt(null);
          setPendingFile(null);
        }}
        onSubmit={(pw) => void doRestore(pw)}
      />
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
  content: { padding: spacing.lg, gap: spacing.md },
  card: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.lg },
  icon: { width: 46, height: 46, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1, gap: 3 },
  warning: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    marginTop: spacing.sm,
  },
});
