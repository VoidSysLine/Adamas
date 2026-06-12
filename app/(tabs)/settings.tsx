import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { Alert, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GlassCard } from '@/components/ui/GlassCard';
import { PressableScale, triggerHaptic } from '@/components/ui/PressableScale';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { useToast } from '@/components/ui/Toast';
import { useT } from '@/i18n';
import { useSettings, type AutoLockPref, type LanguagePref, type ThemePref } from '@/store/settingsStore';
import { useVault } from '@/store/vaultStore';
import { radius, spacing, type as typo, useTheme } from '@/theme';

const APP_ICONS: { id: 'obsidian' | 'ice' | 'gold'; colors: [string, string] }[] = [
  { id: 'obsidian', colors: ['#1E2435', '#0B0E18'] },
  { id: 'ice', colors: ['#67E8F9', '#6E9BFF'] },
  { id: 'gold', colors: ['#F5C66B', '#C98F1B'] },
];

const AUTO_LOCK_OPTIONS: AutoLockPref[] = [0, 1, 5, 15, -1];

export default function SettingsScreen() {
  const theme = useTheme();
  const t = useT();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const settings = useSettings();
  const lock = useVault((s) => s.lock);
  const erase = useVault((s) => s.erase);

  const autoLockLabel = (value: AutoLockPref) =>
    value === 0 ? t('settings.autoLockNow') : value === -1 ? t('settings.autoLockNever') : t('settings.autoLockMinutes', { min: value });

  const onErase = () => {
    triggerHaptic('warning');
    Alert.alert(t('settings.eraseConfirmTitle'), t('settings.eraseConfirmMessage'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.delete'), style: 'destructive', onPress: () => void erase() },
    ]);
  };

  return (
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
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.iconPreview}
                  >
                    <Ionicons
                      name="diamond"
                      size={24}
                      color={icon.id === 'obsidian' ? '#6E9BFF' : 'rgba(8,10,18,0.85)'}
                    />
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
