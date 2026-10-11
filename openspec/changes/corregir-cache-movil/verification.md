# Verificación

## Alcance y entorno

Cambio aplicado en `apps/mobile`, su lockfile y las fuentes de arquitectura, seguridad,
producto y OpenSpec. Expo 57.0.26, React Native 0.86.3, React 19.2.3 y TanStack Query
5.103.1. Se añadió `expo-network` 57.0.2 mediante Expo/Corepack y se retiró el persister
de AsyncStorage sustituido por la implementación cancelable. Los contratos de la API
conservan sus permisos y formatos. No hay migraciones ni operaciones sobre una base.

## Comprobaciones ejecutadas

| Comprobación                                                                                                                                             | Resultado                                                                                                                      |
| -------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `corepack pnpm --filter @turismo/mobile test`                                                                                                            | 455 pruebas correctas en 78 archivos.                                                                                          |
| `corepack pnpm --filter @turismo/mobile typecheck`                                                                                                       | Correcto.                                                                                                                      |
| `corepack pnpm --filter @turismo/mobile exec expo lint --no-cache`                                                                                       | Correcto, sin errores ni advertencias.                                                                                         |
| `corepack pnpm --filter @turismo/mobile format`                                                                                                          | Correcto.                                                                                                                      |
| `corepack pnpm --filter @turismo/mobile build`                                                                                                           | Exportación web correcta; la exportación conjunta posterior verificó también el código final.                                  |
| `APP_VARIANT=development corepack pnpm expo export --platform all --output-dir /tmp/turismo-cache-mobile-export --max-workers 4`, desde `apps/mobile`    | Bundles Hermes de Android/iOS y exportación web con 13 rutas correctos. Salida 0.                                              |
| `APP_VARIANT=development ./gradlew :app:assembleDebug -PreactNativeArchitectures=arm64-v8a --max-workers=4 --console=plain`, desde `apps/mobile/android` | `BUILD SUCCESSFUL`, incluido el módulo nativo Expo Network. APK debug generado en `app/build/outputs/apk/debug/app-debug.apk`. |
| `corepack pnpm openspec validate corregir-cache-movil --strict`                                                                                          | Correcto.                                                                                                                      |
| `corepack pnpm openspec validate --specs --strict`                                                                                                       | 8 especificaciones correctas.                                                                                                  |
| Revisión estática del diff y `git diff --check`                                                                                                          | Sin problemas de espacios, cambios de credenciales ni modificaciones de la API.                                                |

El APK debug de la primera comprobación utiliza Metro; no es una entrega de producción
con JavaScript incorporado. La exportación conjunta verificó la resolución nativa y el
código final de JavaScript. Expo emitió el aviso del entorno de color y, al terminar la
exportación, informó un cierre forzado propio del CLI; ambos comandos de exportación
terminaron con código 0 y produjeron sus artefactos.

## Cobertura de las regresiones

- Foco y reconexión revalidan consultas vencidas, conservan las vigentes y descartan
  lecturas iniciales tardías; los listeners se retiran.
- Escrituras pendientes no sobreviven a un borrado, una escritura en curso termina antes
  de limpiar y una lectura antigua no repone datos. Se filtran claves, propietario,
  versiones y edad individual de 24 horas, excluyendo mutaciones y consultas de ubicación.
- Una sesión anterior no restaura tokens/perfil, no utiliza credenciales de otra cuenta
  ni escribe callbacks privados. Se cubren renovación compartida, reintento único,
  cierre local inmediato, SecureStore lento o fallido y restauración sin conexión.
- Los favoritos optimistas conservan su copia confirmada en disco, incluso con cambios
  concurrentes rechazados y escrituras diferidas; esa protección no renueva su edad.
- Las fichas y filtros alcanzan las descargas al arrancar sin red. Las consultas
  pausadas activan el mapa local; un 403/404 no revive una ficha. El polling del mapa
  requiere foco y red. Guardados y opiniones fallidos no quedan en cola offline.

La revisión del paquete encontró además una referencia de navegación escrita durante
render; su actualización se movió a un efecto antes de los consumidores, manteniendo
el watcher y la navegación existentes. Es una corrección acotada para completar el lint.
Las especificaciones de identidad, favoritos/opiniones y descubrimiento público se
sincronizaron conservando sus escenarios anteriores.

## Límites de la evidencia

Las pruebas simulan transporte, almacenamiento y fuentes de eventos con QueryClient y
observers reales. La instalación y apertura física de Android se comprobaron después,
como se describe abajo. Quedan por comprobar fondo/primer plano, modo avión y
reconexión, favoritos sin conexión y cierre con respuestas demoradas con una API de
pruebas. Tampoco se compiló ni ejecutó el binario iOS con Xcode; su exportación no
certifica el comportamiento nativo. Al instalar este cambio se necesita el binario
reconstruido para incorporar Expo Network.

Un fallo del sistema al borrar almacenamiento conserva el cierre en memoria, pero no
demuestra eliminación física de la copia. Una operación ya aceptada por la API no se
deshace por cancelar la solicitud del cliente. Ambos límites permanecen explícitos
en el diseño y la documentación.

## Instalación física de Android, 2026-10-11

Se recompiló el APK independiente con
`APP_VARIANT=production ./gradlew :app:assembleRelease -PreactNativeArchitectures=arm64-v8a --max-workers=4 --console=plain`,
desde `apps/mobile/android`: `BUILD SUCCESSFUL` en 3 min 47 s. El APK incluye el bundle
Hermes y el módulo nativo Expo Network; no necesita Metro para ejecutarse. Se verificó
que su firma coincide con la de la aplicación instalada antes de actualizarla.

Se actualizó por ADB un Motorola Edge 50 Fusion con Android 14 y ABI `arm64-v8a`,
manteniendo el identificador `ec.edu.ueb.turismovinculacion.software`. La instalación
con `adb install -r` devolvió `Success`, sin desinstalar ni borrar los datos. Android
conservó la fecha original de instalación y actualizó la fecha de modificación del
paquete; la continuidad de cada favorito o descarga no se inspeccionó individualmente.

`am start -W` devolvió `Status: ok`. Se comprobaron el proceso activo, la actividad en
primer plano y una captura con el mapa y los controles de Explorar visibles. No se
observó un fallo de arranque ni un error de carga de Expo Network. MapLibre registró
un timeout al descargar una tesela; el mapa permaneció visible. Esto acredita instalación
y apertura, sin sustituir los escenarios de conectividad, sesiones y concurrencia
que siguen pendientes en dispositivo.
