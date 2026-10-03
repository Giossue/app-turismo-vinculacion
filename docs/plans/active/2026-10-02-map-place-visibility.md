# Plan: aparición progresiva de lugares y nombres en el mapa

Fecha: 2026-10-02
Estado: implementado; verificado en Android

## Resultado acordado

Explorar carga los atractivos de la zona visible, revela lugares y nombres según el
acercamiento y evita que los pines se tapen. La selección conserva el mismo icono y
tamaño, con el nombre visible. No solicita GPS para explorar ni inventa relevancia,
valoraciones o lugares.

## Alcance

- Paginar `GET /centers` de forma compatible, con `offset`, límite máximo de 100 por
  petición, filtros de publicación existentes y orden estable.
- Consultar el bbox real al terminar los movimientos; completar las páginas de la zona,
  cancelar consultas obsoletas y conservar los pines anteriores durante la carga.
- Guardar las consultas con bbox únicamente en memoria, bajo un prefijo no persistible.
- Usar clustering nativo para atractivos a escalas amplias, iconos de atractivos desde
  zoom 12 y servicios desde 14; mantener teselas MVT del catastro.
- Mostrar nombres de atractivos desde zoom 13 (jerarquías III/IV desde 12), servicios
  desde 15 y selección visible; resolver colisiones en el motor nativo con prioridad de
  jerarquía existente y anclas adaptables.
- Reutilizar los nombres, colores, fuentes y halos del tema en mapa en línea y visor
  descargado. Sin una URL de glifos válida se conservan los pines sin etiquetas.
- Sin escrituras de datos, migraciones, nuevas dependencias ni despliegue de producción.

## Límites y fallos

Solo datos públicos activos/publicados desde la API; la ficha completa continúa bajo
demanda. La búsqueda textual y sus alcances son independientes de los pines. Sin red se
conserva el resultado remoto anterior de la sesión y su estado de error/reintento; no se
introducen manifiestos offline en Explorar. Las ciudades descargadas usan su visor local.
Zoom, paneo, filtro y selección siguen siendo estado efímero sin entradas de navegación.

El endpoint de centros mantiene paginación por offset para compatibilidad con su contrato
actual. Cada petición espacial está limitada; migrar los atractivos a teselas queda como
decisión de escala futura, sin impedir completar ahora todos los resultados de la zona.

## Verificación

- API: validación de offset/bbox/límite, propagación y SQL parametrizado, compatibilidad de
  llamadas existentes y exclusión de datos no publicados.
- Móvil: completar una zona con más de 100 atractivos, vacíos, cancelación, respuestas de
  paginación incoherentes, claves separadas por bbox y exclusión de persistencia.
- Política de etiquetas/jerarquía, clustering y selección; tipos, lint, pruebas y builds
  proporcionales a las capas afectadas.
- Revisión de implementación y prueba visual nativa cuando el entorno lo permita, con
  límites de evidencia registrados.
- Sincronizar especificación, arquitectura, reglas locales y este plan con el resultado.

## Resultado y evidencia

- API: 21 pruebas focalizadas, tipos, lint y build correctos. El contrato de paginación
  sigue siendo compatible con los consumidores anteriores.
- Móvil: tipos y lint correctos; suite completa de 313 pruebas en 57 archivos. Tras los
  ajustes de compatibilidad nativa se repitieron tipos, lint de los archivos afectados
  y 21 pruebas relacionadas en cuatro archivos, con resultado correcto.
- Android físico: arranque desde cero, carga de 137 atractivos en páginas de 100 y 37,
  nombres de atractivos y restaurantes según zoom, elección entre lugares cercanos y
  selección con el mismo pin. Un fallo HTTP 503 conserva los pines anteriores y ofrece
  reintentar.
- El arranque detectó dos incompatibilidades: `icon-padding` numérico provoca un fallo
  de conversión en el puente Android de MapLibre 11.3.10; se usa el valor nativo por
  defecto. Al aparecer las etiquetas condicionales, las capas sin `key` podían
  reutilizarse con otro `id`; todas las fuentes y capas tienen ahora una clave estable.
- Se ajustaron las anclas de texto para que el nombre no se coloque sobre la cabeza de
  su propio pin. Las capturas finales muestran etiquetas legibles y selección estable.

La comprobación nativa usó datos inventados y servidores temporales locales; no certifica
la cobertura del catálogo real. Evidencia de la sesión en
`/tmp/turismo-map-place-visibility-20261002/`. iOS no estuvo disponible para una prueba
visual nativa; las comprobaciones automatizadas cubren la lógica compartida.
La sesión confirmó el tema oscuro y los niveles de detalle con nombres; el cambio al
tema claro y el toque para expandir clusters quedan pendientes de comprobación manual
nativa. Los gestos ADB no dieron evidencia fiable de esos dos escenarios.

Al cerrar la sesión se detuvieron los servidores temporales y se restauró el Metro
original de desarrollo en el puerto 8081. La app arrancó de nuevo con su catálogo
habitual y sin errores de identidad de capas ni fallos del puente nativo en el log.
