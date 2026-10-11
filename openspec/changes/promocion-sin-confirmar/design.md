# Design

## Fuente y diferencia observada

El libro original enlaza las casillas afirmativas de plan, inclusión y paquete
con Jerarquia!B79/B80/B81. Sus fórmulas asignan 2/2/3 puntos. Las casillas sin
marcar no suman. `calculateXlsmValuation` ya usa esos pesos y `responseIsYes`
reconoce únicamente respuestas afirmativas; no ejecutar fórmulas o macros.

La validación de publicación exige decisiones binarias y `applyPromotionSection`
convierte el desconocido de plan y paquete en false. El bootstrap declara ambas
columnas NOT NULL. Se corrigen esas fronteras, manteniendo el cálculo explícito.

## Persistencia y compatibilidad

Preparar `20261011_promotion_unknown_responses.sql`: retirar NOT NULL de
tiene_plan_promocion y forma_parte_paquete, sin borrar ni reescribir filas.
Incluido_en_plan ya admite NULL. SIN_INFORMACION se proyecta a NULL; SI y NO
siguen siendo true/false. La lectura distingue IS TRUE, IS FALSE y NULL.

Aceptar incluido_en_plan nulo de clientes anteriores en captura y publicación.
Mantener decisiones conocidas y conservar plan No/inclusión Sí tal como fueron
aprobadas. Una contradicción por sí sola no agrega un bloqueo nuevo. No relajar
tipos de medios, duplicados, catálogos activos ni requisitos ajenos a estas tres
preguntas. NO_APLICA de toda la sección conserva su eliminación de proyección.

## Frontera sensible

Actor y ámbito: permisos y propiedad existentes del registro. Validación:
SI/NO/SIN_INFORMACION para decisiones; NULL legado para inclusión. Repetición y
concurrencia: conservar versión de borrador, estado de revisión y bloqueo
transaccional. Auditoría: publicación y revisión existentes, sin escritura nueva
fuera de la transacción. Responsabilidad: la API proyecta, calcula y publica; el
panel solo presenta y remite datos.

## Despliegue y operación

Verificar destino, respaldo, propietario y permisos antes de aplicar en una base
compartida. Orden: migración, API, panel. Usar lock_timeout 5s y statement_timeout
30s; reintentar bloqueos en una ventana operativa. No requiere backfill ni grants
nuevos. La migración es idempotente y conserva IDs, tablas y secuencias.

Una versión anterior de la API no preserva NULL al leer o publicar. No volver a
desplegar esa versión sin corregir primero sus lecturas/proyecciones. No ejecutar
rollback automático ni convertir desconocidos a false para restablecer NOT NULL.
Una reversión de esquema requeriría inventario y resolución explícita de NULL.

## Comprobación

Contrastar las fórmulas y resultados guardados del libro, revisar proyección y
lectura, y ejecutar tipos, lint, build, formato y OpenSpec. No presentar checks
estáticos como validación de PostgreSQL, migración aplicada o publicación real.
