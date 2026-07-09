import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Brake against master-password guessing on the unlock screen: the first
 * three failures are free, after that the wait doubles per failure
 * (10 s → 20 s → 40 s … capped at 5 min). State survives app restarts via
 * AsyncStorage; a successful unlock resets it. Biometric unlock is not
 * throttled — the OS already rate-limits it.
 */

const KEY = 'adamas.unlockThrottle';
const FREE_ATTEMPTS = 3;
const BASE_DELAY_S = 10;
const MAX_DELAY_S = 300;

interface ThrottleState {
  failures: number;
  lockUntil: number;
}

async function read(): Promise<ThrottleState> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as ThrottleState;
  } catch {
    // Corrupt state → treat as clean slate.
  }
  return { failures: 0, lockUntil: 0 };
}

/** Seconds the user still has to wait before the next password attempt. */
export async function throttleRemainingSeconds(now: number = Date.now()): Promise<number> {
  const state = await read();
  return Math.max(0, Math.ceil((state.lockUntil - now) / 1000));
}

/** Records a failed attempt; returns the imposed wait in seconds (0 while free). */
export async function recordFailedUnlock(now: number = Date.now()): Promise<number> {
  const state = await read();
  const failures = state.failures + 1;
  const over = failures - FREE_ATTEMPTS;
  const delay = over > 0 ? Math.min(MAX_DELAY_S, BASE_DELAY_S * 2 ** (over - 1)) : 0;
  const next: ThrottleState = { failures, lockUntil: delay > 0 ? now + delay * 1000 : 0 };
  await AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => {});
  return delay;
}

/** Clears the counter after a successful unlock. */
export async function resetUnlockThrottle(): Promise<void> {
  await AsyncStorage.removeItem(KEY).catch(() => {});
}
