# Spec Delta

## ADDED Requirements

### Requirement: Espacio y vigencia de las descargas

El móvil SHALL mostrar en cada ciudad descargada el espacio que ocupa en el dispositivo (mosaicos del mapa y contenido local) y la fecha de su última actualización, el total de todas las descargas y si el catálogo publica una versión más reciente.

#### Scenario: Ciudad descargada con tamaños conocidos

- **WHEN** una ciudad descargada informa el tamaño de su mapa y de su contenido
- **THEN** su tarjeta muestra el total con su desglose, por ejemplo «Ocupa 12,4 MB (mapa 11 MB · lugares 1,4 MB)»
- **AND** muestra «Actualizado el» con la fecha larga en español

#### Scenario: Tamaño no informado

- **WHEN** ni el paquete del mapa ni el almacenamiento local informan un tamaño
- **THEN** la tarjeta no muestra un espacio inventado y conserva la fecha si existe

#### Scenario: Total de descargas

- **WHEN** hay ciudades descargadas con tamaño conocido
- **THEN** la cabecera «Mapas descargados» muestra la suma de esos tamaños en este dispositivo

#### Scenario: Versión más reciente publicada

- **WHEN** el catálogo remoto publica para una ciudad descargada una versión de paquete mayor que la guardada
- **THEN** la tarjeta indica «Actualización disponible» y destaca la acción Actualizar

#### Scenario: Sin conexión

- **WHEN** el catálogo remoto no está disponible
- **THEN** la tarjeta muestra el espacio y la fecha guardados sin anunciar una actualización
