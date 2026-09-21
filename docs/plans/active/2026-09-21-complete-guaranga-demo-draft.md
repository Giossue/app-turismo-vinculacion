# Completar borrador demo de Centro Cultural Indio Guaranga

Fecha: 2026-09-21
Estado: completado

## Objetivo

Completar el borrador remoto de la ficha existente `Centro Cultural Indio Guaranga` con datos
referenciales de demostración para que el editor administrativo muestre las catorce secciones
con contenido. Los datos deben quedar marcados como demo y validarse institucionalmente antes
de publicar.

## Alcance y seguridad

- Ubicar la ficha por nombre exacto y abortar si no existe o hay más de una coincidencia.
- Actualizar únicamente `borradores_centros_turisticos.datos` y su versión.
- No cambiar el estado ni el contenido publicado de `centros_turisticos`.
- No mutar revisiones históricas; registrar una nueva entrada en `auditoria_fichas`.
- Reutilizar IDs de catálogos mediante códigos; agregar únicamente opciones demo necesarias
  para que clima y material de vía no aparezcan vacíos.
- No crear binarios falsos para multimedia. Los anexos documentales quedan sin archivo hasta
  que exista un documento institucional real.

## Verificación

1. Ejecutar la migración dentro de una transacción con `ON_ERROR_STOP`.
2. Confirmar que el borrador conserva estado `BORRADOR`, incrementa una versión y contiene
   las 14 claves de `sections`.
3. Confirmar que el estado, código, descripción y coordenadas públicas no cambian.
4. Validar que `validateAdminSectionContent` acepta cada sección con el contrato estructurado.
5. Recargar el panel y revisar que los campos del editor se hidraten desde el borrador.

## Resultado remoto

- Ficha localizada por nombre exacto con código actual `020101MC010500001`.
- Borrador en estado `BORRADOR`, versión `13`, con las 14 secciones presentes.
- Las 14 secciones tienen respuesta `SI` y observación; las filas repetibles no tienen
  etiqueta ni observación vacía.
- La ficha pública conserva estado `PUBLICADO`, código, descripción y coordenadas.
- Las dos revisiones históricas permanecen sin secciones propuestas y se registró una nueva
  auditoría `MODIFICAR`.
- No se añadieron archivos binarios; los documentos institucionales quedan pendientes.

## Rollback operativo

La migración no borra datos. Para revertirla se requiere restaurar el snapshot anterior desde
la fila de auditoría creada por la propia migración, con una operación administrativa explícita
y auditada; no se modifica la ficha pública como parte del rollback.
