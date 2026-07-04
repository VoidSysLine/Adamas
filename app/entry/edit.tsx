import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DateField } from '@/components/ui/DateField';
import { FormField } from '@/components/ui/FormField';
import { GradientButton } from '@/components/ui/GradientButton';
import { PressableScale, triggerHaptic } from '@/components/ui/PressableScale';
import { SelectField } from '@/components/ui/SelectField';
import { StrengthMeter } from '@/components/ui/StrengthMeter';
import { useToast } from '@/components/ui/Toast';
import { fieldsOf } from '@/constants/schema';
import { resolveLanguage, useT } from '@/i18n';
import { DEFAULT_PASSWORD, generatePassword, generatePin } from '@/lib/generator';
import { useSettings } from '@/store/settingsStore';
import { useVault } from '@/store/vaultStore';
import { spacing, type as typo, useTheme } from '@/theme';
import type { EntryDataMap, EntryKind } from '@/types/vault';

const TITLE_EXAMPLES: Partial<Record<EntryKind, string>> = {
  login: 'GitHub',
  identity: 'Max Mustermann',
  creditCard: 'Visa Gold',
  bankAccount: 'Girokonto',
  crypto: 'Bitcoin Wallet',
  wifi: 'Zuhause',
  server: 'Homelab',
  note: 'Tresorcode',
};

/** Create & edit form — fields render dynamically from the kind's schema. */
export default function EditEntry() {
  const params = useLocalSearchParams<{ id?: string; kind?: string }>();
  const theme = useTheme();
  const t = useT();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const toast = useToast();

  const existing = useVault((s) => s.entries.find((e) => e.id === params.id));
  const addEntry = useVault((s) => s.addEntry);
  const updateEntry = useVault((s) => s.updateEntry);

  const language = resolveLanguage(useSettings((s) => s.language));
  const dateLocale = language === 'de' ? 'de-DE' : 'en-US';
  const kind = (existing?.kind ?? params.kind ?? 'login') as EntryKind;
  const fields = fieldsOf(kind);

  const [title, setTitle] = useState(existing?.title ?? '');
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const [data, setData] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    const source = (existing?.data ?? {}) as Record<string, string | undefined>;
    for (const field of fields) initial[field.key] = source[field.key] ?? '';
    return initial;
  });
  const [titleError, setTitleError] = useState(false);

  const setField = (key: string, value: string) => setData((d) => ({ ...d, [key]: value }));

  const passwordKey = useMemo(() => fields.find((f) => f.type === 'password')?.key, [fields]);

  const onSave = () => {
    if (!title.trim()) {
      setTitleError(true);
      triggerHaptic('error');
      return;
    }
    const cleaned: Record<string, string> = {};
    for (const [key, value] of Object.entries(data)) {
      if (value.trim()) cleaned[key] = value.trim();
    }
    if (existing) {
      updateEntry(existing.id, { title, notes, data: cleaned as EntryDataMap[EntryKind] });
    } else {
      addEntry(kind, title, cleaned as EntryDataMap[typeof kind], notes);
    }
    triggerHaptic('success');
    toast({ message: t('toast.saved'), icon: 'checkmark-circle-outline', tone: 'success' });
    router.back();
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.nav}>
        <PressableScale haptic="light" style={styles.navButton} onPress={() => router.back()}>
          <Ionicons name="close" size={24} color={theme.colors.textSecondary} />
        </PressableScale>
        <Text style={[typo.headline, { color: theme.colors.text }]}>
          {existing ? t('edit.editTitle') : t('edit.newTitle', { kind: t(`kinds.${kind}`) })}
        </Text>
        <View style={styles.navButton} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xl }]}
        keyboardShouldPersistTaps="handled"
      >
        <FormField
          label={t('fields.title')}
          value={title}
          onChangeText={(text) => {
            setTitle(text);
            setTitleError(false);
          }}
          placeholder={t('edit.titlePlaceholder', { example: TITLE_EXAMPLES[kind] ?? t(`kinds.${kind}`) })}
          autoFocus={!existing}
        />
        {titleError && <Text style={[typo.caption, { color: theme.colors.danger }]}>{t('edit.required')}</Text>}

        {fields.map((field) => {
          const fieldLabel = t(`fields.${field.label}` as Parameters<typeof t>[0]);
          const hint = field.hint ? t(`hints.${field.hint}` as Parameters<typeof t>[0]) : undefined;

          if (field.type === 'date') {
            return (
              <DateField
                key={field.key}
                label={fieldLabel}
                value={data[field.key] ?? ''}
                onChange={(value) => setField(field.key, value)}
                placeholder={t('edit.pickDate')}
                doneLabel={t('common.done')}
                locale={dateLocale}
                maximumFuture={field.key === 'birthDate'}
              />
            );
          }

          if (field.type === 'select' && field.options) {
            return (
              <SelectField
                key={field.key}
                label={fieldLabel}
                value={data[field.key] ?? ''}
                options={field.options}
                onChange={(value) => setField(field.key, value)}
                labelFor={(key) => t(`options.${key}` as Parameters<typeof t>[0])}
              />
            );
          }

          return (
            <View key={field.key} style={styles.fieldBlock}>
              <FormField
                label={fieldLabel}
                value={data[field.key] ?? ''}
                onChangeText={(text) => setField(field.key, text)}
                fieldType={field.type}
                mask={field.mask}
                sensitive={field.secure}
                placeholder={hint}
                onGenerate={
                  field.generator === 'password'
                    ? () => setField(field.key, generatePassword(DEFAULT_PASSWORD))
                    : field.generator === 'pin'
                      ? () => setField(field.key, generatePin(field.key === 'pin' ? 4 : 6))
                      : undefined
                }
              />
              {field.type === 'password' && field.key === passwordKey && (
                <StrengthMeter password={data[field.key] ?? ''} />
              )}
            </View>
          );
        })}

        <FormField
          label={t('fields.notes')}
          value={notes}
          onChangeText={setNotes}
          fieldType="multiline"
          placeholder={t('edit.notesPlaceholder')}
        />

        <GradientButton label={t('common.save')} onPress={onSave} haptic="none" style={{ marginTop: spacing.sm }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  nav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.md,
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
  fieldBlock: {
    gap: spacing.sm,
  },
});
