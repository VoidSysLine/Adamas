import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { kindGradient, kindIcon } from '@/constants/schema';
import { extractDomain, faviconSources, monogram } from '@/lib/favicon';
import { radius } from '@/theme';
import type { VaultEntry } from '@/types/vault';

interface Props {
  entry: VaultEntry;
  size?: number;
}

/**
 * Entry avatar with a graceful degradation chain:
 * real favicon (Google → DuckDuckGo) → category-gradient icon/monogram.
 */
export function FaviconBadge({ entry, size = 44 }: Props) {
  const [sourceIndex, setSourceIndex] = useState(0);
  const domain = entry.kind === 'login' ? extractDomain(entry.data.url) : null;
  const sources = domain ? faviconSources(domain) : [];
  const showFavicon = domain !== null && sourceIndex < sources.length;
  const gradient = kindGradient(entry.kind);

  if (showFavicon) {
    // The favicon fills the whole badge (like the category icons); a small
    // inset keeps it off the rounded corners, "cover" crops the source's own
    // transparent margins so the logo reads large instead of floating.
    const inset = Math.round(size * 0.1);
    return (
      <View style={[styles.shell, { width: size, height: size, borderRadius: radius.md }]}>
        <Image
          source={{ uri: sources[sourceIndex] }}
          style={{ width: size - inset, height: size - inset, borderRadius: radius.md - 4 }}
          contentFit="cover"
          transition={150}
          recyclingKey={domain}
          onError={() => setSourceIndex((i) => i + 1)}
        />
      </View>
    );
  }

  return (
    <LinearGradient
      colors={[...gradient]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.gradient, { width: size, height: size, borderRadius: radius.md }]}
    >
      {entry.kind === 'login' ? (
        <Text style={[styles.monogram, { fontSize: size * 0.42 }]}>{monogram(entry.title)}</Text>
      ) : (
        <Ionicons name={kindIcon(entry.kind)} size={size * 0.48} color="rgba(8,10,18,0.85)" />
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  shell: {
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gradient: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  monogram: {
    fontWeight: '800',
    color: 'rgba(8,10,18,0.85)',
  },
});
