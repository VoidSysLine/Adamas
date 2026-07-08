import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, StyleSheet, Text, View } from 'react-native';
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DiamondLogo } from '@/components/ui/DiamondLogo';
import { FormField } from '@/components/ui/FormField';
import { GradientButton } from '@/components/ui/GradientButton';
import { PasswordPromptModal } from '@/components/ui/PasswordPromptModal';
import { PressableScale, triggerHaptic } from '@/components/ui/PressableScale';
import { useToast } from '@/components/ui/Toast';
import { biometricsAvailable } from '@/crypto/vaultService';
import { useT } from '@/i18n';
import { readBackup, type BackupPayload } from '@/lib/backup';
import { useSettings } from '@/store/settingsStore';
import { useVault } from '@/store/vaultStore';
import { spacing, type as typo, useTheme } from '@/theme';

export default function Unlock() {
  const theme = useTheme();
  const t = useT();
  const insets = useSafeAreaInsets();
  const unlockWithPassword = useVault((s) => s.unlockWithPassword);
  const unlockWithBiometrics = useVault((s) => s.unlockWithBiometrics);
  const recoverFromBackup = useVault((s) => s.recoverFromBackup);
  const biometricsEnabled = useSettings((s) => s.biometricsEnabled);
  const toast = useToast();

  const [password, setPassword] = useState('');
  const [recoverStep, setRecoverStep] = useState<'backupPw' | 'newPw' | null>(null);
  const backupFile = useRef<string | null>(null);
  const backupPayload = useRef<BackupPayload | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [canBiometric, setCanBiometric] = useState(false);
  const shake = useSharedValue(0);

  useEffect(() => {
    void biometricsAvailable().then(setCanBiometric);
  }, []);

  const tryBiometric = useCallback(async () => {
    const ok = await unlockWithBiometrics(t('unlock.biometricPrompt'));
    if (ok) triggerHaptic('success');
  }, [unlockWithBiometrics, t]);

  // Offer Face ID / fingerprint immediately when the screen appears — exactly
  // once per lock, no matter how often the deps change while it is visible.
  const autoPrompted = useRef(false);
  useEffect(() => {
    if (canBiometric && biometricsEnabled && !autoPrompted.current) {
      autoPrompted.current = true;
      void tryBiometric();
    }
  }, [canBiometric, biometricsEnabled, tryBiometric]);

  const onUnlock = async () => {
    if (!password || busy) return;
    setBusy(true);
    setError(false);
    const ok = await unlockWithPassword(password);
    setBusy(false);
    if (ok) {
      triggerHaptic('success');
      return;
    }
    setError(true);
    setPassword('');
    triggerHaptic('error');
    shake.value = withSequence(
      withTiming(-10, { duration: 50 }),
      withTiming(10, { duration: 50 }),
      withTiming(-7, { duration: 50 }),
      withTiming(7, { duration: 50 }),
      withTiming(0, { duration: 50 }),
    );
  };

  const shakeStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shake.value }] }));

  /** Step 1: pick the .adamas backup file. */
  const pickBackup = async () => {
    try {
      const picked = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
      if (picked.canceled || !picked.assets?.[0]) return;
      backupFile.current = await new File(picked.assets[0].uri).text();
      setRecoverStep('backupPw');
    } catch {
      triggerHaptic('error');
      toast({ message: t('backup.restoreError'), icon: 'alert-circle-outline', tone: 'danger' });
    }
  };

  /** Step 2: decrypt the backup with its password. */
  const onBackupPassword = async (backupPassword: string) => {
    setRecoverStep(null);
    if (!backupFile.current) return;
    const result = await readBackup(backupPassword, backupFile.current);
    if (!result.ok) {
      triggerHaptic('error');
      toast({
        message: t(result.reason === 'wrongPassword' ? 'backup.wrongPassword' : 'backup.restoreError'),
        icon: 'alert-circle-outline',
        tone: 'danger',
      });
      // Wrong password: reopen the prompt so the user can retry directly.
      if (result.reason === 'wrongPassword') setRecoverStep('backupPw');
      return;
    }
    backupPayload.current = result.payload;
    setRecoverStep('newPw');
  };

  /** Step 3: confirm replacing the locked vault, then rebuild it. */
  const onNewMasterPassword = (newPassword: string) => {
    setRecoverStep(null);
    triggerHaptic('warning');
    Alert.alert(t('recover.replaceTitle'), t('recover.replaceMessage'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('recover.replaceConfirm'),
        style: 'destructive',
        onPress: () => {
          void (async () => {
            const payload = backupPayload.current;
            if (!payload) return;
            setBusy(true);
            try {
              const count = await recoverFromBackup(payload, newPassword);
              triggerHaptic('success');
              toast({ message: t('backup.restored', { count }), icon: 'checkmark-circle-outline', tone: 'success' });
            } catch {
              triggerHaptic('error');
              toast({ message: t('backup.restoreError'), icon: 'alert-circle-outline', tone: 'danger' });
            } finally {
              backupFile.current = null;
              backupPayload.current = null;
              setBusy(false);
            }
          })();
        },
      },
    ]);
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.content, { paddingTop: insets.top + 80, paddingBottom: insets.bottom + 24 }]}>
        <Animated.View entering={FadeInDown.springify().damping(16)} style={styles.hero}>
          <DiamondLogo size={84} />
          <Text style={[typo.title, { color: theme.colors.text, marginTop: spacing.xl }]}>
            {t('unlock.title')}
          </Text>
        </Animated.View>

        <Animated.View style={[styles.form, shakeStyle]}>
          <FormField
            label={t('unlock.placeholder')}
            value={password}
            onChangeText={(text) => {
              setPassword(text);
              setError(false);
            }}
            fieldType="password"
            placeholder={t('unlock.placeholder')}
          />
          {error && (
            <Text style={[typo.caption, { color: theme.colors.danger }]}>{t('unlock.wrongPassword')}</Text>
          )}
          <GradientButton
            label={busy ? t('unlock.unlocking') : t('unlock.unlock')}
            onPress={onUnlock}
            loading={busy}
            disabled={!password}
            haptic="none"
          />
          {canBiometric && (
            <PressableScale
              haptic="light"
              style={[styles.biometric, { borderColor: theme.colors.border }]}
              onPress={tryBiometric}
            >
              <Ionicons
                name={Platform.OS === 'ios' ? 'scan-outline' : 'finger-print-outline'}
                size={20}
                color={theme.colors.accent}
              />
              <Text style={[typo.headline, { color: theme.colors.accent }]}>{t('unlock.biometric')}</Text>
            </PressableScale>
          )}
          <PressableScale haptic="light" style={styles.recover} onPress={() => void pickBackup()}>
            <Ionicons name="archive-outline" size={16} color={theme.colors.textTertiary} />
            <Text style={[typo.caption, { color: theme.colors.textTertiary }]}>{t('recover.link')}</Text>
          </PressableScale>
        </Animated.View>
      </View>

      <PasswordPromptModal
        visible={recoverStep === 'backupPw'}
        title={t('backup.restoreTitle')}
        hint={t('backup.restoreHint')}
        submitLabel={t('common.done')}
        onCancel={() => setRecoverStep(null)}
        onSubmit={(pw) => void onBackupPassword(pw)}
      />
      <PasswordPromptModal
        visible={recoverStep === 'newPw'}
        title={t('recover.newMasterTitle')}
        hint={t('recover.newMasterHint')}
        submitLabel={t('common.save')}
        confirm
        minLength={8}
        onCancel={() => setRecoverStep(null)}
        onSubmit={onNewMasterPassword}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    paddingHorizontal: spacing.xl,
  },
  hero: {
    alignItems: 'center',
    marginBottom: spacing.xxl,
  },
  form: {
    gap: spacing.md,
  },
  biometric: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: 14,
    borderWidth: 1,
  },
  recover: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: spacing.md,
    marginTop: spacing.sm,
  },
});
