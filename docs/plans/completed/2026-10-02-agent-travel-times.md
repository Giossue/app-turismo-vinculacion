# Tiempos de llegada en el agente turístico

## Objetivo

Mostrar en las tarjetas del agente los tiempos estimados desde la ubicación puntual
aproximada del visitante en carro, a pie y en bicicleta. El agente recibe las mismas
métricas verificadas mediante una herramienta de la API; no estima minutos a partir
de distancia directa ni modifica el orden de descubrimiento.

## Alcance y límites

- Solo destinos publicados o activos obtenidos mediante herramientas autorizadas.
- Coordenadas del visitante redondeadas, usadas durante la solicitud sin persistirlas.
- Consultas OSRM Table por perfil, acotadas a seis destinos y tres modos, sin tráfico
  en tiempo real ni sustitución por velocidad supuesta si una ruta no existe.
- Sin ubicación, ofrecer la acción existente para solicitarla; exploración general
  continúa funcionando sin GPS. Fallos por perfil y rutas ausentes son estados explícitos.
- No iniciar navegación; se conserva la confirmación móvil y el recálculo de la ruta.
- Sin migraciones, dependencias nuevas, despliegue, commit ni push.

## Trabajo

- [x] Ampliar el servicio de rutas con tiempos y distancias hacia varios destinos.
- [x] Incorporar herramienta del agente y métricas confiables en las tarjetas.
- [x] Mostrar lista accesible de carro, caminata y bicicleta en móvil.
- [x] Sincronizar contrato de chat, intención de ubicación y documentación.
- [x] Verificar contrato, proveedores fallidos, rutas ausentes y flujo de chat.

## Verificación

- API: 234 pruebas, formato, lint, TypeScript y build pasan.
- Móvil: 255 pruebas, formato, lint, TypeScript y build configurado (export web) pasan.
- Las pruebas del proveedor verifican los tres perfiles, alineación de matrices,
  rutas ausentes, errores aislados, respuestas inválidas, cancelación y límite de destinos.
- Las pruebas del agente verifican origen redondeado, referencias confiables, datos
  entregados al modelo y tarjetas, caché por turno, fuentes de respaldo y ubicación ausente.
- En Android físico, una pantalla temporal con datos controlados mostró los iconos y
  las duraciones sin recortes, incluyendo `<1 min`, `Sin ruta` y `No disponible`.
  El árbol accesible expone las tres duraciones dentro de la etiqueta de la tarjeta.
  Se retiraron la pantalla temporal y el servidor Metro al terminar.
- No se probó una conversación real contra la API/OSRM desplegados, ni lectura auditiva
  con TalkBack ni un dispositivo iOS. No se realizó despliegue.
