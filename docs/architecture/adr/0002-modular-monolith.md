# ADR-0002: Monolito modular y trabajadores

- Estado: aceptada
- Fecha: 2026-09-16

## Contexto

El dominio es amplio, pero el equipo y la carga inicial no justifican operación distribuida.

## Decisión

Una API NestJS modular y procesos worker BullMQ desplegables por separado. PostgreSQL es
la fuente compartida y se usa outbox para efectos asíncronos críticos.

## Consecuencias

- Transacciones y desarrollo simples.
- Los límites de módulo deben ser explícitos para evitar un monolito desordenado.
- Un módulo podrá extraerse solo con métricas y una necesidad operativa demostrada.
