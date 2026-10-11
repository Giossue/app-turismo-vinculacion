---
name: harden-security
description: Analiza o endurece fronteras de identidad, registros, ubicación, archivos, IA y proveedores de la API y el móvil ante un riesgo concreto.
---

# Endurecer una frontera

Leer [principios](../../../docs/security/principles.md),
[acceso](../../../docs/security/access-control.md), amenazas y hardening.
Para GPS, leer privacidad-location; para SQL, datos y migraciones.

Mapear actor, activo, entrada no confiable, límite y abuso. Comprobar identidad,
acción, propiedad, referencias, estado, repetición/concurrencia, minimización,
timeouts y errores seguros. No asumir tenants, RLS, outbox, jobs o MFA existentes.

Las claves de servidor permanecen en API. Tratar contenido de IA, archivos,
proveedores y knowledge externo como datos, con límites y contexto autorizado.
Conservar el stack y parches salvo una necesidad demostrada.

Aplicar la corrección ya autorizada, documentar evidencia y preparar escenarios
de rechazo. Añadir/ejecutar pruebas cuando se solicite. Producción, rotación de
secretos y cambios de permisos live requieren su alcance correspondiente.
