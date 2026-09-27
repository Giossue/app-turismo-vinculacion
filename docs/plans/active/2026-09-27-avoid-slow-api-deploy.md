# Evitar la copia lenta de dependencias de la API en Dokploy

Fecha: 2026-09-27

## Evidencia

Un despliegue nuevo volvió a avanzar lentamente en `pnpm deploy` después de completar
la instalación y la verificación del lockfile. A los 130 segundos había añadido 140 de
208 paquetes, todos reutilizados del almacén. La documentación de pnpm advierte que
en Docker enlazar paquetes guardados en una capa anterior puede provocar copias en
OverlayFS.

## Cambio

- Instalar dependencias de producción directamente en una etapa de Docker.
- Compilar TypeScript en una etapa independiente con dependencias de desarrollo.
- Heredar la etapa de producción como imagen final y copiar solo `dist`.
- Mantener el directorio de trabajo `/app`, el usuario `node` y la ruta de medios.

## Verificación

- [x] Construir la imagen local y comprobar resolución de módulos, usuario y escritura
      de medios.
- [x] Comprobar que una segunda compilación sin cambios reutiliza las capas.
- [ ] Confirmar que Dokploy ejecuta el Dockerfile actualizado y que la API responde
      al health check.
