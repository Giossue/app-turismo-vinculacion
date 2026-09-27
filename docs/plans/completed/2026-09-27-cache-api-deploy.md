# Caché de dependencias del despliegue API

## Objetivo

Evitar que cada cambio de código repita la copia de las dependencias de producción
durante el build de Dokploy.

## Evidencia

El despliegue del 2026-09-27 usó el Dockerfile actualizado y avanzó lentamente en
`pnpm deploy`: `reused 122`, `downloaded 0`, `added 115` después de 206 segundos.
La verificación del lockfile ya no aparece en ese paso. La causa del costo restante
es la materialización del paquete en `/out`; el servidor no es accesible por SSH con
la clave local para medir disco y CPU.

## Pasos

1. Crear una etapa de Docker con instalación y `pnpm deploy` basada solo en los
   manifiestos y el lockfile.
2. Compilar el código en una etapa posterior que herede dependencias de desarrollo.
3. Copiar a la imagen final el paquete de producción y el `dist` compilado desde
   etapas distintas.
4. Construir la imagen completa y comprobar el usuario y los permisos de medios.

## Riesgo y verificación

La primera construcción de la nueva etapa aún debe generar `/out`; el ahorro se
espera en builds posteriores con caché de Docker conservada. No hay cambios de API,
datos ni migraciones. Verificado localmente con dos builds de Podman: el segundo,
tras agregar temporalmente un archivo al código de la API, reutilizó la etapa
`dependencies` completa, incluido `pnpm deploy`, y la copia de dependencias de la
imagen final. La imagen contiene `dist/main.js`, ejecuta como `node` y puede
escribir en `/app/.data/media`. Completado el 2026-09-27.

Seguimiento: cuando cambió el lockfile, Dokploy invalidó esa capa y `pnpm deploy`
volvió a copiar los paquetes con lentitud. La solución posterior en
`2026-09-27-avoid-slow-api-deploy.md` elimina ese paso.
