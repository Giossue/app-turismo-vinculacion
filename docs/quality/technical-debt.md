# Limitaciones documentadas

| Tema                     | Estado al adoptar knowledge                                         | Responsabilidad de evolución                               |
| ------------------------ | ------------------------------------------------------------------- | ---------------------------------------------------------- |
| Jobs / Redis / BullMQ    | Arquitectura prevista, sin worker de aplicación instalado           | API/operación: especificar antes de implementarlo          |
| Idempotencia general     | Sin contrato global de claves/outbox                                | API: definir por operación y riesgo                        |
| Contratos de clientes    | Parsers y tipos propios; Swagger disponible                         | API/clientes: coordinar cambios, generador si se adopta    |
| Tenants                  | Sin contrato de organización                                        | Producto/API: definir alcance antes de diseñar aislamiento |
| `apps/web`               | Scaffold público conservado; panel externo MUI                      | Producto: resolver su futuro mediante cambio explícito     |
| Rendimiento / plataforma | Sin nuevas mediciones o pruebas de dispositivos en esta instalación | Comprobar cuando se solicite verificación                  |
| Licencia CognitiveStack  | Sin licencia general en el dev analizado                            | Conservar atribución y redacción local                     |

Estos límites no son nuevos hallazgos de vulnerabilidad confirmados. El inventario
anterior sigue en
[deuda histórica en Git](https://github.com/Giossue/app-turismo-vinculacion/blob/91736d206fe194838f07fb72b45c95411f6e75d2/docs/plans/technical-debt.md); no se certifica
su resolución ni vigencia completa al migrar el knowledge.
