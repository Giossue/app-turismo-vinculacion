# Tasks

## 1. Base de datos

- [x] 1.1 Crear la migración de `aceptaciones_legales` con índice único por cuenta, documento y versión.
- [x] 1.2 Añadir `eliminado_at` a `usuarios` y ajustar las columnas que deban quedar sin dato personal.
- [x] 1.3 Inventariar todas las tablas con FK a `usuarios` y clasificar qué se borra, vacía o conserva.
- [x] 1.4 Aplicar la migración en local y comprobar que las cuentas existentes quedan sin constancias.

## 2. Documentos legales

- [x] 2.1 Redactar «Términos y condiciones» con la Universidad Estatal de Bolívar como responsable.
- [x] 2.2 Redactar «Política de privacidad» con los 17 puntos del art. 12 de la LOPDP y el tratamiento con IA.
- [x] 2.3 Publicar `GET /legal/documents` sin autenticación y con versión por documento.

## 3. API de aceptación

- [x] 3.1 Exigir en el registro `birthDate`, `acceptedLegal` y la edad mínima de 15 años.
- [x] 3.2 Guardar las constancias en la transacción que crea la cuenta.
- [x] 3.3 Responder `LEGAL_VERSION_OUTDATED` y `UNDERAGE` con sus códigos.
- [x] 3.4 Añadir `pendingLegalDocuments` al perfil de sesión solo para cuentas turísticas.
- [x] 3.5 Crear `POST /auth/legal-acceptances` idempotente y autenticado.
- [x] 3.6 Añadir el estado de aceptación al listado de usuarios del panel en la API.
- [x] 3.7 Probar los escenarios de `legal-acceptance`, incluidas repetición, concurrencia y acceso.

## 4. API de eliminación

- [x] 4.1 Crear `POST /auth/account/delete` con contraseña, solo para cuentas únicamente turísticas.
- [x] 4.2 Implementar la anonimización atómica con bloqueo de la cuenta.
- [x] 4.3 Rechazar login y renovación de cuentas eliminadas y liberar el correo.
- [x] 4.4 Comprobar que las opiniones eliminadas salen de las calificaciones públicas.
- [x] 4.5 Añadir una prueba de integración que recorra las FK reales hacia `usuarios`.
- [x] 4.6 Probar los escenarios de `account-deletion` contra PostgreSQL, incluido el fallo parcial.

## 5. Móvil

- [x] 5.1 Añadir `TourismCheckbox` con objetivo táctil y estado accesible.
- [x] 5.2 Crear la ruta de documentos con estados de carga, error y reintento.
- [x] 5.3 Añadir las casillas y las validaciones al registro, y traducir los errores nuevos.
- [x] 5.4 Recargar los documentos ante `LEGAL_VERSION_OUTDATED`.
- [x] 5.5 Añadir la pantalla de reaceptación y evaluarla en login, refresh y al recuperar conexión.
- [x] 5.6 Añadir eliminar cuenta en el perfil, con explicación, contraseña y errores.
- [x] 5.7 Añadir los textos en español e inglés y las pruebas de los flujos anteriores.

## 6. Panel institucional

- [x] 6.1 Mostrar en `web-turismo-admin` el estado de aceptación en el listado de usuarios.

## 7. Documentación y verificación

- [x] 7.1 Actualizar `authentication.md`, `database.md`, `ai.md` y `privacy-location.md`.
- [x] 7.2 Ejecutar pruebas, tipos y lint de API, móvil y panel.
- [x] 7.3 Ejecutar la verificación independiente de la eliminación y de las aceptaciones.

## 8. Publicación

- [ ] 8.1 Obtener el correo institucional e incluirlo en los documentos.
- [ ] 8.2 Obtener la revisión jurídica de ambos documentos.
- [ ] 8.3 Desplegar en orden: migración, API, panel y APK.
