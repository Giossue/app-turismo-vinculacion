# Matriz XLSM → ficha integral

Fuente: `temp/Centro Cultural Indio Guaranga (2).xlsm`, revisión realizada el
2026-09-19. Las hojas ocultas se consideran fuentes de catálogos o reglas; no se presentan
como pantallas independientes.

## Hojas y destino

| Hoja del libro | Papel | Destino de implementación |
| --- | --- | --- |
| `Ficha_Jerarquia` | Ficha principal, 14 bloques y respuestas binarias | editor por secciones; tablas normalizadas del centro y snapshot JSONB durante captura |
| `Valores` | Valores permitidos, estados, frecuencias y listas | catálogos existentes; las respuestas se modelan con estado/observación, no solo checkbox |
| `Clas_AT` | Categoría → tipo → subtipo y códigos | `categorias_atractivo`, `tipos_atractivo`, `subtipos_atractivo`; selects dependientes |
| `DPA` | Provincia → cantón → parroquia | `provincias`, `cantones`, `parroquias`; selects dependientes |
| `Jerarquia` | Rangos y códigos de jerarquía | `rangos_jerarquia`; resultado calculado, no selección manual final |
| `Calculos` | Puntajes y composición del código | `resultados_indicador`, `resultados_criterio`, trigger de código; debe quedar reproducible y auditable |
| `RESUMEN DE RESULTADOS` | Resultado A–I y total | vista de valoración administrativa; no sustituye el detalle de respuestas |
| `ficha_Accesibilidad` | Criterios detallados por accesibilidad | `criterios_accesibilidad`, `respuestas_accesibilidad`, resumen de accesibilidad |
| `Validación-GAD` | Control de validación institucional | `validaciones_gad`, estado/observación y anexos restringidos |

## Fórmula de valoración observada

La hoja `Jerarquia` suma nueve criterios A–I y la hoja `Calculos` normaliza las modalidades
de acceso antes de aportar el resultado A. El traslado tipado de esas fórmulas usa esta
matriz; nunca ejecuta el texto de una regla guardada en la base.

| Criterio | Regla trasladada | Máximo aplicado |
| --- | --- | ---: |
| A | Vías terrestre/acuática/aérea normalizadas a 9 y promediadas entre modalidades activas; se agregan accesibilidad física y conectividad | 18 |
| B | Indicadores de planta turística con pesos `1,5` y `0,6` según la hoja | 18 |
| C | Atractivo y entorno: `conservado=7`, `alterado=5`, `en proceso=3`, `deteriorado=1` | 14 |
| D | Indicadores de higiene y seguridad con pesos `1,5`, `0,6`, `2` y `1` | 14 |
| E | Cuatro respuestas de políticas con pesos `3`, `3`, `2` y `2` | 10 |
| F | Cuatro actividades con pesos `3`, `3`, `3` y `9`; la suma se limita a 9 | 9 |
| G | Tres medios/decisiones de promoción con pesos `2`, `2` y `3` | 7 |
| H | Registro, estadísticas y afluencia con pesos `3`, `2` y `2`; la suma se limita a 5 | 5 |
| I | Personal y capacidades con pesos `2`, `2` y `1` | 5 |

El XLSM entregado produce `A–I = 0; 7,2; 10; 7,5; 2; 9; 5; 5; 3`, total `48,7` y
jerarquía `02`. La referencia anterior `56,2/53,2` queda marcada como documentación
histórica hasta que exista otro libro aprobado.

## Secciones de la ficha principal

