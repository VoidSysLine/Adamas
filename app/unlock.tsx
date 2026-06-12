import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, View } from 'react-native';
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
import { PressableScale, triggerHaptic } from '@/components/ui/PressableScale';
import { biometricsAvailable } from '@/crypto/vaultService';
import { useT } from '@/i18n';
import { useSettings } from '@/store/settingsStore';
import { useVault } from '@/store/vaultStore';
import { spacing, type as typo, useTheme } from '@/theme';

export default function Unlock() {
  const theme = useTheme();
  const t = useT();
  const insets = useSafeAreaInsets();
  const unlockWithPassword = useVault((s) => s.unlockWithPassword);
  const unlockWithBiometrics = useVault((s) => s.unlockWithBiometrics);
  const biometricsEnabled = useSettings((s) => s.biometricsEnabled);

  const [password, setPassword] = useState('');
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

  // Offer Face ID / fingerprint immediately when the screen appears.
  useEffect(() => {
    if (canBiometric && biometricsEnabled) void tryBiometric();
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
          {canBiometric && biometricsEnabled && (
            <PressableScale haptic="light" style={styles.biometric} onPress={tryBiometric}>
              <Ionicons
                name={Platform.OS === 'ios' ? 'scan-outline' : 'finger-print-outline'}
                size={20}
                color={theme.colors.accent}
              />
              <Text style={[typo.caption, { color: theme.colors.accent }]}>{t('unlock.biometric')}</Text>
            </PressableScale>
          )}
        </Animated.View>
      </View>
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
  },
});
