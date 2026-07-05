import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GlassCard } from '@/components/ui/GlassCard';
import { PressableScale, triggerHaptic } from '@/components/ui/PressableScale';
import { ScoreRing } from '@/components/ui/ScoreRing';
import type { IoniconName } from '@/constants/schema';
import { useT } from '@/i18n';
import { runAudit, type AuditIssueType } from '@/lib/audit';
import { checkPwnedPasswords } from '@/lib/hibp';
import { useVault } from '@/store/vaultStore';
import { radius, spacing, type as typo, useTheme } from '@/theme';

const SECTION_META: Record<AuditIssueType, { icon: IoniconName; color: string }> = {
  pwned: { icon: 'skull', color: '#F43F5E' },
  weak: { icon: 'alert-circle', color: '#FB7185' },
  reused: { icon: 'copy', color: '#FB923C' },
  expired: { icon: 'time', color: '#F87171' },
  expiring: { icon: 'hourglass', color: '#FBBF24' },
  old: { icon: 'calendar', color: '#A78BFA' },
  noTotp: { icon: 'shield-outline', color: '#60A5FA' },
};

const SECTION_ORDER: AuditIssueType[] = ['pwned', 'weak', 'reused', 'expired', 'expiring', 'old', 'noTotp'];

export default function AuditScreen() {
  const theme = useTheme();
  const t = useT();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const entries = useVault((s) => s.entries);

  const [pwnedCounts, setPwnedCounts] = useState<Map<string, number> | null>(null);
  const [hibpState, setHibpState] = useState<'idle' | 'checking' | 'done' | 'error'>('idle');

  const report = useMemo(
    () => runAudit(entries, Date.now(), pwnedCounts ?? undefined),
    [entries, pwnedCounts],
  );

  const runHibpCheck = async () => {
    if (hibpState === 'checking') return;
    setHibpState('checking');
    try {
      const passwords = entries.flatMap((e) => (e.kind === 'login' && e.data.password ? [e.data.password] : []));
      const result = await checkPwnedPasswords(passwords);
      setPwnedCounts(result);
      setHibpState('done');
      triggerHaptic(result.size > 0 ? 'warning' : 'success');
    } catch {
      setHibpState('error');
      triggerHaptic('error');
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <View style={[styles.nav, { paddingTop: insets.top + spacing.sm }]}>
        <PressableScale haptic="light" style={styles.navButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={theme.colors.text} />
        </PressableScale>
        <Text style={[typo.headline, { color: theme.colors.text }]}>{t('audit.title')}</Text>
        <View style={styles.navButton} />
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xl }]}>
        <View style={styles.ringWrap}>
          <ScoreRing score={report.score} suffix="%" label={t('audit.percentLabel')} />
          <Text style={[typo.caption, { color: theme.colors.textSecondary }]}>
            {t('audit.secureRatio', { secure: report.secureLogins, total: report.loginCount })}
          </Text>
        </View>

        <Animated.View entering={FadeInDown.delay(80).springify().damping(18)}>
          <GlassCard style={styles.hibpCard}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionIcon, { backgroundColor: 'rgba(244,63,94,0.13)' }]}>
                <Ionicons name="earth" size={18} color="#F43F5E" />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={[typo.headline, { color: theme.colors.text }]}>{t('audit.hibpTitle')}</Text>
                <Text style={[typo.caption, { color: theme.colors.textSecondary }]}>
                  {hibpState === 'done'
                    ? pwnedCounts && pwnedCounts.size > 0
                      ? t('audit.hibpFound', { count: report.findings.pwned.length })
                      : t('audit.hibpNone')
                    : hibpState === 'error'
                      ? t('audit.hibpError')
                      : t('audit.hibpHint')}
                </Text>
              </View>
              <PressableScale
                haptic="medium"
                style={[styles.hibpButton, { backgroundColor: theme.colors.accentSoft }]}
                onPress={() => void runHibpCheck()}
              >
                {hibpState === 'checking' ? (
                  <ActivityIndicator size="small" color={theme.colors.accent} />
                ) : (
                  <Text style={[typo.caption, { color: theme.colors.accent }]}>
                    {hibpState === 'idle' ? t('audit.hibpCheck') : t('audit.hibpRecheck')}
                  </Text>
                )}
              </PressableScale>
            </View>
          </GlassCard>
        </Animated.View>

        {report.totalIssues === 0 ? (
          <Animated.View entering={FadeInDown.delay(150).springify().damping(18)} style={styles.perfect}>
            <Ionicons name="shield-checkmark" size={40} color={theme.colors.success} />
            <Text style={[typo.title, { color: theme.colors.text }]}>{t('audit.perfect')}</Text>
            <Text style={[typo.caption, { color: theme.colors.textSecondary }]}>{t('audit.perfectSub')}</Text>
          </Animated.View>
        ) : (
          SECTION_ORDER.filter((type) => report.findings[type].length > 0).map((type, sectionIndex) => {
            const findings = report.findings[type];
            const meta = SECTION_META[type];
            return (
              <Animated.View
                key={type}
                entering={FadeInDown.delay(120 + sectionIndex * 70).springify().damping(18)}
              >
                <GlassCard style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <View style={[styles.sectionIcon, { backgroundColor: `${meta.color}22` }]}>
                      <Ionicons name={meta.icon} size={18} color={meta.color} />
                    </View>
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text style={[typo.headline, { color: theme.colors.text }]}>{t(`audit.${type}`)}</Text>
                      <Text style={[typo.caption, { color: theme.colors.textSecondary }]}>
                        {t(`audit.${type}Sub` as Parameters<typeof t>[0])}
                      </Text>
                    </View>
                    <Text style={[typo.caption, { color: meta.color }]}>
                      {findings.length === 1 ? t('audit.issue') : t('audit.issues', { count: findings.length })}
                    </Text>
                  </View>
                  {findings.map((finding) => (
                    <PressableScale
                      key={`${type}-${finding.entry.id}`}
                      haptic="light"
                      style={[styles.findingRow, { borderTopColor: theme.colors.border }]}
                      onPress={() => router.push(`/entry/${finding.entry.id}`)}
                    >
                      <Text style={[typo.body, { color: theme.colors.text, flex: 1 }]} numberOfLines={1}>
                        {finding.entry.title}
                      </Text>
                      {finding.detail && type === 'pwned' && (
                        <Text style={[typo.caption, { color: meta.color, marginRight: 4 }]}>
                          {finding.detail}
                        </Text>
                      )}
                      <Ionicons name="chevron-forward" size={15} color={theme.colors.textTertiary} />
                    </PressableScale>
                  ))}
                </GlassCard>
              </Animated.View>
            );
          })
        )}
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
  ringWrap: {
    alignItems: 'center',
    gap: spacing.sm,
    marginVertical: spacing.lg,
  },
  hibpCard: {
    padding: spacing.lg,
  },
  hibpButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.full,
    minWidth: 84,
    alignItems: 'center',
  },
  perfect: {
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xl,
  },
  section: {
    padding: spacing.lg,
    gap: spacing.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  sectionIcon: {
    width: 38,
    height: 38,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  findingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: spacing.md - 2,
    paddingBottom: 2,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
