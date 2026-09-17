# Decisiones de la feature

| Fecha | Decisión | Razón | Consecuencia |
| --- | --- | --- | --- |
| 2026-09-16 | La consulta inicial usa únicamente centros `PUBLICADO` y activos. | Separar información oficial de borradores. | El endpoint no sirve para captura ni revisión. |
| 2026-09-16 | Se usa código de atractivo, no ID interno, en URL y respuesta. | Evitar exponer identificadores internos. | La ficha requiere código generado por las reglas de la base. |
| 2026-09-16 | El mapa envía viewport, no ubicación persistida. | La exploración no requiere GPS. | El GPS y MapLibre se agregan en el corte móvil correspondiente. |
