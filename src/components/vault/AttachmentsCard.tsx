import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { GlassCard } from '@/components/ui/GlassCard';
import { PressableScale, triggerHaptic } from '@/components/ui/PressableScale';
import { useToast } from '@/components/ui/Toast';
import { useT } from '@/i18n';
import { loadAttachment, MAX_ATTACHMENTS_PER_ENTRY, MAX_BASE64_LENGTH } from '@/lib/attachments';
import { useVault } from '@/store/vaultStore';
import { radius, spacing, type as typo, useTheme } from '@/theme';
import type { AttachmentMeta, VaultEntry } from '@/types/vault';

const THUMB = 96;

/** Decrypts and shows one attachment thumbnail; tap opens the fullscreen viewer. */
function AttachmentThumb({
  meta,
  onOpen,
  onDelete,
}: {
  meta: AttachmentMeta;
  onOpen: (uri: string) => void;
  onDelete: () => void;
}) {
  const theme = useTheme();
  const vaultKey = useVault((s) => s.vaultKey);
  const [uri, setUri] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!vaultKey) return;
    loadAttachment(meta.id, vaultKey)
      .then((base64) => {
        if (!cancelled) setUri(`data:${meta.mime};base64,${base64}`);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [meta.id, meta.mime, vaultKey]);

  return (
    <View>
      <PressableScale
        haptic="light"
        style={[styles.thumb, { backgroundColor: theme.colors.surfaceAlt, borderColor: theme.colors.border }]}
        onPress={() => uri && onOpen(uri)}
      >
        {uri ? (
          <Image source={{ uri }} style={styles.thumbImage} contentFit="cover" transition={120} />
        ) : failed ? (
          <Ionicons name="alert-circle-outline" size={22} color={theme.colors.danger} />
        ) : (
          <ActivityIndicator size="small" color={theme.colors.accent} />
        )}
      </PressableScale>
      <PressableScale haptic="none" style={[styles.deleteBadge, { backgroundColor: theme.colors.danger }]} onPress={onDelete}>
        <Ionicons name="close" size={13} color="#FFFFFF" />
      </PressableScale>
    </View>
  );
}

/**
 * Encrypted photo attachments (e.g. passport front/back). Photos are resized
 * to ≤1600 px JPEG on import — which also strips EXIF/GPS — then encrypted
 * with the vault key and stored outside the vault blob.
 */
export function AttachmentsCard({ entry }: { entry: VaultEntry }) {
  const theme = useTheme();
  const t = useT();
  const toast = useToast();
  const addAttachment = useVault((s) => s.addAttachment);
  const removeAttachment = useVault((s) => s.removeAttachment);

  const [busy, setBusy] = useState(false);
  const [viewerUri, setViewerUri] = useState<string | null>(null);

  const items = entry.attachments ?? [];
  const canAdd = items.length < MAX_ATTACHMENTS_PER_ENTRY;

  const importImage = async (source: 'camera' | 'library') => {
    if (busy) return;
    setBusy(true);
    try {
      const options: ImagePicker.ImagePickerOptions = { mediaTypes: 'images', quality: 1 };
      const result =
        source === 'camera'
          ? await (async () => {
              const permission = await ImagePicker.requestCameraPermissionsAsync();
              if (!permission.granted) return null;
              return ImagePicker.launchCameraAsync(options);
            })()
          : await ImagePicker.launchImageLibraryAsync(options);
      if (!result || result.canceled || !result.assets?.[0]) return;

      const asset = result.assets[0];
      // Downscale + recompress: bounds the size and drops EXIF/GPS metadata.
      const processed = await ImageManipulator.manipulateAsync(
        asset.uri,
        asset.width > 1600 ? [{ resize: { width: 1600 } }] : [],
        { compress: 0.6, format: ImageManipulator.SaveFormat.JPEG, base64: true },
      );
      if (!processed.base64 || processed.base64.length > MAX_BASE64_LENGTH) {
        triggerHaptic('error');
        toast({ message: t('attachments.tooLarge'), icon: 'alert-circle-outline', tone: 'danger' });
        return;
      }
      const ok = await addAttachment(entry.id, {
        name: `${entry.title}-${items.length + 1}.jpg`,
        mime: 'image/jpeg',
        base64: processed.base64,
      });
      if (ok) {
        triggerHaptic('success');
        toast({ message: t('attachments.added'), icon: 'image-outline', tone: 'success' });
      }
    } catch {
      triggerHaptic('error');
    } finally {
      setBusy(false);
    }
  };

  const confirmDelete = (meta: AttachmentMeta) => {
    triggerHaptic('warning');
    Alert.alert(t('attachments.deleteTitle'), undefined, [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: () => void removeAttachment(entry.id, meta.id),
      },
    ]);
  };

  return (
    <GlassCard style={styles.card}>
      <Text style={[typo.micro, { color: theme.colors.textTertiary }]}>{t('attachments.title')}</Text>
      <View style={styles.row}>
        {items.map((meta) => (
          <AttachmentThumb key={meta.id} meta={meta} onOpen={setViewerUri} onDelete={() => confirmDelete(meta)} />
        ))}
        {canAdd && (
          <View style={styles.addColumn}>
            <PressableScale
              haptic="light"
              style={[styles.addButton, { borderColor: theme.colors.border }]}
              onPress={() => void importImage('camera')}
              disabled={busy}
            >
              {busy ? (
                <ActivityIndicator size="small" color={theme.colors.accent} />
              ) : (
                <>
                  <Ionicons name="camera-outline" size={18} color={theme.colors.accent} />
                  <Text style={[typo.micro, { color: theme.colors.accent }]}>{t('attachments.camera')}</Text>
                </>
              )}
            </PressableScale>
            <PressableScale
              haptic="light"
              style={[styles.addButton, { borderColor: theme.colors.border }]}
              onPress={() => void importImage('library')}
              disabled={busy}
            >
              <Ionicons name="images-outline" size={18} color={theme.colors.accent} />
              <Text style={[typo.micro, { color: theme.colors.accent }]}>{t('attachments.gallery')}</Text>
            </PressableScale>
          </View>
        )}
      </View>
      <Text style={[typo.caption, { color: theme.colors.textTertiary }]}>{t('attachments.hint')}</Text>

      <Modal visible={viewerUri !== null} transparent animationType="fade" onRequestClose={() => setViewerUri(null)}>
        <Pressable style={styles.viewer} onPress={() => setViewerUri(null)}>
          {viewerUri && <Image source={{ uri: viewerUri }} style={styles.viewerImage} contentFit="contain" />}
          <View style={styles.viewerClose}>
            <Ionicons name="close-circle" size={34} color="rgba(255,255,255,0.85)" />
          </View>
        </Pressable>
      </Modal>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'center',
  },
  thumb: {
    width: THUMB,
    height: THUMB,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  thumbImage: {
    width: '100%',
    height: '100%',
  },
  deleteBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addColumn: {
    gap: spacing.sm,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.md,
    borderWidth: 1,
    minWidth: 118,
  },
  viewer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewerImage: {
    width: '94%',
    height: '80%',
  },
  viewerClose: {
    position: 'absolute',
    top: 56,
    right: 20,
  },
});
