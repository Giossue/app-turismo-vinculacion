# Cuenta turística y entrada de visitante

## Objetivo

Ofrecer una única pantalla de acceso móvil con tres caminos explícitos: iniciar sesión,
crear cuenta turística o explorar como invitado. Las funciones privadas, como favoritos,
deben llevar a esa pantalla sin bloquear el descubrimiento público.

## Alcance

- Registro móvil mediante `POST /auth/mobile/register`.
- Sesión móvil con refresh rotatorio ya existente, usando `SecureStore` en el dispositivo.
- Campos de `usuarios`: nombre, email, género obligatorio (`Masculino` o `Femenino`),
  fecha de nacimiento obligatoria mediante calendario nativo y
  contraseña; el backend asigna el rol `TURISTA`.
- El menú principal incluye `Cuenta`; una sesión activa abre su resumen y un visitante es
  dirigido a la pantalla única de autenticación.
- Entrada inicial de la app: elegir cuenta o invitado; la elección de invitado se conserva
  localmente para no mostrar la puerta de acceso en cada apertura.
- Guardados y demás acciones protegidas redirigen a la entrada de autenticación.
- El catálogo público, mapa, fichas y rutas siguen disponibles como invitado.
- Rediseño visual de la entrada de cuenta para reflejar la referencia aprobada:
  fondo fotográfico de Ecuador, presentación de beneficios y llamadas a la acción
  diferenciadas para iniciar sesión y crear cuenta.
- El fondo se incorpora como recurso local generado para el cliente móvil; los textos,
  iconos y controles permanecen implementados en React Native para conservar navegación,
  accesibilidad y acciones reales.
- La entrada como invitado conserva la elección en memoria y almacenamiento; cuando el login
  se abre sobre una pantalla existente vuelve a ella sin reconstruir el mapa. Los centros
  confirmados se reutilizan durante cinco minutos y se revalidan en segundo plano.

## Límites y seguridad

- No se exponen `activo`, `remember_token`, hashes ni identificadores internos en el móvil.
- Email normalizado a minúsculas y protegido con un índice único case-insensitive.
- Contraseña nueva de mínimo 12 caracteres, almacenada con Argon2id.
- La respuesta de registro no revela si un correo ya existe.
- No se solicita ubicación durante registro; se solicita únicamente en la función que la usa.
- Verificación de correo transaccional queda pendiente de configurar el proveedor institucional;
  el campo `email_verified_at` permanece disponible y no se inventa una verificación en cliente.

## Verificación

- TypeScript, lint y pruebas de API/móvil.
- Export web del cliente.
- Build del development client Android.
- Prueba manual de entrada, invitado, login, registro y guardados en dispositivo.

## Estado del rediseño visual

- [x] Generar y guardar el fondo fotográfico local.
- [x] Implementar la composición visual en la entrada de `login.tsx`.
- [x] Revisar diff y export web; ejecutar verificaciones adicionales si el cambio afecta
      comportamiento o navegación.

## Resultado de esta iteración

- Fondo generado con la herramienta integrada de imágenes y guardado en
  `apps/mobile/assets/images/account-hero.png`.
- Entrada de cuenta inmersiva con cabecera sobre la imagen, beneficios, acciones reales
  y acceso de invitado conservado.
- Verificado con `corepack pnpm --filter @turismo/mobile typecheck`, `lint`, `format` y
  `build`.
