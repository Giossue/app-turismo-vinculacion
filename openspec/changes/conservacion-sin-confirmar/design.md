# Design

## Context

Plaza 15 de Mayo tiene atractivo ALTERADO, entorno null y tres factores en cada
componente. Las casillas de estado y sus vínculos a Jerarquia confirman la
ausencia; C35 suma 5, con cero para el entorno. El borrador remoto contiene
esos datos y la validación de Conservación es el rechazo observado.

## Goals / Non-Goals

Preservar estados conocidos, desconocidos, factores y observaciones en
publicación y lectura. No inferir estados, alterar puntajes ni escribir o
publicar la ficha remota como parte de este cambio.

## Decisions

El estado desconocido sigue siendo null en el contrato. Retirar NOT NULL de
evaluaciones_conservacion.estado_conservacion_id permite guardar la evaluación
que referencia los factores sin añadir un quinto estado al catálogo MINTUR.
Se conservan FKs, unicidad por centro/componente e identificadores existentes.

Crear evaluaciones por componente que tengan datos o factores, incluso sin
estado. Resolver estados conocidos contra el catálogo activo; un identificador
ausente causa conflicto y no descarta silenciosamente la evaluación. Leer con
LEFT JOIN al estado para que un NULL no elimine la evaluación del resultado.

Retirar únicamente la exigencia de estado en la publicación y en la asociación
de factores. Mantener tipos, catálogo activo, origen, componente, respuesta
binaria y duplicados. Una respuesta null explícita es válida en el progreso;
un componente ausente sigue incompleto. El motor de valoración ya asigna cero
a null y usa 7/5/3/1 para los cuatro estados, por componente.

Acceso: permisos, propietario y estado de revisión existentes. Repetición y
concurrencia: bloqueo y versión vigentes. Auditoría: conservar los eventos y la
transacción de aprobación; no introducir mutaciones fuera de ese flujo.

## Risks / Trade-offs

Aplicar primero `20261011_conservation_unknown_state.sql`, después API y panel.
La migración no transforma datos; usa lock_timeout de 5s y statement_timeout
de 30s. Antes de producción verificar destino, respaldo restaurable, propietario,
historial y permisos de ambas tablas y sus secuencias. Es idempotente.
La API antigua omite evaluaciones NULL y bloquea factores sin estado; no volver
a desplegarla después de guardar desconocidos. No restablecer NOT NULL sin
resolver NULL explícitamente ni ejecutar rollback automático.
