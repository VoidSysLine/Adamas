import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { kindGradient, kindIcon } from '@/constants/schema';
import { loadAttachment } from '@/lib/attachments';
import {
  bankDomain,
  cardNetwork,
  CARD_MARKS,
  cryptoMark,
  insurerDomain,
  pensionDomain,
  securityKeyDomain,
  simProviderDomain,
  vehicleBrandDomain,
  type BrandMark,
} from '@/lib/brandIcons';
import { extractDomain, faviconSources, monogram, publicHostDomain } from '@/lib/favicon';
import { useVault } from '@/store/vaultStore';
import { radius } from '@/theme';
import type { VaultEntry } from '@/types/vault';

/** Flat colored tile with a currency symbol / short word (card & crypto marks). */
function BrandTile({ mark, size }: { mark: BrandMark; size: number }) {
  return (
    <View
      style={[
        styles.brandTile,
        { width: size, height: size, borderRadius: radius.md, backgroundColor: mark.color },
      ]}
    >
      <Text
        style={{
          color: mark.textColor,
          fontSize: mark.isWord ? size * 0.3 : size * 0.5,
          fontWeight: '800',
          letterSpacing: mark.isWord ? 0.5 : 0,
        }}
      >
        {mark.label}
      </Text>
    </View>
  );
}

/** The Mastercard interlocking-circles mark. */
function MastercardTile({ size }: { size: number }) {
  const circle = size * 0.42;
  const overlap = circle * 0.32;
  return (
    <View style={[styles.brandTile, { width: size, height: size, borderRadius: radius.md, backgroundColor: '#1A1A1A' }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <View style={{ width: circle, height: circle, borderRadius: circle / 2, backgroundColor: '#EB001B' }} />
        <View
          style={{
            width: circle,
            height: circle,
            borderRadius: circle / 2,
            backgroundColor: '#F79E1B',
            marginLeft: -overlap,
            opacity: 0.92,
          }}
        />
      </View>
    </View>
  );
}

interface Props {
  entry: VaultEntry;
  size?: number;
}

/**
 * Favicon domain per kind: login/license URLs and server hosts directly
 * (hosts filtered so private infrastructure never hits the favicon services),
 * brand names (bank, insurer, pension provider, carrier, manufacturer)
 * resolved via the lookup tables in `brandIcons`.
 */
function entryDomain(entry: VaultEntry): string | null {
  switch (entry.kind) {
    case 'login':
      return extractDomain(entry.data.url);
    case 'softwareLicense':
      return extractDomain(entry.data.url);
    case 'server':
    case 'vpn':
      return publicHostDomain(entry.data.host);
    case 'apiKey':
      // api.example.com rarely serves its own favicon — use the site's.
      return publicHostDomain(entry.data.url)?.replace(/^api[.-]/, '') ?? null;
    case 'bankAccount':
      return bankDomain(entry.data.bankName);
    case 'healthInsurance':
      return insurerDomain(entry.data.insurer);
    case 'pension':
      return pensionDomain(entry.data.provider);
    case 'vehicle':
      return vehicleBrandDomain(entry.data.model);
    case 'sim':
      return simProviderDomain(entry.data.provider);
    case 'securityKey':
      return securityKeyDomain(entry.data.deviceModel);
    default:
      return null;
  }
}

/**
 * Entry avatar with a graceful degradation chain:
 * uploaded avatar (identities) → real favicon (Google → DuckDuckGo) →
 * category-gradient icon/monogram. Memoized (see export) so list re-sorts
 * don't re-run the favicon/avatar resolution for unchanged entries.
 */
function FaviconBadgeBase({ entry, size = 44 }: Props) {
  const [sourceIndex, setSourceIndex] = useState(0);
  const vaultKey = useVault((s) => s.vaultKey);
  const [avatar, setAvatar] = useState<string | null>(null);

  // Decrypt the profile photo when the entry carries one.
  useEffect(() => {
    let cancelled = false;
    if (!entry.avatarId || !vaultKey) {
      setAvatar(null);
      return;
    }
    loadAttachment(entry.avatarId, vaultKey)
      .then((base64) => {
        if (!cancelled) setAvatar(`data:image/jpeg;base64,${base64}`);
      })
      .catch(() => {
        if (!cancelled) setAvatar(null);
      });
    return () => {
      cancelled = true;
    };
  }, [entry.avatarId, vaultKey]);

  const domain = entryDomain(entry);
  const sources = domain ? faviconSources(domain) : [];
  const showFavicon = domain !== null && sourceIndex < sources.length;
  const gradient = kindGradient(entry.kind);

  if (avatar) {
    return (
      <Image
        source={{ uri: avatar }}
        style={{ width: size, height: size, borderRadius: radius.md }}
        contentFit="cover"
        transition={150}
        recyclingKey={entry.avatarId}
      />
    );
  }

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

  // Credit card: brand tile detected from the card number prefix.
  if (entry.kind === 'creditCard') {
    const network = cardNetwork(entry.data.number);
    if (network === 'mastercard') return <MastercardTile size={size} />;
    if (network) return <BrandTile mark={CARD_MARKS[network]} size={size} />;
  }

  // Crypto wallet: currency symbol in the coin's brand color.
  if (entry.kind === 'crypto') {
    const mark = cryptoMark(entry.data.blockchain);
    if (mark) return <BrandTile mark={mark} size={size} />;
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

export const FaviconBadge = React.memo(
  FaviconBadgeBase,
  (prev, next) => prev.entry === next.entry && prev.size === next.size,
);

const styles = StyleSheet.create({
  shell: {
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandTile: {
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
