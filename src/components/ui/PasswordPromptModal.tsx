import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { FormField } from './FormField';
import { GradientButton } from './GradientButton';
import { PressableScale } from './PressableScale';
import { useT } from '@/i18n';
import { radius, spacing, type as typo, useTheme } from '@/theme';

interface Props {
  visible: boolean;
  title: string;
  hint?: string;
  submitLabel: string;
  /** Require a second matching field (for setting a new password). */
  confirm?: boolean;
  /** Minimum length; shows an inline error otherwise. */
  minLength?: number;
  onCancel: () => void;
  onSubmit: (password: string) => void;
}

/** Centered password prompt used for backup encryption / restore / re-auth. */
export function PasswordPromptModal({
  visible,
  title,
  hint,
  submitLabel,
  confirm,
  minLength = 1,
  onCancel,
  onSubmit,
}: Props) {
  const theme = useTheme();
  const t = useT();
  const [value, setValue] = useState('');
  const [confirmValue, setConfirmValue] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setValue('');
      setConfirmValue('');
      setError(null);
    }
  }, [visible]);

  const submit = () => {
    if (value.length < minLength) {
      setError(t('backup.tooShort', { min: minLength }));
      return;
    }
    if (confirm && value !== confirmValue) {
      setError(t('onboarding.mismatch'));
      return;
    }
    onSubmit(value);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.backdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onCancel} />
          <View style={[styles.card, { backgroundColor: theme.colors.background, borderColor: theme.colors.border }]}>
            <Text style={[typo.headline, { color: theme.colors.text, textAlign: 'center' }]}>{title}</Text>
            {hint && (
              <Text style={[typo.caption, { color: theme.colors.textSecondary, textAlign: 'center' }]}>{hint}</Text>
            )}
            <FormField
              label={t('backup.password')}
              value={value}
              onChangeText={(text) => {
                setValue(text);
                setError(null);
              }}
              fieldType="password"
              autoFocus
            />
            {confirm && (
              <FormField
                label={t('onboarding.confirmPlaceholder')}
                value={confirmValue}
                onChangeText={(text) => {
                  setConfirmValue(text);
                  setError(null);
                }}
                fieldType="password"
              />
            )}
            {error && <Text style={[typo.caption, { color: theme.colors.danger }]}>{error}</Text>}
            <GradientButton label={submitLabel} onPress={submit} haptic="medium" disabled={!value} />
            <PressableScale haptic="light" style={styles.cancel} onPress={onCancel}>
              <Text style={[typo.caption, { color: theme.colors.textSecondary }]}>{t('common.cancel')}</Text>
            </PressableScale>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.xl,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  card: {
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.lg,
    gap: spacing.md,
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
  },
  cancel: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
});
