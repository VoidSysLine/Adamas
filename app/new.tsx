import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { GlassCard } from '@/components/ui/GlassCard';
import { PressableScale } from '@/components/ui/PressableScale';
import { CATEGORIES, CATEGORY_ORDER, kindIcon } from '@/constants/schema';
import { useT } from '@/i18n';
import { radius, spacing, type as typo, useTheme } from '@/theme';

/** Modal sheet: pick what kind of secret to create. */
export default function NewEntry() {
  const theme = useTheme();
  const t = useT();
  const router = useRouter();

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.grabber, { backgroundColor: theme.colors.border }]} />
        <Text style={[typo.title, { color: theme.colors.text }]}>{t('vault.newEntry')}</Text>
        <Text style={[typo.caption, { color: theme.colors.textTertiary, marginBottom: spacing.md }]}>
          {t('vault.chooseKind')}
        </Text>

        {CATEGORY_ORDER.map((category, sectionIndex) => (
          <Animated.View
            key={category}
            entering={FadeInDown.delay(sectionIndex * 60).springify().damping(18)}
            style={styles.section}
          >
            <Text style={[typo.micro, { color: theme.colors.textTertiary }]}>
              {t(`categories.${category}`)}
            </Text>
            {CATEGORIES[category].kinds.map((kind) => (
              <PressableScale
                key={kind}
                haptic="light"
                onPress={() => router.replace({ pathname: '/entry/edit', params: { kind } })}
              >
                <GlassCard style={styles.kindCard}>
                  <LinearGradient
                    colors={[...CATEGORIES[category].gradient]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.kindIcon}
                  >
                    <Ionicons name={kindIcon(kind)} size={19} color="rgba(8,10,18,0.85)" />
                  </LinearGradient>
                  <Text style={[typo.headline, { color: theme.colors.text, flex: 1 }]}>
                    {t(`kinds.${kind}`)}
                  </Text>
                  <Ionicons name="chevron-forward" size={16} color={theme.colors.textTertiary} />
                </GlassCard>
              </PressableScale>
            ))}
          </Animated.View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  grabber: {
    alignSelf: 'center',
    width: 38,
    height: 5,
    borderRadius: radius.full,
    marginBottom: spacing.lg,
  },
  section: {
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  kindCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md - 2,
  },
  kindIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
