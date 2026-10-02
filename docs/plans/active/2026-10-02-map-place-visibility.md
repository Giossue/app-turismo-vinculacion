# Plan: aparición progresiva de lugares y nombres en el mapa

Fecha: 2026-10-02
Estado: en implementación

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
