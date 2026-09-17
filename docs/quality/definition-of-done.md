# Definition of Done

## General

- La implementación coincide con la especificación y sus criterios.
- Formato, lint, tipos, pruebas y build aplicables pasan.
- OpenAPI, migraciones, documentación y clientes generados están sincronizados.
- Entradas no confiables se validan y cada acción protegida autoriza el registro.
- No existen secretos ni datos personales innecesarios en código, logs o fixtures.
- Dependencias nuevas tienen justificación, licencia compatible y mantenimiento revisado.
- Estados de carga, vacío, error, offline y reintento están resueltos.
- Logs, métricas y errores permiten operar la función.

## Backend

- Dominio no importa infraestructura.
- Controladores son delgados y errores tienen códigos estables.
- Escrituras críticas son transaccionales e idempotentes donde corresponde.
- Cambios de esquema incluyen migración y prueba desde cero.
- Trabajos declaran reintento, timeout y fallo definitivo.

## Móvil

- Probado en Android e iOS soportados, no solo emulador ideal.
- Permisos denegados y GPS apagado tienen alternativa clara.
- Tokens permanecen en almacenamiento seguro.
- Texto escalado, lector de pantalla, contraste y touch targets funcionan.
- Navegación activa libera ubicación/recursos al terminar.

## Web

- Público indexable cuando corresponde; privado no se filtra al HTML.
- Teclado, foco, responsive, temas y textos largos funcionan.
- Mutaciones evitan doble envío y muestran feedback semántico.
- Formularios extensos guardan progreso y previenen pérdida accidental.

## Datos/IA/Mapas

- Consultas espaciales usan índices y límites.
- IA cita fuentes y rechaza hechos ausentes en evaluaciones.
- Cambios de mapas/rutas tienen manejo de cuota, error y degradación.
- No se registra ubicación precisa sin propósito y consentimiento.
