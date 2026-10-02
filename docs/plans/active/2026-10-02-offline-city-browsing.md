# Plan: ciudades descargadas y rutas guardadas sin conexión

Fecha: 2026-10-02

## Alcance autorizado

Completar lo viable sobre MapLibre, SQLite y la API existentes: descargar y abrir una
ciudad con calles, centros públicos, POIs públicos disponibles y rutas institucionales;
guardar explícitamente rutas calculadas y seguirlas con GPS sin recalcular por red.
No incorporar un motor nativo nuevo de cálculo de rutas ni modificar producción.

## Decisiones

- El visor de ciudad descargada es un flujo explícito independiente de Explorar en línea.
  Sus búsquedas, fichas y capas leen exclusivamente el paquete local.
- El estilo y sus recursos usan las mismas URLs que el paquete MapLibre y sobreviven a
  reinicios; no depender de la caché pública con TTL de 24 horas.
- Solo se exportan datos públicos/activos dentro de la zona descargada. No introducir un
  endpoint de catastros JSON por viewport: el snapshot offline se descarga una vez por ciudad.
- Actualizar conserva el paquete anterior hasta guardar correctamente el nuevo. Borrar
  elimina mapa y manifiesto de esa ciudad. El catálogo guardado abre sin API.
- Guardar una ruta calculada es una acción explícita. Se aísla por cuenta porque contiene
  el origen elegido. GPS y segundo plano se activan únicamente por controles existentes.
- Las rutas institucionales se muestran como recorridos publicados; no inventar instrucciones
  giro a giro. Calcular una nueva ruta o un desvío continúa requiriendo internet.

## Unidades

1. API: incluir snapshot público de POIs/catastros con límites coherentes y pruebas.
2. Móvil: persistencia de estilo/manifiesto y operaciones de descargar/actualizar/borrar.
3. Móvil: listado y visor local con mapa, búsqueda, fichas y recorridos publicados.
4. Móvil: guardar/abrir/borrar rutas calculadas con navegación sobre el recorrido guardado.
5. Documentación, tipos, lint, pruebas y builds proporcionales; validar modo avión en un
   dispositivo si está disponible sin interferir otras aplicaciones.

## Verificación

Pendiente.
