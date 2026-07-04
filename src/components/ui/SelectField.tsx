import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { SelectOption } from '@/constants/schema';
import { radius, spacing, type as typo, useTheme } from '@/theme';
import { PressableScale } from './PressableScale';

interface Props {
  label: string;
  value: string;
  options: readonly SelectOption[];
  onChange: (value: string) => void;
  /** Resolves an option's i18n label key. */
  labelFor: (key: string) => string;
}

/** Chip picker for enumerated fields (gender, Wi-Fi encryption). */
export function SelectField({ label, value, options, onChange, labelFor }: Props) {
  const theme = useTheme();
  return (
    <View style={styles.container}>
      <Text style={[typo.micro, { color: theme.colors.textTertiary }]}>{label}</Text>
      <View style={styles.chips}>
        {options.map((option) => {
          const active = value === option.value;
          return (
            <PressableScale
              key={option.value}
              haptic="selection"
              onPress={() => onChange(active ? '' : option.value)}
              style={[
                styles.chip,
                {
                  backgroundColor: active ? theme.colors.accentSoft : theme.colors.surfaceAlt,
                  borderColor: active ? theme.colors.accent : theme.colors.border,
                },
              ]}
            >
              <Text style={[typo.caption, { color: active ? theme.colors.accent : theme.colors.textSecondary }]}>
                {labelFor(option.label)}
              </Text>
            </PressableScale>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 8 },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 9,
    borderRadius: radius.full,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
