# Retirar desenfoque de componentes

## Objetivo

Quitar el trabajo de desenfoque solicitado por el usuario, conservando superficies
legibles, transparencia, bordes y tema en los controles y paneles existentes.

## Alcance

- Sustituir BlurView y BlurTargetView por View en el componente compartido.
- Eliminar captura de fondo, refs y contexto de targets de la barra y pantallas.
- Retirar expo-blur de las dependencias y regenerar lock con pnpm.
- Preservar visibilidad de búsqueda/barra inferior, navegación y fuentes de datos.
- Actualizar guías y arquitectura vigentes, sin modificar evidencia histórica.

## Verificación

- [x] No hay componentes o imports que ejecuten blur en el código móvil.
- [x] Superficies y bordes usan los tokens de ambos temas.
- [x] Dependencias y lock sincronizados.
- [x] Tipos, lint dirigido y revisión del diff; sin cambios de Metro/dispositivo.
- [x] Documentación vigente consistente.

## Resultado

Los controles usan una capa normal con transparencia; los paneles `regular` usan
`colors.surface` opaco para conservar la legibilidad sobre el mapa. Se eliminaron
BlurView, BlurTargetView, los targets/refs de captura, el hook de fondo de las
pestañas y la dependencia expo-blur (incluidos importer/package/snapshot del lock).

Pasaron TypeScript, eslint dirigido y diff --check; la búsqueda confirmó ausencia
de imports/componentes blur y dependencias restantes. No se añadieron pruebas que
repitan la implementación visual ni se ejecutaron capturas/builds de dispositivos.
El módulo nativo de un binario instalado se retira en su próxima compilación;
el código de componentes actualizado ya no lo invoca. No se cuantifica ahorro.
