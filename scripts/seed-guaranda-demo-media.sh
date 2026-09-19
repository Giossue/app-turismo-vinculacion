#!/usr/bin/env bash
set -euo pipefail

project_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
asset_root="$project_root/assets/seed-tourism-media"
media_root="$project_root/apps/api/.data/media"

install -D -m 0640 "$asset_root/mirador-guaranda.jpg" \
  "$media_root/centers/1/photos/mirador-guaranda.jpg"
install -D -m 0640 "$asset_root/mirador-calvario.jpg" \
  "$media_root/centers/2/photos/mirador-calvario.jpg"
install -D -m 0640 "$asset_root/sendero-panoramico.jpg" \
  "$media_root/centers/3/photos/sendero-panoramico.jpg"
install -D -m 0640 "$asset_root/plaza-cultural.jpg" \
  "$media_root/centers/4/photos/plaza-cultural.jpg"
install -D -m 0640 "$asset_root/centro-historico.jpg" \
  "$media_root/centers/5/photos/centro-historico.jpg"

echo "Medios demostrativos copiados en $media_root"
