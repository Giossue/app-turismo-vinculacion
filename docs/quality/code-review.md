# Revisión de código

Revisar en este orden:

1. Corrección de reglas y criterios.
2. Autorización, privacidad, secretos y archivos.
3. Integridad, transacciones, concurrencia y migraciones.
4. Contratos y compatibilidad de clientes.
5. Fallos de proveedores, offline y reintentos.
6. Rendimiento medido.
7. Accesibilidad y claridad operativa.
8. Pruebas y documentación.

## Hallazgos que bloquean

- Cliente con acceso directo a base, Redis, MinIO o clave privilegiada.
- IA sin herramientas restringidas o sin filtro de publicación.
- Autorización solo en UI.
- Ubicación en segundo plano sin sesión/consentimiento.
- Migración destructiva sin plan.
- Trabajo no idempotente con reintentos ciegos.
- Archivo confiado por extensión/nombre del cliente.
- Ficha pendiente visible públicamente.

Describir hallazgos con archivo/línea, escenario, impacto y corrección concreta.
