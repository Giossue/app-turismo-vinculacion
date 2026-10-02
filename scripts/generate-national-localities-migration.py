#!/usr/bin/env python3
"""Build the national locality catalog from the official INEC 2026 snapshot.

Only Python's standard library is required. Importing the XLSX is explicit; normal
generation reads the versioned CSV and never accesses the network or a database.
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
import posixpath
import re
import xml.etree.ElementTree as ET
from pathlib import Path
from zipfile import ZipFile


CATALOG = Path("database/catalogs/inec-localities-2026.csv")
PROVENANCE = Path("database/catalogs/inec-localities-2026.json")
OUTPUT = Path("database/migrations/20261002_seed_national_localities.sql")
SOURCE_URL = "https://aplicaciones2.ecuadorencifras.gob.ec/SIN/descargas/cdpa2026.xlsx"
SOURCE_SHA256 = "0d0ae33a0a0023ed44abcaa6b38a1c173fbda423e368a8f12bedda59d65d8f3a"
FIELDS = ("province_code", "canton_code", "canton_name", "parish_code", "name")
SHEET_NS = "{http://schemas.openxmlformats.org/spreadsheetml/2006/main}"
REL_NS = "{http://schemas.openxmlformats.org/officeDocument/2006/relationships}"


def display_name(raw: str) -> str:
    particles = {"a", "al", "de", "del", "el", "en", "la", "las", "los", "o", "y"}
    words = re.sub(r"\s+", " ", raw.strip()).lower().split(" ")
    return " ".join(
        word if index and word in particles else word[:1].upper() + word[1:]
        for index, word in enumerate(words)
    )


def import_xlsx(source: Path) -> None:
    digest = hashlib.sha256(source.read_bytes()).hexdigest()
    if digest != SOURCE_SHA256:
        raise ValueError("The XLSX differs from the reviewed INEC 2026 source")

    with ZipFile(source) as archive:
        strings = []
        if "xl/sharedStrings.xml" in archive.namelist():
            shared = ET.fromstring(archive.read("xl/sharedStrings.xml"))
            strings = [
                "".join(node.itertext())
                for node in shared.findall(f"{SHEET_NS}si")
            ]
        workbook = ET.fromstring(archive.read("xl/workbook.xml"))
        sheet = next(
            item for item in workbook.findall(f"{SHEET_NS}sheets/{SHEET_NS}sheet")
            if item.attrib["name"] == "CODIGOS"
        )
        relationships = ET.fromstring(archive.read("xl/_rels/workbook.xml.rels"))
        target = next(
            item.attrib["Target"] for item in relationships
            if item.attrib["Id"] == sheet.attrib[f"{REL_NS}id"]
        )
        sheet_path = target.lstrip("/") if target.startswith("/") else posixpath.normpath(f"xl/{target}")
        tree = ET.fromstring(archive.read(sheet_path))
        rows = []
        for row in tree.findall(f"{SHEET_NS}sheetData/{SHEET_NS}row"):
            cells = {}
            for cell in row.findall(f"{SHEET_NS}c"):
                column = re.match(r"[A-Z]+", cell.attrib["r"])[0]
                value = cell.findtext(f"{SHEET_NS}v", "")
                if cell.attrib.get("t") == "s":
                    value = strings[int(value)]
                elif cell.attrib.get("t") == "inlineStr":
                    value = "".join(cell.find(f"{SHEET_NS}is").itertext())
                cells[column] = value
            province = cells.get("B", "")
            canton = cells.get("D", "")
            parish = cells.get("F", "")
            if not re.fullmatch(r"\d{2}", province) or province == "90":
                continue
            if not re.fullmatch(r"\d{4}", canton) or not re.fullmatch(r"\d{6}", parish):
                raise ValueError(f"Invalid DPA code in source row {row.attrib['r']}")
            if canton[:2] != province or parish[:4] != canton:
                raise ValueError("Inconsistent DPA hierarchy")
            rows.append(dict(zip(FIELDS, (province, canton[2:], cells["E"], parish[4:], cells["G"]))))

    CATALOG.parent.mkdir(parents=True, exist_ok=True)
    with CATALOG.open("w", newline="", encoding="utf-8") as output:
        writer = csv.DictWriter(output, fieldnames=FIELDS, lineterminator="\n")
        writer.writeheader()
        writer.writerows(sorted(rows, key=lambda row: tuple(row[field] for field in FIELDS)))
    PROVENANCE.write_text(json.dumps({
        "sourceUrl": SOURCE_URL,
        "sourceSha256": digest,
        "sourceSheet": "CODIGOS",
        "excludedProvinceCodes": ["90"],
        "catalogSha256": hashlib.sha256(CATALOG.read_bytes()).hexdigest(),
        "localities": len(rows),
        "cities": sum(row["parish_code"] == "50" for row in rows),
        "towns": sum(int(row["parish_code"]) >= 51 for row in rows),
    }, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def read_catalog():
    metadata = json.loads(PROVENANCE.read_text(encoding="utf-8"))
    if metadata["sourceSha256"] != SOURCE_SHA256:
        raise ValueError("Unexpected official source checksum")
    if hashlib.sha256(CATALOG.read_bytes()).hexdigest() != metadata["catalogSha256"]:
        raise ValueError("The locality snapshot checksum does not match its provenance")
    with CATALOG.open(newline="", encoding="utf-8") as source:
        reader = csv.DictReader(source)
        if tuple(reader.fieldnames or ()) != FIELDS:
            raise ValueError("Unexpected locality CSV headers")
        rows = list(reader)
    codes = set()
    names = set()
    for row in rows:
        province, canton, parish = (row[key] for key in ("province_code", "canton_code", "parish_code"))
        if not all(re.fullmatch(r"\d{2}", value) for value in (province, canton, parish)):
            raise ValueError("Locality codes must contain exactly two digits")
        if not 1 <= int(province) <= 24 or not 50 <= int(parish) <= 99:
            raise ValueError("The catalog must only include national heads and rural parishes")
        code = (province, canton, parish)
        name = (province, canton, display_name(row["name"]).lower())
        if code in codes or name in names:
            raise ValueError(f"Duplicated source locality: {code}")
        if not row["name"] or len(display_name(row["name"])) > 150:
            raise ValueError("Invalid locality name")
        codes.add(code)
        names.add(name)
    if len(rows) != 1046 or sum(row["parish_code"] == "50" for row in rows) != 222:
        raise ValueError("Expected the reviewed 222 heads and 824 rural parishes")
    if len({row["province_code"] for row in rows}) != 24:
        raise ValueError("Expected 24 national provinces")
    return rows, metadata


def sql_literal(value: str) -> str:
    return "'" + value.replace("'", "''") + "'"


def build_sql(rows, metadata) -> str:
    values = ",\n".join(
        "  (" + ", ".join(sql_literal(value) for value in (
            row["province_code"], row["canton_code"], row["parish_code"],
            display_name(row["name"]), "CIUDAD" if row["parish_code"] == "50" else "POBLADO",
        )) + ")" for row in rows
    )
    return f"""-- Catálogo nacional de localidades: 222 cabeceras y 824 parroquias rurales.
