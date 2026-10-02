# Catálogo nacional de localidades y búsqueda administrativa

Fecha: 2026-10-02
Estado: implementado, verificado y aplicado en el destino remoto

## Problema observado

La base remota documentada contiene 25 provincias, 227 cantones y 1.250 parroquias
activas, pero únicamente una localidad activa: Guaranda. `GET /admin/catalogs`
consulta `localidades`, que es independiente de la DPA usada en las fichas; por ello
el formulario de establecimiento ofrece una sola opción. La comprobación se realizó
con lectura del destino `turismo_vinculacion_app`, sin credenciales en los resultados.

## Implementación

- Snapshot de la hoja `CODIGOS` del archivo oficial `cdpa2026.xlsx` del INEC,
  publicado en su Sistema Integrado de Consultas. SHA-256:
  `0d0ae33a0a0023ed44abcaa6b38a1c173fbda423e368a8f12bedda59d65d8f3a`.
- 222 cabeceras cantonales (`50`) y 824 parroquias rurales (`51` a `99`) de 24
  provincias; se excluye el código provincial `90` y no se duplican las parroquias
  urbanas como ciudades.
- SQL generado reproducible y autocontenido, sin dependencias Python adicionales.
- Alta única del cantón `14/13 Sevilla Don Bosco`, que falta en el catálogo XLSM
  anterior; el resto de referencias se resuelve por códigos DPA existentes activos.
- Preservación de todas las localidades existentes mediante comparación por nombre
  sin distinguir mayúsculas ni espacios externos y `ON CONFLICT DO NOTHING`.
- Coordenadas nulas en altas; no se modifican códigos, posiciones, referencias
  históricas, activación ni nombres existentes.
- En el repositorio web, selector MUI buscable por localidad, cantón y provincia.

## Verificación y despliegue

- Probar en PostgreSQL/PostGIS temporal: carga desde esquema vacío con DPA previa,
  repetición idempotente, Guaranda con coordenadas e ID preservados, localidad
  inactiva preservada y localidad operativa ajena al snapshot conservada.
- Validar 1.046 localidades nacionales y 222/824 tipos, exclusión de `90`, nombres
  correctos de cabeceras y alta del cantón requerido.
- Verificar que una DPA incompleta cancela toda la transacción.
- Antes de ejecutar en el destino remoto, verificar la conexión y respaldar solamente
  los catálogos territoriales; aplicar con `ON_ERROR_STOP=1` y revisar los conteos.
- Conservar las altas al revertir la interfaz. Si se necesita una corrección territorial,
  crear una migración posterior después de inventariar referencias; no borrar datos
  utilizados ni ejecutar rollbacks automáticos.

## Compatibilidad

La API de captura acepta localidades activas sin posición y exige coordenadas propias
del establecimiento. Las consultas por cercanía y fallback excluyen explícitamente
las localidades con ubicación nula. El catálogo offline permite coordenadas nulas y
solo ofrece descargas cuando existe un paquete publicado. No se publica contenido ni
se generan paquetes offline con esta carga territorial.

## Resultado de la verificación

`bash scripts/verify-national-localities.sh` terminó correctamente con PostgreSQL/
PostGIS temporal local. Verificó carga reproducible, preservación íntegra de Guaranda
georreferenciada, una localidad inactiva con nombre en mayúsculas y espacios, y una
localidad operativa adicional. Tras la carga hubo 1.046 referencias oficiales y una
localidad propia; la repetición conservó todas las filas e IDs. La DPA incompleta
produjo el error esperado y no dejó localidades ni el alta parcial de Sevilla Don
Bosco. El bootstrap completo más DPA y migración también se probó en un contenedor
PostGIS aislado: 1.046 localidades, 222 cabeceras, 824 poblados, 24 provincias y
222 cantones, con coordenadas nulas en todas las altas.

El script de verificación queda versionado y no utiliza `.pgpass`, el destino remoto
ni variables de despliegue. El generador y el importador usan exclusivamente la
biblioteca estándar de Python. La incorporación del nuevo cantón se limita a la
referencia necesaria para el catastro de establecimientos; no actualiza la DPA
histórica de parroquias ni cambia los códigos de fichas.

## Resultado del despliegue remoto

La migración se aplicó el 2 de octubre de 2026 en `turismo_vinculacion_app`, tras
verificar el destino documentado y respaldar los catálogos territoriales. Finalizó
con `COMMIT`, un cantón añadido y 1.045 localidades nuevas. La base conserva
Guaranda con su ID `1` y sus coordenadas; ahora expone 1.046 localidades activas:
222 ciudades y 824 poblados de 24 provincias y 222 cantones nacionales.

Se comprobaron las cabeceras Quito, Guayaquil, Cuenca, Sangolquí, Puyo, Puerto
Baquerizo Moreno y Sevilla Don Bosco. El portal pasó formato, lint, typecheck, build,
182 pruebas automatizadas y 15 verificaciones de interfaz en Chromium. Los secretos
de conexión se mantuvieron fuera del repositorio y de los resultados.