| Sección | Contenido del XLSM | Persistencia existente |
| --- | --- | --- |
| 1. Identificación | nombre, clasificación, DPA, zona y códigos | `centros_turisticos`, catálogos territoriales/clasificación |
| 2. Ubicación y administración | coordenadas, dirección, administrador y responsable | `centros_turisticos`, `administraciones_atractivo` |
| 3. Características e ingreso | clima, línea, escenario, ingreso, horarios, reservas, precios, pagos y meses | `caracteristicas_climaticas`, `ingresos_centro_turistico`, `centro_formas_pago`, `centro_meses_recomendados` |
| 4. Accesibilidad y conectividad | localidad cercana, accesos, transporte, accesibilidad y señalización | `centro_localidad_cercana`, `vias_acceso_terrestre`, `accesos_acuaticos`, `accesos_aereos`, `transporte_centro`, `centro_tipos_transporte`, `detalles_transporte`, `centro_accesibilidad_resumen`, `respuestas_accesibilidad`, `senalizaciones_aproximacion` |
| 5. Planta y complementarios | agregados del atractivo/localidad, facilidades y servicios complementarios | `planta_turistica_centro`, `facilidades_centro`, `servicios_complementarios_centro` |
| 6. Conservación | estado por componente, factores de alteración y declaratorias | `evaluaciones_conservacion`, `evaluacion_factores_alteracion`, `declaratorias_turisticas` |
| 7. Higiene y seguridad | servicios básicos, señalética, salud, seguridad y comunicaciones | `servicios_basicos_centro`, `senaletica_centro`, `servicios_salud_centro`, `servicios_seguridad_centro`, `comunicaciones_centro`, `radios_portatiles_centro` |
| 8. Políticas y regulaciones | respuestas de política y contingencia | `respuestas_politica_centro`, `planes_contingencia`, observaciones por sección |
| 9. Actividades | actividades practicadas y detalle | `actividades_centro_turistico` |
| 10. Promoción | promoción, comercialización y medios | `promocion_centro_turistico`, `medios_promocion_centro_turistico` |
| 11. Visitantes | registros, temporadas, procedencias, informantes y afluencia | `registros_visitantes`, `temporadas_visitacion`, `temporada_meses`, `procedencias_visitantes`, `informantes_clave`, `afluencia_visitantes` |
| 12. Recurso humano | resumen y formación del personal | `resumen_recurso_humano`, `formacion_personal_centro` |
| 13. Descripción | descripción narrativa y observaciones | `centros_turisticos.descripcion`, `observaciones_seccion_centro_turistico` |
| 14. Anexos y responsabilidades | archivos, responsables, levantamiento de accesibilidad y validación GAD | `archivos_centro_turistico`, `responsables_ficha`, `levantamientos_accesibilidad`, `validaciones_gad` |

La captura administrativa de la sección 4 conserva temporalmente esas relaciones en
`accessibilityDetails` dentro del snapshot: vías terrestres con coordenadas/material/estado,
accesos acuáticos y aéreos, tipos y operadores de transporte, criterios detallados de
`ficha_Accesibilidad` y señalización. El adaptador transaccional ya reemplaza las tablas
anteriores para filas con catálogos activos; una fila manual bloquea su publicación.

La sección 5 usa los bloques `plant`, `facilitiesDetails` y `complementaryServices` en el
snapshot para conservar el ámbito y las cantidades de planta, el detalle de facilidades y
los servicios complementarios. El adaptador transaccional ya publica filas con IDs activos;
una fila manual sin catálogo se conserva en el borrador y bloquea su publicación para no
inventar una relación normalizada.

## Reglas de captura

- Cada fila repetible se guarda como una relación del mismo `centro_turistico_id`; nunca se
  crea otro centro por una actividad, facilidad o vía.
- Las respuestas binarias deben conservar al menos `SI`, `NO`, `NO APLICA` y
  `SIN INFORMACIÓN` cuando la tabla de destino lo permita, junto con observación.
- El catastro individual vive en `establecimientos_turisticos` y no reemplaza los agregados
  de planta turística de la sección 5.1.
- El código institucional se compone con DPA (2+2+2), clasificación (categoría/tipo/subtipo),
  jerarquía calculada y secuencial de tres dígitos. Para el caso del libro, la vista de
  referencia fue `020101MC010202001`; la API debe devolver siempre el código canónico del
  servidor.
- La hoja de resultados observada en el libro contiene el total almacenado del caso de
  referencia; cualquier discrepancia con documentación previa debe resolverse mediante un
  fixture aprobado antes de publicar.
