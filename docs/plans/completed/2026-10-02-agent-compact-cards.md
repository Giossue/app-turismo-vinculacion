# Tarjetas compactas del agente turístico

## Objetivo

Reducir la carga visual del chat: nombre, categoría, dirección/localidad y «Ver»;
tiempos opcionales en una fila de iconos; retirar el pie visible «Fuentes».
El agente debe hablar como un guía turístico: respuestas breves y útiles, sin narrar
consultas a catastros, fichas, catálogos ni procesos internos.
Cada respuesta contesta la pregunta concreta y envía la tarjeta del lugar, sin botones
adicionales de ruta ni descripción de lo que muestran las tarjetas.

## Alcance y límites

- Turista autenticado; solo entidades publicadas verificadas por herramientas de la API.
- Dirección y localidad de centros tomadas del detalle público y catálogo territorial;
  campos opcionales compatibles con respuestas anteriores. El cantón es una localidad,
  no una ciudad inferida. Ausencia o fallo de datos no inventa direcciones.
- Compatibilidad en ambos sentidos: cabecera `X-Turismo-Agent-Card-Locations: 1` para
  solicitar los campos; la API mantiene la forma anterior cuando falta la capacidad, y
  el móvil acepta la respuesta sin campos de APIs anteriores.
- La ficha completa conserva los detalles; «Ver» abre el mismo overlay del chat.
- Fuentes siguen siendo trazables en el contrato y backend, sin pie visible.
- Prompt y textos deterministas de éxito, ausencia, fallo y ubicación usan voz de guía,
  conservando los hechos y límites reales. No se borran palabras de respuestas libres
  con expresiones regulares ni se inventan recomendaciones cuando faltan datos.
- Los tiempos conservan sus cálculos por modo y estados de degradación. La ubicación
  solo se comparte para cercanía o tiempos desde el visitante. La orientación simple
  «Cómo llegar a X» muestra el destino sin bloquear por GPS.
- Rutas desde «Ver» → «Cómo llegar»; solo «Usar mi ubicación» puede aparecer como control
  adicional. Referencias de acciones válidas se convierten en cards confiables.
- Contexto interno con nombres, orden y códigos públicos para seguimientos, sin ubicación
  ni contactos. Viñetas sobre precio, horario o descripción se conservan en texto y voz.
- Sin cambios de BD, dependencias, permisos, publicaciones ni seguimiento de ubicación.

## Trabajo

- [x] Compactar tarjeta y mostrar tiempos con iconos en una fila adaptable.
- [x] Completar dirección/localidad pública de centros en el contrato validado.
- [x] Ajustar prompt, fallbacks y mensajes locales a respuestas concisas de guía turístico.
- [x] Responder solo lo preguntado, asegurar tarjeta del destino y conservar referentes.
- [x] Retirar pie «Fuentes» y acciones «Ver» duplicadas.
- [x] Actualizar especificación y arquitectura del agente.
- [x] Verificar contratos, degradación, tipos y formato; revisar Android con texto ampliado.

## Verificación

- API: 83 pruebas en ocho archivos; contratos, JSON/SSE, capacidad de dirección,
  búsquedas, degradación, referencias confiables, omisiones de cards y detalles en paralelo.
- Móvil: 50 pruebas en seis archivos; contrato/transporte, contexto de referentes,
  límites y privacidad, GPS por intención, conservación de precios/horarios, tiempos y
  único control adicional de ubicación. Tipos y ESLint de ambos paquetes aprobados.
- Formato focal y `git diff --check` aprobados.
- QA Android aislada con componentes reales y fixtures en 390×844 y 320×568 con
  fuente 1.5: tarjetas compactas, tiempos/estados legibles y ajuste de línea correcto.
  Evidencia temporal: `/tmp/turismo-agent-cards-qa/`. Sin API ni GPS reales; recursos QA
  cerrados sin afectar Metro del producto ni el teléfono.
- Los cambios posteriores de texto, contexto y controles se comprobaron con tipos,
  pruebas y revisión del diff, sin repetir QA nativa ni ampliar el alcance.

Las pruebas usan proveedores simulados y no certifican el tono de todas las respuestas
de un modelo real. No se realizó verificación iOS ni despliegue en esta tarea. Ante varios
destinos sin selección explícita o detalle único, no se inventa una tarjeta arbitraria.
