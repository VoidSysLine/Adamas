import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GlassCard } from '@/components/ui/GlassCard';
import { GradientButton } from '@/components/ui/GradientButton';
import { PressableScale, triggerHaptic } from '@/components/ui/PressableScale';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { StrengthMeter } from '@/components/ui/StrengthMeter';
import { useCopy } from '@/components/ui/Toast';
import { useT } from '@/i18n';
import {
  DEFAULT_PASSPHRASE,
  DEFAULT_PASSWORD,
  generatePassphrase,
  generatePassword,
  generatePin,
  passphraseEntropyBits,
  passwordEntropyBits,
  type PassphraseOptions,
  type PasswordOptions,
} from '@/lib/generator';
import { fonts, radius, spacing, type as typo, useTheme } from '@/theme';

type Mode = 'password' | 'passphrase' | 'pin';

const SEPARATORS = ['-', '.', '_', ' '] as const;

/** Colorize digits and symbols so the structure of a password is scannable. */
function ResultText({ value }: { value: string }) {
  const theme = useTheme();
  return (
    <Text style={[styles.result, { fontFamily: fonts.mono, color: theme.colors.text }]}>
      {[...value].map((char, i) => {
        let color = theme.colors.text;
        if (/\d/.test(char)) color = theme.colors.accent;
        else if (/[^a-zA-Z0-9]/.test(char)) color = theme.colors.gold;
        return (
          <Text key={`${i}-${char}`} style={{ color }}>
            {char}
          </Text>
        );
      })}
    </Text>
  );
}

