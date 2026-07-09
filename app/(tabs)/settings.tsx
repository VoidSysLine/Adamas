import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GlassCard } from '@/components/ui/GlassCard';
import { PasswordPromptModal } from '@/components/ui/PasswordPromptModal';
import { PressableScale, triggerHaptic } from '@/components/ui/PressableScale';
import { PrismGem } from '@/components/ui/PrismGem';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { useToast } from '@/components/ui/Toast';
import { biometricsAvailable } from '@/crypto/vaultService';
import { resolveLanguage, useT } from '@/i18n';
import { formatTimestamp } from '@/lib/dates';
import {
  useSettings,
  type AutoLockPref,
  type ClipboardClearPref,
  type LanguagePref,
  type ThemePref,
} from '@/store/settingsStore';
import { useVault } from '@/store/vaultStore';
import { radius, spacing, type as typo, useTheme } from '@/theme';
import type { IoniconName } from '@/constants/schema';

const APP_ICONS: { id: 'obsidian' | 'ice' | 'gold'; colors: [string, string] }[] = [
  { id: 'obsidian', colors: ['#1B2030', '#06070D'] },
  { id: 'ice', colors: ['#FCFDFF', '#E2E8F1'] },
  { id: 'gold', colors: ['#F3DC99', '#B98A3F'] },
];

const AUTO_LOCK_OPTIONS: AutoLockPref[] = [0, 1, 5, 15, -1];
const CLIPBOARD_OPTIONS: ClipboardClearPref[] = [20, 45, 90, 0];

/** Section: micro label above a GlassCard that hosts the rows. */
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const theme = useTheme();
  return (
    <View style={styles.section}>
      <Text style={[typo.micro, styles.sectionLabel, { color: theme.colors.textTertiary }]}>{title}</Text>
      <GlassCard style={styles.sectionCard}>{children}</GlassCard>
    </View>
  );
}

/** Hairline divider, inset so it aligns with the row text (not the icon). */
function RowDivider() {
  const theme = useTheme();
  return <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />;
}

interface RowProps {
  icon: IoniconName;
  title: string;
  subtitle?: string;
  danger?: boolean;
  onPress?: () => void;
  /** Right-hand accessory (Switch, value+chevron, …). */
  right?: React.ReactNode;
}

/** The one row layout every setting uses: icon tile · title/subtitle · accessory. */
function Row({ icon, title, subtitle, danger, onPress, right }: RowProps) {
  const theme = useTheme();
  const tint = danger ? theme.colors.danger : theme.colors.accent;
  const content = (
    <View style={styles.row}>
      <View style={[styles.rowIcon, { backgroundColor: danger ? 'rgba(244,63,94,0.12)' : theme.colors.accentSoft }]}>
        <Ionicons name={icon} size={16} color={tint} />
      </View>
      <View style={styles.rowText}>
        <Text style={[typo.body, { color: danger ? theme.colors.danger : theme.colors.text }]} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={[typo.caption, { color: theme.colors.textTertiary }]} numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right}
    </View>
  );
  if (!onPress) return content;
  return (
    <PressableScale haptic="light" accessibilityRole="button" accessibilityLabel={title} onPress={onPress}>
      {content}
    </PressableScale>
  );
}

/** Right accessory: current value + disclosure chevron. */
function RowValue({ value }: { value: string }) {
  const theme = useTheme();
  return (
    <View style={styles.rowValue}>
      <Text style={[typo.caption, { color: theme.colors.textSecondary }]}>{value}</Text>
      <Ionicons name="chevron-forward" size={15} color={theme.colors.textTertiary} />
    </View>
  );
}

/** Consistently styled Switch accessory. */
function RowSwitch({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  const theme = useTheme();
  return (
    <Switch
      value={value}
      onValueChange={(v) => {
        triggerHaptic('selection');
        onChange(v);
      }}
      trackColor={{ true: theme.colors.accent, false: theme.colors.surfaceAlt }}
      thumbColor="#FFFFFF"
    />
  );
}

interface SelectSheetProps<T> {
  visible: boolean;
  title: string;
  options: { value: T; label: string }[];
  selected: T;
  onSelect: (value: T) => void;
  onClose: () => void;
}

/** Centered option picker (same modal pattern as DateField/PasswordPrompt). */
function SelectSheet<T extends string | number>({ visible, title, options, selected, onSelect, onClose }: SelectSheetProps<T>) {
  const theme = useTheme();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.sheetBackdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={[styles.sheetCard, { backgroundColor: theme.colors.background, borderColor: theme.colors.border }]}>
          <Text style={[typo.headline, { color: theme.colors.text, textAlign: 'center', marginBottom: spacing.sm }]}>
            {title}
          </Text>
          {options.map((option) => {
            const active = option.value === selected;
            return (
              <PressableScale
                key={String(option.value)}
                haptic="selection"
                accessibilityRole="button"
                accessibilityLabel={option.label}
                style={[styles.sheetOption, active && { backgroundColor: theme.colors.accentSoft }]}
                onPress={() => {
                  onSelect(option.value);
                  onClose();
                }}
              >
                <Text style={[typo.body, { color: active ? theme.colors.accent : theme.colors.text, flex: 1 }]}>
                  {option.label}
                </Text>
                {active && <Ionicons name="checkmark" size={18} color={theme.colors.accent} />}
              </PressableScale>
            );
          })}
        </View>
      </View>
    </Modal>
  );
}

