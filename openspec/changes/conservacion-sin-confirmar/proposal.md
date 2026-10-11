# Proposal

## Why

La ficha MINTUR aportada registra factores del entorno sin marcar su estado.
La API admite null en borrador, pero exige dos estados al publicar y el esquema
impide conservar factores sin un estado confirmado.

## What Changes

- Permitir estados desconocidos al publicar y mantenerlos como NULL.
- Conservar evaluaciones por componente, factores y observaciones aunque falte el estado.
- Leer evaluaciones con estado NULL sin perder sus datos.
- Considerar el estado explícitamente nulo una respuesta válida para el progreso.
- Preparar una migración aditiva que retire NOT NULL del estado de la evaluación.
- Mantener los controles de factores, catálogos, versión, revisión y auditoría.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `institutional-publication`: conservación con estados sin confirmar y factores persistidos.

## Impact

Servicio administrativo, migración SQL, documentación y coordinación del panel.
La sesión autoriza aplicar la migración remota y hacer commit/push en ambos
repositorios; la última instrucción del usuario excluye respaldos. No incluye
despliegue manual ni publicación de la ficha de la persona.
