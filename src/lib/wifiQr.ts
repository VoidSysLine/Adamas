/**
 * Builds the standard Wi-Fi network config QR payload
 * (`WIFI:T:WPA;S:MyNet;P:secret;;`) that iOS and Android cameras scan to
 * join a network directly.
 */

/** Special characters in the WIFI: format are escaped with a backslash. */
function escapeWifiValue(value: string): string {
  return value.replace(/([\\;,:"])/g, '\\$1');
}

/** Maps our encryption select values onto the QR auth types. */
function authType(encryption: string | undefined): 'WPA' | 'WEP' | 'nopass' {
  switch (encryption) {
    case 'WEP':
      return 'WEP';
    case 'none':
      return 'nopass';
    // WPA/WPA2/WPA3 all use the WPA auth marker in the QR standard.
    default:
      return 'WPA';
  }
}

/** Returns the QR payload, or null when there is no SSID to encode. */
export function buildWifiQrValue(data: {
  ssid?: string;
  password?: string;
  encryption?: string;
}): string | null {
  const ssid = data.ssid?.trim();
  if (!ssid) return null;
  const auth = data.password?.trim() ? authType(data.encryption) : 'nopass';
  const parts = [`T:${auth}`, `S:${escapeWifiValue(ssid)}`];
  if (auth !== 'nopass' && data.password) {
    parts.push(`P:${escapeWifiValue(data.password)}`);
  }
  return `WIFI:${parts.join(';')};;`;
}
