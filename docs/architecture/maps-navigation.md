# Mapas, rutas y navegación

## Responsabilidades

### MapLibre

- Renderizado nativo de mapas base, capas y marcadores en Android/iOS.
- Estilos de mapa y tiles configurados por entorno; el estilo de demostración nunca se usa
  en producción.
- En el desarrollo local actual se usa la base raster pública **ArcGIS World Street Map**
  con su atribución visible. No incorpora credenciales ni sustituye la selección de estilo
  y política de disponibilidad para producción.
- No calcula rutas ni provee navegación por sí mismo.

### Proveedor de rutas

- Geocodificación, cálculo de ruta, instrucciones, recálculo y mapas offline si se aprueba.
- Se consume desde el backend mediante un puerto para preservar la posibilidad de cambiar
  proveedor y proteger credenciales de servicios privilegiados.

### PostgreSQL/PostGIS

- Centros, POI, establecimientos y paradas oficiales.
- Consultas por viewport, distancia y territorio.
- Geometría declarada de rutas de cooperativas.
- Relación entre rutas, centros y paradas.

No duplicar automáticamente toda la base en un proveedor cartográfico. Publicar capas
externas solo cuando exista un workflow GIS que lo necesite.

## Tipos de ruta

- Ruta calculada: resultado temporal del proveedor de rutas para un origen/destino y modo.
- Ruta registrada: recorrido institucional de una cooperativa con paradas y horarios.
- Itinerario: secuencia turística de visitas; puede requerir varias rutas calculadas.

## Ubicación desactivada

Mapa, búsqueda, fichas y origen manual continúan disponibles. No ofrecer seguimiento ni
decir “cerca de ti” sin ubicación suficientemente reciente.

## Seguridad de credenciales

- Los estilos y tiles públicos declaran atribución y límites por entorno.
- Operaciones privilegiadas, rutas y consumo controlado pasan por backend.
- Nunca incluir credenciales administrativas o privadas de mapas/rutas en móvil/web.
- Registrar consumo, expiración y rotación.

## Navegación

- Comenzar solo con modos confirmados por el servicio y datos ecuatorianos.
- Advertir que horarios/precios de transporte registrado son informativos.
- No prometer rutas accesibles sin datos verificables.
- Segundo plano únicamente durante una sesión activa.
- La navegación debe tolerar pérdida de señal y ubicación antigua.

## Rendimiento del mapa

- Endpoint por viewport/zoom con límites y clustering.
- Respuestas compactas para marcadores; ficha completa bajo demanda.
- Cancelar consultas obsoletas al mover el mapa.
- Cachear catálogos/mapas públicos con política de invalidación por publicación.
