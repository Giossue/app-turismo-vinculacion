# Privacidad y ubicación

## Principios

- No pedir ubicación en el registro.
- Pedirla al usar “mi ubicación”, cercanía o navegación.
- Explicar finalidad antes del diálogo del sistema.
- Permitir explorar, buscar y usar origen manual sin permiso.
- No convertir permiso del sistema en consentimiento para analítica o personalización.

## Niveles

### En uso

Posición actual, cercanía y cálculo de ruta. Preferencia por precisión mínima suficiente.

### Segundo plano

Solo durante navegación activa. Mostrar indicador, permitir detener y finalizar al cerrar
la sesión de navegación según comportamiento documentado de plataforma.

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
precisión aproximada y dato antiguo. Nunca muestra una posición antigua como actual.

La consulta de establecimientos puede usar la posición puntual solo para ordenar resultados
durante la solicitud. La API no la guarda dentro del catastro ni la devuelve junto con datos
fiscales; sin coordenadas se puede buscar por localidad y se informa la precisión territorial
disponible.
