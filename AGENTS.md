# Adamas — Projekt-Briefing für Agenten

Premium-Passwort-Manager (React Native / Expo), **muss zu 100 % in Expo Go laufen** — keine Custom Native Modules. UI-Sprache der Nutzerin/des Nutzers: **Deutsch**; antworte auf Deutsch.

## Harte Constraints (nicht verletzen!)

- **Expo SDK 54 festgepinnt** (`expo ~54.0.0`) — die Expo-Go-App des Users kann nur SDK 54. Niemals SDK upgraden, niemals `npm audit fix --force`.
- Docs-Referenz: https://docs.expo.dev/versions/v54.0.0/ — bei API-Unsicherheit die installierten `.d.ts` in `node_modules` lesen (docs.expo.dev ist aus der Sandbox oft 403).
- `npm install` braucht immer `--legacy-peer-deps`; `npx expo install` braucht `EXPO_OFFLINE=1` (Expo-API vom Sandbox-Proxy geblockt).
- **Nichts in `app/` darf beim Modul-Eval native Module ziehen, die crashen können** — Expo Router lädt ALLE Route-Dateien beim Start. `expo-camera` deshalb nur lazy (`src/components/ui/QrScannerModal.tsx` → `React.lazy` auf `CameraScanner.tsx`). Muster beibehalten.
- User testet auf **iOS** in Expo Go. Tresor liegt in der Expo-Go-Sandbox → Expo-Go-Deinstallation = Datenverlust (deshalb gibt es Backup/Restore, auch am Unlock-Screen).

## Workflow (jede Änderung)

1. Code ändern → 2. `npx tsc --noEmit` (muss leer sein) → 3. `EXPO_OFFLINE=1 npx expo export --platform ios --output-dir /tmp/adamas-verify` (muss durchlaufen) → 4. **pro Feature einzeln committen & pushen** (Branch `claude/charming-dirac-elwevt`), Commit-Messages auf Deutsch.
- Logik ohne UI (Parser, Masken, Krypto) zusätzlich per Node-Test verifizieren: Datei nach `/tmp/<x>/` kopieren, `@/`-Imports per `sed` umbiegen, expo-Module stubben, mit `npx tsc <file> --module commonjs --esModuleInterop --skipLibCheck` kompilieren, Testskript laufen lassen (Beispiele: bisherige Commits für TOTP/HIBP/Backup/Masken).
- Dem User am Ende immer den Fetch-Befehl nennen: `git pull origin claude/charming-dirac-elwevt` (+ `npm install --legacy-peer-deps` nur wenn neue Pakete) + `npx expo start -c`.

## Architektur-Kern

- **Schema-getrieben**: `src/constants/schema.ts` (`KIND_REGISTRY`) ist die Single Source of Truth für alle ~20 Eintragstypen (Felder, Typen, Masken, Icons, Select-Optionen, expiry-Flags). Formular (`app/entry/edit.tsx`), Detail (`app/entry/[id].tsx`), Suche, Audit leiten ALLES daraus ab. **Neuer Eintragstyp = nur**: `EntryKind`+Interface+`EntryDataMap` in `src/types/vault.ts`, Registry-Eintrag + Kategorie-`kinds`-Array in schema.ts, i18n-Keys (DE **und** EN spiegeln!), optional Untertitel in `EntryListItem.tsx` + `TITLE_EXAMPLES` in edit.tsx.
- **Krypto** (`src/crypto/`): Master-PW → Hash-Chain-KDF (native SHA-512, 10k Iter.) → Wrapping-Key → entpackt zufälligen Vault-Key. Tresor = AES-256-CBC + HMAC (Encrypt-then-MAC, crypto-js) in AsyncStorage; Meta/Bio-Key in SecureStore. PW-Wechsel = Re-Wrap. Anhänge/Avatare = einzeln verschlüsselte Dateien (`src/lib/attachments.ts`), NIE in den Vault-Blob (AsyncStorage-Limit!).
- **Stores** (zustand): `vaultStore` (Einträge, Trash, alle Mutationen, persistiert manuell verschlüsselt; `migrate()` in `vaultService.loadVault` für Alt-Daten), `settingsStore` (persist via AsyncStorage).
- **i18n**: `src/i18n/translations.ts`, typsichere dotted Keys, `de` ist Master, `en: Translations` muss exakt spiegeln (sonst tsc-Fehler). `useT()`-Hook.
- **Design „Obsidian & Ice“** (`src/theme/`): Aurora-Gradient (4 Stops), Sora (Display) + Manrope (Text) + Mono für Secrets, GlassCards, `PressableScale` (Haptik) überall. `type`-Skala nutzen, keine rohen fontWeights.
- **Feld-Masken**: `src/lib/masks.ts` (IBAN, VIN, KVNR, SVNR, Steuer-ID …) — Live-Formatierung mit Backspace-Handling. Feldtypen `code`/`username` = ohne Autokorrektur.
- **Listen-Perf**: `EntryListItem`/`FaviconBadge` sind `React.memo` mit Referenz-Vergleich, `index` bewusst ignoriert; Callbacks in `app/(tabs)/index.tsx` via `useCallback` stabil halten.

## Feature-Inventar (fertig)

Onboarding/Unlock (+ Backup-Recovery am Lock-Screen, Biometrie/Gerätecode via `getEnrolledLevelAsync`), ~20 Eintragstypen inkl. Fahrzeug (TÜV-Audit), Steuer/KVNR/Rente (deutsche Formate), Krypto- & Hardware-Wallet, VPN, YubiKey, Custom Fields (10 Typen), verschlüsselte Foto-Anhänge (max 2, EXIF-Strip) + Identitäts-Avatare, WLAN-QR (Teilen/Speichern), TOTP (Ring, QR-Scan, Ente-Auth-Import), Bitwarden-Import, Security-Audit (%-Konzept, HIBP k-Anonymity opt-in, 2FA-Status extern/N.A.), Generator, Backup/Restore (.adamas), Master-PW ändern, Clipboard-Auto-Clear, Reveal-Auth, Papierkorb (30 Tage), Passwort-Verlauf, Duplizieren, Sortier-Umschalter, Marken-Icons (Bank-Favicon, Kartennetzwerk aus IIN, Krypto-Symbole), Kreditkarten-Visual, DE/EN.

## Offene Roadmap (User-bestätigt, nicht begonnen)

„Zuletzt benutzt“-Sektion (lastUsed-Tracking) · Generator-Verlauf · Tags/Labels · weitere Sprachen (FR/ES/IT) · Backup-Erinnerung (Banner wenn Backup > X Tage alt; User war interessiert, Intervall unklar) · Nur mit Dev-Build: Autofill, Passkey-Provider, Sync.
