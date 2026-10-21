## ADDED Requirements

### Requirement: Contraste y objetivo táctil

El móvil SHALL usar colores de texto con contraste WCAG AA (4,5:1) sobre todas sus superficies en tema claro y oscuro, y controles con un área táctil de al menos 48 dp.

#### Scenario: Texto secundario legible

- **WHEN** se muestra texto con cualquier rol de texto de la paleta sobre fondo, superficie o superficie seleccionada
- **THEN** su contraste es de al menos 4,5:1 en ambos temas

#### Scenario: Chips y botones compactos

- **WHEN** una persona toca un chip o un botón compacto
- **THEN** el área táctil, incluido su margen, mide al menos 48 dp

### Requirement: Anuncios al lector de pantalla

El móvil SHALL comunicar al lector de pantalla los errores de carga y la posición de cada fotografía sin que la persona tenga que buscarlos.

#### Scenario: Error de carga

- **WHEN** una pantalla o panel pasa a un estado de error
- **THEN** TalkBack anuncia su título y mensaje

#### Scenario: Galería a pantalla completa

- **WHEN** el foco llega a una fotografía del visor con varias imágenes
- **THEN** se lee su descripción seguida de «Fotografía N de M»

### Requirement: Navegación legible con lector de pantalla

El móvil SHALL agrupar la información de la navegación activa en lecturas completas y anunciar los cambios que no mueven el foco.

#### Scenario: Cuenta regresiva de llegada

- **WHEN** la persona llega al destino y empieza la cuenta regresiva
- **THEN** TalkBack anuncia una sola vez que la navegación se cerrará en 60 segundos y el contador se lee con la palabra «segundos»

#### Scenario: Resumen del trayecto

- **WHEN** el foco llega a la barra inferior de la navegación
- **THEN** se lee en una sola frase el tiempo restante, la distancia y la hora de llegada

#### Scenario: Reordenar el recorrido

- **WHEN** la persona sube, baja o quita una parada de su recorrido
- **THEN** TalkBack anuncia la nueva posición del lugar o que se quitó
