# Fronteras de los clientes

| Cliente             | Función vigente                          | Decisiones locales                                           |
| ------------------- | ---------------------------------------- | ------------------------------------------------------------ |
| `apps/mobile`       | Producto turístico Expo/React Native     | Paper, MapLibre, `Tourism*`, Expo Router y tokens nativos    |
| `apps/web`          | Scaffold del primer corte público        | Next.js existente; no contiene el panel institucional actual |
| `web-turismo-admin` | Portal institucional en otro repositorio | Next.js/MUI, React Hook Form, TanStack Query y Bun propios   |

Mantener las fronteras de repositorio al implementar. Cambiar un contrato de API
puede requerir coordinación con el panel, sin instalar su UI o gestor en el monorepo.

## Propiedad del estado

- Navegación: rutas reales de Expo Router.
- Datos remotos: TanStack Query y parsers de contratos del cliente.
- Mapa, selección, overlays y chat actual: estado de la feature móvil.
- Tema: proveedor compartido y preferencia explícita.
- Refresh y perfil mínimo: SecureStore nativo; access token en memoria.
- Datos públicos offline: almacenamiento declarado por la feature; no caché privada indiscriminada.

Los clientes actuales mantienen parsers y tipos propios. No afirmar que todo
se genera de Swagger mientras no exista ese generador. Actualizar contrato y
compatibilidad de ambos consumidores cuando la API cambie.

## Trabajo de interfaz

Usar el [brief](cognitive-architecture.md), elegir una superficie y reutilizar
[componentes](component-system.md). Preservar labels, permisos contextuales,
cancelación, estados normales de error/offline y el historial de navegación.

Las reglas detalladas móviles están en [mobile.md](mobile.md) y
[apps/mobile/AGENTS.md](../../apps/mobile/AGENTS.md). La coordinación del panel
está en [web.md](web.md); sus componentes y specs se mantienen en su propio repo.
