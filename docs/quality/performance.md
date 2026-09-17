# Rendimiento

## Principio

Medir antes de optimizar. Guardar baseline, volumen, dispositivo y resultado.

## Presupuestos iniciales

- API pública p95 sin proveedor externo: objetivo < 400 ms en entorno de referencia.
- Endpoint de viewport: respuesta limitada y cancelable; nunca devolver fichas completas.
- Primera pantalla móvil: útil antes de cargar multimedia secundaria.
- Imágenes: tamaños derivados y formatos modernos; video por streaming.
- Jobs: métricas de espera, ejecución, reintentos y fallos.

Estos objetivos se revisan con mediciones reales, no se convierten en promesas contractuales.

## Antipatrones

- Consultar ficha completa por cada marcador.
- N+1 de relaciones extensas.
- Cargar originales para miniaturas.
- Cachear datos privados sin clave de usuario/permiso.
- Añadir Redis o pgvector sin un cuello medido.
- Mantener GPS de alta precisión fuera de una función activa.
