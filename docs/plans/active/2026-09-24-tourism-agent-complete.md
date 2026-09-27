# Cierre integral del agente turístico

Fecha: 2026-09-24
Estado: en ejecución. El objetivo abarca todas las capacidades del asistente
definidas para este producto; no se reduce al chat textual ya implementado.

## Evidencia inicial

- El árbol de trabajo estaba limpio al iniciar esta unidad.
- ADB reconoce un Motorola Edge 50 Fusion con la build `.dev` abierta; Metro
  responde en el puerto 8081.
- Una consulta real desde el teléfono («¿Qué lugares turísticos puedo visitar?»)
  respondió pidiendo ubicación y no ofreció lugares ni fuentes. El catálogo público
  puede consultarse sin GPS, así que es un fallo funcional comprobado.
- Una segunda consulta real («¿Dónde puedo comer?») también pidió GPS sin
  mostrar establecimientos. La base objetivo verificada contiene restaurantes,
  cafeterías, hoteles y hostales activos/publicados; una consulta de solo lectura
  devolvió establecimientos de Guaranda sin coordenadas del visitante.
- El chat actual tiene texto SSE, herramientas para centros, POI, establecimientos,
  transporte y rutas, tarjetas, fuentes genéricas, propuestas de itinerario en memoria
  y confirmación de navegación. No tiene historial persistente, itinerarios guardados,
  entrada de voz/foto, respuesta hablada ni asistencia editorial a guías.

## Requisitos de cierre

1. Descubrimiento y preguntas fundamentadas de centros, POI, establecimientos,
   transporte, accesibilidad y datos de fichas, con y sin GPS. Fuentes identificables
   por respuesta y ausencia explícita de información no publicada.
2. Recomendaciones y rutas viales verificadas; ubicación aproximada opcional y
   confirmación móvil antes de navegar.
3. Itinerarios viables con jornadas/paradas ordenadas, verificación de horarios y
   desplazamientos cuando haya datos, edición, guardado, listado y borrado por titular.
4. Historial de conversación opcional, aislado por usuario y borrable; sin guardar GPS,
   fotos o audio por defecto. Control visible de consentimiento y retención.
5. Voz de entrada con transcripción revisable y salida hablada con el mismo texto y
   fuentes; permisos, cancelación, límites, errores y liberación de recursos.
6. Foto/cámara para consultar lugares, con tamaño/tipo válidos, consentimiento,
   análisis ligado al catálogo publicado y ausencia explícita si no hay coincidencia.
7. Asistencia de redacción/validación para `AGENTE_TURISTICO` sobre registros propios;
   la persona revisa y decide, y la IA jamás publica o aprueba.
8. Límites por usuario/proveedor, degradación de red, seguridad contra instrucciones
   inyectadas en contenido, observabilidad sin datos sensibles y evaluación de
   exactitud/citas/ausencias en español e inglés.
9. Verificación de API, migraciones, móvil Android por ADB, accesibilidad y el resto de
   plataformas soportadas antes de declarar el objetivo completo.

## Orden de implementación

- [ ] Corregir descubrimiento sin GPS y forzar consulta de fuentes para preguntas
      turísticas; comprobar en pruebas y en el teléfono contra un backend actualizado.
- [x] Completar búsqueda pública de establecimientos por localidad sin GPS y fuentes
      concretas de los resultados.
- [x] Persistir itinerarios e historial opt-in con migración, API, controles de borrado
      y UI móvil.
- [x] Añadir voz y foto con los módulos Expo compatibles, backend acotado y pruebas
      de permisos/errores.
- [x] Añadir asistencia editorial autorizada para guías.
- [ ] Ejecutar evaluaciones, pruebas E2E y auditoría de requisitos punto por punto.

## Progreso comprobado

- Se añadieron herramientas y rutas forzadas para descubrimiento general y catastro
  sin GPS, con respuesta verificada de respaldo y fuente por registro.
- La consulta SQL del catastro filtra activo/publicado, localidad activa y resultado
  acotado; no expone RUC, razón social ni identificadores internos.
- API: 30 suites y más de 160 pruebas pasan; TypeScript y lint pasan. Móvil: 40 suites y
  184 pruebas pasan; TypeScript y lint pasan. La nueva lógica aún no está desplegada
  en el backend que consume el teléfono, así que los criterios ADB de respuesta
  corregida siguen pendientes.
- La migración se aplicó dos veces sin errores en PostgreSQL local con el esquema
  previo representativo. La build Android de desarrollo se regeneró y compiló con
  los módulos nuevos, se instaló por ADB y el agente abrió. Micrófono, cámara y
  galería abren directamente sus funciones; la cancelación de voz restablece el
  compositor. No se enviaron fotos ni grabaciones privadas al backend anterior.
- La web institucional muestra la propuesta editorial para revisión y aplicación
  manual. `bun run verify` pasa, incluido el build de producción.
- Se corrigió la desconexión entre el permiso GPS del mapa y el agente: una
  consulta cercana lee la ubicación concedida aunque aún no esté en memoria.
  Sin lectura, el móvil ofrece la acción `request_location` de inmediato;
  la API también dispone de `requestLocationAccess` para otros clientes. El
  botón obtiene la ubicación y repite la pregunta. La salida hablada usa un
  icono pequeño en la esquina del mensaje.
- El compositor agrupa Voz, Cámara y Galería en un menú anclado al botón «+».
  ADB verificó que el menú abre sobre el compositor, que la grabación se puede
  cancelar desde él, que cámara y galería se abren y que Atrás cierra primero
  el menú sin cerrar la sheet.
- Las tarjetas de centro, catastro y POI ahora abren una ficha apilada sobre
  el agente. ADB confirmó que una tarjeta de catastro abre su ficha y que Atrás
  vuelve a la conversación con las tarjetas intactas. El texto aplica énfasis
  Markdown y oculta las viñetas que repiten los lugares ya visibles como
  tarjetas. ADB confirmó la respuesta sin lista duplicada y la apertura/cierre
  de una tarjeta sin salir del chat.
- Se detectó por ADB que «Ahora no» en el aviso de seguimiento en segundo
  plano iniciaba la navegación y mostraba una advertencia verde, aunque la
  persona esperaba cancelar. El seguimiento persistente pasó a un interruptor
  voluntario en la vista previa; iniciar la ruta por defecto no muestra ese
  aviso y usa solo ubicación en primer plano. ADB comprobó que el botón inicia
  sin diálogo ni aviso verde, y que la X detiene la navegación y devuelve a la
  vista previa con el interruptor apagado. Atrás o cerrar durante la lectura GPS
  cancela el inicio pendiente. No se forzó el permiso opcional de segundo plano
  en el teléfono durante esta comprobación.

## Pendientes de cierre

- Desplegar la migración antes de la API, comprobar las variables de proveedor y
  reconstruir el servicio con Dokploy según el procedimiento del repositorio.
- Repetir ADB con la API actualizada para respuestas fundamentadas, historial,
  planes y multimedia de extremo a extremo.
- Completar evaluación de casos difíciles y verificación de respuestas de extremo a
  extremo con la API nueva. El build Android, controles y permisos ya se probaron.

## Límites que permanecen

El modelo solo puede leer datos publicados mediante herramientas permitidas y proponer
acciones. No escribe catálogos, inicia navegación, aprueba contenido ni usa credenciales
o datos privados del turista. Las mutaciones de itinerarios e historial las realiza la
persona mediante acciones explícitas de la API, con autorización por titular.
