import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { GradientButton } from './GradientButton';
import { PressableScale, triggerHaptic } from './PressableScale';
import { useT } from '@/i18n';
import { radius, spacing, type as typo, useTheme } from '@/theme';

export interface CameraScannerProps {
  onClose: () => void;
  /** Return true to accept the scan (closes); false to keep scanning. */
  onScan: (value: string) => boolean;
  title: string;
  hint: string;
}

/**
 * The actual camera UI. Kept in its own module so that `expo-camera` is only
 * imported when the scanner is opened (lazy-loaded by QrScannerModal) — never
 * at app startup, which would otherwise crash the whole route tree on Expo Go
 * clients that lack the camera native module.
 */
export default function CameraScanner({ onClose, onScan, title, hint }: CameraScannerProps) {
  const theme = useTheme();
  const t = useT();
  const [permission, requestPermission] = useCameraPermissions();
  const handled = useRef(false);
  const [rejected, setRejected] = useState(false);

  useEffect(() => {
    handled.current = false;
    setRejected(false);
    if (permission && !permission.granted && permission.canAskAgain) void requestPermission();
  }, [permission, requestPermission]);

  const handleScan = (result: BarcodeScanningResult) => {
    if (handled.current) return;
    handled.current = true;
    if (onScan(result.data)) {
      triggerHaptic('success');
    } else {
      triggerHaptic('error');
      setRejected(true);
      setTimeout(() => {
        handled.current = false;
      }, 1200);
    }
  };

  return (
    <View style={styles.container}>
      {permission?.granted ? (
        <CameraView
          style={StyleSheet.absoluteFill}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          onBarcodeScanned={handleScan}
        />
      ) : (
        <View style={[styles.permission, { backgroundColor: theme.colors.background }]}>
          <Ionicons name="camera-outline" size={44} color={theme.colors.textTertiary} />
          <Text style={[typo.headline, { color: theme.colors.text, textAlign: 'center' }]}>
            {t('scanner.permissionTitle')}
          </Text>
          <Text style={[typo.caption, { color: theme.colors.textSecondary, textAlign: 'center' }]}>
            {t('scanner.permissionHint')}
          </Text>
          <GradientButton label={t('scanner.grant')} onPress={() => void requestPermission()} haptic="medium" />
        </View>
      )}

      {permission?.granted && (
        <View style={styles.overlay} pointerEvents="box-none">
          <View style={styles.frame} />
          <Text style={styles.hint}>{rejected ? t('scanner.notValid') : hint}</Text>
        </View>
      )}

      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        <PressableScale haptic="light" style={styles.close} onPress={onClose}>
          <Ionicons name="close" size={26} color="#FFFFFF" />
        </PressableScale>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    position: 'absolute',
    top: 56,
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
  },
  close: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xl,
  },
  frame: {
    width: 240,
    height: 240,
    borderRadius: radius.xl,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.9)',
  },
  hint: {
    color: '#FFFFFF',
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 40,
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowRadius: 6,
  },
  permission: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing.xl,
  },
});
