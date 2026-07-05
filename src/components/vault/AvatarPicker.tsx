import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, View } from 'react-native';
import { PressableScale, triggerHaptic } from '@/components/ui/PressableScale';
import { FaviconBadge } from '@/components/vault/FaviconBadge';
import { useT } from '@/i18n';
import { pickAndCompressImage, type ImageSource } from '@/lib/imagePick';
import { useVault } from '@/store/vaultStore';
import { radius, useTheme } from '@/theme';
import type { VaultEntry } from '@/types/vault';

const SIZE = 84;

/**
 * Tappable entry avatar (identity profile photo). Opens an action sheet to
 * take/choose a photo — square-cropped, compressed and encrypted like other
 * uploads — or to remove the current one. Shows the small camera affordance.
 */
export function AvatarPicker({ entry }: { entry: VaultEntry }) {
  const theme = useTheme();
  const t = useT();
  const setAvatar = useVault((s) => s.setAvatar);
  const removeAvatar = useVault((s) => s.removeAvatar);
  const [busy, setBusy] = useState(false);

  const upload = async (source: ImageSource) => {
    setBusy(true);
    try {
      // Avatars are square and small (256 px) — sharp as an icon, tiny on disk.
      const picked = await pickAndCompressImage(source, 256);
      if (picked) {
        await setAvatar(entry.id, picked.base64);
        triggerHaptic('success');
      }
    } catch {
      triggerHaptic('error');
    } finally {
      setBusy(false);
    }
  };

  const openMenu = () => {
    triggerHaptic('light');
    const options = [
      { text: t('avatar.camera'), onPress: () => void upload('camera') },
      { text: t('avatar.gallery'), onPress: () => void upload('library') },
      ...(entry.avatarId
        ? [{ text: t('avatar.remove'), style: 'destructive' as const, onPress: () => void removeAvatar(entry.id) }]
        : []),
      { text: t('common.cancel'), style: 'cancel' as const },
    ];
    Alert.alert(t('avatar.title'), undefined, options);
  };

  return (
    <PressableScale haptic="none" onPress={openMenu} style={styles.wrap}>
      <FaviconBadge entry={entry} size={SIZE} />
      <View style={[styles.badge, { backgroundColor: theme.colors.accent, borderColor: theme.colors.background }]}>
        {busy ? (
          <ActivityIndicator size="small" color={theme.colors.onAccent} />
        ) : (
          <Ionicons name="camera" size={15} color={theme.colors.onAccent} />
        )}
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: SIZE,
    height: SIZE,
  },
  badge: {
    position: 'absolute',
    right: -4,
    bottom: -4,
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
