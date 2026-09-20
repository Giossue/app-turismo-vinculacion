# Plan: agente flotante y shell de mapa

Fecha: 2026-09-20  
Estado: implementación móvil completada; pendiente validación visual en dispositivo.

## Objetivo

Convertir el mapa en la superficie principal de la app: retirar la navegación inferior,
abrir el agente turístico desde un botón flotante y presentar su conversación en una sheet
nativa. El menú lateral queda junto al buscador superior.

## Decisiones

- El estado `agentOpen` es la única fuente de verdad para la sheet del agente.
- El agente abre en una sheet de altura completa, sin cierre por gesto; la salida visible es
  la acción `X` del encabezado.
- El botón del agente comparte la columna de acciones flotantes con el control de ubicación.
- La conversación reutiliza el contrato actual de `askTourismAgent` y sus mensajes de ejemplo.
- Las fichas sugeridas por el agente cierran la sheet antes de navegar a la ficha.
- No se añade una dependencia: se reutiliza `@expo/ui/community/bottom-sheet` ya instalada.

## Cambios

- `apps/mobile/src/app/(tabs)/_layout.tsx`: Tabs sin barra inferior y únicamente el mapa visible.
- `apps/mobile/src/app/(tabs)/index.tsx`: buscador + menú en la fila superior, botón flotante y
  sheet controlada para búsqueda, ficha y agente.
- `apps/mobile/src/features/agent/presentation/agent-chat-content.tsx`: contenido de chat
  reutilizable dentro de la sheet con `BottomSheetTextInput`.
- `apps/mobile/src/core/ui/tourism-navigation.tsx`: retiro de `TourismTabBar` y del tipo de pestaña.
- `apps/mobile/src/app/(tabs)/agent.tsx`: ruta de pestaña retirada.

## Verificación

- Typecheck de `@turismo/mobile`.
- Prettier y lint sobre los archivos modificados.
- Smoke visual en Android: mapa a pantalla completa, menú, botón del agente, apertura/cierre
  de sheet, envío de mensaje y navegación desde una tarjeta de resultado.
