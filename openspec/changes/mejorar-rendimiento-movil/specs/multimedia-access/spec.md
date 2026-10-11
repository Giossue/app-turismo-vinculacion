## ADDED Requirements

### Requirement: Variantes públicas de fotografías con recursos acotados

La API SHALL aceptar tamaños públicos thumbnail y preview de 640/1280 píxeles de ancho, sin ampliar imágenes ni admitir dimensiones arbitrarias, comprobar publicación antes de usar variantes y acotar memoria y concurrencia de transformación.

#### Scenario: Fotografía publicada con tamaño admitido

- **WHEN** se solicita una variante de una fotografía pública visible
- **THEN** se entrega una WebP reducida o el original permitido si la transformación no está disponible

#### Scenario: Registro oculto o tamaño inválido

- **WHEN** el registro no está publicado o el tamaño no está admitido
- **THEN** se rechaza la solicitud correspondiente sin entregar una variante almacenada en memoria

### Requirement: Galería móvil paginada y compatible

El móvil SHALL mostrar hasta ocho fotos por página y solicitar variantes solo de multimedia propia; todas las fotos y descripciones permanecen accesibles y una API anterior conserva la entrega del archivo original.

#### Scenario: Galería extensa

- **WHEN** se avanza o retrocede entre páginas de fotos
- **THEN** se montan como máximo ocho imágenes y se conserva el acceso a todas las fotografías

#### Scenario: URL externa o API anterior

- **WHEN** la foto procede de otra URL o el servidor aún no admite variantes
- **THEN** no se altera la URL externa ni se rompe la visualización de la foto original
