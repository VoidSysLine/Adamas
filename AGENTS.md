# Adamas — Projekt-Briefing für Agenten

Premium-Passwort-Manager (React Native / Expo), **muss zu 100 % in Expo Go laufen** — keine Custom Native Modules. UI-Sprache der Nutzerin/des Nutzers: **Deutsch**; antworte auf Deutsch.

## Harte Constraints (nicht verletzen!)

- **Expo SDK 54 festgepinnt** (`expo ~54.0.0`) — die Expo-Go-App des Users kann nur SDK 54. Niemals SDK upgraden, niemals `npm audit fix --force`.
- Docs-Referenz: https://docs.expo.dev/versions/v54.0.0/ — bei API-Unsicherheit die installierten `.d.ts` in `node_modules` lesen (docs.expo.dev ist aus der Sandbox oft 403).
- `npm install` braucht immer `--legacy-peer-deps`; `npx expo install` braucht `EXPO_OFFLINE=1` (Expo-API vom Sandbox-Proxy geblockt).
- **Nichts in `app/` darf beim Modul-Eval native Module ziehen, die crashen können** — Expo Router lädt ALLE Route-Dateien beim Start. `expo-camera` deshalb nur lazy (`src/components/ui/QrScannerModal.tsx` → `React.lazy` auf `CameraScanner.tsx`). Muster beibehalten.
- User testet auf **iOS** in Expo Go. Tresor liegt in der Expo-Go-Sandbox → Expo-Go-Deinstallation = Datenverlust (deshalb gibt es Backup/Restore, auch am Unlock-Screen).

## Workflow (jede Änderung)

1. Code ändern → 2. `npx tsc --noEmit` (muss leer sein) → 3. `npm test` (Node-Unit-Tests, muss grün sein) → 4. `EXPO_OFFLINE=1 npx expo export --platform ios --output-dir /tmp/adamas-verify` (muss durchlaufen) → 5. **pro Feature einzeln committen & pushen** (Branch: der jeweils in der Session zugewiesene `claude/…`-Branch — **immer den aktuellen Branch-Namen an den User weitergeben**, alte Branches nicht wiederverwenden), Commit-Messages auf Deutsch.
- Neue Logik ohne UI (Parser, Masken, Krypto, Validierung) direkt in `tests/unit.test.ts` mitabdecken — `scripts/test.sh` kopiert die Module nach `.testbuild/`, biegt `@/`-Imports um und stubbt Expo; läuft in reinem Node ohne Jest.
- Dem User am Ende immer den Fetch-Befehl mit dem **aktuellen** Branch nennen: `git pull origin <branch>` (+ `npm install --legacy-peer-deps` nur wenn neue Pakete) + `npx expo start -c`.

## Architektur-Kern

- **Schema-getrieben**: `src/constants/schema.ts` (`KIND_REGISTRY`) ist die Single Source of Truth für alle ~20 Eintragstypen (Felder, Typen, Masken, Icons, Select-Optionen, expiry-Flags). Formular (`app/entry/edit.tsx`), Detail (`app/entry/[id].tsx`), Suche, Audit leiten ALLES daraus ab. **Neuer Eintragstyp = nur**: `EntryKind`+Interface+`EntryDataMap` in `src/types/vault.ts`, Registry-Eintrag + Kategorie-`kinds`-Array in schema.ts, i18n-Keys (DE **und** EN spiegeln!), optional Untertitel in `EntryListItem.tsx` + `TITLE_EXAMPLES` in edit.tsx.
- **Krypto** (`src/crypto/`): Master-PW → Hash-Chain-KDF (native SHA-512, 10k Iter.) → Wrapping-Key → entpackt zufälligen Vault-Key. Tresor = AES-256-CBC + HMAC (Encrypt-then-MAC, crypto-js) in AsyncStorage; Meta/Bio-Key in SecureStore. PW-Wechsel = Re-Wrap. Anhänge/Avatare = einzeln verschlüsselte Dateien (`src/lib/attachments.ts`), NIE in den Vault-Blob (AsyncStorage-Limit!).
- **Stores** (zustand): `vaultStore` (Einträge, Trash, alle Mutationen, persistiert manuell verschlüsselt; `migrate()` in `vaultService.loadVault` für Alt-Daten), `settingsStore` (persist via AsyncStorage).
- **i18n**: `src/i18n/translations.ts`, typsichere dotted Keys, `de` ist Master, `en: Translations` muss exakt spiegeln (sonst tsc-Fehler). `useT()`-Hook.
- **Design „Obsidian & Ice“** (`src/theme/`): Aurora-Gradient (4 Stops), Sora (Display) + Manrope (Text) + Mono für Secrets, GlassCards, `PressableScale` (Haptik) überall. `type`-Skala nutzen, keine rohen fontWeights.
- **Feld-Masken**: `src/lib/masks.ts` (IBAN, VIN, KVNR, SVNR, Steuer-ID …) — Live-Formatierung mit Backspace-Handling. Feldtypen `code`/`username` = ohne Autokorrektur.
- **Listen-Perf**: `EntryListItem`/`FaviconBadge` sind `React.memo` mit Referenz-Vergleich, `index` bewusst ignoriert; Callbacks in `app/(tabs)/index.tsx` via `useCallback` stabil halten.

## Feature-Inventar (fertig)

Onboarding/Unlock (+ Backup-Recovery am Lock-Screen, Biometrie/Gerätecode via `getEnrolledLevelAsync`, Fehlversuchs-Bremse mit wachsender Wartezeit), ~20 Eintragstypen inkl. Fahrzeug (TÜV-Audit), Steuer/KVNR/Rente (deutsche Formate), Krypto- & Hardware-Wallet, VPN, YubiKey, Custom Fields (10 Typen), verschlüsselte Foto-Anhänge (max 2, EXIF-Strip) + Identitäts-Avatare, WLAN-QR (Teilen/Speichern), TOTP (Ring, QR-Scan, Ente-Auth-Import), Bitwarden-Import, Security-Audit (%-Konzept, HIBP k-Anonymity opt-in über ALLE Passwortfelder, 2FA-Status extern/N.A., Tage-Angaben bei Ablauf-Funden), Generator, Backup/Restore (.adamas) + Backup-Erinnerungs-Banner (14 Tage, 7 Tage Snooze), Master-PW ändern, Clipboard-Auto-Clear, Reveal-Auth, Papierkorb (30 Tage), Passwort-Verlauf, Duplizieren, Sortier-Umschalter, Marken-Icons für Finanzen/Dokumente/Tech (Bank/Versicherer/Provider/Hersteller-Favicon via `src/lib/brandIcons.ts`, Kartennetzwerk aus IIN, Krypto-Symbole; per Setting abschaltbar, Server-Hosts durch `publicHostDomain` privacy-gefiltert), Prüfsummen-Warnungen (IBAN mod-97, Karten-Luhn, Steuer-ID — `src/lib/validate.ts`, nicht blockierend), Kreditkarten-Visual, Privacy-Overlay im App-Switcher, Error Boundary, VoiceOver-Labels auf allen Icon-Buttons, Verwerfen-Schutz + Speichern-Button oben im Editor, Return-Taste schließt Passwort-Dialoge ab, DE/EN.

## Offene Roadmap (User-bestätigt, nicht begonnen)

„Zuletzt benutzt“-Sektion (lastUsed-Tracking) · Generator-Verlauf · Tags/Labels · weitere Sprachen (FR/ES/IT) · Nur mit Dev-Build (= Ebene A der Release-Readiness): EAS-Build + Bundle-IDs, native KDF-Härtung (Argon2), Autofill, Passkey-Provider, Sync.
