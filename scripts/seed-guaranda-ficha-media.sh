#!/usr/bin/env bash
set -euo pipefail

project_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
asset_root="$project_root/assets/seed-tourism-media/zona-entorno-guaranda"
media_root="$project_root/apps/api/.data/media"
center_id="${CENTER_ID:-${1:-1}}"

if [[ ! "$center_id" =~ ^[0-9]+$ ]]; then
  echo "CENTER_ID debe ser un entero positivo." >&2
  exit 1
fi

install -D -m 0640 "$asset_root/01-panorama-urbano-guaranda.png" \
  "$media_root/centers/$center_id/photos/01-panorama-urbano-guaranda.png"
install -D -m 0640 "$asset_root/02-plaza-guaranda.png" \
  "$media_root/centers/$center_id/photos/02-plaza-guaranda.png"
install -D -m 0640 "$asset_root/03-sendero-panoramico-guaranda.png" \
  "$media_root/centers/$center_id/photos/03-sendero-panoramico-guaranda.png"

echo "Medios de la ficha de Guaranda copiados en $media_root/centers/$center_id/photos"
