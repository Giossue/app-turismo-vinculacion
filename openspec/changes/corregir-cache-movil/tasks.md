# Tasks

## 1. Ciclo nativo de consultas

- [x] 1.1 Instalar Network compatible con Expo 57 y conectar foco/red con limpieza y orden de eventos; verificar revalidación, estado desconocido, lectura tardía, arranque desde descargas y consultas pausadas.
- [x] 1.2 Actualizar la documentación de caché móvil y reconstrucción nativa; comprobar concordancia con el adaptador y el lockfile.

## 2. Persistencia y sesión

- [x] 2.1 Serializar almacenamiento y hacer cancelables las escrituras de caché, filtrar propietario y edad individual; conservar la colección confirmada durante cambios optimistas y comprobar carreras de borrado, restauración y datos públicos.
- [x] 2.2 Implementar generación de sesión, cierre local inmediato y fetcher cancelable ligado a su sesión; comprobar renovación compartida, respuestas tardías, reintento único y restauración sin conexión.
- [x] 2.3 Alinear arquitectura de autenticación/caché y controles de privacidad con las garantías implementadas y sus límites de almacenamiento.

## 3. Colecciones y opiniones

- [x] 3.1 Pasar señales a consultas privadas y ligar callbacks de mutación a propietario/generación; comprobar invitado, reversión tardía, éxito de opinión después de cambiar de cuenta y fallo sin cola offline.
- [x] 3.2 Actualizar la documentación de favoritos y opiniones y comprobar que claves e invalidaciones corresponden solo a la cuenta actual.

## 4. Integración

- [x] 4.1 Ejecutar formato, lint, tipos, pruebas y exportación del paquete móvil; registrar resultados y limitaciones de dispositivo en verification.md.
- [x] 4.2 Validar el cambio, sincronizar los requisitos implementados y revisar el diff sin cambios ajenos ni credenciales.
