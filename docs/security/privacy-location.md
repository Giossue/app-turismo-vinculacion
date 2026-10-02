# Privacidad y ubicación

## Principios

- La creación de cuenta no sustituye el permiso de ubicación; pedirlo cuando la persona
  active la función que lo necesita.
- Pedirla al activar «mi ubicación» o una función de navegación que la necesita; abrir
  el mapa, escribir, filtrar servicios o buscar en la zona visible no la solicitan.
  El mapa continúa disponible si se deniega.
- Explicar finalidad antes del diálogo del sistema.
- Permitir explorar, buscar y usar origen manual sin permiso.
- No convertir permiso del sistema en consentimiento para analítica o personalización.

## Niveles

### En uso

Posición actual, cercanía y cálculo de ruta. Preferencia por precisión mínima suficiente.
Después de que la persona activa “mi ubicación”, la app puede mantener un watcher de
primer plano mientras permanece abierta para actualizar el punto del mapa y conservar la
sesión al cambiar de pantalla. Al pasar a segundo plano se detiene ese watcher; una tarea
persistente solo puede iniciarse desde una función que la persona haya habilitado de forma
explícita y bajo las condiciones de plataforma.

### Segundo plano

Solo cuando la persona activa explícitamente una función que lo necesita. Explicar la
finalidad, solicitar el permiso específico, ofrecer una alternativa en primer plano si lo
rechaza, mostrar el indicador/notificación requerido por la plataforma, permitir detenerlo y
finalizarlo cuando la función termine.

### Historial

Desactivado por defecto. Si una feature futura lo necesita, requiere especificación,
consentimiento separado, retención, descarga/borrado y evaluación de impacto.

## Almacenamiento

- No guardar cada punto GPS en logs o analítica.
- Para estadísticas usar agregación y reducción de precisión.
- Preferencias de lugar no deben revelar trayectorias detalladas.
- El usuario puede revocar consentimiento y borrar datos asociados.

## UX de estados

La app distingue permiso denegado, ubicación del dispositivo apagada, señal insuficiente,
precisión aproximada y dato antiguo. Para mostrar o usar la ubicación actual exige una
lectura fresca con precisión reportada de 100 m o menos; descarta `lastKnown` y muestras
más amplias. Nunca muestra una posición antigua como actual. La última posición persistida
de una navegación solo sirve para continuidad del servicio y espera un punto nuevo antes
de actualizar mapa, indicaciones o desvíos.

La consulta de establecimientos puede usar la posición puntual solo para ordenar resultados
durante la solicitud. La API no la guarda dentro del catastro ni la devuelve junto con datos
fiscales; sin coordenadas se puede buscar por localidad y se informa la precisión territorial
disponible.

La búsqueda pública puede usar una posición ya autorizada o el viewport visible durante
la solicitud, sin iniciar una lectura ni pedir permiso como efecto de escribir. Sus
consultas y claves con coordenadas/bbox viven solo en memoria y quedan fuera de la caché
persistida. Las búsquedas recientes locales conservan únicamente texto borrable, sin
posición, alcance geográfico ni historial del mapa.
