# Plan: pines Osmic y color automático del catastro

Fecha: 2026-09-22
Estado: implementado; queda pendiente comprobación visual en Development Build

## Objetivo

Reemplazar los pines genéricos del catastro por la colección Osmic entregada por producto,
reducir la saturación visual del mapa y dejar el color como una decisión automática del
sistema. El panel administrativo conserva la elección de ícono, pero elimina la elección
manual de color.

## Alcance

- Incorporar los 18 pines curados de `osmic_pins_osmic_wrapped (1)` como assets: 17 para
  catastros y `tourism-monument` reservado para centros turísticos.
- Ampliar los códigos de ícono administrables a esos pines y migrar los códigos heredados.
- Reservar `tourism-monument`, recoloreado en verde institucional, para los centros
  turísticos y excluirlo del catálogo de catastros.
- Definir una paleta fija, de menor saturación y con contraste sobre el estilo actual del
  mapa; el color se deriva siempre del ícono seleccionado.
- Rechazar `color` en el contrato de mutación administrativa y conservarlo únicamente como
  valor calculado, auditable y público para renderizar los puntos lejanos.
- Mostrar el pin seleccionado, agrupar establecimientos cercanos a escalas amplias y
  consultar el catálogo por viewport desde el móvil.
- Mantener la ficha, selección de lugares superpuestos, aproximación de coordenadas y ruta.

## Datos y seguridad

- La migración es aditiva y mantiene las columnas visuales heredadas para compatibilidad.
- Solo se publican establecimientos activos y georreferenciados; no se exponen identificadores
  fiscales ni administrativos.
- La edición continúa protegida por `ADMINISTRADOR` y auditada en `auditoria_catalogos`.
- El catálogo público no depende de Redis ni de una copia cliente como fuente única.

## Verificación

- Pruebas API de color derivado, rechazo de color manual y migración de íconos heredados.
- Pruebas del cliente móvil para viewport, fallback de API y selección visual.
- Formato, lint, typecheck y pruebas de API, móvil y panel.
- Revisión de assets y build web; comprobación visual nativa queda indicada si no hay
  Development Build disponible.

## Archivos principales

- `apps/api/src/establishments/establishment-visuals.ts`
- `apps/api/src/admin/admin-centers.service.ts`
- `apps/mobile/src/features/map/presentation/center-map.native.tsx`
- `apps/mobile/src/features/establishments/data/establishments-api.ts`
- `web-turismo-admin/src/components/admin/catalog-management.tsx`
- `database/migrations/20260922_osmic_establishment_pins.sql`