function ToggleRow({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  const theme = useTheme();
  return (
    <View style={styles.toggleRow}>
      <Text style={[typo.body, { color: theme.colors.text, flex: 1 }]}>{label}</Text>
      <Switch
        value={value}
        onValueChange={(v) => {
          triggerHaptic('selection');
          onChange(v);
        }}
        trackColor={{ true: theme.colors.accent, false: theme.colors.surfaceAlt }}
        thumbColor="#FFFFFF"
      />
    </View>
  );
}

export default function GeneratorScreen() {
  const theme = useTheme();
  const t = useT();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const copy = useCopy();

  const [mode, setMode] = useState<Mode>('password');
  const [passwordOptions, setPasswordOptions] = useState<PasswordOptions>(DEFAULT_PASSWORD);
  const [passphraseOptions, setPassphraseOptions] = useState<PassphraseOptions>(DEFAULT_PASSPHRASE);
  const [pinLength, setPinLength] = useState(6);
  const [result, setResult] = useState('');

  const regenerate = useCallback(
    (haptic = false) => {
      if (haptic) triggerHaptic('medium');
      if (mode === 'password') setResult(generatePassword(passwordOptions));
      else if (mode === 'passphrase') setResult(generatePassphrase(passphraseOptions));
      else setResult(generatePin(pinLength));
    },
    [mode, passwordOptions, passphraseOptions, pinLength],
  );

  // Live regeneration while sliders/toggles change.
  useEffect(() => {
    regenerate();
  }, [regenerate]);

  const entropy =
    mode === 'password'
      ? passwordEntropyBits(passwordOptions)
      : mode === 'passphrase'
        ? passphraseEntropyBits(passphraseOptions)
        : Math.round(pinLength * Math.log2(10));

  const setPw = <K extends keyof PasswordOptions>(key: K, value: PasswordOptions[K]) =>
    setPasswordOptions((o) => ({ ...o, [key]: value }));
  const setPp = <K extends keyof PassphraseOptions>(key: K, value: PassphraseOptions[K]) =>
    setPassphraseOptions((o) => ({ ...o, [key]: value }));

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
        <Text style={[typo.headline, { color: theme.colors.text }]}>{t('generator.title')}</Text>
        <View style={styles.navButton} />
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xl }]}>
        <SegmentedControl<Mode>
          options={[
            { value: 'password', label: t('generator.password') },
            { value: 'passphrase', label: t('generator.passphrase') },
            { value: 'pin', label: t('generator.pin') },
          ]}
          value={mode}
          onChange={setMode}
        />

        <GlassCard style={styles.resultCard}>
          <Animated.View key={result} entering={FadeIn.duration(160)}>
            <ResultText value={result} />
          </Animated.View>
          <Text style={[typo.caption, { color: theme.colors.textTertiary }]}>
            {t('generator.entropy', { bits: entropy })}
          </Text>
          <StrengthMeter password={result} />
          <View style={styles.resultActions}>
            <PressableScale
              haptic="none"
              style={[styles.secondaryButton, { borderColor: theme.colors.border }]}
              onPress={() => regenerate(true)}
            >
              <Ionicons name="refresh" size={17} color={theme.colors.text} />
              <Text style={[typo.caption, { color: theme.colors.text }]}>{t('generator.regenerate')}</Text>
            </PressableScale>
            <GradientButton
              label={t('generator.copy')}
              onPress={() => void copy(t(`generator.${mode}`), result)}
              haptic="none"
              style={{ flex: 1 }}
            />
          </View>
        </GlassCard>

        <GlassCard style={styles.optionsCard}>
          {mode === 'password' && (
            <>
              <View style={styles.sliderHeader}>
                <Text style={[typo.body, { color: theme.colors.text }]}>{t('generator.length')}</Text>
                <Text style={[typo.headline, { color: theme.colors.accent, fontFamily: fonts.mono }]}>
                  {passwordOptions.length}
                </Text>
              </View>
              <Slider
                minimumValue={8}
                maximumValue={64}
                step={1}
                value={passwordOptions.length}
                onValueChange={(v: number) => setPw('length', Math.round(v))}
                minimumTrackTintColor={theme.colors.accent}
                maximumTrackTintColor={theme.colors.surfaceAlt}
                thumbTintColor={theme.colors.accent}
              />
              <ToggleRow label={t('generator.uppercase')} value={passwordOptions.uppercase} onChange={(v) => setPw('uppercase', v)} />
              <ToggleRow label={t('generator.lowercase')} value={passwordOptions.lowercase} onChange={(v) => setPw('lowercase', v)} />
              <ToggleRow label={t('generator.digits')} value={passwordOptions.digits} onChange={(v) => setPw('digits', v)} />
              <ToggleRow label={t('generator.symbols')} value={passwordOptions.symbols} onChange={(v) => setPw('symbols', v)} />
              <ToggleRow
                label={t('generator.excludeAmbiguous')}
                value={passwordOptions.excludeAmbiguous}
                onChange={(v) => setPw('excludeAmbiguous', v)}
              />
            </>
          )}

          {mode === 'passphrase' && (
            <>
              <View style={styles.sliderHeader}>
                <Text style={[typo.body, { color: theme.colors.text }]}>{t('generator.words')}</Text>
                <Text style={[typo.headline, { color: theme.colors.accent, fontFamily: fonts.mono }]}>
                  {passphraseOptions.words}
                </Text>
              </View>
              <Slider
                minimumValue={3}
                maximumValue={10}
                step={1}
                value={passphraseOptions.words}
                onValueChange={(v: number) => setPp('words', Math.round(v))}
                minimumTrackTintColor={theme.colors.accent}
                maximumTrackTintColor={theme.colors.surfaceAlt}
                thumbTintColor={theme.colors.accent}
              />
              <View style={styles.toggleRow}>
                <Text style={[typo.body, { color: theme.colors.text, flex: 1 }]}>{t('generator.separator')}</Text>
                <View style={styles.separatorRow}>
                  {SEPARATORS.map((sep) => {
                    const active = passphraseOptions.separator === sep;
                    return (
                      <PressableScale
                        key={sep}
                        haptic="selection"
                        style={[
                          styles.separatorChip,
                          {
                            backgroundColor: active ? theme.colors.accentSoft : theme.colors.surfaceAlt,
                            borderColor: active ? theme.colors.accent : theme.colors.border,
                          },
                        ]}
                        onPress={() => setPp('separator', sep)}
                      >
                        <Text style={{ color: active ? theme.colors.accent : theme.colors.textSecondary, fontFamily: fonts.mono }}>
                          {sep === ' ' ? '␣' : sep}
                        </Text>
                      </PressableScale>
                    );
                  })}
                </View>
              </View>
              <ToggleRow
                label={t('generator.capitalizeWords')}
                value={passphraseOptions.capitalize}
                onChange={(v) => setPp('capitalize', v)}
              />
              <ToggleRow
                label={t('generator.includeNumber')}
                value={passphraseOptions.includeNumber}
                onChange={(v) => setPp('includeNumber', v)}
              />
            </>
          )}

          {mode === 'pin' && (
            <>
              <View style={styles.sliderHeader}>
                <Text style={[typo.body, { color: theme.colors.text }]}>{t('generator.length')}</Text>
                <Text style={[typo.headline, { color: theme.colors.accent, fontFamily: fonts.mono }]}>{pinLength}</Text>
              </View>
              <Slider
                minimumValue={4}
                maximumValue={12}
                step={1}
                value={pinLength}
                onValueChange={(v: number) => setPinLength(Math.round(v))}
                minimumTrackTintColor={theme.colors.accent}
                maximumTrackTintColor={theme.colors.surfaceAlt}
                thumbTintColor={theme.colors.accent}
              />
            </>
          )}
        </GlassCard>
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
  resultCard: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  result: {
    fontSize: 19,
    fontWeight: '600',
    lineHeight: 28,
  },
  resultActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 54,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  optionsCard: {
    padding: spacing.lg,
    gap: spacing.sm,
  },
  sliderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  separatorRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  separatorChip: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
