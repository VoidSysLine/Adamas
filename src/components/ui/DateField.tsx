import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import React, { useState } from 'react';
import { Modal, Platform, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, SlideInDown } from 'react-native-reanimated';
import { GradientButton } from './GradientButton';
import { PressableScale, triggerHaptic } from './PressableScale';
import { parseFieldDate } from '@/lib/dates';
import { radius, spacing, type as typo, useTheme } from '@/theme';

interface Props {
  label: string;
  /** Stored as DD.MM.YYYY. */
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  doneLabel: string;
  locale: string;
  /** e.g. birthdays cannot be in the future. */
  maximumFuture?: boolean;
  minimumToday?: boolean;
}

function formatDMY(date: Date): string {
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  return `${dd}.${mm}.${date.getFullYear()}`;
}

/**
 * Opens the platform's native calendar/spinner instead of free-text entry.
 * iOS shows an inline spinner inside a bottom sheet; Android uses the system
 * dialog. The value is stored as DD.MM.YYYY so it stays compatible with the
 * audit's `parseFieldDate`.
 */
export function DateField({
  label,
  value,
  onChange,
  placeholder,
  doneLabel,
  locale,
  maximumFuture,
  minimumToday,
}: Props) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const parsed = parseFieldDate(value);
  const [draft, setDraft] = useState<Date>(parsed ?? new Date(2000, 0, 1));

  const displayValue = parsed
    ? parsed.toLocaleDateString(locale, { day: '2-digit', month: 'long', year: 'numeric' })
    : '';

  const commit = (date: Date) => {
    onChange(formatDMY(date));
    triggerHaptic('selection');
  };

  const onAndroidChange = (event: DateTimePickerEvent, date?: Date) => {
    setOpen(false);
    if (event.type === 'set' && date) commit(date);
  };

  const openPicker = () => {
    setDraft(parsed ?? (minimumToday ? new Date() : new Date(2000, 0, 1)));
    setOpen(true);
  };

  return (
    <View style={styles.container}>
      <Text style={[typo.micro, { color: theme.colors.textTertiary }]}>{label}</Text>
      <PressableScale
        haptic="light"
        onPress={openPicker}
        style={[styles.field, { backgroundColor: theme.colors.surfaceAlt, borderColor: theme.colors.border }]}
      >
        <Ionicons name="calendar-outline" size={19} color={theme.colors.accent} />
        <Text style={[styles.value, { color: displayValue ? theme.colors.text : theme.colors.textTertiary }]}>
          {displayValue || placeholder}
        </Text>
        {displayValue.length > 0 && (
          <PressableScale
            haptic="none"
            onPress={() => {
              triggerHaptic('selection');
              onChange('');
            }}
          >
            <Ionicons name="close-circle" size={18} color={theme.colors.textTertiary} />
          </PressableScale>
        )}
      </PressableScale>

      {open && Platform.OS === 'android' && (
        <DateTimePicker
          value={draft}
          mode="date"
          display="calendar"
          maximumDate={maximumFuture ? new Date() : undefined}
          minimumDate={minimumToday ? new Date() : undefined}
          onChange={onAndroidChange}
        />
      )}

      {Platform.OS === 'ios' && (
        <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
          <Animated.View entering={FadeIn.duration(150)} style={styles.backdrop}>
            <PressableScale haptic="none" style={StyleSheet.absoluteFill} onPress={() => setOpen(false)} />
            <Animated.View
              entering={SlideInDown.springify().damping(18)}
              style={[styles.sheet, { backgroundColor: theme.colors.background, borderColor: theme.colors.border }]}
            >
              <Text style={[typo.headline, { color: theme.colors.text, textAlign: 'center' }]}>{label}</Text>
              <DateTimePicker
                value={draft}
                mode="date"
                display="spinner"
                locale={locale}
                textColor={theme.colors.text}
                maximumDate={maximumFuture ? new Date() : undefined}
                minimumDate={minimumToday ? new Date() : undefined}
                onChange={(_, date) => date && setDraft(date)}
                style={styles.iosPicker}
              />
              <GradientButton
                label={doneLabel}
                haptic="none"
                onPress={() => {
                  commit(draft);
                  setOpen(false);
                }}
              />
            </Animated.View>
          </Animated.View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 6 },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
  },
  value: {
    flex: 1,
    fontSize: 16,
  },
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    gap: spacing.md,
  },
  iosPicker: {
    alignSelf: 'center',
  },
});
