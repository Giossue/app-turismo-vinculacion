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

### Ficha y revisión

Un guía prepara cambios. Una revisión conserva los datos propuestos sin modificar la
versión pública. La aprobación aplica los cambios en una transacción y genera auditoría.

### Transporte

Cooperativa, ruta, geometría de recorrido, paradas y horarios. Una ruta registrada no es
lo mismo que una ruta calculada por un proveedor de rutas.

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
