import {
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
} from '@expo-google-fonts/manrope';
import { Sora_600SemiBold, Sora_700Bold, Sora_800ExtraBold, useFonts } from '@expo-google-fonts/sora';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useRef, useState } from 'react';
import { AppState, StyleSheet, useColorScheme, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { DiamondLogo } from '@/components/ui/DiamondLogo';
import { ToastProvider } from '@/components/ui/Toast';
import { useSettings } from '@/store/settingsStore';
import { useVault } from '@/store/vaultStore';
import { useTheme } from '@/theme';

void SplashScreen.preventAutoHideAsync();

/** Redirects based on vault status so no protected screen is reachable while locked. */
function useVaultGuard() {
  const status = useVault((s) => s.status);
  const segments = useSegments() as string[];
  const router = useRouter();

  useEffect(() => {
    if (status === 'loading') return;
    const inAuth = segments[0] === 'onboarding' || segments[0] === 'unlock';
    if (status === 'none' && segments[0] !== 'onboarding') {
      router.replace('/onboarding');
    } else if (status === 'locked' && segments[0] !== 'unlock') {
      router.replace('/unlock');
    } else if (status === 'unlocked' && (inAuth || segments.length === 0)) {
      router.replace('/(tabs)');
    }
  }, [status, segments, router]);
}

/** Locks the vault after the configured time in background. */
function useAutoLock() {
  const backgroundedAt = useRef<number | null>(null);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      const { autoLock } = useSettings.getState();
      const vault = useVault.getState();
      if (state === 'background' || state === 'inactive') {
        if (backgroundedAt.current === null) backgroundedAt.current = Date.now();
        if (autoLock === 0 && state === 'background') vault.lock();
      } else if (state === 'active') {
        const elapsed = backgroundedAt.current ? Date.now() - backgroundedAt.current : 0;
        backgroundedAt.current = null;
        if (autoLock > 0 && elapsed > autoLock * 60_000) vault.lock();
      }
    });
    return () => subscription.remove();
  }, []);
}

/**
 * Covers the UI with the logo while the app is inactive/backgrounded so no
 * vault content ends up in the iOS app-switcher snapshot. Only while
 * unlocked — the lock screens hold no secrets.
 */
function PrivacyShield() {
  const theme = useTheme();
  const status = useVault((s) => s.status);
  const [covered, setCovered] = useState(false);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      setCovered(state !== 'active');
    });
    return () => subscription.remove();
  }, []);

  if (!covered || status !== 'unlocked') return null;
  return (
    <View
      pointerEvents="none"
      style={[
        StyleSheet.absoluteFill,
        { backgroundColor: theme.colors.background, alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
      ]}
    >
      <DiamondLogo size={84} />
    </View>
  );
}

export default function RootLayout() {
  const theme = useTheme();
  const systemScheme = useColorScheme();
  const initialize = useVault((s) => s.initialize);

  const [fontsLoaded] = useFonts({
    Sora_600SemiBold,
    Sora_700Bold,
    Sora_800ExtraBold,
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
  });

  useEffect(() => {
    useSettings.getState().set('systemScheme', systemScheme === 'light' ? 'light' : 'dark');
  }, [systemScheme]);

  useEffect(() => {
    void initialize();
  }, [initialize]);

  useEffect(() => {
    if (fontsLoaded) void SplashScreen.hideAsync();
  }, [fontsLoaded]);

  useVaultGuard();
  useAutoLock();

  // Hold the native splash until fonts are ready to avoid a fallback-font flash.
  if (!fontsLoaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ErrorBoundary>
        <ToastProvider>
          <StatusBar style={theme.dark ? 'light' : 'dark'} />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: theme.colors.background },
              animation: 'fade_from_bottom',
            }}
          >
            <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
            <Stack.Screen name="new" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
            <Stack.Screen name="entry/edit" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
          </Stack>
          <PrivacyShield />
        </ToastProvider>
        </ErrorBoundary>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
