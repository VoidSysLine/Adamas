import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useTheme } from '@/theme';

/** Boot screen — the root layout's vault guard redirects as soon as the status is known. */
export default function Boot() {
  const theme = useTheme();
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.background }}>
      <ActivityIndicator color={theme.colors.accent} />
    </View>
  );
}
