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
`ficha_Accesibilidad` y señalización. El adaptador transaccional a las tablas anteriores
queda pendiente; no se considera publicado mientras no exista.

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
