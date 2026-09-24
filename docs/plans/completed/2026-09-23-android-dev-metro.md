# Android de desarrollo con Metro

## Objetivo

Ejecutar en el teléfono USB una build Android depurable conectada a Metro sin reemplazar
la app de publicación ya instalada.

## Alcance y archivos

- Configuración Expo de variante local en `apps/mobile/app.config.js`.
- Comandos de arranque en `apps/mobile/package.json`.
- Procedimiento en `docs/architecture/mobile.md`.

## Fuera de alcance

Cambios de comportamiento de la app, API, esquema de datos y distribución de producción.

## Pasos

1. Dar a la variante de desarrollo un paquete Android y nombre visibles distintos.
2. Verificar la configuración Expo de ambas variantes.
3. Compilar e instalar la variante depurable en el teléfono USB y conectarla a Metro.
4. Documentar el comando para sesiones posteriores.

## Riesgos y migraciones

La configuración nativa exige reconstruir el binario. No hay migraciones. La app de
producción instalada conserva sus datos y permisos.

## Verificación y estado

Completado el 2026-09-23. `expo config --json` confirma los paquetes de producción y
desarrollo. `expo run:android --device --variant debug --no-bundler` compiló e instaló el
APK. `adb run-as` confirma que la variante de desarrollo es depurable; `adb` muestra ambas
apps instaladas. La actividad de desarrollo quedó visible, abrió conexiones al puerto 8081
de Metro y dibujó el mapa de Explorar.
