# Proposal

## Why

Dos establecimientos publicados (FOLK y MARISQUERIA 7 ANCLAS) tenían la longitud en `-100,99` y `-97,00`, en pleno Pacífico. Al tocar FOLK desde el agente, la ruta apuntaba al mar y fallaba. La importación de MINTUR valida que el punto esté en Ecuador, pero el guardado manual de establecimientos y el DTO de centros solo exigían latitud entre -90 y 90 y longitud entre -180 y 180.

## What Changes

- Módulo compartido `common/ecuador-bounds` con los límites de Ecuador (incluye Galápagos) y `isInsideEcuador`; la importación de MINTUR lo reutiliza.
- El guardado manual de establecimientos y `SaveAdminCenterDto` rechazan coordenadas fuera de Ecuador con un mensaje claro.
- La validación del panel admin de centros también cubre las coordenadas inicial y final de las vías de acceso y las coordenadas de las facilidades del entorno.
- Datos corregidos en producción: FOLK (id 107) a `-78,998689` y MARISQUERIA 7 ANCLAS (id 127) a `-79,006006`, con respaldo previo de las filas y confirmación por dirección y vecinos.

## Capabilities

### Modified Capabilities

- `public-tourism-discovery`: solo se publican puntos dentro de Ecuador.

## Impact

API (`establishments.service`, `admin.dto`, importación). Sin migraciones.
