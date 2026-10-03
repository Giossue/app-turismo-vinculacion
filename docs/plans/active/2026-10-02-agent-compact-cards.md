# Tarjetas compactas del agente turístico

## Objetivo

Reducir la carga visual del chat: nombre, categoría, dirección/localidad y «Ver»;
tiempos opcionales en una fila de iconos; retirar el pie visible «Fuentes».
El agente debe hablar como un guía turístico: respuestas breves y útiles, sin narrar
consultas a catastros, fichas, catálogos ni procesos internos.

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
  solo se comparte para consultas de cercanía o llegada; no se amplía la solicitud de GPS.
- Sin cambios de BD, dependencias, permisos, publicaciones ni seguimiento de ubicación.

## Trabajo

- [x] Compactar tarjeta y mostrar tiempos con iconos en una fila adaptable.
- [ ] Completar dirección/localidad pública de centros en el contrato validado.
- [ ] Ajustar prompt, fallbacks y mensajes locales a respuestas concisas de guía turístico.
- [x] Retirar pie «Fuentes» y acciones «Ver» duplicadas.
- [x] Actualizar especificación y arquitectura del agente.
- [ ] Verificar contratos, degradación, tipos y formato; revisar Android con texto ampliado.

## Verificación prevista

Pruebas focalizadas del agente en API y móvil, tipos de paquetes afectados y revisión
de formato/diff. QA Android aislada con fixtures, pantalla estrecha y fuente ampliada,
sin API ni GPS reales. No sustituye una prueba con proveedores reales ni una revisión iOS.
