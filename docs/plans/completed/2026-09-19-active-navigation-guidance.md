# Plan: navegación activa con voz y recálculo

Fecha: 2026-09-19
Estado: completado.

## Objetivo

Permitir que una ruta calculada se convierta en una sesión de navegación activa en primer
plano, con instrucciones habladas y recálculo cuando la persona se aleja del trayecto.

## Alcance realizado

- Se añadió texto a voz en español para los pasos devueltos por OSRM.
- El seguimiento GPS comienza únicamente después de pulsar «Iniciar navegación».
- Se detectan llegada y desvío con umbrales tolerantes a la precisión del GPS.
- El recálculo usa `POST /api/v1/routing/route` con la posición actual como nuevo origen.
- La persona puede silenciar la voz y detener explícitamente la sesión.
- El mapa muestra la ubicación actual durante la navegación y limpia el watcher/voz al
  detenerla o al llegar.

## Fuera de alcance

- Tráfico en tiempo real: los motores open source calculan, pero no proporcionan una fuente
  mundial de velocidades/incidentes; OSRM solo puede aplicar datos de tráfico que nosotros
  suministremos.
- Seguimiento en segundo plano, notificación persistente y navegación con la pantalla apagada.
- Guardar historial de coordenadas o enviar GPS a un proveedor externo.

## Archivos

- `apps/mobile/package.json` y `pnpm-lock.yaml`
- `apps/mobile/src/features/routing/domain/navigation-guidance.ts`
- `apps/mobile/src/features/routing/domain/navigation-guidance.test.ts`
- `apps/mobile/src/features/routing/application/use-navigation-session.ts`
- `apps/mobile/src/app/route.tsx`
- `apps/mobile/src/features/routing/presentation/route-map.native.tsx`
- `apps/mobile/src/features/routing/presentation/route-map.web.tsx`
- `apps/mobile/src/core/ui/tourism-controls.tsx`
- `docs/architecture/maps-navigation.md`
- `docs/architecture/mobile.md`

## Riesgos y decisiones

- La voz se basa en los pasos de OSRM y en la distancia aproximada a la siguiente maniobra;
  no se afirma precisión de navegación profesional.
- La ubicación se solicita al iniciar la sesión, no al abrir la ficha ni entrar a la vista
  previa.
- El recálculo conserva el contrato público y no expone los servicios OSRM al móvil.

## Verificación

- `corepack pnpm --dir apps/mobile run typecheck` ✅
- `corepack pnpm --dir apps/mobile run lint` ✅
- `corepack pnpm --dir apps/mobile run test` ✅ — 5 archivos, 14 pruebas
- `corepack pnpm --dir apps/mobile run format` ✅
- `git diff --check` ✅

La nueva dependencia nativa `expo-speech` requiere reconstruir el Development Build antes de
probar la voz en el dispositivo; Metro/Fast Refresh no incorpora módulos nativos nuevos.
