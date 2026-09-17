# Visión del producto

## Propósito

Ayudar a turistas nacionales y extranjeros a descubrir Ecuador mediante información
oficial y comprensible sobre atractivos, puntos de interés, establecimientos, transporte,
accesibilidad y seguridad. La primera operación será Guaranda, sin codificar reglas que
impidan extenderla al resto del país.

El sistema transforma fichas técnicas del sector turístico en experiencias útiles:
mapa, búsqueda, rutas, navegación, itinerarios y un asistente de IA que cita información
aprobada. Guías registran contenido y un administrador/revisor decide su publicación.

## Usuarios

- Visitante: explora mapa y lugares públicos sin cuenta.
- Turista: favoritos, opiniones, preferencias, itinerarios e IA personalizada.
- Guía/gestor: captura fichas, ubicación y multimedia; atiende observaciones.
- Revisor: evalúa cambios y aprueba o rechaza.
- Administrador: usuarios, roles, catálogos, publicación, moderación y configuración.

## Problemas que resuelve

- Información turística dispersa, técnica o desactualizada.
- Dificultad para descubrir lugares y saber cómo llegar.
- Falta de un flujo auditable para producir información confiable.
- Baja visibilidad de atractivos y servicios locales.
- Recomendaciones genéricas que ignoran horario, accesibilidad y transporte.

## Flujos principales

1. Explorar: buscar o navegar el mapa y abrir una ficha pública.
2. Llegar: elegir origen/modo, calcular una ruta y navegar.
3. Planificar: guardar destinos y generar un itinerario viable.
4. Consultar IA: recibir respuestas con fuentes publicadas.
5. Registrar: un guía guarda borradores y envía una ficha.
6. Revisar: un revisor compara, observa, aprueba y publica.
7. Mantener: administrar catálogos, rutas, multimedia, opiniones e importaciones.

## Comportamiento sin ubicación

La aplicación sigue mostrando mapas, búsqueda, fichas y rutas con origen manual. Se
desactivan posición actual, cercanía en tiempo real y seguimiento de navegación.

## No objetivos iniciales

- Reservas y pagos de hoteles o actividades.
- Seguimiento en tiempo real de buses sin una fuente GPS autorizada.
- Red social turística completa.
- Moderación o publicación autónoma por IA.
- Microservicios o infraestructura multirregional prematura.

## Referencias

- Módulos y fases: `docs/product/modules.md`.
- Decisiones todavía abiertas: `docs/product/open-decisions.md`.
- Modelo relacional: `temp/db.md`.
