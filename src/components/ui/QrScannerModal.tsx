import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import React, { useEffect, useRef, useState } from 'react';
import { Modal, StyleSheet, Text, View } from 'react-native';
import { GradientButton } from './GradientButton';
import { PressableScale, triggerHaptic } from './PressableScale';
import { useT } from '@/i18n';
import { radius, spacing, type as typo, useTheme } from '@/theme';

interface Props {
  visible: boolean;
  onClose: () => void;
  /** Return true to accept the scan (closes); false to keep scanning. */
  onScan: (value: string) => boolean;
  title: string;
  hint: string;
}

/** Fullscreen QR/barcode scanner backed by expo-camera (Expo-Go compatible). */
export function QrScannerModal({ visible, onClose, onScan, title, hint }: Props) {
  const theme = useTheme();
  const t = useT();
  const [permission, requestPermission] = useCameraPermissions();
  const handled = useRef(false);
  const [rejected, setRejected] = useState(false);

  useEffect(() => {
    if (visible) {
      handled.current = false;
      setRejected(false);
      if (permission && !permission.granted && permission.canAskAgain) void requestPermission();
    }
  }, [visible, permission, requestPermission]);

  const handleScan = (result: BarcodeScanningResult) => {
    if (handled.current) return;
    handled.current = true;
    const accepted = onScan(result.data);
    if (accepted) {
      triggerHaptic('success');
    } else {
      triggerHaptic('error');
      setRejected(true);
      // Allow another attempt after a short debounce.
      setTimeout(() => {
        handled.current = false;
      }, 1200);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
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
    </Modal>
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
