import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { SlideInDown, SlideOutDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { IoniconName } from '@/constants/schema';
import { useT } from '@/i18n';
import { radius, type as typo, useTheme } from '@/theme';
import { triggerHaptic } from './PressableScale';

interface ToastOptions {
  message: string;
  icon?: IoniconName;
  tone?: 'default' | 'success' | 'danger';
}

const ToastContext = createContext<(options: ToastOptions) => void>(() => {});

export function useToast() {
  return useContext(ToastContext);
}

/** Copies a value, fires success haptics and confirms with a toast. */
export function useCopy() {
  const toast = useToast();
  const t = useT();
  return useCallback(
    async (label: string, value: string) => {
      await Clipboard.setStringAsync(value);
      triggerHaptic('success');
      toast({ message: t('common.copied', { label }), icon: 'copy-outline', tone: 'success' });
    },
    [toast, t],
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<(ToastOptions & { id: number }) | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  const show = useCallback((options: ToastOptions) => {
    if (timer.current) clearTimeout(timer.current);
    setToast({ ...options, id: Date.now() });
    timer.current = setTimeout(() => setToast(null), 1800);
  }, []);

  const toneColor =
    toast?.tone === 'success' ? theme.colors.success : toast?.tone === 'danger' ? theme.colors.danger : theme.colors.accent;

  return (
    <ToastContext.Provider value={show}>
      {children}
      {toast && (
        <View pointerEvents="none" style={[styles.host, { bottom: insets.bottom + 96 }]}>
          <Animated.View
            key={toast.id}
            entering={SlideInDown.springify().damping(16)}
            exiting={SlideOutDown.duration(180)}
            style={[
              styles.toast,
              { backgroundColor: theme.dark ? 'rgba(24,28,40,0.96)' : 'rgba(255,255,255,0.97)', borderColor: theme.colors.border },
            ]}
          >
            {toast.icon && <Ionicons name={toast.icon} size={17} color={toneColor} />}
            <Text style={[typo.caption, { color: theme.colors.text }]} numberOfLines={1}>
              {toast.message}
            </Text>
          </Animated.View>
        </View>
      )}
    </ToastContext.Provider>
  );
}

const styles = StyleSheet.create({
  host: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: radius.full,
    borderWidth: StyleSheet.hairlineWidth,
    maxWidth: '82%',
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
});
