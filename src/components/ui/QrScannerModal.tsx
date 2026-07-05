import React, { Suspense, lazy } from 'react';
import { ActivityIndicator, Modal, StyleSheet, View } from 'react-native';
import type { CameraScannerProps } from './CameraScanner';

// Lazy-loaded so `expo-camera` is imported only when the scanner first opens —
// never during the eager route-tree evaluation at app startup.
const CameraScanner = lazy(() => import('./CameraScanner'));

interface Props extends CameraScannerProps {
  visible: boolean;
}

/** Fullscreen QR/barcode scanner. The camera module loads on demand. */
export function QrScannerModal({ visible, onClose, onScan, title, hint }: Props) {
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <Suspense
        fallback={
          <View style={styles.loading}>
            <ActivityIndicator color="#FFFFFF" />
          </View>
        }
      >
        {visible && <CameraScanner onClose={onClose} onScan={onScan} title={title} hint={hint} />}
      </Suspense>
    </Modal>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
