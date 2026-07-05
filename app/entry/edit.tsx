import { Ionicons } from '@expo/vector-icons';
import * as Crypto from 'expo-crypto';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DateField } from '@/components/ui/DateField';
import { FormField } from '@/components/ui/FormField';
import { GradientButton } from '@/components/ui/GradientButton';
import { PressableScale, triggerHaptic } from '@/components/ui/PressableScale';
import { QrScannerModal } from '@/components/ui/QrScannerModal';
import { SelectField } from '@/components/ui/SelectField';
import { StrengthMeter } from '@/components/ui/StrengthMeter';
import { useToast } from '@/components/ui/Toast';
import { fieldsOf } from '@/constants/schema';
import { resolveLanguage, useT } from '@/i18n';
import { DEFAULT_PASSWORD, generatePassword, generatePin } from '@/lib/generator';
import { parseTotpScan } from '@/lib/importers/totp';
import { useSettings } from '@/store/settingsStore';
import { useVault } from '@/store/vaultStore';
import { radius, spacing, type as typo, useTheme } from '@/theme';
import type { CustomField, CustomFieldType, EntryDataMap, EntryKind } from '@/types/vault';

/** Types offered in the custom-field composer, in display order. */
const CUSTOM_FIELD_TYPES: CustomFieldType[] = [
  'text',
  'password',
  'pin',
  'date',
  'code',
  'url',
  'email',
  'phone',
  'number',
  'multiline',
];

