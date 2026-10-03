# Perfil móvil desde la cabecera del menú

## Objetivo

Al tocar el mismo bloque donde aparece el nombre en el menú, abrir una pantalla
secundaria «Perfil» con nombre, correo y debajo «Cerrar sesión».

## Alcance

- Conservar el bloque actual de usuario como acceso al perfil y retirar el cierre
  de sesión de las acciones del menú.
- Cerrar el menú antes de navegar con `push`; Atrás vuelve a la pantalla anterior.
- Proteger `/profile` con `AuthGate`; un invitado inicia sesión y retorna al perfil.
- Mostrar los datos de la sesión existente, también cuando está restaurada sin red.
- Reutilizar `auth.logout`, con estado de progreso y protección contra dobles toques.
- Usar componentes y tokens compartidos, sin dependencias ni cambios de API.

## Trabajo

- [x] Crear pantalla Perfil y trasladar «Cerrar sesión».
- [x] Enlazar la cabecera existente del menú a Perfil.
- [x] Sincronizar las reglas y documentación de navegación/autenticación.
- [x] Verificar tipos, pruebas de autenticación y diff; revisar flujo de retorno.

## Verificación

- TypeScript del paquete móvil aprobado, incluida la nueva ruta generada por Expo.
- 20 pruebas de autenticación en cuatro archivos aprobadas: retorno interno de login,
  formularios, contrato de sesión y solicitudes autorizadas.
- ESLint de la pantalla y ambos layouts, formato focal y `git diff --check` aprobados.
- Revisión del flujo existente: la hoja cierra antes de ejecutar el acceso a Perfil;
  `AuthGate` protege la pantalla y redirige tras salir; login usa `dismissTo` para
  retornar sin duplicar la pantalla. El cierre conserva la limpieza local cuando falla
  la petición remota.

Las pruebas no ejecutan una sesión real ni certifican una revisión visual en dispositivo.
No se cambió el proveedor de autenticación ni se realizó despliegue.
