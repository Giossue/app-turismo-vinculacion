#!/usr/bin/env bash
# Firma un APK de producción con la clave propia y conserva las actualizaciones.
#
# La clave anterior (debug) certifica a la nueva mediante la rotación de APK
# Signature Scheme v3: Android 9+ pasa a confiar solo en la clave nueva y no
# acepta volver a la anterior. Android 7 y 8 no entienden v3, por lo que siguen
# validando la firma anterior; sin esto cada usuario tendría que desinstalar.
#
# Uso: scripts/sign-android-release.sh <apk-de-entrada> <apk-de-salida>
set -euo pipefail

input="${1:?Falta el APK de entrada}"
output="${2:?Falta el APK de salida}"
signing_dir="${WASI_SIGNING_DIR:-$HOME/.config/wasi-travel-signing}"
key="$signing_dir/wasi-travel-release.p12"
password="$signing_dir/keystore.pass"
old_key="$signing_dir/original-debug.keystore"
lineage="$signing_dir/wasi-travel.lineage"
rotation_min_sdk=28

build_tools="$(ls -d "${ANDROID_HOME:-$HOME/Android/Sdk}"/build-tools/* | sort -V | tail -1)"
apksigner="$build_tools/apksigner"

for file in "$key" "$password" "$old_key"; do
  [[ -f "$file" ]] || { echo "No existe $file" >&2; exit 1; }
done

if [[ ! -f "$lineage" ]]; then
  "$apksigner" rotate --out "$lineage" \
    --old-signer --ks "$old_key" --ks-key-alias androiddebugkey \
    --ks-pass pass:android --key-pass pass:android \
    --set-installed-data true --set-rollback false \
    --new-signer --ks "$key" --ks-key-alias wasi-travel \
    --ks-pass "file:$password" 2> >(grep -v '^WARNING' >&2)
fi

"$apksigner" sign \
  --ks "$old_key" --ks-key-alias androiddebugkey \
  --ks-pass pass:android --key-pass pass:android \
  --next-signer \
  --ks "$key" --ks-key-alias wasi-travel --ks-pass "file:$password" \
  --lineage "$lineage" \
  --rotation-min-sdk-version "$rotation_min_sdk" \
  --v4-signing-enabled false \
  --out "$output" "$input" 2> >(grep -v '^WARNING' >&2)

report="$("$apksigner" verify --verbose --print-certs "$output" 2> >(grep -v '^WARNING' >&2))"
grep -E '^Verified using|^Signer .*certificate DN' <<<"$report"
if ! grep -q 'Scheme v3): true' <<<"$report" ||
  ! grep -q 'certificate DN: CN=Wasi Travel' <<<"$report"; then
  rm -f "$output"
  echo "El APK no quedó firmado con la clave propia" >&2
  exit 1
fi
