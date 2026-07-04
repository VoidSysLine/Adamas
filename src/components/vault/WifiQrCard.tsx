import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import React, { useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { GlassCard } from '@/components/ui/GlassCard';
import { PressableScale, triggerHaptic } from '@/components/ui/PressableScale';
import { useToast } from '@/components/ui/Toast';
import { useT } from '@/i18n';
import { buildWifiQrValue } from '@/lib/wifiQr';
import { radius, spacing, type as typo, useTheme } from '@/theme';
import type { WifiData } from '@/types/vault';

interface Props {
  title: string;
  data: WifiData;
}

interface QrRef {
  toDataURL: (callback: (base64: string) => void) => void;
}

/**
 * Scannable Wi-Fi join QR (standard `WIFI:` payload) rendered directly in the
 * entry, with share and save-to-photos actions. The QR sits on a white tile —
 * cameras need the light background to lock on.
 */
export function WifiQrCard({ title, data }: Props) {
  const theme = useTheme();
  const t = useT();
  const toast = useToast();
  const qrRef = useRef<QrRef | null>(null);
  const [busy, setBusy] = useState<'share' | 'save' | null>(null);

  const value = buildWifiQrValue(data);
  if (!value) return null;

  /** Renders the QR to a PNG in the cache and returns its file URI. */
  const exportPng = async (): Promise<string | null> => {
    const ref = qrRef.current;
    if (!ref) return null;
    const base64 = await new Promise<string>((resolve) => ref.toDataURL(resolve));
    const safeName = (data.ssid ?? title).replace(/[^a-zA-Z0-9_-]+/g, '_').slice(0, 40) || 'wifi';
    const uri = `${FileSystem.cacheDirectory}wifi-qr-${safeName}.png`;
    await FileSystem.writeAsStringAsync(uri, base64.replace(/\s/g, ''), {
      encoding: FileSystem.EncodingType.Base64,
    });
    return uri;
  };

  const onShare = async () => {
    if (busy) return;
    setBusy('share');
    try {
      const uri = await exportPng();
      if (uri && (await Sharing.isAvailableAsync())) {
        await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: t('wifiQr.title') });
      }
    } catch {
      triggerHaptic('error');
    } finally {
      setBusy(null);
    }
  };

  const onSave = async () => {
    if (busy) return;
    setBusy('save');
    try {
      const permission = await MediaLibrary.requestPermissionsAsync(true);
      if (!permission.granted) {
        triggerHaptic('warning');
        toast({ message: t('wifiQr.permissionDenied'), icon: 'alert-circle-outline', tone: 'danger' });
        return;
      }
      const uri = await exportPng();
      if (uri) {
        await MediaLibrary.saveToLibraryAsync(uri);
        triggerHaptic('success');
        toast({ message: t('wifiQr.saved'), icon: 'images-outline', tone: 'success' });
      }
    } catch {
      triggerHaptic('error');
    } finally {
      setBusy(null);
    }
  };

  return (
    <GlassCard style={styles.card}>
      <Text style={[typo.micro, { color: theme.colors.textTertiary }]}>{t('wifiQr.title')}</Text>
      <View style={styles.qrTile}>
        <QRCode
          value={value}
          size={188}
          quietZone={14}
          backgroundColor="#FFFFFF"
          color="#0B0F1A"
          getRef={(c) => {
            qrRef.current = c as QrRef | null;
          }}
        />
      </View>
      <Text style={[typo.caption, styles.hint, { color: theme.colors.textSecondary }]}>
        {t('wifiQr.hint')}
      </Text>
      <View style={styles.actions}>
        <PressableScale
          haptic="light"
          style={[styles.actionButton, { borderColor: theme.colors.border }]}
          onPress={() => void onShare()}
        >
          <Ionicons name="share-outline" size={18} color={theme.colors.accent} />
          <Text style={[typo.caption, { color: theme.colors.accent }]}>{t('wifiQr.share')}</Text>
        </PressableScale>
        <PressableScale
          haptic="light"
          style={[styles.actionButton, { borderColor: theme.colors.border }]}
          onPress={() => void onSave()}
        >
          <Ionicons name="download-outline" size={18} color={theme.colors.accent} />
          <Text style={[typo.caption, { color: theme.colors.accent }]}>{t('wifiQr.save')}</Text>
        </PressableScale>
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: spacing.lg,
    gap: spacing.md,
    alignItems: 'center',
  },
  qrTile: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  hint: {
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignSelf: 'stretch',
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: spacing.md - 2,
    borderRadius: radius.md,
    borderWidth: 1,
  },
});
