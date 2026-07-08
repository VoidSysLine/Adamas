import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DiamondLogo } from '@/components/ui/DiamondLogo';
import { FormField } from '@/components/ui/FormField';
import { GradientButton } from '@/components/ui/GradientButton';
import { StrengthMeter } from '@/components/ui/StrengthMeter';
import { triggerHaptic } from '@/components/ui/PressableScale';
import { useT } from '@/i18n';
import { useVault } from '@/store/vaultStore';
import { fonts, spacing, type as typo, useTheme } from '@/theme';

export default function Onboarding() {
  const theme = useTheme();
  const t = useT();
  const insets = useSafeAreaInsets();
  const createVault = useVault((s) => s.createVault);

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onCreate = async () => {
    if (password.length < 8) {
      setError(t('onboarding.tooShort'));
      triggerHaptic('error');
      return;
    }
    if (password !== confirm) {
      setError(t('onboarding.mismatch'));
      triggerHaptic('error');
      return;
    }
    setError(null);
    setBusy(true);
    try {
      await createVault(password);
      triggerHaptic('success');
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 48, paddingBottom: insets.bottom + 24 },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <Animated.View entering={FadeInDown.springify().damping(16)} style={styles.hero}>
          <DiamondLogo />
          <Text style={[typo.caption, { color: theme.colors.textSecondary, marginTop: spacing.xl }]}>
            {t('onboarding.welcome')}
          </Text>
          <Text style={[typo.display, styles.wordmark, { color: theme.colors.text }]}>ADAMAS</Text>
          <Text style={[typo.body, styles.tagline, { color: theme.colors.textSecondary }]}>
            {t('onboarding.tagline')}
          </Text>
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(200).springify().damping(16)} style={styles.form}>
          <Text style={[typo.headline, { color: theme.colors.text }]}>{t('onboarding.createMaster')}</Text>
          <Text style={[typo.caption, { color: theme.colors.textTertiary }]}>{t('onboarding.masterHint')}</Text>
          <FormField
            label={t('unlock.placeholder')}
            value={password}
            onChangeText={setPassword}
            fieldType="password"
            placeholder={t('onboarding.masterPlaceholder')}
          />
          <StrengthMeter password={password} />
          <FormField
            label={t('onboarding.confirmPlaceholder')}
            value={confirm}
            onChangeText={setConfirm}
            fieldType="password"
            placeholder={t('onboarding.confirmPlaceholder')}
            returnKeyType="go"
            onSubmitEditing={() => void onCreate()}
          />
          {error && <Text style={[typo.caption, { color: theme.colors.danger }]}>{error}</Text>}
          <GradientButton
            label={busy ? t('onboarding.creating') : t('onboarding.createVault')}
            onPress={onCreate}
            loading={busy}
            disabled={!password || !confirm}
            haptic="none"
            style={{ marginTop: spacing.sm }}
          />
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    paddingHorizontal: spacing.xl,
  },
  hero: {
    alignItems: 'center',
    marginBottom: spacing.xxl,
  },
  wordmark: {
    fontFamily: fonts.display,
    letterSpacing: 8,
    paddingLeft: 8,
    marginTop: 4,
  },
  tagline: {
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  form: {
    gap: spacing.md,
  },
});
