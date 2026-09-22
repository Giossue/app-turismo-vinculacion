# Reforma semántica del catastro

Fecha: 2026-09-22
Estado: completado; migración aplicada y verificaciones automatizadas ejecutadas

## Objetivo

Separar el tipo de establecimiento de la escala o categoría que aparece en el
consolidado nacional. `3 Estrellas`, `3 Tenedores`, `2 Tazas` y `3 Copas` no deben
presentarse como categorías universales equivalentes.

## Alcance

- Añadir semántica compatible a `catalogo_catastro_categorias` sin perder el texto ni
  los aliases de origen.
- Administrar el icono en `catalogo_catastro_clasificaciones`, donde representa el tipo de
  establecimiento y no el nivel de categoría; el color se deriva automáticamente del pin.
- Exponer sistema, valor y etiqueta contextual en la API administrativa y pública.
- Mostrar en el panel y en el móvil etiquetas como `HOTEL · 3 Estrellas`.
- Mantener durante la transición los IDs, campos de texto y campos visuales heredados.

## Reglas

- Los valores semánticos se derivan de la combinación actividad, clasificación y nombre
  canónico; los valores no concluyentes quedan marcados para revisión.
- La clasificación padre controla el marcador por defecto: todas sus categorías
  comparten icono y el color automático correspondiente.
- No se elimina ni se sobrescribe el valor original del consolidado.
- Las mutaciones administrativas siguen protegidas por `ADMINISTRADOR` y auditoría.
- El contrato público conserva `category`, `icon` y `color` calculado, y añade campos opcionales
  para clientes actualizados.

## Migración

La migración es aditiva e idempotente. Añade `esquema`, `valor_numerico` y
`requiere_revision` a las categorías, añade `icono` y `color` a las clasificaciones,
backfilla los 111 registros actuales y sincroniza los campos visuales heredados.

## Verificación

- Aplicar sobre la base desplegada y comprobar que no existen categorías huérfanas.
- Probar API, panel administrativo y cliente móvil.
- Confirmar que los establecimientos mantienen sus IDs y relaciones.
- Ejecutar lint, typecheck y pruebas de API/web/móvil aplicables.
