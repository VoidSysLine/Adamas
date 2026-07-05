import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import { Image } from 'expo-image';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { GlassCard } from '@/components/ui/GlassCard';
import { PressableScale, triggerHaptic } from '@/components/ui/PressableScale';
import { useToast } from '@/components/ui/Toast';
import { useT } from '@/i18n';
import { loadAttachment, MAX_ATTACHMENTS_PER_ENTRY } from '@/lib/attachments';
import { pickAndCompressImage } from '@/lib/imagePick';
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
  onOpen: (meta: AttachmentMeta, base64: string) => void;
  onDelete: () => void;
}) {
  const theme = useTheme();
  const vaultKey = useVault((s) => s.vaultKey);
  const [payload, setPayload] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const uri = payload ? `data:${meta.mime};base64,${payload}` : null;

  useEffect(() => {
    let cancelled = false;
    if (!vaultKey) return;
    loadAttachment(meta.id, vaultKey)
      .then((base64) => {
        if (!cancelled) setPayload(base64);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [meta.id, vaultKey]);

  return (
    <View>
      <PressableScale
        haptic="light"
        style={[styles.thumb, { backgroundColor: theme.colors.surfaceAlt, borderColor: theme.colors.border }]}
        onPress={() => payload && onOpen(meta, payload)}
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
  const [viewer, setViewer] = useState<{ meta: AttachmentMeta; base64: string } | null>(null);
  const [exporting, setExporting] = useState<'share' | 'save' | null>(null);

  const items = entry.attachments ?? [];
  const canAdd = items.length < MAX_ATTACHMENTS_PER_ENTRY;

  /** Writes a temporary unencrypted copy for the share/save action. */
  const exportToCache = async (meta: AttachmentMeta, base64: string): Promise<string> => {
    const uri = `${FileSystem.cacheDirectory}adamas-${meta.id}.jpg`;
    await FileSystem.writeAsStringAsync(uri, base64, { encoding: FileSystem.EncodingType.Base64 });
    return uri;
  };

  const onShare = async () => {
    if (!viewer || exporting) return;
    setExporting('share');
    let uri: string | null = null;
    try {
      uri = await exportToCache(viewer.meta, viewer.base64);
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: viewer.meta.mime, dialogTitle: viewer.meta.name });
      }
    } catch {
      triggerHaptic('error');
    } finally {
      // Remove the plaintext copy once the share sheet is dismissed.
      if (uri) await FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => {});
      setExporting(null);
    }
  };

  const onSaveToPhotos = async () => {
    if (!viewer || exporting) return;
    setExporting('save');
    let uri: string | null = null;
    try {
      const permission = await MediaLibrary.requestPermissionsAsync(true);
      if (!permission.granted) {
        triggerHaptic('warning');
        toast({ message: t('attachments.permissionDenied'), icon: 'alert-circle-outline', tone: 'danger' });
        return;
      }
      uri = await exportToCache(viewer.meta, viewer.base64);
      await MediaLibrary.saveToLibraryAsync(uri);
      triggerHaptic('success');
      toast({ message: t('attachments.saved'), icon: 'images-outline', tone: 'success' });
    } catch {
      triggerHaptic('error');
    } finally {
      if (uri) await FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => {});
      setExporting(null);
    }
  };

  const importImage = async (source: 'camera' | 'library') => {
    if (busy) return;
    setBusy(true);
    try {
      const picked = await pickAndCompressImage(source);
      if (!picked) return;
      const ok = await addAttachment(entry.id, {
        name: `${entry.title}-${items.length + 1}.jpg`,
        mime: picked.mime,
        base64: picked.base64,
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
          <AttachmentThumb
            key={meta.id}
            meta={meta}
            onOpen={(m, base64) => setViewer({ meta: m, base64 })}
            onDelete={() => confirmDelete(meta)}
          />
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

      <Modal visible={viewer !== null} transparent animationType="fade" onRequestClose={() => setViewer(null)}>
        <Pressable style={styles.viewer} onPress={() => setViewer(null)}>
          {viewer && (
            <Image
              source={{ uri: `data:${viewer.meta.mime};base64,${viewer.base64}` }}
              style={styles.viewerImage}
              contentFit="contain"
            />
          )}
          <View style={styles.viewerClose}>
            <Ionicons name="close-circle" size={34} color="rgba(255,255,255,0.85)" />
          </View>
          <View style={styles.viewerActions}>
            <PressableScale haptic="light" style={styles.viewerButton} onPress={() => void onShare()}>
              {exporting === 'share' ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="share-outline" size={19} color="#FFFFFF" />
                  <Text style={[typo.caption, styles.viewerButtonText]}>{t('attachments.share')}</Text>
                </>
              )}
            </PressableScale>
            <PressableScale haptic="light" style={styles.viewerButton} onPress={() => void onSaveToPhotos()}>
              {exporting === 'save' ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="download-outline" size={19} color="#FFFFFF" />
                  <Text style={[typo.caption, styles.viewerButtonText]}>{t('attachments.save')}</Text>
                </>
              )}
            </PressableScale>
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
  viewerActions: {
    position: 'absolute',
    bottom: 52,
    flexDirection: 'row',
    gap: spacing.md,
  },
  viewerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.full,
    backgroundColor: 'rgba(255,255,255,0.16)',
    minWidth: 132,
  },
  viewerButtonText: {
    color: '#FFFFFF',
  },
});
