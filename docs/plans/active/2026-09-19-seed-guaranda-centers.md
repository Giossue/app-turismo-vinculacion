# Plan: centros turísticos de demostración en Guaranda

Fecha: 2026-09-19
Estado: aplicado y verificado en la BD remota; pendiente decidir si se hace commit/push de la migración.

## Objetivo

Cargar seis centros turísticos de demostración, separados geográficamente alrededor de
Guaranda, para comprobar los pines, filtros y fichas del mapa móvil.

## Precondición verificada

La BD remota `turismo_vinculacion_app` está accesible con el usuario de la aplicación,
PostGIS está habilitado y no contiene centros, territorios ni clasificaciones cargados.
Las líneas de producto, escenarios, estados y rangos de jerarquía ya existen.

## Alcance

- Crear/actualizar los catálogos mínimos de Bolívar, Guaranda, una parroquia base y las
  clasificaciones necesarias.
- Crear seis localidades, zonas y centros publicados con coordenadas distribuidas.
- Mantener la operación idempotente por códigos y por `(parroquia_id, secuencial_atractivo)`.

## Fuera de alcance

- Fotografías, horarios, actividades, accesibilidad o datos institucionales definitivos.
- Cambios en la API, la app, los tiles o el administrador.
- Publicación de estos datos como inventario oficial.

## Migración y rollback

Migración: `database/migrations/20260919_seed_guaranda_six_centers.sql`.
Se ejecuta dentro de una transacción y valida que queden seis registros publicados.
Para retirar este seed sin borrar historial, se debe marcar esos seis centros como inactivos
desde el flujo administrativo; no se borran filas directamente.

## Verificación

- Consultar los seis códigos generados y sus coordenadas en PostgreSQL.
- Consultar `GET /api/v1/centers` y confirmar `meta.total = 6`.
- Confirmar en el móvil que los seis pines aparecen tras revalidar la API.

Resultado de esta ejecución: seis registros `PUBLICADO`, `GET /api/v1/centers` devuelve
`meta.total = 6` y la distancia mínima entre centros es de aproximadamente 2.769 km.
