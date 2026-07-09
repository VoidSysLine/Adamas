#!/usr/bin/env bash
#
# Node-Unit-Tests für die reine Logik (Masken, Prüfsummen, Audit, TOTP,
# Marken-Icons, Parser). Die Module werden flach in ein Build-Verzeichnis
# kopiert, @/-Aliase auf relative Pfade umgebogen und Expo-/UI-Abhängigkeiten
# gestubbt — so laufen die Tests ohne Jest/Metro in reinem Node.
#
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BUILD="$ROOT/.testbuild"

rm -rf "$BUILD"
mkdir -p "$BUILD"

cp "$ROOT"/src/lib/masks.ts \
   "$ROOT"/src/lib/validate.ts \
   "$ROOT"/src/lib/dates.ts \
   "$ROOT"/src/lib/strength.ts \
   "$ROOT"/src/lib/audit.ts \
   "$ROOT"/src/lib/brandIcons.ts \
   "$ROOT"/src/lib/favicon.ts \
   "$ROOT"/src/lib/wifiQr.ts \
   "$BUILD/"
cp "$ROOT/src/crypto/totp.ts" "$BUILD/totp.ts"
cp "$ROOT/src/constants/schema.ts" "$BUILD/schema.ts"
cp "$ROOT/src/types/vault.ts" "$BUILD/vault.ts"
cp "$ROOT/src/lib/importers/bitwarden.ts" "$BUILD/bitwarden.ts"
cp "$ROOT/src/lib/importers/totp.ts" "$BUILD/totpImport.ts"
cp "$ROOT"/tests/*.test.ts "$BUILD/"

# @/-Aliase → flache relative Importe
sed -i \
  -e "s|@/constants/schema|./schema|" \
  -e "s|@/types/vault|./vault|" \
  -e "s|@/lib/masks|./masks|" \
  -e "s|@/lib/dates|./dates|" \
  -e "s|@/lib/strength|./strength|" \
  -e "s|@/lib/favicon|./favicon|" \
  -e "s|@/crypto/totp|./totp|" \
  "$BUILD"/*.ts

# Ionicons aus dem Schema stubben (nur der Typ wird gebraucht)
sed -i \
  -e "s|import type { ComponentProps } from 'react';||" \
  -e "s|import { Ionicons } from '@expo/vector-icons';||" \
  -e "s|export type IoniconName = ComponentProps<typeof Ionicons>\['name'\];|export type IoniconName = string;|" \
  "$BUILD/schema.ts"

cd "$BUILD"
npx tsc ./*.ts --module commonjs --esModuleInterop --skipLibCheck --target es2020 --outDir js

failed=0
for test in js/*.test.js; do
  echo "── $(basename "$test")"
  node "$test" || failed=1
done

if [ "$failed" -ne 0 ]; then
  echo "TESTS FEHLGESCHLAGEN"
  exit 1
fi
echo "ALLE TESTDATEIEN OK"
