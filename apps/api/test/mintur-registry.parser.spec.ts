import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";

import {
  cellText,
  isOperatingStatus,
  parseMinturRegistry,
} from "../src/establishments/mintur-registry.parser";

const HEADERS = [
  "RUC",
  "Código de Establecimiento RUC",
  "Nombre Comercial",
  "Número de Registro",
  "Fecha de Registro",
  "Actividad / Modalidad",
  "Clasificación",
  "Categoría",
  "Provincia",
  "Cantón",
  "Parroquia",
  "Teléfono Principal",
  "Latitud",
  "Longitud",
  "Correo Electrónico",
  "Estado Registro del Establecimiento",
  "Total Camas",
  "Póliza de seguros de accidentes",
];

async function workbook(sheets: Record<string, unknown[][]>) {
  const book = new ExcelJS.Workbook();
  for (const [name, rows] of Object.entries(sheets)) {
    const sheet = book.addWorksheet(name);
    rows.forEach((row) => sheet.addRow(row));
  }
  return Buffer.from(await book.xlsx.writeBuffer());
}

describe("parseMinturRegistry", () => {
  it("reads catastro sheets by header and skips pivot tables", async () => {
    const file = await workbook({
      Dinámica: [
        ["Etiquetas de fila", "Cuenta de RUC"],
        ["ALOJAMIENTO", 1],
      ],
      Consolidado: [
        HEADERS,
        [
          "0100064476001 ",
          "2",
          "HOTEL CORDERO",
          "0100064476001.002.2001602",
          new Date(Date.UTC(2021, 6, 29)),
          "ALOJAMIENTO",
          "HOTEL",
          "3 Estrellas",
          "AZUAY",
          "CUENCA",
          "EL SAGRARIO",
          "0",
          "-2.897379",
          "-79.002493",
          "Info@HotelCordero.com",
          "PENDIENTE DE INSPECCIÓN",
          53,
          "Sí",
        ],
        [
          "",
          "",
          "SIN REGISTRO",
          "",
          "",
          "ALOJAMIENTO",
          "",
          "",
          "AZUAY",
          "CUENCA",
        ],
      ],
    });

    const result = await parseMinturRegistry(file);

    expect(result.sheets).toEqual(["Consolidado"]);
    expect(result.errors).toEqual([
      expect.objectContaining({
        rowNumber: 3,
        reason: "No tiene número de registro.",
      }),
    ]);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]).toMatchObject({
      sheet: "Consolidado",
      rowNumber: 2,
      numeroRegistro: "0100064476001.002.2001602",
      ruc: "0100064476001",
      codigoEstablecimientoRuc: "2",
      clasificacion: "HOTEL",
      categoria: "3 Estrellas",
      telefono: null,
      correo: "info@hotelcordero.com",
      latitude: -2.897379,
      longitude: -79.002493,
      estadoRegistro: "PENDIENTE_INSPECCION",
      fechaRegistro: "2021-07-29",
      totalCamas: 53,
    });
    // Las columnas sin campo propio quedan en la fila original.
    expect(result.rows[0].raw["Póliza de seguros de accidentes"]).toBe("Sí");
  });

  it("flattens rich text, hyperlinks and formulas", () => {
    expect(cellText({ richText: [{ text: "Hotel " }, { text: "Sol" }] })).toBe(
      "Hotel Sol",
    );
    expect(cellText({ text: "www.sol.ec", hyperlink: "http://sol.ec" })).toBe(
      "www.sol.ec",
    );
    expect(cellText({ formula: "A1", result: 12 })).toBe("12");
  });

  it("keeps only operating MINTUR states active", () => {
    expect(isOperatingStatus("RATIFICADO")).toBe(true);
    expect(isOperatingStatus("PENDIENTE_INSPECCION")).toBe(true);
    expect(isOperatingStatus("SUSPENSION_TEMPORAL")).toBe(false);
    expect(isOperatingStatus("INACTIVO")).toBe(false);
  });
});
