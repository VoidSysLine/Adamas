import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GlassCard } from '@/components/ui/GlassCard';
import { PressableScale } from '@/components/ui/PressableScale';
import { useT } from '@/i18n';
import { runAudit } from '@/lib/audit';
import { useVault } from '@/store/vaultStore';
import { fonts, radius, spacing, type as typo, useTheme } from '@/theme';

export default function ToolsScreen() {
  const theme = useTheme();
  const t = useT();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const entries = useVault((s) => s.entries);
  const report = useMemo(() => runAudit(entries), [entries]);

  const scoreColor =
    report.score >= 85 ? theme.colors.success : report.score >= 55 ? theme.colors.warning : theme.colors.danger;

  return (
    <ScrollView
      style={{ backgroundColor: theme.colors.background }}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + spacing.md, paddingBottom: insets.bottom + 110 },
      ]}
    >
      <Text style={[typo.display, { color: theme.colors.text, marginBottom: spacing.lg }]}>
        {t('tools.title')}
      </Text>

      <Animated.View entering={FadeInDown.springify().damping(18)}>
        <PressableScale haptic="light" onPress={() => router.push('/generator')}>
          <GlassCard style={styles.card}>
            <LinearGradient
              colors={theme.colors.heroGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.icon}
            >
              <Ionicons name="sparkles" size={22} color={theme.colors.onAccent} />
            </LinearGradient>
            <View style={styles.text}>
              <Text style={[typo.headline, { color: theme.colors.text }]}>{t('tools.generator')}</Text>
              <Text style={[typo.caption, { color: theme.colors.textSecondary }]}>{t('tools.generatorSub')}</Text>
            </View>
            <Ionicons name="chevron-forward" size={17} color={theme.colors.textTertiary} />
          </GlassCard>
        </PressableScale>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(80).springify().damping(18)}>
        <PressableScale haptic="light" onPress={() => router.push('/audit')}>
          <GlassCard style={styles.card}>
            <LinearGradient
              colors={['#34D399', '#0EA5E9']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.icon}
            >
              <Ionicons name="shield-checkmark" size={22} color={theme.colors.onAccent} />
            </LinearGradient>
            <View style={styles.text}>
              <Text style={[typo.headline, { color: theme.colors.text }]}>{t('tools.audit')}</Text>
              <Text style={[typo.caption, { color: theme.colors.textSecondary }]}>{t('tools.auditSub')}</Text>
            </View>
            <View style={styles.scoreBadge}>
              <Text style={[styles.scoreText, { color: scoreColor }]}>{report.score}%</Text>
              <Text style={[typo.micro, { color: theme.colors.textTertiary }]}>{t('tools.score')}</Text>
            </View>
          </GlassCard>
        </PressableScale>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(160).springify().damping(18)}>
        <Text style={[typo.micro, styles.sectionLabel, { color: theme.colors.textTertiary }]}>
          {t('importer.sectionTitle')}
        </Text>
        <GlassCard>
          <PressableScale haptic="light" style={styles.row} onPress={() => router.push('/import')}>
            <View style={[styles.rowIcon, { backgroundColor: '#175DDC' }]}>
              <Ionicons name="shield-half-outline" size={19} color="#FFFFFF" />
            </View>
            <View style={styles.text}>
              <Text style={[typo.headline, { color: theme.colors.text }]}>{t('importer.bitwarden')}</Text>
              <Text style={[typo.caption, { color: theme.colors.textSecondary }]}>
                {t('importer.bitwardenSub')}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={17} color={theme.colors.textTertiary} />
          </PressableScale>
          <PressableScale
            haptic="light"
            style={[styles.row, { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.colors.border }]}
            onPress={() => router.push('/import-totp')}
          >
            <View style={[styles.rowIcon, { backgroundColor: theme.colors.accentSoft }]}>
              <Ionicons name="timer-outline" size={19} color={theme.colors.accent} />
            </View>
            <View style={styles.text}>
              <Text style={[typo.headline, { color: theme.colors.text }]}>{t('importer.totp')}</Text>
              <Text style={[typo.caption, { color: theme.colors.textSecondary }]}>{t('importer.totpSub')}</Text>
            </View>
            <Ionicons name="chevron-forward" size={17} color={theme.colors.textTertiary} />
          </PressableScale>
          {(
            [
              { key: 'onePassword', icon: 'key-outline' },
              { key: 'csv', icon: 'document-text-outline' },
              { key: 'export', icon: 'download-outline' },
            ] as const
          ).map(({ key, icon }) => (
            <View key={key} style={[styles.row, styles.rowDisabled, { borderTopColor: theme.colors.border }]}>
              <View style={[styles.rowIcon, { backgroundColor: theme.colors.surfaceAlt }]}>
                <Ionicons name={icon} size={19} color={theme.colors.textTertiary} />
              </View>
              <Text style={[typo.headline, { color: theme.colors.textTertiary, flex: 1 }]}>
                {t(`importer.${key}`)}
              </Text>
              <View style={[styles.soonChip, { backgroundColor: theme.colors.surfaceAlt }]}>
                <Text style={[typo.micro, { color: theme.colors.textTertiary }]}>{t('importer.soon')}</Text>
              </View>
            </View>
          ))}
        </GlassCard>
      </Animated.View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
  },
  icon: {
    width: 46,
    height: 46,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    flex: 1,
    gap: 3,
  },
  scoreBadge: {
    alignItems: 'center',
  },
  scoreText: {
    fontFamily: fonts.displayHeavy,
    fontSize: 24,
  },
  sectionLabel: {
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  rowDisabled: {
    borderTopWidth: StyleSheet.hairlineWidth,
    opacity: 0.75,
  },
  rowIcon: {
    width: 38,
    height: 38,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  soonChip: {
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
});
