import * as LocalAuthentication from 'expo-local-authentication';
import { useSettings } from '@/store/settingsStore';

/**
 * Optional biometric/device gate before a secret is revealed or copied.
 * Returns true (allow) when the setting is off or no biometric hardware is
 * enrolled — the feature adds friction, it must never lock the user out.
 */
export async function authenticateForReveal(promptMessage: string): Promise<boolean> {
  if (!useSettings.getState().revealAuth) return true;
  try {
    const capable =
      (await LocalAuthentication.hasHardwareAsync()) && (await LocalAuthentication.isEnrolledAsync());
    if (!capable) return true;
    const result = await LocalAuthentication.authenticateAsync({ promptMessage });
    return result.success;
  } catch {
    return true;
  }
}
