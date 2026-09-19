# Decisiones abiertas

Estas preguntas no están resueltas por la base de datos ni por `answers.md`. Las decisiones
cerradas de la fase actual se registran al final; las demás siguen requiriendo decisión de
producto.

## Decisiones cerradas en la fase de rendimiento/offline

- Alcance offline: paquetes descargables por ciudad con mapa, catálogo de fichas y rutas
  institucionales registradas.
- Rutas offline: solo versiones PUBLICADAS de rutas registradas; no se recalculan sin red.
- Geometría de ciudad: límites oficiales importados y versionados; no se dibujan ni editan en
  la app móvil.
- Geometría de ruta: ArcGIS puede generar una propuesta y el flujo administrativo puede
  revisarla/editarla antes de publicar una versión PostGIS.

## Mapas y movilidad

Decisiones cerradas para la primera versión de rutas online:

- Los modos calculados son vehículo, bicicleta y caminata mediante OSRM propio.
- El transporte público se representa primero con rutas, paradas y horarios administrados;
  GTFS/OTP queda para una fase posterior.
- No se ofrece tráfico en tiempo real ni seguimiento de unidades en esta fase.

- Quién mantiene y publica los datos de transporte: funcionarios, cooperativas o ambos.
- Si las rutas registradas admitirán edición manual, importación GIS o ambos flujos.
- Si habrá ubicación de unidades en tiempo real y cuál será su fuente.
- Alcance de ubicación: solo en uso o también segundo plano durante navegación.
- Alcance offline: ninguno, favoritos/catálogos o mapas/rutas descargables.
- Frecuencia real de zonas sin conectividad.

## Gobernanza

- Institución propietaria y responsable del tratamiento de datos.
- Relación futura entre GAD, Ministerio, universidad y organizaciones.
- Ámbitos territoriales y permisos cuando existan varios administradores.
- Política de conservación y eliminación de cuentas, opiniones y ubicación.

## Producto

- Funciones exactas de la web turística autenticada.
- Regla de moderación automática y proceso de apelación.
- Proveedor de clima y criterio para alertas oficiales.
- Soporte mínimo de Android tras validar MapLibre y el Development Build en dispositivos objetivo.
- Idiomas posteriores a español/inglés.

## Operación

- Dominio, correo transaccional y certificados institucionales.
- Capacidad, respaldos y disponibilidad del servidor propio.
- Proveedor/modelo de IA, límites de costo y retención contractual.
- Fuente de tiles, atribución, límites y proveedor de rutas para producción.
