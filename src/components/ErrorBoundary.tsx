import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { DiamondLogo } from '@/components/ui/DiamondLogo';
import { resolveLanguage, translate } from '@/i18n';
import { useSettings } from '@/store/settingsStore';

/**
 * Last line of defense: a render error shows this screen instead of killing
 * the app. Deliberately minimal — no theme hook, no animated components,
 * nothing that could itself throw. The vault stays untouched; "reload"
 * simply re-renders the tree.
 */
export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true };
  }

  componentDidCatch(error: unknown): void {
    console.error('[adamas] render error', error);
  }

  render(): React.ReactNode {
    if (!this.state.failed) return this.props.children;
    const lang = resolveLanguage(useSettings.getState().language);
    return (
      <View style={styles.container}>
        <DiamondLogo size={72} />
        <Text style={styles.title}>{translate(lang, 'error.title')}</Text>
        <Text style={styles.message}>{translate(lang, 'error.message')}</Text>
        <Pressable style={styles.button} onPress={() => this.setState({ failed: false })}>
          <Text style={styles.buttonLabel}>{translate(lang, 'error.retry')}</Text>
        </Pressable>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#06070D',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 12,
  },
  title: {
    color: '#F4F7FF',
    fontSize: 20,
    fontWeight: '700',
    marginTop: 16,
    textAlign: 'center',
  },
  message: {
    color: 'rgba(244,247,255,0.65)',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  button: {
    marginTop: 16,
    paddingHorizontal: 28,
    paddingVertical: 13,
    borderRadius: 14,
    backgroundColor: 'rgba(103,232,249,0.16)',
  },
  buttonLabel: {
    color: '#67E8F9',
    fontSize: 15,
    fontWeight: '600',
  },
});
