# Modelo de dominio

## Agregados principales

### Centro turístico

Raíz de la ficha institucional. Conserva ubicación, clasificación, estado editorial,
valoración, anexos y secciones técnicas. Solo `PUBLICADO` y `activo = true` es visible al
turista. El código de 17 caracteres se deriva de territorio, clasificación, jerarquía y
secuencial; el `id` interno nunca cambia.

### Punto de interés

Lugar georreferenciado perteneciente a una zona turística. Puede recibir favoritos y
opiniones, y participar en itinerarios.

### Establecimiento turístico

Registro de catastro como alojamiento, alimentación u operadora. No equivale a un centro
turístico y no implica reservas.

Pertenece a una `localidad` (ciudad o poblado). La consulta pública puede resolver una
localidad efectiva distinta de la solicitada cuando no existe un registro activo para la
actividad buscada; esa resolución no modifica la pertenencia del establecimiento ni la
ficha del centro.

### Ficha y revisión

Un administrador prepara cambios en `borradores_centros_turisticos`. Una revisión conserva
un snapshot de los datos propuestos sin modificar la versión pública. La aprobación cambia
el estado de la propuesta y la publicación aplica el snapshot normalizado en una transacción
junto con el código, valoración y auditoría.

### Transporte

Cooperativa, ruta, geometría de recorrido, paradas y horarios. Una ruta registrada no es
lo mismo que una ruta calculada por un proveedor de rutas. La duración declarada por la
administración prevalece; si falta, puede estimarse desde la geometría y una velocidad
media del tipo de transporte, sin presentarla como tiempo garantizado.

### Itinerario

Plan del turista compuesto por jornadas y paradas ordenadas. Debe respetar horarios,
distancias, duración, preferencias y restricciones conocidas.

### Conversación de IA

Historial del usuario y mensajes. Cada afirmación factual debe derivarse de herramientas
del backend y poder vincularse con sus fuentes publicadas.

## Reglas críticas

- No publicar sin revisión aprobada.
- No reutilizar secuenciales de centros inactivos.
- No mostrar borradores ni cambios pendientes a turistas.
- No mezclar clima habitual con pronóstico externo.
- No considerar una ruta de transporte como navegación giro a giro.
- No inferir accesibilidad cuando la ficha no la confirma.
- La IA no convierte información ausente en un hecho.
- Los borrados de entidades históricas son lógicos.
- La ubicación del turista no forma parte de la ficha turística.

## Fuente detallada

El inventario completo de tablas y cardinalidades está en `temp/db.md`.
