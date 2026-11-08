#!/usr/bin/env bash
# Publica una versión nueva de la app Android con un solo comando:
# sube la versión, compila (solo arm64-v8a), firma con la clave propia,
# confirma y sube el cambio de versión, crea la release en GitHub y espera
# a que el servidor copie el APK para servirlo desde /descargar.
#
# Uso: scripts/publish-android-release.sh <versión> [notas]
#   scripts/publish-android-release.sh 1.0.14 "- Mejoras del modo sin conexión"
set -euo pipefail

version="${1:?Falta la versión, por ejemplo 1.0.14}"
notes="${2:-}"
download_url="${WASI_DOWNLOAD_URL:-https://api.maps.devs-ueb.tech/descargar/wasi-travel.apk}"

root="$(git -C "$(dirname "$0")" rev-parse --show-toplevel)"
mobile="$root/apps/mobile"
app_json="$mobile/app.json"
gradle="$mobile/android/app/build.gradle"
output="$mobile/android/app/build/outputs/apk/release"

fail() { echo "Error: $*" >&2; exit 1; }

[[ "$version" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]] || fail "versión inválida: $version"
[[ -f "$gradle" ]] || fail "no existe $gradle; ejecuta antes «npx expo prebuild»"
[[ "$(git -C "$root" branch --show-current)" == main ]] || fail "hay que estar en main"
git -C "$root" diff --quiet HEAD -- "$app_json" || fail "app.json tiene cambios sin confirmar"
git -C "$root" fetch --quiet origin main
[[ "$(git -C "$root" rev-parse HEAD)" == "$(git -C "$root" rev-parse origin/main)" ]] ||
  fail "main no coincide con origin/main; sincroniza antes de publicar"
! gh release view "v$version" >/dev/null 2>&1 || fail "la release v$version ya existe"

current="$(node -p "require('$app_json').expo.version")"
newest="$(printf '%s\n%s\n' "$current" "$version" | sort -V | tail -1)"
[[ "$version" != "$current" && "$newest" == "$version" ]] ||
  fail "la versión $version debe ser mayor que la actual ($current)"
code="$(( $(node -p "require('$app_json').expo.android.versionCode") + 1 ))"

echo "==> Versión $current → $version (versionCode $code)"
node -e '
  const fs = require("fs");
  const [file, version, code] = process.argv.slice(1);
  const json = JSON.parse(fs.readFileSync(file, "utf8"));
  json.expo.version = version;
  json.expo.android.versionCode = Number(code);
  fs.writeFileSync(file, JSON.stringify(json, null, 2) + "\n");
' "$app_json" "$version" "$code"
sed -i -E "s/^( *versionCode( =)? )[0-9]+$/\1$code/; s/^( *versionName( =)? )\"[^\"]+\"$/\1\"$version\"/" "$gradle"
grep -Eq "^ *versionCode( =)? $code$" "$gradle" &&
  grep -Eq "^ *versionName( =)? \"$version\"$" "$gradle" ||
  fail "no se pudo actualizar la versión en build.gradle"

echo "==> Compilando (arm64-v8a)"
(cd "$mobile/android" && ./gradlew :app:assembleRelease -PreactNativeArchitectures=arm64-v8a -q)

echo "==> Firmando"
"$root/scripts/sign-android-release.sh" "$output/app-release.apk" "$output/wasi-travel.apk"

echo "==> Confirmando y subiendo la versión"
git -C "$root" commit --quiet -m "chore(mobile): actualizar versión a $version" -- "$app_json"
git -C "$root" push --quiet origin main
commit="$(git -C "$root" rev-parse HEAD)"

echo "==> Creando la release v$version"
body="${notes:+$notes

}APK para Android de 64 bits (arm64-v8a). Versión \`$version\` (\`versionCode: $code\`), compilado desde \`${commit:0:7}\`."
gh release create "v$version" "$output/wasi-travel.apk" \
  --target "$commit" --title "Wasi Travel $version" --notes "$body"

echo "==> Esperando a que el servidor copie el APK (hasta 20 min)"
for _ in $(seq 40); do
  if curl -fsS -r 0-0 -D - -o /dev/null "$download_url" 2>/dev/null |
    grep -qi "^etag: \"$version-"; then
    echo "Listo: $download_url entrega la versión $version desde el servidor."
    exit 0
  fi
  sleep 30
done
echo "Aviso: el servidor aún no sirve la $version; mientras tanto la descarga va a GitHub." >&2