-- Fuente: {metadata['sourceUrl']} (hoja CODIGOS).
-- SHA-256 XLSX: {metadata['sourceSha256']}
-- Snapshot CSV: database/catalogs/inec-localities-2026.csv
-- Generador: scripts/generate-national-localities-migration.py
-- No modifica nombres, activación, identificadores ni coordenadas existentes.
-- La fuente no informa coordenadas: las localidades nuevas quedan sin posición.

BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';

CREATE TEMP TABLE _national_localities (
  province_code CHAR(2) NOT NULL,
  canton_code CHAR(2) NOT NULL,
  parish_code CHAR(2) NOT NULL,
  name VARCHAR(150) NOT NULL,
  locality_type VARCHAR(20) NOT NULL,
  PRIMARY KEY (province_code, canton_code, parish_code)
) ON COMMIT DROP;

INSERT INTO _national_localities (province_code, canton_code, parish_code, name, locality_type)
VALUES
{values};

-- Sevilla Don Bosco (14/13) es el único cantón de la fuente 2026 ausente del XLSM.
-- Su alta no reasigna parroquias históricas ni cambia los códigos de centros.
INSERT INTO cantones (provincia_id, codigo_cton, nombre)
SELECT id, '13', 'Sevilla Don Bosco'
FROM provincias
WHERE codigo_dpa = '14' AND activo
ON CONFLICT (provincia_id, codigo_cton) DO NOTHING;

DO $$
DECLARE missing_cantons INTEGER;
BEGIN
  SELECT COUNT(*) INTO missing_cantons
  FROM (SELECT DISTINCT province_code, canton_code FROM _national_localities) source
  LEFT JOIN provincias province ON province.codigo_dpa = source.province_code AND province.activo
  LEFT JOIN cantones canton ON canton.provincia_id = province.id
    AND canton.codigo_cton = source.canton_code AND canton.activo
  WHERE canton.id IS NULL;
  IF missing_cantons <> 0 THEN
    RAISE EXCEPTION 'Faltan % cantones DPA activos del catálogo nacional; la carga se cancela', missing_cantons;
  END IF;
END $$;

INSERT INTO localidades (canton_id, nombre, tipo_localidad)
SELECT canton.id, source.name, source.locality_type
FROM _national_localities source
JOIN provincias province ON province.codigo_dpa = source.province_code AND province.activo
JOIN cantones canton ON canton.provincia_id = province.id
  AND canton.codigo_cton = source.canton_code AND canton.activo
WHERE NOT EXISTS (
  SELECT 1 FROM localidades existing
  WHERE existing.canton_id = canton.id
    AND lower(btrim(existing.nombre)) = lower(btrim(source.name))
)
ORDER BY source.province_code, source.canton_code, source.parish_code
ON CONFLICT (canton_id, nombre) DO NOTHING;

DO $$
DECLARE covered INTEGER;
BEGIN
  SELECT COUNT(*) INTO covered
  FROM _national_localities source
  JOIN provincias province ON province.codigo_dpa = source.province_code AND province.activo
  JOIN cantones canton ON canton.provincia_id = province.id
    AND canton.codigo_cton = source.canton_code AND canton.activo
  WHERE EXISTS (
    SELECT 1 FROM localidades locality
    WHERE locality.canton_id = canton.id
      AND lower(btrim(locality.nombre)) = lower(btrim(source.name))
  );
  IF covered <> 1046 THEN
    RAISE EXCEPTION 'Se esperaban 1046 localidades nacionales cubiertas, hay %', covered;
  END IF;
END $$;

COMMIT;
"""


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source-xlsx", type=Path, help="Import the exact reviewed official XLSX before generation")
    parser.add_argument("--output", type=Path, default=OUTPUT)
    args = parser.parse_args()
    if args.source_xlsx:
        import_xlsx(args.source_xlsx)
    rows, metadata = read_catalog()
    args.output.write_text(build_sql(rows, metadata), encoding="utf-8")
    print(f"Generated {args.output}: 222 cities and 824 towns in 24 provinces")


if __name__ == "__main__":
    main()
