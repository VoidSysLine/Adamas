import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { FlatList, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { EntryListItem } from '@/components/vault/EntryListItem';
import { PressableScale, triggerHaptic } from '@/components/ui/PressableScale';
import { CATEGORY_ORDER, categoryOf } from '@/constants/schema';
import { useT } from '@/i18n';
import { useSettings, type SortMode } from '@/store/settingsStore';
import { useVault } from '@/store/vaultStore';
import { fonts, radius, spacing, type as typo, useTheme } from '@/theme';
import type { Category, VaultEntry } from '@/types/vault';

type Filter = 'all' | 'favorites' | Category;

function matchesQuery(entry: VaultEntry, query: string): boolean {
  const haystack = [
    entry.title,
    entry.notes ?? '',
    ...Object.values(entry.data as Record<string, string | undefined>),
    ...(entry.customFields ?? []).flatMap((f) => [f.label, f.value]),
  ]
    .filter((v): v is string => !!v)
    .join('\n')
    .toLowerCase();
  return haystack.includes(query);
}

export default function VaultScreen() {
  const theme = useTheme();
  const t = useT();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const entries = useVault((s) => s.entries);
  const sortMode = useSettings((s) => s.sortMode);
  const setSetting = useSettings((s) => s.set);

  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const compare = (a: VaultEntry, b: VaultEntry) => {
      if (sortMode === 'updated') return b.updatedAt - a.updatedAt;
      if (sortMode === 'created') return b.createdAt - a.createdAt;
      return a.title.localeCompare(b.title, undefined, { sensitivity: 'base', numeric: true });
    };
    return entries
      .filter((entry) => {
        if (filter === 'favorites') return entry.favorite;
        if (filter !== 'all') return categoryOf(entry.kind) === filter;
        return true;
      })
      .filter((entry) => !q || matchesQuery(entry, q))
      // Favorites stay pinned on top, then by the chosen sort mode.
      .sort((a, b) => Number(b.favorite) - Number(a.favorite) || compare(a, b));
  }, [entries, filter, query, sortMode]);

  const cycleSort = () => {
    const order: SortMode[] = ['az', 'updated', 'created'];
    const next = order[(order.indexOf(sortMode) + 1) % order.length];
    triggerHaptic('selection');
    setSetting('sortMode', next);
  };

  // Stable across renders so memoized rows don't re-render on every keystroke.
  const openEntry = useCallback((id: string) => router.push(`/entry/${id}`), [router]);
  const keyExtractor = useCallback((item: VaultEntry) => item.id, []);
  const renderItem = useCallback(
    ({ item, index }: { item: VaultEntry; index: number }) => (
      <EntryListItem entry={item} index={index} onPress={openEntry} />
    ),
    [openEntry],
  );

  const filters: { value: Filter; label: string }[] = [
    { value: 'all', label: t('common.all') },
    { value: 'favorites', label: t('common.favorites') },
    ...CATEGORY_ORDER.map((c) => ({ value: c as Filter, label: t(`categories.${c}`) })),
  ];

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <View style={styles.titleRow}>
          <View>
            <Text style={[typo.display, { color: theme.colors.text }]}>{t('vault.title')}</Text>
            <Text style={[typo.caption, { color: theme.colors.textTertiary }]}>
              {entries.length === 1 ? t('vault.item') : t('vault.items', { count: entries.length })}
            </Text>
          </View>
          <View style={styles.headerActions}>
            <PressableScale
              haptic="none"
              onPress={cycleSort}
              style={[styles.sortButton, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
            >
              <Ionicons name="swap-vertical" size={15} color={theme.colors.textSecondary} />
              <Text style={[typo.caption, { color: theme.colors.textSecondary }]}>{t(`sort.${sortMode}`)}</Text>
            </PressableScale>
            <PressableScale haptic="medium" onPress={() => router.push('/new')}>
              <LinearGradient
                colors={theme.colors.heroGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.fab}
              >
                <Ionicons name="add" size={26} color={theme.colors.onAccent} />
              </LinearGradient>
            </PressableScale>
          </View>
        </View>

        <View style={[styles.search, { backgroundColor: theme.colors.surfaceAlt, borderColor: theme.colors.border }]}>
          <Ionicons name="search" size={17} color={theme.colors.textTertiary} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={t('common.search')}
            placeholderTextColor={theme.colors.textTertiary}
            autoCapitalize="none"
            autoCorrect={false}
            style={[styles.searchInput, { color: theme.colors.text }]}
          />
          {query.length > 0 && (
            <PressableScale haptic="none" onPress={() => setQuery('')}>
              <Ionicons name="close-circle" size={17} color={theme.colors.textTertiary} />
            </PressableScale>
          )}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {filters.map((item) => {
            const active = filter === item.value;
            return (
              <PressableScale
                key={item.value}
                haptic="selection"
                onPress={() => setFilter(item.value)}
                style={[
                  styles.chip,
                  {
                    backgroundColor: active ? theme.colors.accentSoft : theme.colors.surface,
                    borderColor: active ? theme.colors.accent : theme.colors.border,
                  },
                ]}
              >
                <Text style={[typo.caption, { color: active ? theme.colors.accent : theme.colors.textSecondary }]}>
                  {item.label}
                </Text>
              </PressableScale>
            );
          })}
        </ScrollView>
      </View>

      {filtered.length === 0 ? (
        <Animated.View entering={FadeIn.delay(150)} style={styles.empty}>
          <Ionicons
            name={entries.length === 0 ? 'diamond-outline' : 'search-outline'}
            size={44}
            color={theme.colors.textTertiary}
          />
          <Text style={[typo.headline, { color: theme.colors.textSecondary }]}>
            {entries.length === 0 ? t('vault.empty') : t('vault.noResults')}
          </Text>
          {entries.length === 0 && (
            <Text style={[typo.caption, { color: theme.colors.textTertiary }]}>{t('vault.emptyHint')}</Text>
          )}
        </Animated.View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={keyExtractor}
          contentContainerStyle={{ paddingBottom: insets.bottom + 110, paddingTop: spacing.sm }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          renderItem={renderItem}
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={7}
          removeClippedSubviews
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radius.full,
    borderWidth: StyleSheet.hairlineWidth,
  },
  fab: {
    width: 48,
    height: 48,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.md,
  },
  searchInput: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 15,
    paddingVertical: 11,
  },
  chips: {
    gap: spacing.sm,
    paddingBottom: spacing.sm,
  },
  chip: {
    paddingHorizontal: spacing.md + 2,
    paddingVertical: 7,
    borderRadius: radius.full,
    borderWidth: StyleSheet.hairlineWidth,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingBottom: 120,
  },
});
