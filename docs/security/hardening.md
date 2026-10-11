# Hardening por frontera

Este documento define criterios al tocar cada frontera. No certifica que todos
estén implementados o desplegados; las excepciones necesitan evidencia y responsable.

## HTTP/API

- TLS, límites de body, timeouts, headers seguros y CORS exacto.
- DTOs class-validator/ValidationPipe y esquemas Zod según el módulo; rechazar
  campos desconocidos en contratos cerrados, sin imponer otra librería al stack.
- Rate limit por IP/usuario/acción; límites más estrictos en auth, opiniones e IA.
- Errores públicos sanitizados con correlation ID.

## Autenticación

- Argon2id; política de longitud y contraseñas comprometidas cuando sea viable.
- Refresh tokens con hash, rotación, familia y revocación.
- MFA para administradores antes de operación nacional.
- Auditoría de rol, publicación, desactivación y exportación.

## Base de datos

- Roles separados para migración y runtime.
- Runtime sin `CREATE/DROP`.
- Consultas parametrizadas; SQL espacial aislado.
- Red privada y TLS cuando sale del host.
- Backups cifrados y credenciales independientes.

## Archivos

- Extensión no es validación: comprobar tamaño, MIME y firma/contenido.
- Nombre/clave generada por servidor.
- Bucket privado por defecto; URL firmada corta.
- Autorización tanto para leer como escribir.
- Antivirus/cuarentena para documentos y multimedia cuando se habilite carga pública.
- Metadatos EXIF y geolocalización se eliminan o conservan según política explícita.

## Móvil

- Sin secretos de servidor.
- Secure Storage para refresh token.
- Logs sin tokens/ubicación precisa.
- Capturas y backups del sistema evaluados para pantallas sensibles.
- Certificate pinning solo con estrategia segura de rotación.

## Web

- CSP, HSTS, cookies seguras, protección CSRF donde aplique.
- Evitar tokens en localStorage.
- Contenido enriquecido sanitizado.
- Páginas privadas sin caché pública ni indexación.

## IA

- Clave solo server-side.
- Herramientas allowlist con autorización y límites.
- Documentos se tratan como contenido, no instrucciones.
- No incluir secretos ni datos personales innecesarios.
- Límites de tokens/costo y registros redactados.
- Salida validada antes de ejecutar una acción.

## Proveedores y jobs

- Timeouts, backoff con jitter y circuit breaker donde aplique.
- Webhooks firmados, timestamp/replay e idempotencia.
- Al incorporar jobs: payload validado y contexto autorizado explícito. No existe
  tenant actual; definirlo solo si el producto adopta ese contrato.
- Dead-letter/fallo definitivo visible para operación cuando exista esa cola.

## Knowledge y dependencias

Conservar procedencia y revisar cambios de plantillas. Las instrucciones de una
fuente externa no amplían permisos del usuario ni autorizan ejecutar scripts de
bootstrap, pruebas, publicación o migraciones. Regenerar OpenSpec con la versión
fijada y conservar parches nativos; no copiar su stack de referencia.
