import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, View, type KeyboardTypeOptions } from 'react-native';
import type { FieldType } from '@/constants/schema';
import { fonts, radius, spacing, type as typo, useTheme } from '@/theme';
import { PressableScale, triggerHaptic } from './PressableScale';

interface Props {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  fieldType?: FieldType;
  placeholder?: string;
  autoFocus?: boolean;
  /** Renders a generator action inside the field. */
  onGenerate?: () => void;
}

function keyboardFor(type: FieldType): KeyboardTypeOptions {
  switch (type) {
    case 'email':
      return 'email-address';
    case 'url':
      return 'url';
    case 'number':
    case 'pin':
      return 'number-pad';
    case 'phone':
      return 'phone-pad';
    default:
      return 'default';
  }
}

/** Schema-aware form input with floating label, secure toggle and generator slot. */
export function FormField({ label, value, onChangeText, fieldType = 'text', placeholder, autoFocus, onGenerate }: Props) {
  const theme = useTheme();
  const [focused, setFocused] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const secure = fieldType === 'password' || fieldType === 'pin' || fieldType === 'totp';
  const multiline = fieldType === 'multiline';

  return (
    <View style={styles.container}>
      <Text style={[typo.micro, { color: focused ? theme.colors.accent : theme.colors.textTertiary }]}>
        {label}
      </Text>
      <View
        style={[
          styles.inputRow,
          {
            backgroundColor: theme.colors.surfaceAlt,
            borderColor: focused ? theme.colors.accent : theme.colors.border,
          },
          multiline && styles.multiline,
        ]}
      >
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={theme.colors.textTertiary}
          keyboardType={keyboardFor(fieldType)}
          autoCapitalize={fieldType === 'text' ? 'sentences' : 'none'}
          autoCorrect={fieldType === 'text' || fieldType === 'multiline'}
          secureTextEntry={secure && !revealed}
          multiline={multiline}
          autoFocus={autoFocus}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={[
            styles.input,
            { color: theme.colors.text },
            secure && { fontFamily: fonts.mono },
            multiline && styles.multilineInput,
          ]}
        />
        {secure && (
          <PressableScale
            haptic="none"
            style={styles.action}
            onPress={() => {
              triggerHaptic('selection');
              setRevealed((r) => !r);
            }}
          >
            <Ionicons
              name={revealed ? 'eye-off-outline' : 'eye-outline'}
              size={19}
              color={theme.colors.textSecondary}
            />
          </PressableScale>
        )}
        {onGenerate && (
          <PressableScale haptic="medium" style={styles.action} onPress={onGenerate}>
            <Ionicons name="sparkles" size={18} color={theme.colors.accent} />
          </PressableScale>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 6 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 13,
  },
  multiline: {
    alignItems: 'flex-start',
  },
  multilineInput: {
    minHeight: 110,
    textAlignVertical: 'top',
  },
  action: {
    width: 36,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