export default function SettingsScreen() {
  const theme = useTheme();
  const t = useT();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const toast = useToast();
  const settings = useSettings();
  const lock = useVault((s) => s.lock);
  const erase = useVault((s) => s.erase);
  const trashCount = useVault((s) => s.trash.length);
  const language = resolveLanguage(settings.language);

  const changeMasterPassword = useVault((s) => s.changeMasterPassword);
  const [pwStep, setPwStep] = React.useState<'current' | 'next' | null>(null);
  const currentPw = React.useRef('');
  const [sheet, setSheet] = React.useState<'autoLock' | 'clipboard' | null>(null);

  // Hide the biometric rows on devices without Face ID/Touch ID/passcode.
  const [canBiometric, setCanBiometric] = React.useState(true);
  React.useEffect(() => {
    void biometricsAvailable().then(setCanBiometric);
  }, []);

  const autoLockLabel = (value: AutoLockPref) =>
    value === 0 ? t('settings.autoLockNow') : value === -1 ? t('settings.autoLockNever') : t('settings.autoLockMinutes', { min: value });

  const clipboardLabel = (value: ClipboardClearPref) =>
    value === 0 ? t('settings.autoLockNever') : t('settings.clipboardSeconds', { s: value });

  const onChangePassword = async (next: string) => {
    setPwStep(null);
    const result = await changeMasterPassword(currentPw.current, next);
    currentPw.current = '';
    if (result === 'ok') {
      triggerHaptic('success');
      toast({ message: t('settings.passwordChanged'), icon: 'checkmark-circle-outline', tone: 'success' });
    } else {
      triggerHaptic('error');
      toast({
        message: t(result === 'wrongCurrent' ? 'settings.wrongCurrent' : 'backup.exportError'),
        icon: 'alert-circle-outline',
        tone: 'danger',
      });
    }
  };

  const onErase = () => {
    triggerHaptic('warning');
    Alert.alert(t('settings.eraseConfirmTitle'), t('settings.eraseConfirmMessage'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.delete'), style: 'destructive', onPress: () => void erase() },
    ]);
  };

  return (
    <>
      <ScrollView
        style={{ backgroundColor: theme.colors.background }}
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + spacing.md, paddingBottom: insets.bottom + 110 },
        ]}
      >
        <Text style={[typo.display, { color: theme.colors.text, marginBottom: spacing.lg }]}>
          {t('settings.title')}
        </Text>

        <Section title={t('settings.appearance')}>
          <View style={styles.controlBlock}>
            <Text style={[typo.caption, { color: theme.colors.textSecondary }]}>{t('settings.theme')}</Text>
            <SegmentedControl<ThemePref>
              options={[
                { value: 'system', label: t('settings.themeSystem') },
                { value: 'dark', label: t('settings.themeDark') },
                { value: 'light', label: t('settings.themeLight') },
              ]}
              value={settings.theme}
              onChange={(v) => settings.set('theme', v)}
            />
          </View>
          <RowDivider />
          <View style={styles.controlBlock}>
            <Text style={[typo.caption, { color: theme.colors.textSecondary }]}>{t('settings.language')}</Text>
            <SegmentedControl<LanguagePref>
              options={[
                { value: 'system', label: t('settings.themeSystem') },
                { value: 'de', label: 'Deutsch' },
                { value: 'en', label: 'English' },
              ]}
              value={settings.language}
              onChange={(v) => settings.set('language', v)}
            />
          </View>
          <RowDivider />
          <View style={styles.controlBlock}>
            <Text style={[typo.caption, { color: theme.colors.textSecondary }]}>{t('settings.appIcon')}</Text>
            <View style={styles.iconRow}>
              {APP_ICONS.map((icon) => {
                const active = settings.appIcon === icon.id;
                return (
                  <PressableScale
                    key={icon.id}
                    haptic="selection"
                    accessibilityRole="button"
                    accessibilityLabel={icon.id}
                    onPress={() => settings.set('appIcon', icon.id)}
                  >
                    <View style={[styles.iconShell, { borderColor: active ? theme.colors.accent : 'transparent' }]}>
                      <LinearGradient
                        colors={icon.colors}
                        start={{ x: 0.3, y: 0 }}
                        end={{ x: 0.7, y: 1 }}
                        style={styles.iconPreview}
                      >
                        <PrismGem size={38} detail="flat" />
                      </LinearGradient>
                    </View>
                  </PressableScale>
                );
              })}
            </View>
            <Text style={[typo.caption, { color: theme.colors.textTertiary }]}>{t('settings.appIconHint')}</Text>
          </View>
        </Section>

        <Section title={t('settings.security')}>
          {canBiometric && (
            <>
              <Row
                icon="finger-print-outline"
                title={t('settings.biometrics')}
                right={<RowSwitch value={settings.biometricsEnabled} onChange={(v) => settings.set('biometricsEnabled', v)} />}
              />
              <RowDivider />
              <Row
                icon="eye-off-outline"
                title={t('settings.revealAuth')}
                subtitle={t('settings.revealAuthSub')}
                right={<RowSwitch value={settings.revealAuth} onChange={(v) => settings.set('revealAuth', v)} />}
              />
              <RowDivider />
            </>
          )}
          <Row
            icon="time-outline"
            title={t('settings.autoLock')}
            onPress={() => setSheet('autoLock')}
            right={<RowValue value={autoLockLabel(settings.autoLock)} />}
          />
          <RowDivider />
          <Row
            icon="clipboard-outline"
            title={t('settings.clipboardClear')}
            onPress={() => setSheet('clipboard')}
            right={<RowValue value={clipboardLabel(settings.clipboardClear)} />}
          />
          <RowDivider />
          <Row
            icon="key-outline"
            title={t('settings.changePassword')}
            onPress={() => setPwStep('current')}
            right={<Ionicons name="chevron-forward" size={15} color={theme.colors.textTertiary} />}
          />
          <RowDivider />
          <Row
            icon="lock-closed-outline"
            title={t('settings.lockNow')}
            onPress={() => {
              lock();
              toast({ message: t('toast.locked'), icon: 'lock-closed-outline' });
            }}
          />
        </Section>

        <Section title={t('settings.privacy')}>
          <Row
            icon="earth-outline"
            title={t('settings.brandIcons')}
            subtitle={t('settings.brandIconsSub')}
            right={<RowSwitch value={settings.brandIcons} onChange={(v) => settings.set('brandIcons', v)} />}
          />
        </Section>

        <Section title={t('settings.data')}>
          <Row
            icon="archive-outline"
            title={t('backup.manage')}
            subtitle={
              settings.lastBackupAt
                ? t('settings.lastBackupOn', { date: formatTimestamp(settings.lastBackupAt, language) })
                : t('settings.lastBackupNever')
            }
            onPress={() => router.push('/backup')}
            right={<Ionicons name="chevron-forward" size={15} color={theme.colors.textTertiary} />}
          />
          <RowDivider />
          <Row
            icon="trash-outline"
            title={t('trash.title')}
            subtitle={trashCount > 0 ? t('settings.trashCount', { count: trashCount }) : undefined}
            onPress={() => router.push('/trash')}
            right={<Ionicons name="chevron-forward" size={15} color={theme.colors.textTertiary} />}
          />
        </Section>

        <Section title={t('settings.dangerZone')}>
          <Row icon="trash-outline" title={t('settings.eraseVault')} danger onPress={onErase} />
        </Section>

        <Text style={[typo.caption, styles.about, { color: theme.colors.textTertiary }]}>
          {t('settings.about')}
        </Text>
      </ScrollView>

      <SelectSheet<AutoLockPref>
        visible={sheet === 'autoLock'}
        title={t('settings.autoLock')}
        options={AUTO_LOCK_OPTIONS.map((value) => ({ value, label: autoLockLabel(value) }))}
        selected={settings.autoLock}
        onSelect={(v) => settings.set('autoLock', v)}
        onClose={() => setSheet(null)}
      />
      <SelectSheet<ClipboardClearPref>
        visible={sheet === 'clipboard'}
        title={t('settings.clipboardClear')}
        options={CLIPBOARD_OPTIONS.map((value) => ({ value, label: clipboardLabel(value) }))}
        selected={settings.clipboardClear}
        onSelect={(v) => settings.set('clipboardClear', v)}
        onClose={() => setSheet(null)}
      />

      <PasswordPromptModal
        visible={pwStep === 'current'}
        title={t('settings.changePassword')}
        hint={t('settings.currentPwHint')}
        submitLabel={t('common.done')}
        onCancel={() => setPwStep(null)}
        onSubmit={(pw) => {
          currentPw.current = pw;
          setPwStep('next');
        }}
      />
      <PasswordPromptModal
        visible={pwStep === 'next'}
        title={t('settings.newPassword')}
        hint={t('onboarding.masterHint')}
        submitLabel={t('common.save')}
        confirm
        minLength={8}
        onCancel={() => {
          setPwStep(null);
          currentPw.current = '';
        }}
        onSubmit={(pw) => void onChangePassword(pw)}
      />
    </>
  );
}

const ICON_SIZE = 30;

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.lg,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionLabel: {
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
  },
  sectionCard: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
  },
  controlBlock: {
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md - 2,
    minHeight: 52,
  },
  rowIcon: {
    width: ICON_SIZE,
    height: ICON_SIZE,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  rowValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: ICON_SIZE + spacing.md,
  },
  iconRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  iconShell: {
    borderWidth: 2,
    borderRadius: radius.md + 4,
    padding: 3,
  },
  iconPreview: {
    width: 54,
    height: 54,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetBackdrop: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.xl,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheetCard: {
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.lg,
    gap: spacing.xs,
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
  },
  sheetOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md - 2,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
  },
  about: {
    textAlign: 'center',
    marginTop: spacing.sm,
  },
});
