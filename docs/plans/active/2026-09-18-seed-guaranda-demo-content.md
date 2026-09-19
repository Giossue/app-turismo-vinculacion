# Contenido demostrativo de Guaranda

Estado: implementado en el entorno local.

## Alcance

- Completar las cinco fichas públicas existentes de Guaranda sin cambiar sus códigos,
  coordenadas ni clasificación.
- Añadir información referencial de descripción, dirección, ingreso, actividades,
  accesibilidad y facilidades.
- Registrar una fotografía JPEG por ficha mediante el almacenamiento multimedia existente.
- Mantener explícito que los textos, horarios y fotografías son material de prototipo y
  requieren validación institucional antes de producción.

## Entregables

- Migración idempotente `20260918_seed_guaranda_demo_content.sql`.
- Imágenes JPEG optimizadas en `assets/seed-tourism-media/`.
- Script `scripts/seed-guaranda-demo-media.sh` para copiar los objetos locales a
  `apps/api/.data/media/`.

## Verificación

- Migración ejecutada dos veces sin duplicar relaciones ni archivos.
- Los cinco endpoints públicos devuelven detalle, relaciones y una fotografía.
- Los cinco endpoints de media devuelven `200` y el tamaño esperado.
