# Opiniones y moderación con versiones

## Objetivo

Implementar opiniones de turistas para centros turísticos, con lectura pública de
versiones aprobadas, creación y edición autenticada desde el móvil, y una cola
administrativa para aprobar o rechazar cada versión.

## Decisión de producto

- `OCULTA` no será un estado de opinión.
- Una opinión lógica conserva una única versión publicada y puede tener una versión
  pendiente de revisión.
- La primera opinión rechazada no se publica; el turista debe crear otra opinión.
- Una edición de una opinión publicada crea una nueva versión pendiente.
- Si la edición se rechaza, la versión publicada anterior continúa visible y editable.
- Si se aprueba, la versión anterior pasa a `REEMPLAZADA` y la nueva se publica.
- Cada decisión de moderación conserva actor, acción, motivo y fecha.

## Alcance vertical

1. Migración PostgreSQL para separar opinión lógica y versiones.
2. API pública y autenticada para listar, crear y editar opiniones de centros.
3. API administrativa para listar versiones pendientes y aprobar/rechazar.
4. Formulario y estado de opinión en la ficha móvil.
5. Cola administrativa en `web-turismo-admin`.
6. Tests de invariantes, autorización y contratos de cliente.

## Actores y límites

- `TURISTA`: consulta opiniones publicadas, crea una opinión y edita únicamente la
  opinión publicada propia.
- `ADMINISTRADOR`: consulta la cola y decide sobre versiones pendientes.
- Invitado: solo consulta opiniones publicadas.
- La API es la única frontera de autorización; ni móvil ni web acceden a PostgreSQL.

## Estados

### Opinión lógica

`PENDIENTE`, `APROBADA`, `RECHAZADA`.

Una opinión `PENDIENTE` puede conservar una versión aprobada anterior durante una
edición. En ese caso la API pública sigue leyendo la versión publicada.

### Versión

`PENDIENTE`, `APROBADA`, `RECHAZADA`, `REEMPLAZADA`.

`REEMPLAZADA` es histórico interno para la versión aprobada anterior; no representa
una opinión oculta ni se muestra como tal al turista.

## Verificación

- Unit tests de servicio para creación, edición, aprobación, rechazo y autorización.
- Tests de contrato del cliente móvil y del cliente administrativo.
- Migración probada desde el baseline vacío y contra la estructura desplegada.
- `lint`, `typecheck`, `test` y `build` de API, móvil y panel.

## Estado

Implementación local completada y verificada. Migración aplicada a la base remota el
20 de septiembre de 2026; no había opiniones ni moderaciones existentes para convertir.
Respaldo previo verificado en `/tmp/turismo-vinculacion-backups-20260920/turismo_vinculacion_app-before-opinions.dump`.
