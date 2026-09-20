# Plan: integración de rutas OSRM

## Objetivo

Conectar la API monolítica con los servicios internos OSRM de automóvil, bicicleta y
caminata, y permitir que el móvil calcule una ruta desde la ubicación puntual del turista
hasta un atractivo publicado.

## Alcance

- `POST /api/v1/routing/route` con origen, destino y modo validado.
- Adaptador backend hacia `osrm-car`, `osrm-bicycle` y `osrm-foot`.
- Respuesta normalizada con distancia, duración, geometría GeoJSON e indicaciones.
- Pantalla móvil con selección de modo, solicitud puntual de ubicación, mapa de ruta y
  estados de carga/error. La pantalla muestra el mapa de navegación a pantalla completa y
  una hoja inferior nativa para el resumen e indicaciones, sin un minimapa embebido; la
  hoja permite expandir el detalle sin un botón intermedio y oculta el selector de modo
  al comenzar la navegación. Al abrirla desde un atractivo publicado calcula
  automáticamente la primera ruta.
- Sin persistir coordenadas del turista ni enviarlas a proveedores externos desde el móvil.
- Sin tráfico en tiempo real, navegación en segundo plano ni transporte público calculado.

## Fuera de alcance

- CRUD administrativo de cooperativas, rutas, paradas y horarios.
- GTFS/OTP y seguimiento de unidades.
- Recalcular rutas sin conexión.

## Decisiones

- La API es el único cliente de OSRM; el móvil solo consume el contrato público.
- El modo bus se servirá posteriormente desde las rutas publicadas de PostgreSQL y su
  duración manual o estimada por geometría.
- Los endpoints OSRM permanecen privados en `dokploy-network`.

## Verificación

- Tests unitarios del contrato, cliente OSRM e instrucciones.
- Typecheck y lint de API y móvil.
- Smoke test manual contra OSRM en servidor, sin reiniciar la app móvil durante Fast Refresh.

## Estado

- [x] Servicios OSRM de automóvil, bicicleta y caminata desplegados en Dokploy.
- [x] API y cliente móvil implementados con contrato validado.
- [x] Pruebas, typecheck y lint locales aprobados.
- [x] Variables de rutas presentes en el servicio API en Dokploy.
- [x] API y los tres servicios OSRM comparten `dokploy-network`.
- [x] Pantalla móvil verificada con mapa de ruta a pantalla completa y panel inferior.
- [x] La pantalla solicita ubicación y calcula automáticamente la ruta inicial; conserva
      reintento e inicio de navegación explícito.
- [ ] Redeploy de la corrección de inyección de `ConfigService` y smoke test de
      `POST /api/v1/routing/route` desde la API desplegada.
- [ ] Validación visual en el Development Build Android.

Durante el smoke test remoto se confirmó que OSRM responde `200` desde el contenedor de la
API, pero la API devolvía `500` porque `OsrmRoutingClient` no estaba correctamente registrado
para la inyección de dependencias. Primero faltaba `@Injectable()` y, después de añadirlo,
Nest intentó resolver el `fetch` opcional del constructor como una dependencia `Object`.
El proveedor ahora usa una factory explícita que inyecta únicamente `ConfigService`; está
aplicado localmente y verificado, y requiere un nuevo despliegue de la API.
