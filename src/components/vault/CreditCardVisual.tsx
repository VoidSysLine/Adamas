import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { PressableScale, triggerHaptic } from '@/components/ui/PressableScale';
import { useCopy } from '@/components/ui/Toast';
import { useT } from '@/i18n';
import { cardNetwork } from '@/lib/brandIcons';
import { fonts, radius, spacing, type as typo, useTheme } from '@/theme';
import type { CreditCardData } from '@/types/vault';

/** Network → tuned card gradient. Default is a premium obsidian sheen. */
const CARD_GRADIENTS: Record<string, readonly [string, string]> = {
  visa: ['#2A4DA8', '#1A1F71'],
  mastercard: ['#3A2A2E', '#1A1416'],
  amex: ['#2E77BC', '#1C4E80'],
  discover: ['#E55C20', '#B23E12'],
  diners: ['#0079BE', '#004E7C'],
  jcb: ['#1560B5', '#0B4EA2'],
};
const DEFAULT_GRADIENT = ['#232A3B', '#0C0F18'] as const;

function groupNumber(raw: string): string {
  return raw.replace(/\s/g, '').replace(/(.{4})/g, '$1 ').trim();
}

/** A tappable, card-shaped visual for credit-card entries. */
export function CreditCardVisual({ data, title }: { data: CreditCardData; title: string }) {
  const theme = useTheme();
  const t = useT();
  const copy = useCopy();
  const [revealed, setRevealed] = useState(false);

  const network = cardNetwork(data.number);
  const gradient = (network && CARD_GRADIENTS[network]) || DEFAULT_GRADIENT;
  const digits = (data.number ?? '').replace(/\s/g, '');
  const displayNumber = digits
    ? revealed
      ? groupNumber(digits)
      : `•••• •••• •••• ${digits.slice(-4)}`
    : '•••• •••• •••• ••••';

  return (
    <LinearGradient colors={gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.card}>
      <View style={styles.topRow}>
        <View style={styles.chip} />
        <Text style={styles.network}>
          {network === 'mastercard' ? 'MC' : network ? network.toUpperCase() : ''}
        </Text>
      </View>

      <PressableScale
        haptic="none"
        style={styles.numberRow}
        onPress={() => {
          triggerHaptic('selection');
          setRevealed((r) => !r);
        }}
      >
        <Text style={styles.number}>{displayNumber}</Text>
        {digits.length > 0 && (
          <PressableScale haptic="none" onPress={() => copy(t('fields.cardNumber'), digits)}>
            <Ionicons name="copy-outline" size={17} color="rgba(255,255,255,0.75)" />
          </PressableScale>
        )}
      </PressableScale>

      <View style={styles.bottomRow}>
        <View style={styles.field}>
          <Text style={styles.label}>{t('fields.cardHolder')}</Text>
          <Text style={styles.value} numberOfLines={1}>
            {data.holder || title}
          </Text>
        </View>
        {data.expiryDate && (
          <View style={styles.field}>
            <Text style={styles.label}>{t('fields.expiryDate')}</Text>
            <Text style={styles.value}>{data.expiryDate}</Text>
          </View>
        )}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    aspectRatio: 1.586, // ISO/IEC 7810 ID-1
    borderRadius: radius.lg,
    padding: spacing.lg,
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  chip: {
    width: 40,
    height: 30,
    borderRadius: 6,
    backgroundColor: 'rgba(245,215,150,0.85)',
  },
  network: {
    color: '#FFFFFF',
    fontFamily: fonts.displayHeavy,
    fontSize: 20,
    letterSpacing: 1,
  },
  numberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  number: {
    color: '#FFFFFF',
    fontFamily: fonts.mono,
    fontSize: 20,
    letterSpacing: 2,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  field: {
    gap: 3,
    flexShrink: 1,
  },
  label: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  value: {
    color: '#FFFFFF',
    fontFamily: fonts.medium,
    fontSize: 15,
    letterSpacing: 0.5,
  },
});
