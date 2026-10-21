## ADDED Requirements

### Requirement: Reporte opcional de errores del móvil

El móvil SHALL reportar errores y cierres a Sentry solo cuando la compilación define `EXPO_PUBLIC_SENTRY_DSN`, y SHALL funcionar igual sin enviar nada cuando no está definido.

#### Scenario: Compilación sin DSN

- **WHEN** la app se compila sin `EXPO_PUBLIC_SENTRY_DSN`
- **THEN** no se inicializa el reporte de errores
- **AND** ningún error se envía a un servicio externo

#### Scenario: Compilación con DSN

- **WHEN** la app se compila con `EXPO_PUBLIC_SENTRY_DSN` y ocurre un error no controlado
- **THEN** se envía un reporte con stack, versión y entorno

### Requirement: Reportes anónimos y sin ubicación

Cada reporte SHALL excluir la cuenta, cuerpos, cabeceras y cookies de peticiones, query y fragmento de URLs, correos, tokens y coordenadas, tanto en el evento como en sus breadcrumbs. No SHALL adjuntar capturas, jerarquía de vistas ni session replay.

#### Scenario: Error durante una navegación

- **WHEN** un error menciona coordenadas o una URL con origen y destino en la query
- **THEN** el reporte muestra `[ubicación]` en lugar de las coordenadas
- **AND** la URL conserva solo esquema, host y ruta

#### Scenario: Petición autenticada

- **WHEN** un breadcrumb de red incluye cuerpo, cabecera Authorization o correo
- **THEN** el cuerpo se reemplaza por `[filtrado]`, el token por `[token]` y el correo por `[correo]`

### Requirement: Recuperación ante errores de render

El layout raíz SHALL capturar errores de render, reportarlos cuando el reporte está activo y mostrar «Algo salió mal» con la acción «Reintentar».

#### Scenario: Falla una pantalla

- **WHEN** un componente lanza un error al renderizar
- **THEN** la persona ve el mensaje y el botón «Reintentar» en lugar de una pantalla vacía
- **AND** «Reintentar» vuelve a montar la app

### Requirement: Source maps solo con credenciales de build

El build SHALL subir source maps solo cuando su entorno tiene `SENTRY_AUTH_TOKEN`, y SHALL compilar sin intentar subir nada cuando no lo tiene. Las credenciales no SHALL versionarse.

#### Scenario: Build local sin token

- **WHEN** se compila sin `SENTRY_AUTH_TOKEN`
- **THEN** la configuración no incluye el plugin de subida y el build no falla por Sentry
