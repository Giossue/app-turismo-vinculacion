# Plan: coordenadas obligatorias para establecimientos

Fecha: 2026-09-21
Estado: en curso

## Objetivo

Hacer obligatorias la latitud y la longitud al crear o editar un establecimiento,
respaldar la regla en PostgreSQL y completar los registros existentes con la coordenada
territorial que ya tiene su localidad.

## Hallazgo de datos

La base remota contiene 50 establecimientos. Ninguno tiene coordenadas individuales, pero
los 50 tienen una localidad activa con latitud y longitud. Esas coordenadas se usarán como
respaldo territorial y se marcarán como aproximadas; no se presentan como la ubicación
exacta del negocio.

## Alcance

- Separar los DTO de alta y actualización para que el `POST` rechace coordenadas ausentes.
- Impedir que el servicio o PostgreSQL guarden establecimientos sin ambas coordenadas.
- Marcar el backfill territorial con `coordenadas_aproximadas` y mantener esa señal en el
  endpoint público del mapa.
- Validar latitud/longitud como obligatorias y dentro de sus rangos en el panel admin.
- Aplicar una migración transaccional e idempotente que rellene las 50 filas actuales,
  sincronice `ubicacion` mediante el trigger existente y establezca `NOT NULL`.
- Actualizar el seed, la especificación, el modelo documental y el contrato tipado.

## Verificación

- Ejecutar la migración sobre la base remota después del preflight y comprobar 50/50 filas
  con coordenadas, 50 filas aproximadas y cero valores nulos.
- Ejecutar typecheck, lint y pruebas del API.
- Ejecutar `bun run verify` en `web-turismo-admin`.
- Revisar el diff y la consulta SQL final del mapa.

## Operación y rollback

Antes de aplicar la migración se debe contar con un respaldo de la tabla. La migración se
detiene si alguna fila tiene una sola coordenada o si su localidad no tiene coordenadas.
El rollback operativo consiste en restaurar el respaldo; para volver temporalmente al
esquema anterior se pueden retirar los `NOT NULL` y la columna de precisión después de
verificar que ningún consumidor dependa de ellos.
