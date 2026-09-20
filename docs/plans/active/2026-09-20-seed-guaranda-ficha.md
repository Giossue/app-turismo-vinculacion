# Ficha integral presentada como zona turística de Guaranda

## Decisión de interpretación

En la experiencia del producto, el usuario llama “zona turística” a la ficha completa.
El esquema existente conserva una relación territorial `zonas_turisticas` y una raíz de
ficha `centros_turisticos`; la migración crea la primera como contenedor interno y la
segunda como la ficha que consume el mapa y el bottom sheet. No se crean tablas ni
columnas nuevas.

## Ficha creada

- Nombre: `Centro Cultural Indio Guaranga`.
- Zona territorial: `Entorno de Guaranda`.
- Código generado por el servidor: `020101MC010202001`.
- Clasificación: Manifestaciones culturales → Arquitectura → Infraestructura Cultural.
- DPA: Bolívar → Guaranda → Ángel Polibio Cháves.
- Línea/escenario: Cultura / Urbano.
- Valoración XLSM: A–I `0; 7,2; 10; 7,5; 2; 9; 5; 5; 3`, total `48,7`, jerarquía `02`.
- Estado remoto: activo y `PUBLICADO`.
- Relaciones cargadas: administración, ingreso, forma de pago, meses recomendados,
  localidad cercana, accesibilidad general, señalización, planta turística, cuatro
  facilidades, siete actividades culturales y tres medios de promoción.

Los textos, coordenadas, valoración y relaciones son datos de demostración y deben
validarse institucionalmente antes de producción.

## Multimedia

La ficha tiene tres registros `FOTOGRAFIA` en `archivos_centro_turistico`, en estado
`PUBLICADO`, con MIME `image/png`, checksum y orden. El script
`scripts/seed-guaranda-ficha-media.sh` copia los binarios al almacenamiento local para
que `/api/v1/media/:id` pueda servirlos cuando la API use `MEDIA_STORAGE_PROVIDER=LOCAL`.

## Verificación remota

La migración se ejecutó dos veces con `ON_ERROR_STOP=1`. La consulta final confirmó una
ficha, código `020101MC010202001`, nueve resultados de criterio que suman `48,70`, siete
actividades activas, cuatro facilidades y tres fotografías publicadas. La segunda ejecución
no duplicó fotografías, criterios ni relaciones únicas.
