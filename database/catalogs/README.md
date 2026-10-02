# Fuente del catálogo nacional de localidades

`inec-localities-2026.csv` conserva los códigos y nombres originales de la hoja
`CODIGOS` del archivo oficial [Códigos DPA 2026 del INEC](https://aplicaciones2.ecuadorencifras.gob.ec/SIN/descargas/cdpa2026.xlsx).
`inec-localities-2026.json` registra la URL y las sumas SHA-256 del XLSX y el CSV.
La [codificación del INEC](https://www.ecuadorencifras.gob.ec/documentos/web-inec/Geografia_Estadistica/Micrositio_geoportal/index.html)
asigna `50` a las cabeceras cantonales y `51` a `99` a las parroquias rurales.

La selección incluye 222 cabeceras y 824 parroquias rurales de las 24 provincias.
Excluye el código provincial `90`, que representa zonas sin delimitación y no una
provincia. Las parroquias urbanas `01` a `49` se agrupan bajo su cabecera `50` y no
se convierten en ciudades separadas. Las localidades rurales se registran como
`POBLADO` de referencia territorial; esta fuente no pretende enumerar todos los
recintos, barrios o asentamientos del país.

La fuente informa la cabecera real: Quito pertenece al cantón Distrito Metropolitano
de Quito, Sangolquí a Rumiñahui, Puyo a Pastaza y Puerto Baquerizo Moreno a San
Cristóbal. Copiar el nombre del cantón como ciudad produciría valores incorrectos.

El generador usa solo la biblioteca estándar de Python y funciona sin conexión:

```bash
python3 scripts/generate-national-localities-migration.py
```

Para reconstruir el snapshot, descargar el XLSX oficial a una ruta temporal y usar:

```bash
python3 scripts/generate-national-localities-migration.py --source-xlsx /tmp/cdpa2026.xlsx
```

El importador exige el SHA-256 revisado. Si el INEC cambia el archivo, revisar la
nueva fuente y versionar una nueva carga. La migración generada contiene los datos
necesarios para ejecutarse sin Python, XLSX, CSV ni acceso a Internet.
