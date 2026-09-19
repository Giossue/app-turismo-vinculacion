# Plan: pines del mapa desde centros remotos publicados

Fecha: 2026-09-19
Estado: implementado y verificado localmente; pendiente confirmación visual en el dispositivo durante Fast Refresh.

## Objetivo

El mapa de Explorar debe mostrar pines únicamente después de recibir los centros turísticos
publicados desde `GET /api/v1/centers`. Si la API devuelve una lista vacía, el mapa no debe
mostrar pines antiguos, offline ni de demostración.

## Alcance

- Ajustar la consulta móvil de centros publicados.
- Invalidar la consulta persistida de la etapa anterior.
- Ocultar datos persistidos mientras una consulta remota está pendiente o falla.
- Cubrir el contrato de respuesta vacía.
- Sin cambios en API, base de datos, tiles, APK ni servidor.

## Archivos

- `apps/mobile/src/features/centers/application/use-published-centers.ts`
- `apps/mobile/src/app/(tabs)/index.tsx`
- `apps/mobile/src/features/centers/data/public-centers-api.test.ts`
- Documentación de arquitectura y especificación de descubrimiento.

## Riesgos y decisiones

- Se conserva la descarga offline como flujo separado; sus manifiestos no alimentan el mapa
  en línea.
- El primer render puede mostrar el mapa base sin pines mientras se revalida la API. Esto
  evita presentar datos que ya no estén publicados.

## Verificación

- Consultar la API remota y confirmar `data: []` cuando no existan centros publicados.
- Ejecutar typecheck, lint y pruebas del móvil.
- Confirmar en el dispositivo que la respuesta vacía deja el mapa sin pines.
