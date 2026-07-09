import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React from 'react';
import { Alert, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GlassCard } from '@/components/ui/GlassCard';
import { PasswordPromptModal } from '@/components/ui/PasswordPromptModal';
import { PressableScale, triggerHaptic } from '@/components/ui/PressableScale';
import { PrismGem } from '@/components/ui/PrismGem';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { useToast } from '@/components/ui/Toast';
import { biometricsAvailable } from '@/crypto/vaultService';
import { useT } from '@/i18n';
import {
  useSettings,
  type AutoLockPref,
  type ClipboardClearPref,
  type LanguagePref,
  type ThemePref,
} from '@/store/settingsStore';
import { useVault } from '@/store/vaultStore';
import { radius, spacing, type as typo, useTheme } from '@/theme';

const APP_ICONS: { id: 'obsidian' | 'ice' | 'gold'; colors: [string, string] }[] = [
  { id: 'obsidian', colors: ['#1B2030', '#06070D'] },
  { id: 'ice', colors: ['#FCFDFF', '#E2E8F1'] },
  { id: 'gold', colors: ['#F3DC99', '#B98A3F'] },
];

const AUTO_LOCK_OPTIONS: AutoLockPref[] = [0, 1, 5, 15, -1];
const CLIPBOARD_OPTIONS: ClipboardClearPref[] = [20, 45, 90, 0];

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

  const changeMasterPassword = useVault((s) => s.changeMasterPassword);
  const [pwStep, setPwStep] = React.useState<'current' | 'next' | null>(null);
  const currentPw = React.useRef('');

  // Hide the biometrics toggle on devices without Face ID/Touch ID/passcode.
  const [canBiometric, setCanBiometric] = React.useState(true);
  React.useEffect(() => {
    void biometricsAvailable().then(setCanBiometric);
  }, []);

  const autoLockLabel = (value: AutoLockPref) =>
    value === 0 ? t('settings.autoLockNow') : value === -1 ? t('settings.autoLockNever') : t('settings.autoLockMinutes', { min: value });

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

  const clipboardLabel = (value: ClipboardClearPref) =>
    value === 0 ? t('settings.autoLockNever') : t('settings.clipboardSeconds', { s: value });

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

      <Text style={[typo.micro, styles.sectionLabel, { color: theme.colors.textTertiary }]}>
        {t('settings.appearance')}
      </Text>
      <GlassCard style={styles.card}>
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
        <Text style={[typo.caption, { color: theme.colors.textSecondary, marginTop: spacing.sm }]}>
          {t('settings.language')}
        </Text>
        <SegmentedControl<LanguagePref>
          options={[
            { value: 'system', label: t('settings.themeSystem') },
            { value: 'de', label: 'Deutsch' },
            { value: 'en', label: 'English' },
          ]}
          value={settings.language}
          onChange={(v) => settings.set('language', v)}
        />
        <Text style={[typo.caption, { color: theme.colors.textSecondary, marginTop: spacing.sm }]}>
          {t('settings.appIcon')}
        </Text>
        <View style={styles.iconRow}>
          {APP_ICONS.map((icon) => {
            const active = settings.appIcon === icon.id;
            return (
              <PressableScale key={icon.id} haptic="selection" onPress={() => settings.set('appIcon', icon.id)}>
                <View
                  style={[
                    styles.iconShell,
                    { borderColor: active ? theme.colors.accent : 'transparent' },
                  ]}
                >
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
      </GlassCard>

      <Text style={[typo.micro, styles.sectionLabel, { color: theme.colors.textTertiary }]}>
        {t('settings.security')}
      </Text>
      <GlassCard style={styles.card}>
        {canBiometric && (
          <View style={styles.row}>
            <Text style={[typo.body, { color: theme.colors.text, flex: 1 }]}>{t('settings.biometrics')}</Text>
            <Switch
              value={settings.biometricsEnabled}
              onValueChange={(v) => {
                triggerHaptic('selection');
                settings.set('biometricsEnabled', v);
              }}
              trackColor={{ true: theme.colors.accent, false: theme.colors.surfaceAlt }}
              thumbColor="#FFFFFF"
            />
          </View>
        )}
        <Text style={[typo.caption, { color: theme.colors.textSecondary, marginTop: spacing.sm }]}>
          {t('settings.autoLock')}
        </Text>
        <View style={styles.autoLockRow}>
          {AUTO_LOCK_OPTIONS.map((value) => {
            const active = settings.autoLock === value;
            return (
              <PressableScale
                key={value}
                haptic="selection"
                style={[
                  styles.autoLockChip,
                  {
                    backgroundColor: active ? theme.colors.accentSoft : theme.colors.surfaceAlt,
                    borderColor: active ? theme.colors.accent : theme.colors.border,
                  },
                ]}
                onPress={() => settings.set('autoLock', value)}
              >
                <Text style={[typo.caption, { color: active ? theme.colors.accent : theme.colors.textSecondary }]}>
                  {autoLockLabel(value)}
                </Text>
              </PressableScale>
            );
          })}
        </View>
        <Text style={[typo.caption, { color: theme.colors.textSecondary, marginTop: spacing.sm }]}>
          {t('settings.clipboardClear')}
        </Text>
        <View style={styles.autoLockRow}>
          {CLIPBOARD_OPTIONS.map((value) => {
            const active = settings.clipboardClear === value;
            return (
              <PressableScale
                key={value}
                haptic="selection"
                style={[
                  styles.autoLockChip,
                  {
                    backgroundColor: active ? theme.colors.accentSoft : theme.colors.surfaceAlt,
                    borderColor: active ? theme.colors.accent : theme.colors.border,
                  },
                ]}
                onPress={() => settings.set('clipboardClear', value)}
              >
                <Text style={[typo.caption, { color: active ? theme.colors.accent : theme.colors.textSecondary }]}>
                  {clipboardLabel(value)}
                </Text>
              </PressableScale>
            );
          })}
        </View>
        <View style={[styles.row, { marginTop: spacing.sm }]}>
          <View style={{ flex: 1 }}>
            <Text style={[typo.body, { color: theme.colors.text }]}>{t('settings.revealAuth')}</Text>
            <Text style={[typo.caption, { color: theme.colors.textTertiary }]}>{t('settings.revealAuthSub')}</Text>
          </View>
          <Switch
            value={settings.revealAuth}
            onValueChange={(v) => {
              triggerHaptic('selection');
              settings.set('revealAuth', v);
            }}
            trackColor={{ true: theme.colors.accent, false: theme.colors.surfaceAlt }}
            thumbColor="#FFFFFF"
          />
        </View>
        <View style={[styles.row, { marginTop: spacing.sm }]}>
          <View style={{ flex: 1 }}>
            <Text style={[typo.body, { color: theme.colors.text }]}>{t('settings.brandIcons')}</Text>
            <Text style={[typo.caption, { color: theme.colors.textTertiary }]}>{t('settings.brandIconsSub')}</Text>
          </View>
          <Switch
            value={settings.brandIcons}
            onValueChange={(v) => {
              triggerHaptic('selection');
              settings.set('brandIcons', v);
            }}
            trackColor={{ true: theme.colors.accent, false: theme.colors.surfaceAlt }}
            thumbColor="#FFFFFF"
          />
        </View>
        <PressableScale
          haptic="light"
          style={[styles.lockButton, { borderColor: theme.colors.border }]}
          onPress={() => setPwStep('current')}
        >
          <Ionicons name="key-outline" size={17} color={theme.colors.accent} />
          <Text style={[typo.caption, { color: theme.colors.accent }]}>{t('settings.changePassword')}</Text>
        </PressableScale>
        <PressableScale
          haptic="medium"
          style={[styles.lockButton, { borderColor: theme.colors.border }]}
          onPress={() => {
            lock();
            toast({ message: t('toast.locked'), icon: 'lock-closed-outline' });
          }}
        >
          <Ionicons name="lock-closed-outline" size={17} color={theme.colors.accent} />
          <Text style={[typo.caption, { color: theme.colors.accent }]}>{t('settings.lockNow')}</Text>
        </PressableScale>
      </GlassCard>

      <Text style={[typo.micro, styles.sectionLabel, { color: theme.colors.textTertiary }]}>
        {t('backup.title')}
      </Text>
      <GlassCard style={styles.card}>
        <PressableScale haptic="light" style={styles.row} onPress={() => router.push('/backup')}>
          <Ionicons name="archive-outline" size={18} color={theme.colors.accent} />
          <Text style={[typo.body, { color: theme.colors.text, flex: 1, marginLeft: spacing.sm }]}>
            {t('backup.manage')}
          </Text>
          <Ionicons name="chevron-forward" size={17} color={theme.colors.textTertiary} />
        </PressableScale>
        <View style={[styles.rowDivider, { backgroundColor: theme.colors.border }]} />
        <PressableScale haptic="light" style={styles.row} onPress={() => router.push('/trash')}>
          <Ionicons name="trash-outline" size={18} color={theme.colors.accent} />
          <Text style={[typo.body, { color: theme.colors.text, flex: 1, marginLeft: spacing.sm }]}>
            {t('trash.title')}
          </Text>
          {trashCount > 0 && (
            <Text style={[typo.caption, { color: theme.colors.textTertiary, marginRight: 4 }]}>{trashCount}</Text>
          )}
          <Ionicons name="chevron-forward" size={17} color={theme.colors.textTertiary} />
        </PressableScale>
      </GlassCard>

      <Text style={[typo.micro, styles.sectionLabel, { color: theme.colors.textTertiary }]}>
        {t('settings.dangerZone')}
      </Text>
      <GlassCard style={styles.card}>
        <PressableScale haptic="none" style={styles.row} onPress={onErase}>
          <Ionicons name="trash-outline" size={18} color={theme.colors.danger} />
          <Text style={[typo.body, { color: theme.colors.danger, flex: 1, marginLeft: spacing.sm }]}>
            {t('settings.eraseVault')}
          </Text>
        </PressableScale>
      </GlassCard>

      <Text style={[typo.caption, styles.about, { color: theme.colors.textTertiary }]}>
        {t('settings.about')}
      </Text>
    </ScrollView>

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

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.lg,
  },
  sectionLabel: {
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
  },
  card: {
    padding: spacing.lg,
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowDivider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: spacing.sm,
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
  autoLockRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  autoLockChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    borderRadius: radius.full,
    borderWidth: StyleSheet.hairlineWidth,
  },
  lockButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: spacing.md - 2,
    borderRadius: radius.md,
    borderWidth: 1,
    marginTop: spacing.sm,
  },
  about: {
    textAlign: 'center',
    marginTop: spacing.sm,
  },
});
