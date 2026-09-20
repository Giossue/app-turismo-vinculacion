# Plan: caché móvil y ficha pública de centros

Fecha: 2026-09-20

## Objetivo

Reducir datos efímeros guardados en el dispositivo y mejorar la ficha pública de un
centro turístico sin inventar información que todavía no existe en la API.

## Alcance

- Excluir rutas calculadas y búsquedas cercanas de la persistencia general de React Query.
- Mantener la sesión de navegación activa separada, porque la necesita el modo de viaje.
- Rediseñar la ficha pública con portada, acciones, pestañas de Información, Opiniones y
  Fotos.
- Aplicar el mismo patrón a la ficha que aparece al seleccionar un pin en Explorar.
- Retirar el controlador nativo desde que se abre la ficha, conservar el arrastre del
  sheet en estado compacto y encajar magnéticamente al estado completo al superar el
  umbral hacia arriba; en ese estado bloquear el gesto y dejar una salida fija con `X`.
- Permitir cambiar entre Información, Opiniones y Fotos mediante deslizamiento horizontal,
  manteniendo carga diferida de las pestañas no visitadas.
- Cargar la portada al abrir la ficha y montar la galería completa únicamente al abrir
  Fotos.
- Mostrar un estado honesto para Opiniones hasta que exista el módulo de opiniones en la
  API y la base de datos.

## Fuera de alcance

- Crear tablas, endpoints o valoraciones ficticias.
- Cambiar el almacenamiento de fotografías o generar miniaturas en el servidor.
- Crear el módulo de opiniones o valoraciones.

## Verificación

- Formatear y revisar el diff.
- Ejecutar lint, TypeScript y pruebas del paquete móvil.
- Ejecutar la exportación web del paquete móvil como comprobación de compilación.
- Comprobar en Android que la ficha compacta se pueda arrastrar, se expanda al superar el
  umbral, permanezca fija al desplazarse y solo se cierre con `X`.
- Comprobar que la ficha siga abriendo rutas, compartiendo y mostrando estados sin datos.

## Estado

Completado en código y comprobado en Android por ADB: arrastre compacto, expansión con
resorte, scroll interno sin cierre y salida mediante `X`.
