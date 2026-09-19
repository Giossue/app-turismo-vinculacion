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
  estados de carga/error.
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
- [ ] Variables de rutas agregadas al servicio API en Dokploy.
- [ ] Smoke test de `POST /api/v1/routing/route` desde la API desplegada.
- [ ] Validación visual en el Development Build Android.