const TITLE_EXAMPLES: Partial<Record<EntryKind, string>> = {
  login: 'GitHub',
  identity: 'Max Mustermann',
  vehicle: 'BMW 320d',
  pension: 'Deutsche Rentenversicherung',
  creditCard: 'Visa Gold',
  bankAccount: 'Girokonto',
  crypto: 'Bitcoin Wallet',
  wifi: 'Zuhause',
  server: 'Homelab',
  softwareLicense: 'Windows 11 Pro',
  apiKey: 'OpenAI API',
  accessCode: 'Haustür',
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

  const [scanningKey, setScanningKey] = useState<string | null>(null);

  const [customFields, setCustomFields] = useState<CustomField[]>(existing?.customFields ?? []);
  const [composerOpen, setComposerOpen] = useState(false);
  const [composerName, setComposerName] = useState('');
  const [composerType, setComposerType] = useState<CustomFieldType>('text');

  const setField = (key: string, value: string) => setData((d) => ({ ...d, [key]: value }));

  const setCustomValue = (id: string, value: string) =>
    setCustomFields((list) => list.map((f) => (f.id === id ? { ...f, value } : f)));

  const addCustomField = () => {
    const label = composerName.trim();
    if (!label) return;
    setCustomFields((list) => [...list, { id: Crypto.randomUUID(), label, type: composerType, value: '' }]);
    setComposerName('');
    setComposerType('text');
    setComposerOpen(false);
    triggerHaptic('success');
  };

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
    const cleanedCustom = customFields
      .map((f) => ({ ...f, label: f.label.trim(), value: f.value.trim() }))
      .filter((f) => f.label.length > 0);
    if (existing) {
      updateEntry(existing.id, {
        title,
        notes,
        data: cleaned as EntryDataMap[EntryKind],
        customFields: cleanedCustom,
      });
    } else {
      addEntry(kind, title, cleaned as EntryDataMap[typeof kind], notes, cleanedCustom);
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
                maximumFuture={field.key === 'birthDate' || field.key === 'purchaseDate'}
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
                onScan={field.type === 'totp' ? () => setScanningKey(field.key) : undefined}
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

        {(customFields.length > 0 || composerOpen) && (
          <Text style={[typo.micro, { color: theme.colors.textTertiary, marginTop: spacing.sm }]}>
            {t('custom.sectionTitle')}
          </Text>
        )}

        {customFields.map((field) => (
          <View key={field.id} style={styles.customRow}>
            <View style={{ flex: 1 }}>
              {field.type === 'date' ? (
                <DateField
                  label={field.label}
                  value={field.value}
                  onChange={(value) => setCustomValue(field.id, value)}
                  placeholder={t('edit.pickDate')}
                  doneLabel={t('common.done')}
                  locale={dateLocale}
                />
              ) : (
                <FormField
                  label={field.label}
                  value={field.value}
                  onChangeText={(value) => setCustomValue(field.id, value)}
                  fieldType={field.type}
                  sensitive={field.type === 'password' || field.type === 'pin'}
                  onGenerate={
                    field.type === 'password'
                      ? () => setCustomValue(field.id, generatePassword(DEFAULT_PASSWORD))
                      : field.type === 'pin'
                        ? () => setCustomValue(field.id, generatePin(6))
                        : undefined
                  }
                />
              )}
            </View>
            <PressableScale
              haptic="light"
              style={styles.customDelete}
              onPress={() => setCustomFields((list) => list.filter((f) => f.id !== field.id))}
            >
              <Ionicons name="trash-outline" size={18} color={theme.colors.danger} />
            </PressableScale>
          </View>
        ))}

        {composerOpen ? (
          <View style={[styles.composer, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <FormField
              label={t('custom.nameLabel')}
              value={composerName}
              onChangeText={setComposerName}
              placeholder={t('custom.namePlaceholder')}
              autoFocus
            />
            <SelectField
              label={t('custom.typeLabel')}
              value={composerType}
              options={CUSTOM_FIELD_TYPES.map((value) => ({ value, label: value }))}
              onChange={(value) => setComposerType((value || 'text') as CustomFieldType)}
              labelFor={(key) => t(`customTypes.${key}` as Parameters<typeof t>[0])}
            />
            <View style={styles.composerActions}>
              <PressableScale
                haptic="light"
                style={[styles.composerCancel, { borderColor: theme.colors.border }]}
                onPress={() => {
                  setComposerOpen(false);
                  setComposerName('');
                }}
              >
                <Text style={[typo.caption, { color: theme.colors.textSecondary }]}>{t('common.cancel')}</Text>
              </PressableScale>
              <PressableScale
                haptic="medium"
                style={[
                  styles.composerConfirm,
                  { backgroundColor: theme.colors.accentSoft, opacity: composerName.trim() ? 1 : 0.5 },
                ]}
                disabled={!composerName.trim()}
                onPress={addCustomField}
              >
                <Text style={[typo.caption, { color: theme.colors.accent }]}>{t('custom.confirm')}</Text>
              </PressableScale>
            </View>
          </View>
        ) : (
          <PressableScale
            haptic="light"
            style={[styles.addCustomButton, { borderColor: theme.colors.border }]}
            onPress={() => setComposerOpen(true)}
          >
            <Ionicons name="add-circle-outline" size={18} color={theme.colors.accent} />
            <Text style={[typo.caption, { color: theme.colors.accent }]}>{t('custom.add')}</Text>
          </PressableScale>
        )}

        <FormField
          label={t('fields.notes')}
          value={notes}
          onChangeText={setNotes}
          fieldType="multiline"
          placeholder={t('edit.notesPlaceholder')}
        />

        <GradientButton label={t('common.save')} onPress={onSave} haptic="none" style={{ marginTop: spacing.sm }} />
      </ScrollView>

      <QrScannerModal
        visible={scanningKey !== null}
        onClose={() => setScanningKey(null)}
        title={t('scanner.totpTitle')}
        hint={t('scanner.totpHint')}
        onScan={(value) => {
          const parsed = parseTotpScan(value);
          if (!parsed) return false;
          if (scanningKey) setField(scanningKey, parsed.seed);
          setScanningKey(null);
          toast({ message: t('scanner.totpAdded'), icon: 'shield-checkmark-outline', tone: 'success' });
          return true;
        }}
      />
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
  customRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
  customDelete: {
    width: 40,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  composer: {
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.lg,
    gap: spacing.md,
  },
  composerActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  composerCancel: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.md - 2,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  composerConfirm: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.md - 2,
    borderRadius: radius.md,
  },
  addCustomButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: spacing.md - 2,
    borderRadius: radius.md,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
});
