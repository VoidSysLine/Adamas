# 💎 Adamas

> *griechisch „unbezwingbar“ — der Ursprung des Wortes „Diamant“*

Ein Premium-Passwort-Manager, **zu 100 % testbar mit Expo Go** — keine Custom Native Modules, kein Development Build nötig.

## Schnellstart

```bash
npm install
npx expo start
```

QR-Code mit der **Expo Go**-App scannen — fertig.

## Tech-Stack & Setup

Erzeugt mit `create-expo-app` (blank-typescript) und ausschließlich Expo-Go-kompatiblen Paketen:

```bash
npx expo install expo-secure-store expo-crypto expo-clipboard expo-haptics \
  expo-local-authentication expo-blur expo-linear-gradient expo-localization \
  expo-router expo-linking expo-constants expo-font expo-splash-screen \
  expo-system-ui expo-image react-native-reanimated react-native-gesture-handler \
  react-native-safe-area-context react-native-screens react-native-worklets \
  react-native-svg @react-native-async-storage/async-storage \
  @react-native-community/slider @expo/vector-icons
npm install zustand crypto-js
```

## Architektur

```
app/                        # expo-router (file-based routing)
  _layout.tsx               # Root: Vault-Guard, Auto-Lock, Toast-Provider
  onboarding.tsx            # Master-Passwort anlegen
  unlock.tsx                # Entsperren (Passwort + Biometrie)
  (tabs)/
    index.tsx               # Tresor: Suche, Kategorie-Filter, Einträge
    tools.tsx               # Tools-Dashboard (Generator, Audit)
    settings.tsx            # Theme, Sprache, App-Icon, Auto-Lock, Biometrie
  new.tsx                   # Modal: Eintragsart wählen
  entry/[id].tsx            # Dynamische Detailansicht (schema-getrieben)
  entry/edit.tsx            # Dynamisches Formular (schema-getrieben)
  generator.tsx             # Passwort / Passphrase / PIN
  audit.tsx                 # Security-Audit mit animiertem Score-Ring

src/
  types/vault.ts            # Diskriminierte Union über 13 Eintragsarten
  constants/schema.ts       # Single Source of Truth: Felder, Icons, Kategorien
  crypto/
    cipher.ts               # AES-256-CBC + HMAC-SHA256 (Encrypt-then-MAC), KDF
    totp.ts                 # RFC 6238 TOTP (gegen RFC-Testvektoren verifiziert)
    vaultService.ts         # Schlüsselverwaltung & verschlüsselte Persistenz
  store/
    vaultStore.ts           # Zustand: Einträge, Lock-Status, CRUD
    settingsStore.ts        # Zustand + persist: Theme, Sprache, Auto-Lock
  lib/
    generator.ts            # CSPRNG-Generatoren (Rejection Sampling)
    strength.ts             # Entropie-basierte Passwortstärke (~1 KB statt zxcvbn)
    audit.ts                # Audit-Engine (schwach/dupliziert/alt/abgelaufen/2FA)
    favicon.ts              # Favicon-Kette: Google S2 → DuckDuckGo → Monogramm
    dates.ts, wordlist.ts
  i18n/                     # Typsichere DE/EN-Lokalisierung (dotted keys)
  theme/                    # Design-Tokens „Obsidian & Ice“, Dark/Light
  components/               # GlassCard, PressableScale, Toast, TotpRing, …
```

### Sicherheitsmodell

```
Master-Passwort ──KDF──▶ Wrapping-Key ──entpackt──▶ Vault-Key (zufällig, 256 Bit)
                                                        │
                                       AES-256 + HMAC   ▼
SecureStore (Keychain): Salt, Iterationen,   AsyncStorage: verschlüsselter
wrapped Vault-Key, Biometrie-Key             Tresor-Blob
```

- **Encrypt-then-MAC**: AES-256-CBC mit zufälligem IV, HMAC-SHA256 über IV+Ciphertext, getrennte Subkeys. Falsches Passwort/Manipulation ⇒ MAC-Fehler.
- **KDF**: iterierte SHA-512-Hash-Chain über den *nativen* expo-crypto-Digest (10 000 Runden). Pure-JS-PBKDF2 wäre in Hermes um eine Größenordnung langsamer pro Runde — die Chain erreicht im selben Latenzbudget einen höheren Work-Factor. Iterationszahl wird mitgespeichert (migrierbar).
- **Vault-Key-Indirektion**: Passwortwechsel = Re-Wrap des Keys, kein Re-Encrypt des Tresors.
- Master-Passwort wird **niemals gespeichert**; Vault-Key und entschlüsselte Daten existieren nur im Speicher, Auto-Lock wischt beides.
- **Biometrie**: Vault-Key im Geräte-Keychain (SecureStore), Zugriff durch `expo-local-authentication` gegated.

> ⚠️ Hinweis: In Expo Go teilen sich alle Projekte die Sandbox der Go-App. Für den Produktiveinsatz einen Development/EAS Build verwenden — der Code ist dafür unverändert lauffähig.

### Design-Entscheidungen

- **Schema-getriebene UI**: `KIND_REGISTRY` definiert jede Eintragsart einmal (Felder, Typen, Icons, Kategorie). Detailansicht, Formular, Suche und Audit leiten alles daraus ab — null Redundanz.
- **Design-Sprache „Obsidian & Ice“**: Near-Black-Canvas, Glas-Oberflächen (BlurView-Tab-Bar), Diamant-Gradient (Cyan→Blau→Violett), Gold für Favoriten. Helles „Porcelain“-Theme inklusive.
- **Micro-Interactions**: ein zentrales `PressableScale` (Spring-Scale + Haptik) gibt der ganzen App eine taktile Identität; gestaffelte `FadeInDown`-Listen, Shake bei falschem Passwort, animierter Score-Ring mit Count-up, TOTP-Countdown-Ring, animierte Stärke-Anzeige.
- **i18n**: typsichere Keys (`TKey` via Template-Literal-Types), Deutsch/Englisch, folgt der Systemsprache.
