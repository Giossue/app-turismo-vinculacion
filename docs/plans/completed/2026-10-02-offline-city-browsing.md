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

- Móvil: tipos, lint, formato, exportación web y 238 pruebas en 49 archivos correctos.
- API: tipos, lint, formato, build y 191 pruebas en 37 archivos correctos.
- Se cubren snapshots públicos, límites de cobertura, actualización y borrado con fallos,
  persistencia por cuenta y apertura de rutas sin cálculo ni activación automática de GPS.
- El estilo público normalizado y sus recursos se comprobaron por HTTP: estilo con 47
  capas, TileJSON, un tile de Guaranda y glifos de Noto Sans Regular respondieron correctamente.
- Las consultas SQL del manifiesto se comprobaron en una transacción de solo lectura,
  incluida la identidad de la conexión. No se modificaron registros.
- La revisión final del diff no detectó errores de espacios.

## Estado

Implementado y verificado en código. Despliegue y comprobación nativa pendientes.

## Activación pendiente

- La base consultada contiene una ciudad y cero paquetes offline publicados. Guaranda
  tiene 76 establecimientos públicos dentro de la cobertura alternativa; todavía no hay
  centros, POIs propios ni recorridos publicados para su manifiesto.
- Configurar `OFFLINE_MAP_STYLE_URL`, desplegar la API y publicar metadatos de un paquete
  mediante el procedimiento institucional. El código no publica contenido automáticamente.
- Descargar ese paquete y comprobar reinicio, mapa, temas, búsqueda y navegación en modo
  avión en Android/iOS. No se realizó esta prueba ni se intervino el dispositivo disponible.
- Nuevas rutas y desvíos siguen requiriendo internet; las instrucciones guardadas permiten
  seguir un recorrido existente con GPS. No se incorporó un motor local de cálculo.

El procedimiento de activación está documentado en `docs/architecture/deployment.md`.
