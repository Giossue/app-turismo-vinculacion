## ADDED Requirements

### Requirement: Cierre de la navegación al llegar

El móvil SHALL mostrar la llegada con una cuenta regresiva de 60 segundos y cerrar la navegación activa al terminarla, liberando seguimiento, sesión persistida y voz como al cerrarla con la `X`.

#### Scenario: Llegada con la app visible

- **WHEN** la persona llega a 35 m o menos del destino con la app abierta
- **THEN** se anuncia la llegada, se muestra «La navegación se cerrará en N s» y la navegación se cierra al llegar a cero

#### Scenario: Cierre anticipado

- **WHEN** la persona toca la `X` durante la cuenta regresiva
- **THEN** la navegación se cierra de inmediato y la cuenta no vuelve a disparar

#### Scenario: Llegada detectada en segundo plano

- **WHEN** la llegada se detectó con la app oculta y la persona vuelve a la app
- **THEN** se muestra la llegada y la cuenta regresiva empieza en ese momento

### Requirement: Aviso de llegada en segundo plano

El móvil SHALL publicar una notificación local «Has llegado a tu destino.» cuando la tarea de fondo detecta la llegada con la app oculta y existe permiso de notificaciones, sin solicitar permisos nuevos ni fallar cuando no existe.

#### Scenario: App oculta con permiso

- **WHEN** la tarea de fondo detecta la llegada mientras la app no está activa
- **THEN** se detiene el seguimiento persistente y se publica una sola notificación de llegada

#### Scenario: Sin permiso o app visible

- **WHEN** no hay permiso de notificaciones o la app está en primer plano
- **THEN** no se publica la notificación y la llegada se resuelve como antes

### Requirement: Acciones sobre el lugar de destino

El móvil SHALL ofrecer, durante la cuenta regresiva de llegada a un centro o establecimiento del catálogo, guardar el lugar y abrir su ficha; en centros, también abrir sus opiniones. Los destinos sin lugar del catálogo no muestran estas acciones; todos los destinos ofrecen ver lugares cercanos.

#### Scenario: Guardar al llegar

- **WHEN** una persona autenticada guarda el lugar desde la llegada
- **THEN** se guarda como desde su ficha y la cuenta regresiva continúa

#### Scenario: Abrir ficha u opiniones

- **WHEN** la persona toca «Ver ficha» u «Opinar»
- **THEN** la navegación se cierra y se abre la ficha, en la pestaña de opiniones si eligió «Opinar»

#### Scenario: Visitante sin sesión

- **WHEN** un visitante toca guardar
- **THEN** la navegación se cierra y se abre el inicio de sesión con retorno a la ficha del lugar

#### Scenario: Destino sin lugar del catálogo

- **WHEN** la ruta lleva a una dirección, un POI o una ruta guardada
- **THEN** la llegada muestra el mensaje, la cuenta regresiva y solo la acción «Cerca»

#### Scenario: Ver lugares cerca del destino

- **WHEN** la persona toca «Cerca» durante la cuenta regresiva
- **THEN** la navegación se cierra y «Cerca de mí» lista los lugares publicados alrededor del destino, sin pedir el GPS

#### Scenario: Punto inválido en el enlace de cercanos

- **WHEN** «Cerca de mí» recibe una latitud o longitud ausente, no numérica o fuera de rango
- **THEN** ignora el punto y busca alrededor de la ubicación actual
