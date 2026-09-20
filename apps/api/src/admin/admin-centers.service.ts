import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  Optional,
} from "@nestjs/common";
import { InjectDataSource } from "@nestjs/typeorm";
import { DataSource, EntityManager } from "typeorm";

import type {
  AdminAccessibilityDto,
  AdminActivityDto,
  AdminAdmissionDto,
  AdminAdministrationDto,
  AdminCentersQueryDto,
  AdminCatalogsQueryDto,
  AdminCatalogUpdateDto,
  AdminCenterSectionCode,
  AdminCenterSectionProgress,
  AdminCenterSectionProgressStatus,
  AdminClimateDto,
  AdminFacilityDto,
  ReviewCenterDto,
  SaveAdminSectionDto,
  SaveAdminCenterDto,
} from "./admin.dto";
import { ADMIN_CENTER_SECTION_CODES } from "./admin.dto";
import { MediaService } from "../files/media.service";
import {
  buildXlsmValuationInput,
  calculateXlsmValuation,
  XLSM_INDICATOR_CODES,
  type XlsmValuationCatalogs,
} from "./valuation";

type JsonRecord = Record<string, unknown>;
type CatalogKey = "ACCESSIBILITY" | "ACTIVITY" | "FACILITY";

const CATALOG_TARGETS: Record<CatalogKey, { table: string }> = {
  ACCESSIBILITY: { table: "tipos_accesibilidad" },
  ACTIVITY: { table: "actividades_turisticas" },
  FACILITY: { table: "tipos_facilidad" },
};

type CenterDraft = {
  name: string;
  subtypeId: number;
  touristZoneId: number;
  parishId: number;
  productLineId: number;
  scenarioId: number;
  hierarchyId: number;
  latitude: number;
  longitude: number;
  altitudeMeters?: number;
  description?: string;
  address?: {
    barrio?: string;
    street?: string;
    number?: string;
    crossStreet?: string;
  };
  administration?: AdminAdministrationDto;
  climate?: AdminClimateDto;
  admission?: AdminAdmissionDto;
  activities?: AdminActivityDto[];
  accessibility?: AdminAccessibilityDto[];
  facilities?: AdminFacilityDto[];
  sections?: Record<string, unknown>;
};

interface CenterRow extends JsonRecord {
  id: string;
  code: string | null;
  name: string;
  statusCode: string;
  statusName: string;
  active: boolean;
  publishedAt: string | null;
  subtypeId: number;
  touristZoneId: number;
  parishId: number;
  productLineId: number;
  scenarioId: number;
  hierarchyId: number | null;
  latitude: string;
  longitude: string;
  altitudeMeters: number | null;
  description: string | null;
  barrio: string | null;
  street: string | null;
  addressNumber: string | null;
  crossStreet: string | null;
  administration: AdminAdministrationDto | null;
  climate: AdminClimateDto | null;
  admission: AdminAdmissionDto | null;
  activities: AdminActivityDto[];
  accessibility: AdminAccessibilityDto[];
  facilities: AdminFacilityDto[];
}

interface DraftRow {
  id: string;
  stateCode: string;
  stateName: string;
  version: number;
  data: CenterDraft;
}

interface RevisionRow {
  id: string;
  stateCode: string;
  stateName: string;
  observation: string | null;
  requestedAt: string;
  reviewedAt: string | null;
  data: CenterDraft;
}

interface CenterListRow {
  code: string;
  name: string;
  statusCode: string;
  statusName: string;
  baseStatusCode: string;
  updatedAt: string;
  submittedAt: string | null;
  requestedBy: string | null;
  observation: string | null;
  active: boolean;
  hasDraft: boolean;
  total: string;
}

const EDITABLE_DRAFT_STATES = new Set(["BORRADOR", "RECHAZADO"]);
const SECTION_RESPONSE_VALUES = new Set([
  "SI",
  "NO",
  "SIN_INFORMACION",
  "NO_APLICA",
]);
const CONSERVATION_STATE_VALUES = new Set([
  "CONSERVADO",
  "ALTERADO",
  "EN_PROCESO_DE_DETERIORO",
  "DETERIORADO",
]);
const CONSERVATION_ORIGIN_VALUES = new Set(["NATURAL", "ANTROPICO"]);
const CONSERVATION_COMPONENT_VALUES = new Set(["ATRACTIVO", "ENTORNO"]);
const HYGIENE_ENTRY_KINDS = new Set([
  "BASIC_SERVICE",
  "SIGNAGE",
  "HEALTH",
  "SECURITY",
  "COMMUNICATION",
  "THREAT",
]);
const SERVICE_SCOPE_VALUES = new Set(["EN_ATRACTIVO", "EN_POBLADO_CERCANO"]);
const SIGNAGE_CONDITION_VALUES = new Set(["BUENO", "REGULAR", "MALO"]);
const POLICY_CODES = new Set([
  "PLAN_DESARROLLO_GAD",
  "PLANIFICACION_TERRITORIAL",
  "REGULACIONES_APLICABLES",
  "ORDENANZAS_APLICABLES",
]);
const PROMOTION_MEDIA_RESPONSE_VALUES = SECTION_RESPONSE_VALUES;
const VISITOR_REGISTRY_TYPES = new Set(["DIGITAL", "PAPEL"]);
const VISITOR_SEASON_TYPES = new Set(["ALTA", "BAJA"]);
const VISITOR_ORIGIN_TYPES = new Set(["NACIONAL", "EXTRANJERA"]);
const VISITOR_FREQUENCIES = new Set([
  "PERMANENTE",
  "ESTACIONAL",
  "ESPORADICA",
  "INEXISTENTE",
]);
const TRAINING_GROUPS = new Set(["EDUCACION", "CAPACITACION", "IDIOMA"]);
const ANNEX_VISIBILITIES = new Set([
  "PUBLICA",
  "ADMINISTRATIVA",
  "RESTRINGIDA",
]);
const ACCESSIBILITY_DETAILS_MAX_ROWS = 100;

/**
 * Validates the transitional JSON contract used by the web section editor.
 * Legacy section payloads without the new fields remain readable while the
 * normalized publication adapters are being implemented.
 */
export function validateAdminSectionContent(content: unknown): string | null {
  if (!isJsonRecord(content))
    return "El contenido de la sección debe ser un objeto.";
  const usesStructuredContract = [
    "schemaVersion",
    "response",
    "observation",
    "rows",
    "accessibilityDetails",
    "plant",
    "facilitiesDetails",
    "complementaryServices",
  ].some((key) => key in content);
  if (!usesStructuredContract) return null;
  if (content.schemaVersion !== undefined && content.schemaVersion !== 1) {
    return "La versión de la sección no es compatible.";
  }
  if (!("response" in content) || !isSectionResponse(content.response)) {
    return "La sección requiere una respuesta válida.";
  }
  if (
    content.observation !== undefined &&
    content.observation !== null &&
    (typeof content.observation !== "string" ||
      content.observation.length > 2_000)
  ) {
    return "La observación de la sección supera el límite permitido.";
  }
  if (
    content.localityId !== undefined &&
    content.localityId !== null &&
    (!Number.isInteger(content.localityId) || Number(content.localityId) < 1)
  ) {
    return "La localidad cercana no es válida.";
  }
  if (
    content.distanceKm !== undefined &&
    content.distanceKm !== null &&
    (typeof content.distanceKm !== "number" ||
      !Number.isFinite(content.distanceKm) ||
      content.distanceKm < 0)
  ) {
    return "La distancia debe ser un número mayor o igual que cero.";
  }
  if (content.climate !== undefined) {
    if (!isJsonRecord(content.climate))
      return "El bloque de clima no es válido.";
    if (
      content.climate.climateId !== null &&
      (!Number.isInteger(content.climate.climateId) ||
        Number(content.climate.climateId) < 1)
    ) {
      return "El tipo de clima no es válido.";
    }
    const climateValues = [
      content.climate.minTemperature,
      content.climate.maxTemperature,
      content.climate.minRainfall,
      content.climate.maxRainfall,
    ];
    if (
      climateValues.some(
        (value) =>
          value !== undefined &&
          value !== null &&
          (typeof value !== "number" || !Number.isFinite(value)),
      )
    ) {
      return "Los rangos de clima deben ser números válidos.";
    }
    if (
      content.climate.minRainfall !== undefined &&
      content.climate.minRainfall !== null &&
      typeof content.climate.minRainfall === "number" &&
      content.climate.minRainfall < 0
    ) {
      return "La precipitación mínima no puede ser negativa.";
    }
    if (
      content.climate.maxRainfall !== undefined &&
      content.climate.maxRainfall !== null &&
      typeof content.climate.maxRainfall === "number" &&
      content.climate.maxRainfall < 0
    ) {
      return "La precipitación máxima no puede ser negativa.";
    }
    if (
      content.climate.minTemperature !== null &&
      content.climate.maxTemperature !== null &&
      content.climate.minTemperature !== undefined &&
      content.climate.maxTemperature !== undefined &&
      typeof content.climate.minTemperature === "number" &&
      typeof content.climate.maxTemperature === "number" &&
      content.climate.minTemperature > content.climate.maxTemperature
    ) {
      return "La temperatura mínima no puede superar la máxima.";
    }
    if (
      content.climate.minRainfall !== null &&
      content.climate.maxRainfall !== null &&
      content.climate.minRainfall !== undefined &&
      content.climate.maxRainfall !== undefined &&
      typeof content.climate.minRainfall === "number" &&
      typeof content.climate.maxRainfall === "number" &&
      content.climate.minRainfall > content.climate.maxRainfall
    ) {
      return "La precipitación mínima no puede superar la máxima.";
    }
  }
  if (content.accessibilityDetails !== undefined) {
    const accessibilityError = validateAccessibilityDetailsBlock(
      content.accessibilityDetails,
    );
    if (accessibilityError) return accessibilityError;
  }
  if (content.plant !== undefined) {
    const plantError = validatePlantBlock(content.plant);
    if (plantError) return plantError;
  }
  if (content.facilitiesDetails !== undefined) {
    const facilitiesError = validateFacilityDetailsBlock(
      content.facilitiesDetails,
    );
    if (facilitiesError) return facilitiesError;
  }
  if (content.complementaryServices !== undefined) {
    const complementaryError = validateComplementaryServicesBlock(
      content.complementaryServices,
    );
    if (complementaryError) return complementaryError;
  }
  if (content.conservation !== undefined) {
    const conservationError = validateConservationBlock(content.conservation);
    if (conservationError) return conservationError;
  }
  if (content.declarations !== undefined) {
    const declarationsError = validateConservationDeclarations(
      content.declarations,
    );
    if (declarationsError) return declarationsError;
  }
  if (content.hygieneSafety !== undefined) {
    const hygieneError = validateHygieneSafetyBlock(content.hygieneSafety);
    if (hygieneError) return hygieneError;
  }
  if (content.policies !== undefined) {
    const policiesError = validatePolicyBlock(content.policies);
    if (policiesError) return policiesError;
  }
  if (content.promotion !== undefined) {
    const promotionError = validatePromotionBlock(content.promotion);
    if (promotionError) return promotionError;
  }
  if (content.visitors !== undefined) {
    const visitorsError = validateVisitorsBlock(content.visitors);
    if (visitorsError) return visitorsError;
  }
  if (content.humanResources !== undefined) {
    const humanResourcesError = validateHumanResourcesBlock(
      content.humanResources,
    );
    if (humanResourcesError) return humanResourcesError;
  }
  if (content.annexes !== undefined) {
    const annexesError = validateAnnexesBlock(content.annexes);
    if (annexesError) return annexesError;
  }
  if (content.rows !== undefined) {
    if (!Array.isArray(content.rows) || content.rows.length > 200) {
      return "Las filas de la sección no son válidas.";
    }
    for (const row of content.rows) {
      if (!isJsonRecord(row)) return "Una fila de la sección no es válida.";
      if (
        typeof row.label !== "string" ||
        row.label.trim().length === 0 ||
        row.label.length > 180
      ) {
        return "Cada fila debe tener un elemento de hasta 180 caracteres.";
      }
      if (!isSectionResponse(row.response)) {
        return "Cada fila requiere una respuesta válida.";
      }
      if (
        row.quantity !== undefined &&
        row.quantity !== null &&
        (!Number.isInteger(row.quantity) || Number(row.quantity) < 0)
      ) {
        return "Las cantidades deben ser enteros mayores o iguales que cero.";
      }
      if (
        row.observation !== undefined &&
        row.observation !== null &&
        (typeof row.observation !== "string" || row.observation.length > 1_000)
      ) {
        return "La observación de una fila supera el límite permitido.";
      }
    }
  }
  return null;
}

export function getAdminSectionProgress(
  content: unknown,
  coreComplete = false,
): AdminCenterSectionProgressStatus {
  if (content === undefined || content === null) {
    return coreComplete ? "COMPLETA" : "SIN_INICIAR";
  }
  if (!isJsonRecord(content)) return "CON_ERRORES";
  const validationError = validateAdminSectionContent(content);
  if (validationError) return "CON_ERRORES";
  if (!("response" in content)) return "INCOMPLETA";
  if (
    content.response === "SI" &&
    content.conservation !== undefined &&
    !isConservationBlockComplete(content.conservation)
  ) {
    return "INCOMPLETA";
  }
  return content.response === "NO_APLICA" ? "NO_APLICA" : "COMPLETA";
}

function isSectionResponse(value: unknown): boolean {
  return typeof value === "string" && SECTION_RESPONSE_VALUES.has(value);
}

function isJsonRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getAdminSectionRecord(
  draft: CenterDraft,
  code: AdminCenterSectionCode,
): JsonRecord | null {
  const value = draft.sections?.[code];
  return isJsonRecord(value) ? value : null;
}

function sectionResponseToBoolean(value: unknown): boolean | null {
  if (value === "SI") return true;
  if (value === "NO") return false;
  return null;
}

function isBinarySectionResponse(value: unknown): value is "SI" | "NO" {
  return value === "SI" || value === "NO";
}

function validateAccessibilityDetailsBlock(value: unknown): string | null {
  if (!isJsonRecord(value)) return "El detalle de accesibilidad no es válido.";

  if (value.roads !== undefined) {
    if (
      !Array.isArray(value.roads) ||
      value.roads.length > ACCESSIBILITY_DETAILS_MAX_ROWS
    ) {
      return "Las vías terrestres de acceso no son válidas.";
    }
    for (const road of value.roads) {
      if (!isJsonRecord(road))
        return "Una vía terrestre de acceso no es válida.";
      const typeError = validateOptionalPositiveInteger(
        road.roadTypeId,
        "tipo de vía terrestre",
      );
      if (typeError) return typeError;
      if (
        !road.roadTypeId &&
        (typeof road.typeLabel !== "string" ||
          road.typeLabel.trim().length === 0)
      ) {
        return "Cada vía terrestre requiere un tipo de vía.";
      }
      const materialError = validateOptionalPositiveInteger(
        road.materialId,
        "material de vía",
      );
      if (materialError) return materialError;
      const conditionError = validateOptionalPositiveInteger(
        road.conditionId,
        "estado de vía",
      );
      if (conditionError) return conditionError;
      const distanceError = validateOptionalNonNegativeNumber(
        road.distanceKm,
        "distancia de vía",
      );
      if (distanceError) return distanceError;
      for (const [key, label, min, max] of [
        ["startLatitude", "latitud inicial", -90, 90],
        ["endLatitude", "latitud final", -90, 90],
        ["startLongitude", "longitud inicial", -180, 180],
        ["endLongitude", "longitud final", -180, 180],
      ] as const) {
        const coordinate = road[key];
        if (
          coordinate !== undefined &&
          coordinate !== null &&
          (typeof coordinate !== "number" ||
            !Number.isFinite(coordinate) ||
            coordinate < min ||
            coordinate > max)
        ) {
          return `La ${label} de la vía no es válida.`;
        }
      }
      const textError = validateAccessibilityTextFields(road, [
        ["typeLabel", 180],
        ["observation", 1_000],
      ]);
      if (textError) return textError;
    }
  }

  if (value.aquatic !== undefined) {
    if (
      !Array.isArray(value.aquatic) ||
      value.aquatic.length > ACCESSIBILITY_DETAILS_MAX_ROWS
    ) {
      return "Los accesos acuáticos no son válidos.";
    }
    for (const access of value.aquatic) {
      if (!isJsonRecord(access)) return "Un acceso acuático no es válido.";
      const modalityError = validateOptionalPositiveInteger(
        access.modalityId,
        "modalidad de acceso acuático",
      );
      if (modalityError) return modalityError;
      if (
        !access.modalityId &&
        (typeof access.modalityLabel !== "string" ||
          access.modalityLabel.trim().length === 0)
      ) {
        return "Cada acceso acuático requiere una modalidad.";
      }
      for (const key of [
        "departureConditionId",
        "arrivalConditionId",
      ] as const) {
        const conditionError = validateOptionalPositiveInteger(
          access[key],
          "estado del puerto o muelle",
        );
        if (conditionError) return conditionError;
      }
      const textError = validateAccessibilityTextFields(access, [
        ["modalityLabel", 120],
        ["departure", 180],
        ["arrival", 180],
        ["observation", 1_000],
      ]);
      if (textError) return textError;
    }
  }

  if (value.aerial !== undefined) {
    if (
      !Array.isArray(value.aerial) ||
      value.aerial.length > ACCESSIBILITY_DETAILS_MAX_ROWS
    ) {
      return "Los accesos aéreos no son válidos.";
    }
    for (const access of value.aerial) {
      if (!isJsonRecord(access)) return "Un acceso aéreo no es válido.";
      const coverageError = validateOptionalPositiveInteger(
        access.coverageId,
        "cobertura de acceso aéreo",
      );
      if (coverageError) return coverageError;
      if (
        !access.coverageId &&
        (typeof access.coverageLabel !== "string" ||
          access.coverageLabel.trim().length === 0)
      ) {
        return "Cada acceso aéreo requiere una cobertura.";
      }
      const textError = validateAccessibilityTextFields(access, [
        ["coverageLabel", 120],
        ["observation", 1_000],
      ]);
      if (textError) return textError;
    }
  }

  if (value.transportTypes !== undefined) {
    if (
      !Array.isArray(value.transportTypes) ||
      value.transportTypes.length > ACCESSIBILITY_DETAILS_MAX_ROWS
    ) {
      return "Los tipos de transporte no son válidos.";
    }
    for (const transport of value.transportTypes) {
      if (!isJsonRecord(transport))
        return "Un tipo de transporte no es válido.";
      const typeError = validateOptionalPositiveInteger(
        transport.typeId,
        "tipo de transporte",
      );
      if (typeError) return typeError;
      if (
        !transport.typeId &&
        (typeof transport.label !== "string" ||
          transport.label.trim().length === 0)
      ) {
        return "Cada tipo de transporte requiere una identificación.";
      }
      if (typeof transport.applies !== "boolean") {
        return "Cada tipo de transporte requiere indicar si aplica.";
      }
      const textError = validateAccessibilityTextFields(transport, [
        ["label", 120],
        ["detailOther", 180],
        ["observation", 1_000],
      ]);
      if (textError) return textError;
    }
  }

  if (value.transportDetails !== undefined) {
    if (
      !Array.isArray(value.transportDetails) ||
      value.transportDetails.length > ACCESSIBILITY_DETAILS_MAX_ROWS
    ) {
      return "Los detalles de transporte no son válidos.";
    }
    for (const detail of value.transportDetails) {
      if (!isJsonRecord(detail))
        return "Un detalle de transporte no es válido.";
      if (
        typeof detail.operator !== "string" ||
        detail.operator.trim().length === 0 ||
        detail.operator.length > 180
      ) {
        return "Cada detalle de transporte requiere un operador de hasta 180 caracteres.";
      }
      const frequencyError = validateOptionalPositiveInteger(
        detail.frequencyId,
        "frecuencia de transporte",
      );
      if (frequencyError) return frequencyError;
      const textError = validateAccessibilityTextFields(detail, [
        ["terminal", 180],
        ["frequencyLabel", 80],
        ["transferDetail", 1_000],
        ["observation", 1_000],
      ]);
      if (textError) return textError;
    }
  }

  if (value.criteria !== undefined) {
    if (!Array.isArray(value.criteria) || value.criteria.length > 300) {
      return "Los criterios de accesibilidad no son válidos.";
    }
    const seenCriteria = new Set<number>();
    for (const criterion of value.criteria) {
      if (!isJsonRecord(criterion))
        return "Un criterio de accesibilidad no es válido.";
      const criterionIdError = validateOptionalPositiveInteger(
        criterion.criterionId,
        "criterio de accesibilidad",
      );
      if (criterionIdError) return criterionIdError;
      if (
        criterion.criterionId !== undefined &&
        criterion.criterionId !== null
      ) {
        const criterionId = Number(criterion.criterionId);
        if (seenCriteria.has(criterionId)) {
          return "No repitas criterios de accesibilidad.";
        }
        seenCriteria.add(criterionId);
      }
      const typeIdError = validateOptionalPositiveInteger(
        criterion.accessibilityTypeId,
        "tipo de accesibilidad",
      );
      if (typeIdError) return typeIdError;
      if (
        !criterion.criterionId &&
        (typeof criterion.label !== "string" ||
          criterion.label.trim().length === 0)
      ) {
        return "Cada criterio de accesibilidad requiere un criterio catalogado o una descripción.";
      }
      if (
        criterion.label !== undefined &&
        criterion.label !== null &&
        (typeof criterion.label !== "string" || criterion.label.length > 300)
      ) {
        return "La descripción del criterio de accesibilidad supera 300 caracteres.";
      }
      if (!isSectionResponse(criterion.response)) {
        return "Cada criterio de accesibilidad requiere una respuesta válida.";
      }
      const textError = validateAccessibilityTextFields(criterion, [
        ["detail", 1_000],
        ["observation", 1_000],
      ]);
      if (textError) return textError;
    }
  }

  if (value.signage !== undefined) {
    if (!isJsonRecord(value.signage)) {
      return "La señalización de aproximación no es válida.";
    }
    if (!isSectionResponse(value.signage.available)) {
      return "La señalización de aproximación requiere una respuesta válida.";
    }
    const conditionError = validateOptionalPositiveInteger(
      value.signage.conditionId,
      "estado de señalización",
    );
    if (conditionError) return conditionError;
    const textError = validateAccessibilityTextFields(value.signage, [
      ["observation", 1_000],
    ]);
    if (textError) return textError;
  }

  return null;
}

function validateOptionalPositiveInteger(
  value: unknown,
  label: string,
): string | null {
  if (
    value !== undefined &&
    value !== null &&
    (!Number.isInteger(value) || Number(value) < 1)
  ) {
    return `El ${label} no es válido.`;
  }
  return null;
}

function validateOptionalNonNegativeNumber(
  value: unknown,
  label: string,
): string | null {
  if (
    value !== undefined &&
    value !== null &&
    (typeof value !== "number" || !Number.isFinite(value) || value < 0)
  ) {
    return `La ${label} debe ser un número mayor o igual que cero.`;
  }
  return null;
}

function validateAccessibilityTextFields(
  value: JsonRecord,
  fields: ReadonlyArray<readonly [string, number]>,
): string | null {
  for (const [key, maxLength] of fields) {
    const field = value[key];
    if (
      field !== undefined &&
      field !== null &&
      (typeof field !== "string" || field.length > maxLength)
    ) {
      return "Los textos del detalle de accesibilidad superan los límites permitidos.";
    }
  }
  return null;
}

function validatePlantBlock(value: unknown): string | null {
  if (!Array.isArray(value) || value.length > 300) {
    return "Los registros de planta turística no son válidos.";
  }
  for (const item of value) {
    if (!isJsonRecord(item))
      return "Un registro de planta turística no es válido.";
    if (!SERVICE_SCOPE_VALUES.has(String(item.scope))) {
      return "El ámbito de la planta turística no es válido.";
    }
    const typeError = validateOptionalPositiveInteger(
      item.typeId,
      "tipo de planta turística",
    );
    if (typeError) return typeError;
    if (
      !item.typeId &&
      (typeof item.typeLabel !== "string" || item.typeLabel.trim().length === 0)
    ) {
      return "Cada registro de planta turística requiere un tipo.";
    }
    for (const key of ["quantity1", "quantity2", "quantity3"] as const) {
      const quantity = item[key];
      if (
        quantity !== undefined &&
        quantity !== null &&
        (!Number.isInteger(quantity) || Number(quantity) < 0)
      ) {
        return "Las cantidades de planta turística deben ser enteros no negativos.";
      }
    }
    const textError = validateAccessibilityTextFields(item, [
      ["typeLabel", 180],
      ["group", 80],
      ["observation", 1_000],
    ]);
    if (textError) return textError;
  }
  return null;
}

function validateFacilityDetailsBlock(value: unknown): string | null {
  if (!Array.isArray(value) || value.length > 300) {
    return "Las facilidades del entorno no son válidas.";
  }
  for (const item of value) {
    if (!isJsonRecord(item)) return "Una facilidad del entorno no es válida.";
    const typeError = validateOptionalPositiveInteger(
      item.typeId,
      "tipo de facilidad",
    );
    if (typeError) return typeError;
    if (
      !item.typeId &&
      (typeof item.typeLabel !== "string" || item.typeLabel.trim().length === 0)
    ) {
      return "Cada facilidad del entorno requiere un tipo.";
    }
    if (item.categoryId !== undefined && item.categoryId !== null) {
      const categoryError = validateOptionalPositiveInteger(
        item.categoryId,
        "categoría de facilidad",
      );
      if (categoryError) return categoryError;
    }
    if (!Number.isInteger(item.quantity) || Number(item.quantity) < 0) {
      return "La cantidad de facilidad debe ser un entero no negativo.";
    }
    for (const [key, label, min, max] of [
      ["latitude", "latitud de facilidad", -90, 90],
      ["longitude", "longitud de facilidad", -180, 180],
    ] as const) {
      const coordinate = item[key];
      if (
        coordinate !== undefined &&
        coordinate !== null &&
        (typeof coordinate !== "number" ||
          !Number.isFinite(coordinate) ||
          coordinate < min ||
          coordinate > max)
      ) {
        return `La ${label} no es válida.`;
      }
    }
    if (
      item.universalAccessibility !== undefined &&
      item.universalAccessibility !== null &&
      !isSectionResponse(item.universalAccessibility)
    ) {
      return "La accesibilidad universal de la facilidad requiere una respuesta válida.";
    }
    const conditionError = validateOptionalPositiveInteger(
      item.conditionId,
      "estado de facilidad",
    );
    if (conditionError) return conditionError;
    const textError = validateAccessibilityTextFields(item, [
      ["typeLabel", 180],
      ["administrator", 180],
      ["detailOther", 180],
      ["observation", 1_000],
    ]);
    if (textError) return textError;
  }
  return null;
}

function validateComplementaryServicesBlock(value: unknown): string | null {
  if (!Array.isArray(value) || value.length > 300) {
    return "Los servicios complementarios no son válidos.";
  }
  for (const item of value) {
    if (!isJsonRecord(item)) return "Un servicio complementario no es válido.";
    if (!SERVICE_SCOPE_VALUES.has(String(item.scope))) {
      return "El ámbito del servicio complementario no es válido.";
    }
    const typeError = validateOptionalPositiveInteger(
      item.typeId,
      "tipo de servicio complementario",
    );
    if (typeError) return typeError;
    if (
      !item.typeId &&
      (typeof item.typeLabel !== "string" || item.typeLabel.trim().length === 0)
    ) {
      return "Cada servicio complementario requiere un tipo.";
    }
    const textError = validateAccessibilityTextFields(item, [
      ["typeLabel", 180],
      ["specification", 250],
      ["observation", 1_000],
    ]);
    if (textError) return textError;
  }
  return null;
}

function validateConservationBlock(value: unknown): string | null {
  if (!isJsonRecord(value)) return "El bloque de conservación no es válido.";
  for (const component of ["attraction", "environment"]) {
    const entry = value[component];
    if (entry === undefined || entry === null) continue;
    if (!isJsonRecord(entry)) {
      return "Cada componente de conservación debe ser un objeto.";
    }
    if (
      entry.state !== undefined &&
      entry.state !== null &&
      !CONSERVATION_STATE_VALUES.has(String(entry.state))
    ) {
      return "El estado de conservación no es válido.";
    }
    if (
      entry.observation !== undefined &&
      entry.observation !== null &&
      (typeof entry.observation !== "string" ||
        entry.observation.length > 2_000)
    ) {
      return "La observación de conservación supera el límite permitido.";
    }
  }
  if (value.factors !== undefined) {
    if (!Array.isArray(value.factors) || value.factors.length > 100) {
      return "Los factores de alteración no son válidos.";
    }
    for (const factor of value.factors) {
      if (!isJsonRecord(factor)) return "Un factor de alteración no es válido.";
      const factorIdError = validateOptionalPositiveInteger(
        factor.factorId,
        "factor de alteración",
      );
      if (factorIdError) return factorIdError;
      if (
        factor.component !== undefined &&
        !CONSERVATION_COMPONENT_VALUES.has(String(factor.component))
      ) {
        return "El componente del factor de alteración no es válido.";
      }
      if (
        !factor.factorId &&
        (typeof factor.name !== "string" || factor.name.trim().length === 0)
      ) {
        return "Cada factor requiere un tipo catalogado o un nombre de hasta 180 caracteres.";
      }
      if (
        factor.name !== undefined &&
        factor.name !== null &&
        (typeof factor.name !== "string" || factor.name.length > 180)
      ) {
        return "El nombre del factor de alteración supera 180 caracteres.";
      }
      if (!CONSERVATION_ORIGIN_VALUES.has(String(factor.origin))) {
        return "El origen del factor de alteración no es válido.";
      }
      if (!isSectionResponse(factor.response)) {
        return "Cada factor de alteración requiere una respuesta válida.";
      }
      if (
        factor.observation !== undefined &&
        factor.observation !== null &&
        (typeof factor.observation !== "string" ||
          factor.observation.length > 1_000)
      ) {
        return "La observación del factor de alteración supera el límite permitido.";
      }
      if (
        factor.detailOther !== undefined &&
        factor.detailOther !== null &&
        (typeof factor.detailOther !== "string" ||
          factor.detailOther.length > 180)
      ) {
        return "El detalle del factor de alteración supera el límite permitido.";
      }
    }
  }
  return null;
}

function validateConservationDeclarations(value: unknown): string | null {
  if (!Array.isArray(value) || value.length > 50) {
    return "Las declaratorias turísticas no son válidas.";
  }
  for (const declaration of value) {
    if (!isJsonRecord(declaration)) return "Una declaratoria no es válida.";
    if (
      typeof declaration.entity !== "string" ||
      declaration.entity.trim().length === 0 ||
      declaration.entity.length > 180
    ) {
      return "Cada declaratoria requiere una entidad de hasta 180 caracteres.";
    }
    if (
      typeof declaration.denomination !== "string" ||
      declaration.denomination.trim().length === 0 ||
      declaration.denomination.length > 250
    ) {
      return "Cada declaratoria requiere una denominación de hasta 250 caracteres.";
    }
    if (
      declaration.date !== undefined &&
      declaration.date !== null &&
      (typeof declaration.date !== "string" ||
        !/^\d{4}-\d{2}-\d{2}$/.test(declaration.date) ||
        Number.isNaN(Date.parse(`${declaration.date}T00:00:00Z`)))
    ) {
      return "La fecha de declaratoria no es válida.";
    }
    if (
      declaration.scope !== undefined &&
      declaration.scope !== null &&
      (typeof declaration.scope !== "string" || declaration.scope.length > 120)
    ) {
      return "El ámbito de la declaratoria supera el límite permitido.";
    }
    if (
      declaration.observation !== undefined &&
      declaration.observation !== null &&
      (typeof declaration.observation !== "string" ||
        declaration.observation.length > 1_000)
    ) {
      return "La observación de la declaratoria supera el límite permitido.";
    }
  }
  return null;
}

function isConservationBlockComplete(value: unknown): boolean {
  if (!isJsonRecord(value)) return false;
  for (const component of ["attraction", "environment"]) {
    const entry = value[component];
    if (
      !isJsonRecord(entry) ||
      typeof entry.state !== "string" ||
      !CONSERVATION_STATE_VALUES.has(entry.state)
    ) {
      return false;
    }
  }
  return true;
}

function validateHygieneSafetyBlock(value: unknown): string | null {
  if (!isJsonRecord(value))
    return "El bloque de higiene y seguridad no es válido.";
  if (value.entries !== undefined) {
    if (!Array.isArray(value.entries) || value.entries.length > 300) {
      return "Los registros de higiene y seguridad no son válidos.";
    }
    for (const entry of value.entries) {
      if (!isJsonRecord(entry))
        return "Un registro de higiene y seguridad no es válido.";
      if (!HYGIENE_ENTRY_KINDS.has(String(entry.kind))) {
        return "El tipo de registro de higiene y seguridad no es válido.";
      }
      const typeIdError = validateOptionalPositiveInteger(
        entry.typeId,
        "tipo de higiene y seguridad",
      );
      if (typeIdError) return typeIdError;
      const secondaryIdError = validateOptionalPositiveInteger(
        entry.secondaryId,
        "material de señalética",
      );
      if (secondaryIdError) return secondaryIdError;
      if (
        !entry.typeId &&
        (typeof entry.name !== "string" || entry.name.trim().length === 0)
      ) {
        return "Cada registro requiere un tipo catalogado o un nombre de hasta 180 caracteres.";
      }
      if (
        entry.name !== undefined &&
        entry.name !== null &&
        (typeof entry.name !== "string" || entry.name.length > 180)
      ) {
        return "El nombre del registro de higiene y seguridad supera 180 caracteres.";
      }
      if (
        entry.scope !== undefined &&
        entry.scope !== null &&
        !SERVICE_SCOPE_VALUES.has(String(entry.scope))
      ) {
        return "El ámbito del registro de higiene y seguridad no es válido.";
      }
      if (!isSectionResponse(entry.response)) {
        return "Cada registro de higiene y seguridad requiere una respuesta válida.";
      }
      if (
        entry.quantity !== undefined &&
        entry.quantity !== null &&
        (!Number.isInteger(entry.quantity) || Number(entry.quantity) < 0)
      ) {
        return "Las cantidades de higiene y seguridad deben ser enteros no negativos.";
      }
      if (
        entry.secondary !== undefined &&
        entry.secondary !== null &&
        (typeof entry.secondary !== "string" || entry.secondary.length > 250)
      ) {
        return "El detalle secundario de higiene y seguridad supera el límite permitido.";
      }
      if (
        entry.provider !== undefined &&
        entry.provider !== null &&
        (typeof entry.provider !== "string" || entry.provider.length > 180)
      ) {
        return "El proveedor de higiene y seguridad supera 180 caracteres.";
      }
      if (
        entry.condition !== undefined &&
        entry.condition !== null &&
        !SIGNAGE_CONDITION_VALUES.has(String(entry.condition))
      ) {
        return "El estado de la señalética no es válido.";
      }
      if (
        entry.observation !== undefined &&
        entry.observation !== null &&
        (typeof entry.observation !== "string" ||
          entry.observation.length > 1_000)
      ) {
        return "La observación de higiene y seguridad supera el límite permitido.";
      }
    }
  }
  if (value.radios !== undefined) {
    if (!isJsonRecord(value.radios)) return "El bloque de radios no es válido.";
    for (const key of [
      "available",
      "visitorUse",
      "internalUse",
      "emergencyUse",
    ]) {
      if (!isSectionResponse(value.radios[key])) {
        return "Cada uso de radios requiere una respuesta válida.";
      }
    }
    if (
      value.radios.quantity !== undefined &&
      value.radios.quantity !== null &&
      (!Number.isInteger(value.radios.quantity) ||
        Number(value.radios.quantity) < 0)
    ) {
      return "La cantidad de radios debe ser un entero no negativo.";
    }
    if (
      value.radios.observation !== undefined &&
      value.radios.observation !== null &&
      (typeof value.radios.observation !== "string" ||
        value.radios.observation.length > 1_000)
    ) {
      return "La observación de radios supera el límite permitido.";
    }
  }
  if (value.contingency !== undefined) {
    if (!isJsonRecord(value.contingency)) {
      return "El bloque de contingencia no es válido.";
    }
    if (!isSectionResponse(value.contingency.exists)) {
      return "La existencia del plan de contingencia requiere una respuesta válida.";
    }
    for (const key of ["institution", "document", "observation"]) {
      const field = value.contingency[key];
      if (
        field !== undefined &&
        field !== null &&
        (typeof field !== "string" ||
          field.length > (key === "document" ? 250 : 1_000))
      ) {
        return "Los datos del plan de contingencia superan los límites permitidos.";
      }
    }
    if (
      value.contingency.year !== undefined &&
      value.contingency.year !== null &&
      (!Number.isInteger(value.contingency.year) ||
        Number(value.contingency.year) < 1900 ||
        Number(value.contingency.year) > 2200)
    ) {
      return "El año del plan de contingencia no es válido.";
    }
  }
  return null;
}

function validatePolicyBlock(value: unknown): string | null {
  if (!Array.isArray(value) || value.length > 4) {
    return "Las respuestas de políticas no son válidas.";
  }
  const seen = new Set<string>();
  for (const policy of value) {
    if (!isJsonRecord(policy))
      return "Una respuesta de políticas no es válida.";
    if (
      typeof policy.code !== "string" ||
      !POLICY_CODES.has(policy.code) ||
      seen.has(policy.code)
    ) {
      return "El código de política no es válido o está repetido.";
    }
    seen.add(policy.code);
    if (!isSectionResponse(policy.response)) {
      return "Cada política requiere una respuesta válida.";
    }
    if (
      policy.question !== undefined &&
      policy.question !== null &&
      (typeof policy.question !== "string" || policy.question.length > 250)
    ) {
      return "La pregunta de política supera el límite permitido.";
    }
    if (
      policy.year !== undefined &&
      policy.year !== null &&
      (!Number.isInteger(policy.year) ||
        Number(policy.year) < 1900 ||
        Number(policy.year) > 2200)
    ) {
      return "El año de política no es válido.";
    }
    for (const key of ["specification", "observation"]) {
      const field = policy[key];
      if (
        field !== undefined &&
        field !== null &&
        (typeof field !== "string" || field.length > 1_000)
      ) {
        return "Los detalles de política superan los límites permitidos.";
      }
    }
  }
  return null;
}

function validatePromotionBlock(value: unknown): string | null {
  if (!isJsonRecord(value)) return "El bloque de promoción no es válido.";
  for (const key of ["hasPlan", "includedInPlan", "partOfPackage"]) {
    if (!isSectionResponse(value[key])) {
      return "Cada decisión de promoción requiere una respuesta válida.";
    }
  }
  for (const key of ["planName", "packageDetail", "observation"]) {
    const field = value[key];
    if (
      field !== undefined &&
      field !== null &&
      (typeof field !== "string" ||
        field.length > (key === "planName" ? 250 : 1_000))
    ) {
      return "Los detalles de promoción superan los límites permitidos.";
    }
  }
  if (value.media !== undefined) {
    if (!Array.isArray(value.media) || value.media.length > 100) {
      return "Los medios de promoción no son válidos.";
    }
    for (const medium of value.media) {
      if (!isJsonRecord(medium)) return "Un medio de promoción no es válido.";
      const typeIdError = validateOptionalPositiveInteger(
        medium.typeId,
        "tipo de medio de promoción",
      );
      if (typeIdError) return typeIdError;
      if (!PROMOTION_MEDIA_RESPONSE_VALUES.has(String(medium.response))) {
        return "Cada medio de promoción requiere una respuesta válida.";
      }
      for (const key of ["name", "periodicity", "detailOther", "observation"]) {
        const field = medium[key];
        if (
          field !== undefined &&
          field !== null &&
          (typeof field !== "string" ||
            field.length > (key === "observation" ? 1_000 : 180))
        ) {
          return "Los datos del medio de promoción superan los límites permitidos.";
        }
      }
      if (
        medium.url !== undefined &&
        medium.url !== null &&
        (typeof medium.url !== "string" || medium.url.length > 500)
      ) {
        return "La URL del medio de promoción supera el límite permitido.";
      }
      if (typeof medium.url === "string" && medium.url.trim()) {
        try {
          const url = new URL(medium.url);
          if (!["http:", "https:"].includes(url.protocol)) {
            return "La URL del medio de promoción debe usar HTTP o HTTPS.";
          }
        } catch {
          return "La URL del medio de promoción no es válida.";
        }
      }
    }
  }
  return null;
}

function validateVisitorsBlock(value: unknown): string | null {
  if (!isJsonRecord(value)) return "El bloque de visitantes no es válido.";
  if (value.registry !== undefined) {
    if (!isJsonRecord(value.registry))
      return "El registro de visitantes no es válido.";
    for (const key of ["exists", "reports"]) {
      if (!isSectionResponse(value.registry[key])) {
        return "Cada decisión del registro de visitantes requiere una respuesta válida.";
      }
    }
    if (
      value.registry.type !== undefined &&
      value.registry.type !== null &&
      !VISITOR_REGISTRY_TYPES.has(String(value.registry.type))
    ) {
      return "El tipo de registro de visitantes no es válido.";
    }
    if (
      value.registry.years !== undefined &&
      value.registry.years !== null &&
      (!Number.isInteger(value.registry.years) ||
        Number(value.registry.years) < 0 ||
        Number(value.registry.years) > 200)
    ) {
      return "Los años del registro de visitantes no son válidos.";
    }
    if (
      value.registry.frequency !== undefined &&
      value.registry.frequency !== null &&
      (typeof value.registry.frequency !== "string" ||
        value.registry.frequency.length > 80)
    ) {
      return "La frecuencia de reportes supera el límite permitido.";
    }
    if (
      value.registry.observation !== undefined &&
      value.registry.observation !== null &&
      (typeof value.registry.observation !== "string" ||
        value.registry.observation.length > 1_000)
    ) {
      return "La observación del registro de visitantes supera el límite permitido.";
    }
  }
  if (value.seasons !== undefined) {
    if (!Array.isArray(value.seasons) || value.seasons.length > 24) {
      return "Las temporadas de visitación no son válidas.";
    }
    for (const season of value.seasons) {
      if (
        !isJsonRecord(season) ||
        !VISITOR_SEASON_TYPES.has(String(season.type))
      ) {
        return "El tipo de temporada no es válido.";
      }
      if (
        season.quantity !== undefined &&
        season.quantity !== null &&
        (!Number.isInteger(season.quantity) || Number(season.quantity) < 0)
      ) {
        return "La cantidad de visitantes por temporada no es válida.";
      }
      const yearError = validateOptionalYear(season.year, "temporada");
      if (yearError) return yearError;
      const monthsError = validateMonths(season.months);
      if (monthsError) return monthsError;
      if (
        season.observation !== undefined &&
        season.observation !== null &&
        (typeof season.observation !== "string" ||
          season.observation.length > 1_000)
      ) {
        return "La observación de temporada supera el límite permitido.";
      }
    }
  }
  if (value.origins !== undefined) {
    if (!Array.isArray(value.origins) || value.origins.length > 200) {
      return "Las procedencias de visitantes no son válidas.";
    }
    for (const origin of value.origins) {
      if (
        !isJsonRecord(origin) ||
        !VISITOR_ORIGIN_TYPES.has(String(origin.type))
      ) {
        return "El tipo de procedencia no es válido.";
      }
      if (
        typeof origin.place !== "string" ||
        origin.place.trim().length === 0 ||
        origin.place.length > 150
      ) {
        return "Cada procedencia requiere un lugar de hasta 150 caracteres.";
      }
      if (
        origin.month !== undefined &&
        origin.month !== null &&
        (!Number.isInteger(origin.month) ||
          Number(origin.month) < 1 ||
          Number(origin.month) > 12)
      ) {
        return "El mes de procedencia no es válido.";
      }
      const yearError = validateOptionalYear(origin.year, "procedencia");
      if (yearError) return yearError;
      if (
        origin.quantity !== undefined &&
        origin.quantity !== null &&
        (!Number.isInteger(origin.quantity) || Number(origin.quantity) < 0)
      ) {
        return "La cantidad de visitantes por procedencia no es válida.";
      }
      if (
        origin.observation !== undefined &&
        origin.observation !== null &&
        (typeof origin.observation !== "string" ||
          origin.observation.length > 1_000)
      ) {
        return "La observación de procedencia supera el límite permitido.";
      }
    }
  }
  if (value.informants !== undefined) {
    if (!Array.isArray(value.informants) || value.informants.length > 100) {
      return "Los informantes clave no son válidos.";
    }
    for (const informant of value.informants) {
      if (
        !isJsonRecord(informant) ||
        typeof informant.name !== "string" ||
        informant.name.trim().length === 0 ||
        informant.name.length > 180
      ) {
        return "Cada informante requiere un nombre de hasta 180 caracteres.";
      }
      for (const key of ["contact", "observation"]) {
        const field = informant[key];
        if (
          field !== undefined &&
          field !== null &&
          (typeof field !== "string" ||
            field.length > (key === "contact" ? 120 : 1_000))
        ) {
          return "Los datos del informante superan los límites permitidos.";
        }
      }
    }
  }
  if (value.influx !== undefined) {
    if (!isJsonRecord(value.influx))
      return "La afluencia de visitantes no es válida.";
    for (const key of ["weekday", "weekend", "holidays"]) {
      const quantity = value.influx[key];
      if (
        quantity !== undefined &&
        quantity !== null &&
        (!Number.isInteger(quantity) || Number(quantity) < 0)
      ) {
        return "Las cantidades de afluencia deben ser enteros no negativos.";
      }
    }
    if (
      value.influx.frequency !== undefined &&
      value.influx.frequency !== null &&
      !VISITOR_FREQUENCIES.has(String(value.influx.frequency))
    ) {
      return "La frecuencia de demanda no es válida.";
    }
    if (
      value.influx.observation !== undefined &&
      value.influx.observation !== null &&
      (typeof value.influx.observation !== "string" ||
        value.influx.observation.length > 1_000)
    ) {
      return "La observación de afluencia supera el límite permitido.";
    }
  }
  return null;
}

function validateOptionalYear(value: unknown, label: string): string | null {
  if (
    value !== undefined &&
    value !== null &&
    (!Number.isInteger(value) || Number(value) < 1900 || Number(value) > 2200)
  ) {
    return `El año de ${label} no es válido.`;
  }
  return null;
}

function validateMonths(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  if (!Array.isArray(value) || value.length > 12) {
    return "Los meses de temporada no son válidos.";
  }
  const seen = new Set<number>();
  for (const month of value) {
    if (!Number.isInteger(month) || Number(month) < 1 || Number(month) > 12) {
      return "Cada mes de temporada debe estar entre 1 y 12.";
    }
    if (seen.has(Number(month)))
      return "Los meses de temporada no pueden repetirse.";
    seen.add(Number(month));
  }
  return null;
}

function validateHumanResourcesBlock(value: unknown): string | null {
  if (!isJsonRecord(value)) return "El bloque de recurso humano no es válido.";
  if (value.summary !== undefined) {
    if (!isJsonRecord(value.summary))
      return "El resumen de recurso humano no es válido.";
    for (const key of ["administrationOperation", "specializedTourism"]) {
      const quantity = value.summary[key];
      if (
        quantity !== undefined &&
        quantity !== null &&
        (!Number.isInteger(quantity) || Number(quantity) < 0)
      ) {
        return "Las cantidades de recurso humano deben ser enteros no negativos.";
      }
    }
    if (
      value.summary.observation !== undefined &&
      value.summary.observation !== null &&
      (typeof value.summary.observation !== "string" ||
        value.summary.observation.length > 1_000)
    ) {
      return "La observación de recurso humano supera el límite permitido.";
    }
  }
  if (value.training !== undefined) {
    if (!Array.isArray(value.training) || value.training.length > 100) {
      return "La formación del personal no es válida.";
    }
    for (const training of value.training) {
      if (!isJsonRecord(training))
        return "Un registro de formación no es válido.";
      if (!TRAINING_GROUPS.has(String(training.group))) {
        return "El grupo de formación no es válido.";
      }
      const typeIdError = validateOptionalPositiveInteger(
        training.typeId,
        "tipo de formación",
      );
      if (typeIdError) return typeIdError;
      if (
        !training.typeId &&
        (typeof training.name !== "string" || training.name.trim().length === 0)
      ) {
        return "Cada formación requiere un tipo catalogado o un nombre de hasta 140 caracteres.";
      }
      if (
        training.name !== undefined &&
        training.name !== null &&
        (typeof training.name !== "string" || training.name.length > 140)
      ) {
        return "El nombre de la formación supera 140 caracteres.";
      }
      if (
        training.quantity !== undefined &&
        training.quantity !== null &&
        (!Number.isInteger(training.quantity) || Number(training.quantity) < 0)
      ) {
        return "La cantidad de personas formadas debe ser un entero no negativo.";
      }
      if (
        training.detailOther !== undefined &&
        training.detailOther !== null &&
        (typeof training.detailOther !== "string" ||
          training.detailOther.length > 180)
      ) {
        return "El detalle de otra formación supera el límite permitido.";
      }
      if (
        training.observation !== undefined &&
        training.observation !== null &&
        (typeof training.observation !== "string" ||
          training.observation.length > 1_000)
      ) {
        return "La observación de formación supera el límite permitido.";
      }
    }
  }
  return null;
}

function validateAnnexesBlock(value: unknown): string | null {
  if (!isJsonRecord(value)) return "El bloque de anexos no es válido.";
  if (value.documents !== undefined) {
    if (!Array.isArray(value.documents) || value.documents.length > 100) {
      return "Los anexos documentales no son válidos.";
    }
    for (const document of value.documents) {
      if (!isJsonRecord(document)) return "Un anexo documental no es válido.";
      const fileIdError = validateOptionalPositiveInteger(
        document.fileId,
        "archivo de anexo",
      );
      if (fileIdError) return fileIdError;
      for (const key of ["type", "source", "author", "description"]) {
        const field = document[key];
        if (
          field !== undefined &&
          field !== null &&
          (typeof field !== "string" ||
            field.length > (key === "description" ? 1_000 : 180))
        ) {
          return "Los datos del anexo superan los límites permitidos.";
        }
      }
      if (!ANNEX_VISIBILITIES.has(String(document.visibility))) {
        return "La visibilidad del anexo no es válida.";
      }
      if (
        document.observation !== undefined &&
        document.observation !== null &&
        (typeof document.observation !== "string" ||
          document.observation.length > 1_000)
      ) {
        return "La observación del anexo supera el límite permitido.";
      }
    }
  }
  if (value.responsibles !== undefined) {
    if (!Array.isArray(value.responsibles) || value.responsibles.length > 50) {
      return "Los responsables de la ficha no son válidos.";
    }
    for (const responsible of value.responsibles) {
      if (!isJsonRecord(responsible)) {
        return "Cada responsable requiere un nombre de hasta 180 caracteres.";
      }
      const typeIdError = validateOptionalPositiveInteger(
        responsible.typeId,
        "tipo de responsabilidad",
      );
      if (typeIdError) return typeIdError;
      if (
        typeof responsible.name !== "string" ||
        responsible.name.trim().length === 0 ||
        responsible.name.length > 180
      ) {
        return "Cada responsable requiere un nombre de hasta 180 caracteres.";
      }
      for (const key of [
        "role",
        "institution",
        "phone",
        "email",
        "observation",
      ]) {
        const field = responsible[key];
        const maxLength =
          key === "observation" ? 1_000 : key === "email" ? 254 : 180;
        if (
          field !== undefined &&
          field !== null &&
          (typeof field !== "string" || field.length > maxLength)
        ) {
          return "Los datos del responsable superan los límites permitidos.";
        }
        if (key === "email" && typeof field === "string" && field.trim()) {
          if (!isReasonableEmail(field))
            return "El correo del responsable no es válido.";
        }
      }
    }
  }
  if (value.accessibilitySurvey !== undefined) {
    const surveyError = validateSurveyBlock(value.accessibilitySurvey);
    if (surveyError) return surveyError;
  }
  if (value.gadValidation !== undefined) {
    const gadError = validateGadValidationBlock(value.gadValidation);
    if (gadError) return gadError;
  }
  return null;
}

function validateSurveyBlock(value: unknown): string | null {
  if (!isJsonRecord(value))
    return "El levantamiento de accesibilidad no es válido.";
  for (const key of ["responsible", "scope", "observation"]) {
    const field = value[key];
    if (
      field !== undefined &&
      field !== null &&
      (typeof field !== "string" ||
        field.length > (key === "observation" ? 1_000 : 250))
    ) {
      return "Los datos del levantamiento de accesibilidad superan los límites permitidos.";
    }
  }
  if (
    value.date !== undefined &&
    value.date !== null &&
    !isIsoDate(value.date)
  ) {
    return "La fecha del levantamiento de accesibilidad no es válida.";
  }
  return null;
}

function validateGadValidationBlock(value: unknown): string | null {
  if (!isJsonRecord(value)) return "La validación del GAD no es válida.";
  if (!isSectionResponse(value.acceptance)) {
    return "La aceptación de publicación del GAD requiere una respuesta válida.";
  }
  for (const key of [
    "name",
    "institution",
    "position",
    "phone",
    "email",
    "observation",
  ]) {
    const field = value[key];
    const maxLength =
      key === "observation" ? 1_000 : key === "email" ? 254 : 180;
    if (
      field !== undefined &&
      field !== null &&
      (typeof field !== "string" || field.length > maxLength)
    ) {
      return "Los datos de validación del GAD superan los límites permitidos.";
    }
    if (key === "email" && typeof field === "string" && field.trim()) {
      if (!isReasonableEmail(field))
        return "El correo del validador no es válido.";
    }
  }
  if (
    value.date !== undefined &&
    value.date !== null &&
    !isIsoDate(value.date)
  ) {
    return "La fecha de validación del GAD no es válida.";
  }
  return null;
}

function isIsoDate(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !Number.isNaN(Date.parse(`${value}T00:00:00Z`))
  );
}

function isReasonableEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function buildAdminSectionProgress(
  draft?: CenterDraft,
): AdminCenterSectionProgress[] {
  const sections = draft?.sections ?? {};
  const core = getCoreSectionCompletion(draft);
  return ADMIN_CENTER_SECTION_CODES.map((code) => ({
    code,
    status: getAdminSectionProgress(sections[code], core[code] ?? false),
  }));
}

function getCoreSectionCompletion(
  draft?: CenterDraft,
): Partial<Record<AdminCenterSectionCode, boolean>> {
  if (!draft) return {};
  return {
    identificacion: Boolean(
      draft.name &&
      draft.subtypeId &&
      draft.touristZoneId &&
      draft.parishId &&
      draft.productLineId &&
      draft.scenarioId,
    ),
    "ubicacion-admin":
      Number.isFinite(draft.latitude) && Number.isFinite(draft.longitude),
    caracteristicas: Boolean(draft.productLineId && draft.scenarioId),
    accesibilidad: Array.isArray(draft.accessibility),
    planta: Array.isArray(draft.facilities),
    actividades: Array.isArray(draft.activities),
    descripcion: Boolean(draft.description?.trim()),
  };
}

@Injectable()
export class AdminCentersService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    @Optional() @Inject(MediaService) private readonly media?: MediaService,
  ) {}

  async list(query: AdminCentersQueryDto) {
    const values: unknown[] = [];
    const conditions: string[] = ["TRUE"];
    if (query.status) {
      values.push(query.status);
      conditions.push(`inventory.status_code = $${values.length}`);
    }
    if (query.q) {
      values.push(`%${query.q}%`);
      conditions.push(
        `(inventory.name ILIKE $${values.length} OR inventory.code ILIKE $${values.length})`,
      );
    }
    const limitIndex = values.push(query.limit);
    const offsetIndex = values.push(query.offset);
    const rows = (await this.dataSource.query(
      `WITH inventory AS (
         SELECT TRIM(c.codigo_atractivo) AS code,
                c.nombre AS name,
                CASE
                  WHEN c.activo = FALSE THEN 'INACTIVO'
                  WHEN bd.state_code IS NOT NULL AND bd.state_code <> 'PUBLICADO' THEN bd.state_code
                  ELSE er.codigo
                END AS status_code,
                CASE
                  WHEN c.activo = FALSE THEN 'Inactivo'
                  WHEN bd.state_name IS NOT NULL AND bd.state_code <> 'PUBLICADO' THEN bd.state_name
                  ELSE er.nombre
                END AS status_name,
                er.codigo AS base_status_code,
                c.updated_at AS "updatedAt",
                rp.fecha_solicitud AS "submittedAt",
                u.nombre AS "requestedBy",
                COALESCE(rp.observacion, bd.observation) AS observation,
                c.activo AS active,
                (bd.id IS NOT NULL AND bd.state_code <> 'PUBLICADO') AS "hasDraft",
                COUNT(*) OVER() AS total
           FROM centros_turisticos c
           JOIN estados_resenia er ON er.id = c.estado_resenia_id
           LEFT JOIN LATERAL (
             SELECT b.id, eb.codigo AS state_code, eb.nombre AS state_name,
                    rp0.observacion AS observation
               FROM borradores_centros_turisticos b
               JOIN estados_resenia eb ON eb.id = b.estado_resenia_id
               LEFT JOIN LATERAL (
                 SELECT r.observacion
                   FROM revisiones_publicacion r
                  WHERE r.centro_turistico_id = c.id
                  ORDER BY r.fecha_solicitud DESC
                  LIMIT 1
               ) rp0 ON TRUE
              WHERE b.centro_turistico_id = c.id
              LIMIT 1
           ) bd ON TRUE
           LEFT JOIN LATERAL (
             SELECT r.fecha_solicitud, r.observacion, r.solicitado_por
               FROM revisiones_publicacion r
              WHERE r.centro_turistico_id = c.id
              ORDER BY r.fecha_solicitud DESC
              LIMIT 1
           ) rp ON TRUE
           LEFT JOIN usuarios u ON u.id = rp.solicitado_por
       )
       SELECT code, name, status_code AS "statusCode", status_name AS "statusName",
              base_status_code AS "baseStatusCode", "updatedAt", "submittedAt",
              "requestedBy", observation, active, "hasDraft", total
         FROM inventory
        WHERE ${conditions.join(" AND ")}
        ORDER BY "updatedAt" DESC, code ASC
        LIMIT $${limitIndex} OFFSET $${offsetIndex}`,
      values,
    )) as CenterListRow[];

    return {
      items: rows.map((row) => ({
        code: row.code,
        name: row.name,
        status: { code: row.statusCode, name: row.statusName },
        baseStatus: row.baseStatusCode,
        updatedAt: row.updatedAt,
        submittedAt: row.submittedAt,
        requestedBy: row.requestedBy,
        observation: row.observation,
        active: row.active,
        hasDraft: row.hasDraft,
      })),
      total: Number(rows[0]?.total ?? 0),
      limit: Number(query.limit),
      offset: Number(query.offset),
    };
  }

  async summary() {
    const rows = (await this.dataSource.query(
      `WITH inventory AS (
         SELECT CASE
                  WHEN c.activo = FALSE THEN 'INACTIVO'
                  WHEN bstate.codigo IS NOT NULL AND bstate.codigo <> 'PUBLICADO' THEN bstate.codigo
                  ELSE er.codigo
                END AS code,
                CASE
                  WHEN c.activo = FALSE THEN 'Inactivo'
                  WHEN bstate.nombre IS NOT NULL AND bstate.codigo <> 'PUBLICADO' THEN bstate.nombre
                  ELSE er.nombre
                END AS name,
                c.activo AS active
           FROM centros_turisticos c
           JOIN estados_resenia er ON er.id = c.estado_resenia_id
           LEFT JOIN borradores_centros_turisticos b ON b.centro_turistico_id = c.id
           LEFT JOIN estados_resenia bstate ON bstate.id = b.estado_resenia_id
       )
       SELECT code, name, COUNT(*)::int AS total,
              COUNT(*) FILTER (WHERE active = TRUE)::int AS active
         FROM inventory
        GROUP BY code, name
        ORDER BY code`,
    )) as { code: string; name: string; total: number; active: number }[];

    const byStatus = rows.map((row) => ({
      code: row.code,
      name: row.name,
      total: Number(row.total),
      active: Number(row.active),
    }));
    const total = byStatus.reduce((sum, row) => sum + row.total, 0);
    const active = byStatus.reduce((sum, row) => sum + row.active, 0);
    const count = (code: string) =>
      byStatus.find((row) => row.code === code)?.total ?? 0;

    return {
      total,
      active,
      pendingReview: count("EN_REVISION"),
      published: count("PUBLICADO"),
      inactive: Math.max(total - active, 0),
      byStatus,
    };
  }

  async catalogs(query: AdminCatalogsQueryDto = {}) {
    const search = query.q?.trim() || null;
    const like = search ? `%${search}%` : null;
    const activeCondition = query.includeInactive ? "TRUE" : "activo = TRUE";
    const [
      categories,
      types,
      subtypes,
      provinces,
      cantons,
      parishes,
      localities,
      zones,
      lines,
      scenarios,
      hierarchies,
      climates,
      incomeTypes,
      attentionModes,
      accessibilityTypes,
      accessibilityCriteria,
      conditionStates,
      roadTypes,
      roadMaterials,
      aquaticAccessModes,
      aerialAccessCoverages,
      transportTypes,
      serviceFrequencies,
      serviceScopes,
      conservationStates,
      conservationFactors,
      basicServiceCategories,
      basicServiceTypes,
      signageTypes,
      signageMaterials,
      healthServiceTypes,
      securityServiceTypes,
      communicationTypes,
      threatTypes,
      policyQuestions,
      promotionMediaTypes,
      trainingTypes,
      responsibilityTypes,
      months,
      plantTypes,
      complementaryServiceTypes,
      activityGroups,
      activities,
      facilityCategories,
      facilities,
    ] = await Promise.all([
      this.dataSource.query(
        `SELECT id, codigo AS code, nombre AS name FROM categorias_atractivo WHERE activo AND ($1::text IS NULL OR nombre ILIKE $1) ORDER BY nombre`,
        [like],
      ),
      this.dataSource.query(
        `SELECT id, codigo AS code, nombre AS name, categoria_id AS "categoryId" FROM tipos_atractivo WHERE activo AND ($1::text IS NULL OR nombre ILIKE $1) ORDER BY nombre`,
        [like],
      ),
      this.dataSource.query(
        `SELECT id, codigo AS code, nombre AS name, tipo_atractivo_id AS "typeId" FROM subtipos_atractivo WHERE activo AND ($1::text IS NULL OR nombre ILIKE $1) ORDER BY nombre`,
        [like],
      ),
      this.dataSource.query(
        `SELECT id, codigo_dpa AS code, nombre AS name FROM provincias WHERE activo AND ($1::text IS NULL OR nombre ILIKE $1) ORDER BY nombre`,
        [like],
      ),
      this.dataSource.query(
        `SELECT id, codigo_cton AS code, nombre AS name, provincia_id AS "provinceId" FROM cantones WHERE activo AND ($1::text IS NULL OR nombre ILIKE $1) ORDER BY nombre`,
        [like],
      ),
      this.dataSource.query(
        `SELECT id, codigo_pqa AS code, nombre AS name, canton_id AS "cantonId" FROM parroquias WHERE activo AND ($1::text IS NULL OR nombre ILIKE $1) ORDER BY nombre`,
        [like],
      ),
      this.dataSource.query(
        `SELECT l.id, l.nombre AS name, l.tipo_localidad AS "localityType",
                l.canton_id AS "cantonId", co.provincia_id AS "provinceId"
           FROM localidades l
           JOIN cantones co ON co.id = l.canton_id
          WHERE l.activo AND ($1::text IS NULL OR l.nombre ILIKE $1)
          ORDER BY l.nombre`,
        [like],
      ),
      this.dataSource.query(
        `SELECT id, nombre AS name, localidad_id AS "localityId" FROM zonas_turisticas WHERE activo AND ($1::text IS NULL OR nombre ILIKE $1) ORDER BY nombre`,
        [like],
      ),
      this.dataSource.query(
        `SELECT id, codigo AS code, nombre AS name FROM lineas_producto WHERE activo AND ($1::text IS NULL OR nombre ILIKE $1) ORDER BY nombre`,
        [like],
      ),
      this.dataSource.query(
        `SELECT id, codigo AS code, nombre AS name FROM escenarios WHERE activo AND ($1::text IS NULL OR nombre ILIKE $1) ORDER BY nombre`,
        [like],
      ),
      this.dataSource.query(
        `SELECT id, codigo AS code, nombre AS name FROM rangos_jerarquia WHERE activo ORDER BY codigo`,
      ),
      this.dataSource.query(
        `SELECT id, codigo, nombre FROM catalogo_clima WHERE activo AND ($1::text IS NULL OR nombre ILIKE $1) ORDER BY nombre`,
        [like],
      ),
      this.dataSource.query(
        `SELECT id, codigo, nombre FROM tipos_ingreso WHERE activo ORDER BY nombre`,
      ),
      this.dataSource.query(
        `SELECT id, codigo, nombre FROM modalidades_atencion WHERE activo ORDER BY nombre`,
      ),
      this.dataSource.query(
        `SELECT id, codigo AS code, nombre AS name, activo AS active FROM tipos_accesibilidad WHERE ${activeCondition} AND ($1::text IS NULL OR nombre ILIKE $1) ORDER BY nombre`,
        [like],
      ),
      this.dataSource.query(
        `SELECT id, codigo AS code, descripcion AS name, activo AS active,
                tipo_accesibilidad_id AS "typeId"
           FROM criterios_accesibilidad
          WHERE ${activeCondition} AND ($1::text IS NULL OR descripcion ILIKE $1)
          ORDER BY tipo_accesibilidad_id, orden, descripcion`,
        [like],
      ),
      this.dataSource.query(
        `SELECT id, codigo AS code, nombre AS name, activo AS active
           FROM estados_condicion
          WHERE ${activeCondition} AND ($1::text IS NULL OR nombre ILIKE $1)
          ORDER BY nombre`,
        [like],
      ),
      this.dataSource.query(
        `SELECT id, codigo AS code, nombre AS name, activo AS active
           FROM tipos_via_terrestre
          WHERE ${activeCondition} AND ($1::text IS NULL OR nombre ILIKE $1)
          ORDER BY nombre`,
        [like],
      ),
      this.dataSource.query(
        `SELECT id, codigo AS code, nombre AS name, activo AS active
           FROM materiales_via
          WHERE ${activeCondition} AND ($1::text IS NULL OR nombre ILIKE $1)
          ORDER BY nombre`,
        [like],
      ),
      this.dataSource.query(
        `SELECT id, codigo AS code, nombre AS name, activo AS active
           FROM modalidades_acceso_acuatico
          WHERE ${activeCondition} AND ($1::text IS NULL OR nombre ILIKE $1)
          ORDER BY nombre`,
        [like],
      ),
      this.dataSource.query(
        `SELECT id, codigo AS code, nombre AS name, activo AS active
           FROM coberturas_acceso_aereo
          WHERE ${activeCondition} AND ($1::text IS NULL OR nombre ILIKE $1)
          ORDER BY nombre`,
        [like],
      ),
      this.dataSource.query(
        `SELECT id, codigo AS code, nombre AS name, activo AS active
           FROM tipos_transporte
          WHERE ${activeCondition} AND ($1::text IS NULL OR nombre ILIKE $1)
          ORDER BY nombre`,
        [like],
      ),
      this.dataSource.query(
        `SELECT id, codigo AS code, nombre AS name, activo AS active
           FROM frecuencias_servicio
          WHERE ${activeCondition} AND ($1::text IS NULL OR nombre ILIKE $1)
          ORDER BY nombre`,
        [like],
      ),
      this.dataSource.query(
        `SELECT id, codigo AS code, nombre AS name, activo AS active
           FROM ambitos_ubicacion_servicio
          WHERE ${activeCondition} AND ($1::text IS NULL OR nombre ILIKE $1)
          ORDER BY nombre`,
        [like],
      ),
      this.dataSource.query(
        `SELECT id, codigo AS code, nombre AS name, activo AS active
           FROM estados_conservacion
          WHERE ${activeCondition} AND ($1::text IS NULL OR nombre ILIKE $1)
          ORDER BY nombre`,
        [like],
      ),
      this.dataSource.query(
        `SELECT id, codigo AS code, nombre AS name, origen AS "origin", activo AS active
           FROM factores_alteracion
          WHERE ${activeCondition} AND ($1::text IS NULL OR nombre ILIKE $1)
          ORDER BY origen, nombre`,
        [like],
      ),
      this.dataSource.query(
        `SELECT id, codigo AS code, nombre AS name, activo AS active
           FROM categorias_servicio_basico
          WHERE ${activeCondition} AND ($1::text IS NULL OR nombre ILIKE $1)
          ORDER BY nombre`,
        [like],
      ),
      this.dataSource.query(
        `SELECT id, codigo AS code, nombre AS name,
                categoria_servicio_basico_id AS "categoryId", activo AS active
           FROM tipos_servicio_basico
          WHERE ${activeCondition} AND ($1::text IS NULL OR nombre ILIKE $1)
          ORDER BY "categoryId", nombre`,
        [like],
      ),
      this.dataSource.query(
        `SELECT id, codigo AS code, nombre AS name, ambiente AS "group", activo AS active
           FROM tipos_senaletica
          WHERE ${activeCondition} AND ($1::text IS NULL OR nombre ILIKE $1)
          ORDER BY ambiente, nombre`,
        [like],
      ),
      this.dataSource.query(
        `SELECT id, codigo AS code, nombre AS name, activo AS active
           FROM materiales_senaletica
          WHERE ${activeCondition} AND ($1::text IS NULL OR nombre ILIKE $1)
          ORDER BY nombre`,
        [like],
      ),
      this.dataSource.query(
        `SELECT id, codigo AS code, nombre AS name, activo AS active
           FROM tipos_servicio_salud
          WHERE ${activeCondition} AND ($1::text IS NULL OR nombre ILIKE $1)
          ORDER BY nombre`,
        [like],
      ),
      this.dataSource.query(
        `SELECT id, codigo AS code, nombre AS name, activo AS active
           FROM tipos_servicio_seguridad
          WHERE ${activeCondition} AND ($1::text IS NULL OR nombre ILIKE $1)
          ORDER BY nombre`,
        [like],
      ),
      this.dataSource.query(
        `SELECT id, codigo AS code, nombre AS name, grupo AS "group", activo AS active
           FROM tipos_comunicacion
          WHERE ${activeCondition} AND ($1::text IS NULL OR nombre ILIKE $1)
          ORDER BY grupo, nombre`,
        [like],
      ),
      this.dataSource.query(
        `SELECT id, codigo AS code, nombre AS name, activo AS active
           FROM tipos_amenaza
          WHERE ${activeCondition} AND ($1::text IS NULL OR nombre ILIKE $1)
          ORDER BY nombre`,
        [like],
      ),
      this.dataSource.query(
        `SELECT id, codigo AS code, pregunta AS name, orden AS "order", activo AS active
           FROM preguntas_politica
          WHERE ${activeCondition} AND ($1::text IS NULL OR pregunta ILIKE $1)
          ORDER BY orden, pregunta`,
        [like],
      ),
      this.dataSource.query(
        `SELECT id, codigo AS code, nombre AS name, activo AS active
           FROM tipos_medio_promocion
          WHERE ${activeCondition} AND ($1::text IS NULL OR nombre ILIKE $1)
          ORDER BY nombre`,
        [like],
      ),
      this.dataSource.query(
        `SELECT id, codigo AS code, nombre AS name, grupo AS "group", activo AS active
           FROM tipos_formacion_personal
          WHERE ${activeCondition} AND ($1::text IS NULL OR nombre ILIKE $1)
          ORDER BY grupo, nombre`,
        [like],
      ),
      this.dataSource.query(
        `SELECT id, codigo AS code, nombre AS name, TRUE AS active
           FROM tipos_responsabilidad_ficha
          WHERE ($1::text IS NULL OR nombre ILIKE $1)
          ORDER BY nombre`,
        [like],
      ),
      this.dataSource.query(
        `SELECT id, numero::text AS code, nombre AS name, TRUE AS active
           FROM meses
          WHERE ($1::text IS NULL OR nombre ILIKE $1)
          ORDER BY numero`,
        [like],
      ),
      this.dataSource.query(
        `SELECT id, codigo AS code, nombre AS name, grupo AS "group",
                unidad_1 AS "unit1", unidad_2 AS "unit2", unidad_3 AS "unit3",
                activo AS active
           FROM tipos_planta_turistica
          WHERE ${activeCondition} AND ($1::text IS NULL OR nombre ILIKE $1)
          ORDER BY grupo, nombre`,
        [like],
      ),
      this.dataSource.query(
        `SELECT id, codigo AS code, nombre AS name, activo AS active
           FROM tipos_servicio_complementario
          WHERE ${activeCondition} AND ($1::text IS NULL OR nombre ILIKE $1)
          ORDER BY nombre`,
        [like],
      ),
      this.dataSource.query(
        `SELECT id, codigo AS code, nombre AS name, activo AS active, categoria_atractivo_id AS "categoryId" FROM grupos_actividad WHERE ${activeCondition} AND ($1::text IS NULL OR nombre ILIKE $1) ORDER BY nombre`,
        [like],
      ),
      this.dataSource.query(
        `SELECT at.id, at.codigo AS code, at.nombre AS name, at.activo AS active,
                at.grupo_actividad_id AS "groupId", ga.categoria_atractivo_id AS "categoryId"
           FROM actividades_turisticas at
           JOIN grupos_actividad ga ON ga.id = at.grupo_actividad_id
           WHERE ${query.includeInactive ? "TRUE" : "at.activo = TRUE AND ga.activo = TRUE"} AND ($1::text IS NULL OR at.nombre ILIKE $1)
          ORDER BY ga.nombre, at.nombre`,
        [like],
      ),
      this.dataSource.query(
        `SELECT id, codigo AS code, nombre AS name, activo AS active FROM categorias_facilidad WHERE ${activeCondition} AND ($1::text IS NULL OR nombre ILIKE $1) ORDER BY nombre`,
        [like],
      ),
      this.dataSource.query(
        `SELECT tf.id, tf.codigo AS code, tf.nombre AS name, tf.activo AS active,
                tf.categoria_facilidad_id AS "categoryId"
           FROM tipos_facilidad tf
           JOIN categorias_facilidad cf ON cf.id = tf.categoria_facilidad_id
          WHERE ${query.includeInactive ? "TRUE" : "tf.activo = TRUE AND cf.activo = TRUE"} AND ($1::text IS NULL OR tf.nombre ILIKE $1)
          ORDER BY cf.nombre, tf.nombre`,
        [like],
      ),
    ]);
    return {
      categories,
      types,
      subtypes,
      provinces,
      cantons,
      parishes,
      localities,
      zones,
      lines,
      scenarios,
      hierarchies,
      climates,
      incomeTypes,
      attentionModes,
      accessibilityTypes,
      accessibilityCriteria,
      conditionStates,
      roadTypes,
      roadMaterials,
      aquaticAccessModes,
      aerialAccessCoverages,
      transportTypes,
      serviceFrequencies,
      serviceScopes,
      conservationStates,
      conservationFactors,
      basicServiceCategories,
      basicServiceTypes,
      signageTypes,
      signageMaterials,
      healthServiceTypes,
      securityServiceTypes,
      communicationTypes,
      threatTypes,
      policyQuestions,
      promotionMediaTypes,
      trainingTypes,
      responsibilityTypes,
      months,
      plantTypes,
      complementaryServiceTypes,
      activityGroups,
      activities,
      facilityCategories,
      facilities,
    };
  }

  async updateCatalog(
    actorId: number,
    catalog: string,
    id: number,
    input: AdminCatalogUpdateDto,
  ) {
    const target = CATALOG_TARGETS[catalog as CatalogKey];
    if (!target) throw new ConflictException("El catálogo no está disponible.");
    if (input.name === undefined && input.active === undefined) {
      throw new ConflictException("Debes indicar un cambio para el catálogo.");
    }
    return this.dataSource.transaction(async (manager) => {
      const rows = (await manager.query(
        `SELECT id, codigo AS code, nombre AS name, activo AS active
           FROM ${target.table} WHERE id = $1 FOR UPDATE`,
        [id],
      )) as Array<{ id: string; code: string; name: string; active: boolean }>;
      const current = rows[0];
      if (!current)
        throw new NotFoundException("No se encontró la opción del catálogo.");
      const nextName = input.name?.trim() || current.name;
      const nextActive = input.active ?? current.active;
      if (nextName === current.name && nextActive === current.active) {
        return {
          catalog,
          id: Number(current.id),
          code: current.code,
          name: current.name,
          active: current.active,
        };
      }
      const duplicate = await manager.query(
        `SELECT 1 FROM ${target.table}
          WHERE lower(nombre) = lower($1) AND id <> $2
          LIMIT 1`,
        [nextName, id],
      );
      if (duplicate[0]) {
        throw new ConflictException("Ya existe otra opción con ese nombre.");
      }
      await manager.query(
        `UPDATE ${target.table}
            SET nombre = $2, activo = $3
          WHERE id = $1
          RETURNING id, codigo AS code, nombre AS name, activo AS active`,
        [id, nextName, nextActive],
      );
      await manager.query(
        `INSERT INTO auditoria_catalogos
          (usuario_id, catalogo_codigo, registro_id, accion, datos_anteriores, datos_nuevos)
         VALUES ($1,$2,$3,$4,$5::jsonb,$6::jsonb)`,
        [
          actorId,
          catalog,
          id,
          nextActive === current.active
            ? "MODIFICAR"
            : nextActive
              ? "ACTIVAR"
              : "DESACTIVAR",
          JSON.stringify({ name: current.name, active: current.active }),
          JSON.stringify({ name: nextName, active: nextActive }),
        ],
      );
      return {
        catalog,
        id,
        code: current.code,
        name: nextName,
        active: nextActive,
      };
    });
  }

  async find(code: string) {
    return this.dataSource.transaction((manager) =>
      this.findByCode(manager, code),
    );
  }

  async create(actorId: number, input: SaveAdminCenterDto) {
    return this.dataSource.transaction(async (manager) => {
      const draft = this.requireComplete(
        await this.ensureProvisionalHierarchy(manager, {
          ...input,
          hierarchyId: undefined,
        }),
      );
      await this.validateReferences(manager, draft);
      const state = await this.stateId(manager, "BORRADOR");
      const sequence = await this.nextSequence(manager, draft.parishId);
      const rows = (await manager.query(
        `INSERT INTO centros_turisticos
          (secuencial_atractivo, nombre, subtipo_atractivo_id, zona_turistica_id,
           parroquia_id, linea_producto_id, escenario_id, jerarquia_id,
           estado_resenia_id, latitud, longitud, altitud_msnm, descripcion,
           barrio_sector_comuna, calle_principal, numero_direccion, calle_transversal)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
         RETURNING id`,
        [
          sequence,
          draft.name,
          draft.subtypeId,
          draft.touristZoneId,
          draft.parishId,
          draft.productLineId,
          draft.scenarioId,
          draft.hierarchyId,
          state.id,
          draft.latitude,
          draft.longitude,
          draft.altitudeMeters ?? null,
          draft.description ?? null,
          draft.address?.barrio ?? null,
          draft.address?.street ?? null,
          draft.address?.number ?? null,
          draft.address?.crossStreet ?? null,
        ],
      )) as { id: string }[];
      const center = rows[0];
      if (!center) throw new ConflictException("No se pudo crear la ficha.");
      await this.upsertDraft(manager, center.id, state.id, 1, draft, actorId);
      await this.audit(manager, center.id, actorId, "CREAR", null, draft);
      return this.findById(manager, center.id);
    });
  }

  async save(code: string, actorId: number, input: SaveAdminCenterDto) {
    return this.dataSource.transaction(async (manager) => {
      const center = await this.lockCenter(manager, code);
      const currentDraft = await this.getDraft(manager, center.id);
      const base =
        currentDraft && currentDraft.stateCode !== "PUBLICADO"
          ? currentDraft.data
          : {
              ...this.centerToDraft(center),
              sections: currentDraft?.data.sections,
            };
      const draftState = currentDraft?.stateCode ?? center.statusCode;
      if (
        !EDITABLE_DRAFT_STATES.has(draftState) &&
        draftState !== "PUBLICADO"
      ) {
        throw new ConflictException(
          "La ficha no se puede editar mientras está en revisión o aprobada.",
        );
      }
      if (
        input.version !== undefined &&
        currentDraft &&
        input.version !== currentDraft.version
      ) {
        throw new ConflictException(
          "La ficha cambió mientras la editabas. Recarga antes de guardar.",
        );
      }
      const next = mergeDraft(base, input);
      if (
        input.hierarchyId !== undefined &&
        Number(base.hierarchyId) !== Number(input.hierarchyId)
      ) {
        throw new ConflictException(
          "La jerarquía se calcula a partir de la valoración y no se puede editar.",
        );
      }
      const normalized = next.hierarchyId
        ? next
        : this.requireComplete(
            await this.ensureProvisionalHierarchy(manager, next),
          );
      await this.validateReferences(manager, normalized);
      const state = await this.stateId(manager, "BORRADOR");
      const nextVersion = (currentDraft?.version ?? 0) + 1;
      await this.upsertDraft(
        manager,
        center.id,
        state.id,
        nextVersion,
        normalized,
        actorId,
      );
      await this.audit(
        manager,
        center.id,
        actorId,
        "MODIFICAR",
        base,
        normalized,
      );
      return this.findById(manager, center.id);
    });
  }

  async submitReview(code: string, actorId: number) {
    return this.dataSource.transaction(async (manager) => {
      const center = await this.lockCenter(manager, code);
      const draft = await this.getDraft(manager, center.id);
      if (!draft || !EDITABLE_DRAFT_STATES.has(draft.stateCode)) {
        throw new ConflictException(
          "No existe un borrador editable para enviar a revisión.",
        );
      }
      const complete = this.requireComplete(
        await this.ensureProvisionalHierarchy(manager, draft.data),
      );
      await this.validateReferences(manager, complete);
      const state = await this.stateId(manager, "EN_REVISION");
      await manager.query(
        `UPDATE borradores_centros_turisticos
            SET estado_resenia_id = $2, version = version + 1,
                datos = $4::jsonb, actualizado_por = $3
          WHERE centro_turistico_id = $1`,
        [center.id, state.id, actorId, JSON.stringify(complete)],
      );
      if (center.statusCode !== "PUBLICADO") {
        await this.setCenterState(manager, center.id, "EN_REVISION");
      }
      await manager.query(
        `INSERT INTO revisiones_publicacion
          (centro_turistico_id, solicitado_por, estado_resenia_id, datos_propuestos)
         VALUES ($1,$2,$3,$4::jsonb)`,
        [center.id, actorId, state.id, JSON.stringify(complete)],
      );
      await this.audit(
        manager,
        center.id,
        actorId,
        "SOLICITAR_REVISION",
        null,
        complete,
      );
      return this.findById(manager, center.id);
    });
  }

  async review(code: string, actorId: number, input: ReviewCenterDto) {
    return this.dataSource.transaction(async (manager) => {
      const center = await this.lockCenter(manager, code);
      const revision = await this.latestRevision(
        manager,
        center.id,
        "EN_REVISION",
      );
      const draft = await this.getDraft(manager, center.id);
      if (!revision || !draft) {
        throw new ConflictException(
          "La ficha ya no está en revisión; actualiza la lista antes de operar.",
        );
      }
      const targetCode = input.action === "APPROVE" ? "APROBADO" : "RECHAZADO";
      const target = await this.stateId(manager, targetCode);
      await manager.query(
        `UPDATE revisiones_publicacion
            SET revisado_por = $2, estado_resenia_id = $3,
                observacion = $4, fecha_revision = CURRENT_TIMESTAMP
          WHERE id = $1`,
        [revision.id, actorId, target.id, input.observation ?? null],
      );
      await manager.query(
        `UPDATE borradores_centros_turisticos
            SET estado_resenia_id = $2, version = version + 1, actualizado_por = $3
          WHERE centro_turistico_id = $1`,
        [center.id, target.id, actorId],
      );
      if (center.statusCode !== "PUBLICADO") {
        await this.setCenterState(manager, center.id, targetCode);
      }
      await this.audit(
        manager,
        center.id,
        actorId,
        input.action === "APPROVE" ? "APROBAR" : "RECHAZAR",
        { estado: "EN_REVISION" },
        { estado: targetCode, observacion: input.observation ?? null },
      );
      return this.findById(manager, center.id);
    });
  }

  async publish(code: string, actorId: number) {
    return this.dataSource.transaction(async (manager) => {
      const center = await this.lockCenter(manager, code);
      const draft = await this.getDraft(manager, center.id);
      if (!draft || draft.stateCode !== "APROBADO") {
        throw new ConflictException(
          "Solo se pueden publicar fichas aprobadas.",
        );
      }
      const complete = this.requireComplete(draft.data);
      await this.validateReferences(manager, complete, true, center.id);
      await this.applyDraft(manager, center, complete);
      const published = await this.stateId(manager, "PUBLICADO");
      await manager.query(
        `UPDATE borradores_centros_turisticos SET estado_resenia_id = $2, version = version + 1, actualizado_por = $3 WHERE centro_turistico_id = $1`,
        [center.id, published.id, actorId],
      );
      await manager.query(
        `UPDATE revisiones_publicacion
            SET revisado_por = $2, estado_resenia_id = $3,
                fecha_revision = COALESCE(fecha_revision, CURRENT_TIMESTAMP)
          WHERE id = (
            SELECT id FROM revisiones_publicacion
             WHERE centro_turistico_id = $1
             ORDER BY fecha_solicitud DESC LIMIT 1
          )`,
        [center.id, actorId, published.id],
      );
      await this.media?.publishPending(manager, center.id, actorId);
      await this.audit(
        manager,
        center.id,
        actorId,
        "PUBLICAR",
        { estado: center.statusCode },
        { estado: "PUBLICADO" },
      );
      return this.findById(manager, center.id);
    });
  }

  async deactivate(code: string, actorId: number) {
    return this.dataSource.transaction(async (manager) => {
      const center = await this.lockCenter(manager, code);
      const inactive = await this.stateId(manager, "INACTIVO");
      await manager.query(
        `UPDATE centros_turisticos SET activo = FALSE, estado_resenia_id = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
        [center.id, inactive.id],
      );
      await this.audit(
        manager,
        center.id,
        actorId,
        "DESACTIVAR",
        { estado: center.statusCode },
        { estado: "INACTIVO" },
      );
      return this.findById(manager, center.id);
    });
  }

  async reactivate(code: string, actorId: number) {
    return this.dataSource.transaction(async (manager) => {
      const center = await this.lockCenter(manager, code);
      const targetCode = center.publishedAt ? "PUBLICADO" : "BORRADOR";
      const target = await this.stateId(manager, targetCode);
      await manager.query(
        `UPDATE centros_turisticos SET activo = TRUE, estado_resenia_id = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
        [center.id, target.id],
      );
      await this.audit(
        manager,
        center.id,
        actorId,
        "REACTIVAR",
        { estado: "INACTIVO" },
        { estado: targetCode },
      );
      return this.findById(manager, center.id);
    });
  }

  async getAudit(code: string) {
    const rows = await this.dataSource.query(
      `SELECT a.accion AS action, a.seccion_codigo AS section,
              a.datos_anteriores AS "previous", a.datos_nuevos AS "next",
              a.created_at AS "createdAt", u.nombre AS actor
         FROM auditoria_fichas a
         JOIN centros_turisticos c ON c.id = a.centro_turistico_id
         JOIN usuarios u ON u.id = a.usuario_id
        WHERE TRIM(c.codigo_atractivo) = TRIM($1)
        ORDER BY a.created_at DESC, a.id DESC`,
      [code],
    );
    return { items: rows };
  }

  async sections(code: string) {
    return this.dataSource.transaction(async (manager) => {
      const rows = (await manager.query(
        this.centerSelect() + " WHERE TRIM(c.codigo_atractivo) = TRIM($1)",
        [code],
      )) as CenterRow[];
      const center = rows[0];
      if (!center)
        throw new NotFoundException("No se encontró la ficha turística.");
      const draft = await this.getDraft(manager, center.id);
      return {
        code: center.code ?? code,
        version: draft?.version ?? 0,
        sections: draft?.data.sections ?? {},
        progress: buildAdminSectionProgress(draft?.data),
      };
    });
  }

  async valuation(code: string) {
    return this.dataSource.transaction(async (manager) => {
      const rows = (await manager.query(
        `SELECT c.id, c.jerarquia_id AS "hierarchyId",
                rj.codigo AS "hierarchyCode"
           FROM centros_turisticos c
           LEFT JOIN rangos_jerarquia rj ON rj.id = c.jerarquia_id
          WHERE TRIM(c.codigo_atractivo) = TRIM($1)`,
        [code],
      )) as Array<{
        id: string;
        hierarchyId: number | null;
        hierarchyCode: string | null;
      }>;
      const center = rows[0];
      if (!center)
        throw new NotFoundException("No se encontró la ficha turística.");

      const [indicatorRows, criterionRows, totalRows] = await Promise.all([
        manager.query(
          `SELECT COUNT(*)::int AS count,
                  COUNT(*) FILTER (
                    WHERE TRIM(codigo) = ANY($1::text[])
                  )::int AS "requiredCount"
             FROM indicadores_valoracion
            WHERE activo = TRUE`,
          [XLSM_INDICATOR_CODES],
        ),
        manager.query(
          `SELECT cv.codigo AS code, cv.nombre AS name,
                  cv.puntaje_maximo AS maximum,
                  rc.puntaje_obtenido AS score,
                  rc.puntaje_maximo_aplicado AS "appliedMaximum"
             FROM criterios_valoracion cv
             LEFT JOIN resultados_criterio rc
               ON rc.criterio_valoracion_id = cv.id
              AND rc.centro_turistico_id = $1
            WHERE cv.activo = TRUE
            ORDER BY cv.orden`,
          [center.id],
        ),
        manager.query(
          `SELECT SUM(rc.puntaje_obtenido)::numeric AS total
             FROM resultados_criterio rc
            WHERE rc.centro_turistico_id = $1`,
          [center.id],
        ),
      ]);
      const configured =
        Number(indicatorRows[0]?.requiredCount ?? 0) >=
        XLSM_INDICATOR_CODES.length;
      const totalValue = totalRows[0]?.total;
      return {
        configured,
        total:
          totalValue === null || totalValue === undefined
            ? null
            : Number(totalValue),
        hierarchyCode: center.hierarchyCode ?? "00",
        hierarchyId:
          center.hierarchyId === null ? null : Number(center.hierarchyId),
        criteria: (criterionRows as Array<Record<string, unknown>>).map(
          (item) => ({
            code: String(item.code).trim(),
            name: item.name,
            maximum: Number(item.maximum),
            score:
              item.score === null || item.score === undefined
                ? null
                : Number(item.score),
            appliedMaximum:
              item.appliedMaximum === null || item.appliedMaximum === undefined
                ? null
                : Number(item.appliedMaximum),
          }),
        ),
      };
    });
  }

  async saveSection(
    code: string,
    sectionCode: AdminCenterSectionCode,
    actorId: number,
    input: SaveAdminSectionDto,
  ) {
    if (!ADMIN_CENTER_SECTION_CODES.includes(sectionCode)) {
      throw new ConflictException("La sección de ficha no está disponible.");
    }
    const serialized = JSON.stringify(input.content);
    if (serialized.length > 300_000) {
      throw new ConflictException("La sección supera el tamaño permitido.");
    }
    return this.dataSource.transaction(async (manager) => {
      const center = await this.lockCenter(manager, code);
      const currentDraft = await this.getDraft(manager, center.id);
      const base =
        currentDraft && currentDraft.stateCode !== "PUBLICADO"
          ? currentDraft.data
          : {
              ...this.centerToDraft(center),
              sections: currentDraft?.data.sections,
            };
      const draftState = currentDraft?.stateCode ?? center.statusCode;
      if (
        !EDITABLE_DRAFT_STATES.has(draftState) &&
        draftState !== "PUBLICADO"
      ) {
        throw new ConflictException(
          "La ficha no se puede editar mientras está en revisión o aprobada.",
        );
      }
      if (
        input.version !== undefined &&
        currentDraft &&
        input.version !== currentDraft.version
      ) {
        throw new ConflictException(
          "La ficha cambió mientras la editabas. Recarga antes de guardar.",
        );
      }
      const next: CenterDraft = {
        ...base,
        sections: {
          ...(base.sections ?? {}),
          [sectionCode]: input.content,
        },
      };
      this.validateSectionMap(next.sections);
      await this.validateReferences(manager, next);
      const state = await this.stateId(manager, "BORRADOR");
      const nextVersion = (currentDraft?.version ?? 0) + 1;
      await this.upsertDraft(
        manager,
        center.id,
        state.id,
        nextVersion,
        next,
        actorId,
      );
      await this.audit(
        manager,
        center.id,
        actorId,
        "MODIFICAR",
        base,
        next,
        sectionCode,
      );
      return this.findById(manager, center.id);
    });
  }

  private async findByCode(manager: EntityManager, code: string) {
    const rows = (await manager.query(
      this.centerSelect() + " WHERE TRIM(c.codigo_atractivo) = TRIM($1)",
      [code],
    )) as CenterRow[];
    if (!rows[0])
      throw new NotFoundException("No se encontró la ficha turística.");
    return this.mapDetail(manager, rows[0]);
  }

  private async findById(manager: EntityManager, id: string) {
    const rows = (await manager.query(
      this.centerSelect() + " WHERE c.id = $1",
      [id],
    )) as CenterRow[];
    if (!rows[0])
      throw new NotFoundException("No se encontró la ficha turística.");
    return this.mapDetail(manager, rows[0]);
  }

  private async mapDetail(manager: EntityManager, center: CenterRow) {
    const draft = await this.getDraft(manager, center.id);
    const revision = await this.latestRevision(manager, center.id);
    const hasPendingDraft = draft && draft.stateCode !== "PUBLICADO";
    const effectiveStatus =
      center.active === false
        ? { code: "INACTIVO", name: "Inactivo" }
        : hasPendingDraft
          ? { code: draft.stateCode, name: draft.stateName }
          : { code: center.statusCode, name: center.statusName };
    const published = this.centerToDraft(center);
    const [
      publishedAccessibility,
      publishedPlant,
      publishedVisitors,
      publishedPolicies,
      publishedPromotion,
      publishedHumanResources,
      publishedConservation,
      publishedHygiene,
      publishedAnnexes,
    ] = await Promise.all([
      this.readPublishedAccessibilitySection(manager, center.id),
      this.readPublishedPlantSection(manager, center.id),
      this.readPublishedVisitorsSection(manager, center.id),
      this.readPublishedPoliciesSection(manager, center.id),
      this.readPublishedPromotionSection(manager, center.id),
      this.readPublishedHumanResourcesSection(manager, center.id),
      this.readPublishedConservationSection(manager, center.id),
      this.readPublishedHygieneSection(manager, center.id),
      this.readPublishedAnnexesSection(manager, center.id),
    ]);
    const publishedSections: Record<string, unknown> = {};
    if (publishedAccessibility)
      publishedSections.accesibilidad = publishedAccessibility;
    if (publishedPlant) publishedSections.planta = publishedPlant;
    if (publishedVisitors) publishedSections.visitantes = publishedVisitors;
    if (publishedPolicies) publishedSections.politicas = publishedPolicies;
    if (publishedPromotion) publishedSections.promocion = publishedPromotion;
    if (publishedHumanResources)
      publishedSections["recurso-humano"] = publishedHumanResources;
    if (publishedConservation)
      publishedSections.conservacion = publishedConservation;
    if (publishedHygiene)
      publishedSections["higiene-seguridad"] = publishedHygiene;
    if (publishedAnnexes) publishedSections.anexos = publishedAnnexes;
    published.sections = publishedSections;
    return {
      code: center.code,
      status: effectiveStatus,
      baseStatus: { code: center.statusCode, name: center.statusName },
      active: center.active,
      publishedAt: center.publishedAt ?? null,
      version: draft?.version ?? 0,
      published,
      draft: hasPendingDraft ? draft.data : null,
      review: revision
        ? {
            status: { code: revision.stateCode, name: revision.stateName },
            observation: revision.observation,
            requestedAt: revision.requestedAt,
            reviewedAt: revision.reviewedAt,
          }
        : null,
    };
  }

  private centerSelect(): string {
    return `SELECT c.id, TRIM(c.codigo_atractivo) AS code, c.nombre AS name,
                   er.codigo AS "statusCode", er.nombre AS "statusName", c.activo AS active,
                   c.publicado_at AS "publishedAt", c.subtipo_atractivo_id AS "subtypeId",
                   c.zona_turistica_id AS "touristZoneId", c.parroquia_id AS "parishId",
                   c.linea_producto_id AS "productLineId", c.escenario_id AS "scenarioId",
                   c.jerarquia_id AS "hierarchyId", c.latitud AS latitude, c.longitud AS longitude,
                   c.altitud_msnm AS "altitudeMeters", c.descripcion AS description,
                   c.barrio_sector_comuna AS barrio, c.calle_principal AS street,
                   c.numero_direccion AS "addressNumber", c.calle_transversal AS "crossStreet",
                   CASE WHEN aa.id IS NULL THEN NULL ELSE json_build_object(
                     'type', aa.tipo_administrador, 'institution', aa.institucion,
                     'name', aa.nombre_administrador, 'position', aa.cargo,
                     'phone', aa.num_celular, 'email', aa.email, 'observation', aa.observacion) END AS administration,
                   CASE WHEN cc.id IS NULL THEN NULL ELSE json_build_object(
                     'climateId', cc.tipo_clima_id, 'minTemperature', cc.temperatura_min_c,
                     'maxTemperature', cc.temperatura_max_c, 'minRainfall', cc.precipitacion_min_mm,
                     'maxRainfall', cc.precipitacion_max_mm, 'observation', cc.observacion) END AS climate,
                   CASE WHEN ic.id IS NULL THEN NULL ELSE json_build_object(
                     'incomeTypeId', ic.tipo_ingreso_id, 'attentionModeId', ic.modalidad_atencion_id,
                     'opensAt', to_char(ic.hora_ingreso, 'HH24:MI'), 'closesAt', to_char(ic.hora_salida, 'HH24:MI'),
                     'otherAttention', ic.atencion_otro, 'reservations', ic.maneja_reservas,
                     'priceFrom', ic.precio_desde, 'priceTo', ic.precio_hasta, 'observation', ic.observacion) END AS admission,
                   COALESCE((SELECT json_agg(json_build_object(
                     'activityId', act.actividad_turistica_id, 'active', act.activo,
                     'detailOther', act.detalle_otro, 'observation', act.observacion)
                     ORDER BY act.actividad_turistica_id)
                     FROM actividades_centro_turistico act
                    WHERE act.centro_turistico_id = c.id), '[]'::json) AS activities,
                   COALESCE((SELECT json_agg(json_build_object(
                     'typeId', acr.tipo_accesibilidad_id, 'applies', acr.aplica,
                     'observation', acr.observacion)
                     ORDER BY acr.tipo_accesibilidad_id)
                     FROM centro_accesibilidad_resumen acr
                    WHERE acr.centro_turistico_id = c.id), '[]'::json) AS accessibility,
                   COALESCE((SELECT json_agg(json_build_object(
                     'typeId', fc.tipo_facilidad_id, 'quantity', fc.cantidad,
                     'detailOther', fc.detalle_otro, 'observation', fc.observacion)
                     ORDER BY fc.tipo_facilidad_id)
                     FROM facilidades_centro fc
                    WHERE fc.centro_turistico_id = c.id), '[]'::json) AS facilities
              FROM centros_turisticos c
              JOIN estados_resenia er ON er.id = c.estado_resenia_id
              LEFT JOIN administraciones_atractivo aa ON aa.centro_turistico_id = c.id
              LEFT JOIN caracteristicas_climaticas cc ON cc.centro_turistico_id = c.id
              LEFT JOIN ingresos_centro_turistico ic ON ic.centro_turistico_id = c.id`;
  }

  private async lockCenter(
    manager: EntityManager,
    code: string,
  ): Promise<CenterRow> {
    const rows = (await manager.query(
      this.centerSelect() +
        " WHERE TRIM(c.codigo_atractivo) = TRIM($1) FOR UPDATE OF c",
      [code],
    )) as CenterRow[];
    if (!rows[0])
      throw new NotFoundException("No se encontró la ficha turística.");
    return rows[0];
  }

  private async getDraft(
    manager: EntityManager,
    centerId: string,
  ): Promise<DraftRow | null> {
    const rows = (await manager.query(
      `SELECT b.id, e.codigo AS "stateCode", e.nombre AS "stateName", b.version, b.datos AS data
         FROM borradores_centros_turisticos b
         JOIN estados_resenia e ON e.id = b.estado_resenia_id
        WHERE b.centro_turistico_id = $1`,
      [centerId],
    )) as DraftRow[];
    return rows[0] ?? null;
  }

  private async latestRevision(
    manager: EntityManager,
    centerId: string,
    state?: string,
  ): Promise<RevisionRow | null> {
    const params: unknown[] = [centerId];
    const stateCondition = state ? "AND e.codigo = $2" : "";
    if (state) params.push(state);
    const rows = (await manager.query(
      `SELECT r.id, e.codigo AS "stateCode", e.nombre AS "stateName",
              r.observacion AS observation, r.fecha_solicitud AS "requestedAt",
              r.fecha_revision AS "reviewedAt", r.datos_propuestos AS data
         FROM revisiones_publicacion r
         JOIN estados_resenia e ON e.id = r.estado_resenia_id
        WHERE r.centro_turistico_id = $1 ${stateCondition}
        ORDER BY r.fecha_solicitud DESC, r.id DESC LIMIT 1`,
      params,
    )) as RevisionRow[];
    return rows[0] ?? null;
  }

  private async upsertDraft(
    manager: EntityManager,
    centerId: string,
    stateId: string,
    version: number,
    data: CenterDraft,
    actorId: number,
  ) {
    await manager.query(
      `INSERT INTO borradores_centros_turisticos
        (centro_turistico_id, estado_resenia_id, version, datos, actualizado_por)
       VALUES ($1,$2,$3,$4::jsonb,$5)
       ON CONFLICT (centro_turistico_id) DO UPDATE SET
         estado_resenia_id = EXCLUDED.estado_resenia_id,
         version = EXCLUDED.version,
         datos = EXCLUDED.datos,
         actualizado_por = EXCLUDED.actualizado_por,
         updated_at = CURRENT_TIMESTAMP`,
      [centerId, stateId, version, JSON.stringify(data), actorId],
    );
  }

  private async applyDraft(
    manager: EntityManager,
    center: CenterRow,
    draft: CenterDraft,
  ) {
    const characteristicsSection = getAdminSectionRecord(
      draft,
      "caracteristicas",
    );
    let sequence: number | null = null;
    if (Number(center.parishId) !== Number(draft.parishId)) {
      sequence = await this.nextSequence(manager, draft.parishId);
    }
    const published = await this.stateId(manager, "PUBLICADO");
    await manager.query(
      `UPDATE centros_turisticos
          SET secuencial_atractivo = COALESCE($2, secuencial_atractivo),
              nombre = $3, subtipo_atractivo_id = $4, zona_turistica_id = $5,
              parroquia_id = $6, linea_producto_id = $7, escenario_id = $8,
              jerarquia_id = $9, estado_resenia_id = $10, latitud = $11,
              longitud = $12, altitud_msnm = $13, descripcion = $14,
              barrio_sector_comuna = $15, calle_principal = $16,
              numero_direccion = $17, calle_transversal = $18,
              activo = TRUE, publicado_at = COALESCE(publicado_at, CURRENT_TIMESTAMP),
              updated_at = CURRENT_TIMESTAMP
        WHERE id = $1`,
      [
        center.id,
        sequence,
        draft.name,
        draft.subtypeId,
        draft.touristZoneId,
        draft.parishId,
        draft.productLineId,
        draft.scenarioId,
        draft.hierarchyId,
        published.id,
        draft.latitude,
        draft.longitude,
        draft.altitudeMeters ?? null,
        draft.description ?? null,
        draft.address?.barrio ?? null,
        draft.address?.street ?? null,
        draft.address?.number ?? null,
        draft.address?.crossStreet ?? null,
      ],
    );
    if (draft.administration) {
      await manager.query(
        `INSERT INTO administraciones_atractivo
          (centro_turistico_id, tipo_administrador, institucion, nombre_administrador, cargo, num_celular, email, observacion)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
         ON CONFLICT (centro_turistico_id) DO UPDATE SET
          tipo_administrador = EXCLUDED.tipo_administrador, institucion = EXCLUDED.institucion,
          nombre_administrador = EXCLUDED.nombre_administrador, cargo = EXCLUDED.cargo,
          num_celular = EXCLUDED.num_celular, email = EXCLUDED.email, observacion = EXCLUDED.observacion,
          updated_at = CURRENT_TIMESTAMP`,
        [
          center.id,
          draft.administration.type,
          draft.administration.institution ?? null,
          draft.administration.name,
          draft.administration.position ?? null,
          draft.administration.phone ?? null,
          draft.administration.email ?? null,
          draft.administration.observation ?? null,
        ],
      );
    }
    if (
      draft.climate &&
      !characteristicsSection?.climate &&
      characteristicsSection?.response !== "NO_APLICA"
    ) {
      await manager.query(
        `INSERT INTO caracteristicas_climaticas
          (centro_turistico_id, tipo_clima_id, temperatura_min_c, temperatura_max_c, precipitacion_min_mm, precipitacion_max_mm, observacion)
         VALUES ($1,$2,$3,$4,$5,$6,$7)
         ON CONFLICT (centro_turistico_id) DO UPDATE SET
          tipo_clima_id = EXCLUDED.tipo_clima_id, temperatura_min_c = EXCLUDED.temperatura_min_c,
          temperatura_max_c = EXCLUDED.temperatura_max_c, precipitacion_min_mm = EXCLUDED.precipitacion_min_mm,
          precipitacion_max_mm = EXCLUDED.precipitacion_max_mm, observacion = EXCLUDED.observacion,
          updated_at = CURRENT_TIMESTAMP`,
        [
          center.id,
          draft.climate.climateId,
          draft.climate.minTemperature ?? null,
          draft.climate.maxTemperature ?? null,
          draft.climate.minRainfall ?? null,
          draft.climate.maxRainfall ?? null,
          draft.climate.observation ?? null,
        ],
      );
    }
    if (draft.admission) {
      await manager.query(
        `INSERT INTO ingresos_centro_turistico
          (centro_turistico_id, tipo_ingreso_id, modalidad_atencion_id, hora_ingreso, hora_salida, atencion_otro, maneja_reservas, precio_desde, precio_hasta, observacion)
         VALUES ($1,$2,$3,$4::time,$5::time,$6,$7,$8,$9,$10)
         ON CONFLICT (centro_turistico_id) DO UPDATE SET
          tipo_ingreso_id = EXCLUDED.tipo_ingreso_id, modalidad_atencion_id = EXCLUDED.modalidad_atencion_id,
          hora_ingreso = EXCLUDED.hora_ingreso, hora_salida = EXCLUDED.hora_salida,
          atencion_otro = EXCLUDED.atencion_otro, maneja_reservas = EXCLUDED.maneja_reservas,
          precio_desde = EXCLUDED.precio_desde, precio_hasta = EXCLUDED.precio_hasta,
          observacion = EXCLUDED.observacion, updated_at = CURRENT_TIMESTAMP`,
        [
          center.id,
          draft.admission.incomeTypeId,
          draft.admission.attentionModeId,
          draft.admission.opensAt ?? null,
          draft.admission.closesAt ?? null,
          draft.admission.otherAttention ?? null,
          draft.admission.reservations ?? false,
          draft.admission.priceFrom ?? null,
          draft.admission.priceTo ?? null,
          draft.admission.observation ?? null,
        ],
      );
    }
    if (draft.activities) {
      await manager.query(
        `UPDATE actividades_centro_turistico SET activo = FALSE WHERE centro_turistico_id = $1`,
        [center.id],
      );
      for (const activity of draft.activities) {
        await manager.query(
          `INSERT INTO actividades_centro_turistico
             (centro_turistico_id, actividad_turistica_id, activo, detalle_otro, observacion)
           VALUES ($1,$2,$3,$4,$5)
           ON CONFLICT (centro_turistico_id, actividad_turistica_id) DO UPDATE SET
             activo = EXCLUDED.activo, detalle_otro = EXCLUDED.detalle_otro,
             observacion = EXCLUDED.observacion`,
          [
            center.id,
            activity.activityId,
            activity.active,
            activity.detailOther ?? null,
            activity.observation ?? null,
          ],
        );
      }
    }
    if (draft.accessibility) {
      await manager.query(
        `UPDATE centro_accesibilidad_resumen SET aplica = FALSE WHERE centro_turistico_id = $1`,
        [center.id],
      );
      for (const access of draft.accessibility) {
        await manager.query(
          `INSERT INTO centro_accesibilidad_resumen
             (centro_turistico_id, tipo_accesibilidad_id, aplica, observacion)
           VALUES ($1,$2,$3,$4)
           ON CONFLICT (centro_turistico_id, tipo_accesibilidad_id) DO UPDATE SET
             aplica = EXCLUDED.aplica, observacion = EXCLUDED.observacion`,
          [
            center.id,
            access.typeId,
            access.applies,
            access.observation ?? null,
          ],
        );
      }
    }
    if (characteristicsSection) {
      await this.applyCharacteristicsSection(
        manager,
        center.id,
        characteristicsSection,
      );
    }
    const visitorsSection = getAdminSectionRecord(draft, "visitantes");
    if (visitorsSection) {
      await this.applyVisitorsSection(manager, center.id, visitorsSection);
    }
    const policiesSection = getAdminSectionRecord(draft, "politicas");
    if (policiesSection) {
      await this.applyPoliciesSection(manager, center.id, policiesSection);
    }
    const promotionSection = getAdminSectionRecord(draft, "promocion");
    if (promotionSection) {
      await this.applyPromotionSection(manager, center.id, promotionSection);
    }
    const humanResourcesSection = getAdminSectionRecord(
      draft,
      "recurso-humano",
    );
    if (humanResourcesSection) {
      await this.applyHumanResourcesSection(
        manager,
        center.id,
        humanResourcesSection,
      );
    }
    const conservationSection = getAdminSectionRecord(draft, "conservacion");
    if (conservationSection) {
      await this.applyConservationSection(
        manager,
        center.id,
        conservationSection,
      );
    }
    const hygieneSection = getAdminSectionRecord(draft, "higiene-seguridad");
    if (hygieneSection) {
      await this.applyHygieneSection(manager, center.id, hygieneSection);
    }
    const annexesSection = getAdminSectionRecord(draft, "anexos");
    if (annexesSection) {
      await this.applyAnnexesSection(manager, center.id, annexesSection);
    }
    const accessibilitySection = getAdminSectionRecord(draft, "accesibilidad");
    if (accessibilitySection) {
      await this.applyAccessibilitySection(
        manager,
        center.id,
        accessibilitySection,
      );
    }
    const plantSection = getAdminSectionRecord(draft, "planta");
    const detailedFacilities =
      Array.isArray(plantSection?.facilitiesDetails) &&
      plantSection.facilitiesDetails.length > 0;
    if (draft.facilities && !detailedFacilities) {
      await manager.query(
        `DELETE FROM facilidades_centro WHERE centro_turistico_id = $1`,
        [center.id],
      );
      for (const facility of draft.facilities) {
        await manager.query(
          `INSERT INTO facilidades_centro
             (centro_turistico_id, tipo_facilidad_id, cantidad, detalle_otro, observacion)
           VALUES ($1,$2,$3,$4,$5)`,
          [
            center.id,
            facility.typeId,
            facility.quantity ?? 1,
            facility.detailOther ?? null,
            facility.observation ?? null,
          ],
        );
      }
    }
    if (plantSection) {
      await this.applyPlantSection(manager, center.id, plantSection);
    }
    await this.persistXlsmValuation(manager, center.id, draft);
  }

  private async persistXlsmValuation(
    manager: EntityManager,
    centerId: string,
    draft: CenterDraft,
  ): Promise<boolean> {
    const indicatorRows = (await manager.query(
      `SELECT iv.id, TRIM(iv.codigo) AS code,
              iv.criterio_valoracion_id AS "criterionId",
              TRIM(cv.codigo) AS "criterionCode",
              iv.puntaje_maximo AS maximum
         FROM indicadores_valoracion iv
         JOIN criterios_valoracion cv
           ON cv.id = iv.criterio_valoracion_id
        WHERE iv.activo = TRUE AND cv.activo = TRUE
        ORDER BY cv.orden, iv.orden`,
    )) as Array<{
      id: string;
      code: string;
      criterionId: string;
      criterionCode: string;
      maximum: string | number;
    }>;

    if (indicatorRows.length === 0) {
      await this.clearPersistedValuation(manager, centerId);
      return false;
    }

    const configuredCodes = new Set(indicatorRows.map((row) => row.code));
    const missingCodes = XLSM_INDICATOR_CODES.filter(
      (code) => !configuredCodes.has(code),
    );
    if (missingCodes.length > 0) {
      throw new ConflictException(
        `El catálogo de valoración XLSM está incompleto: faltan ${missingCodes.length} indicadores.`,
      );
    }

    const criterionRows = (await manager.query(
      `SELECT id, TRIM(codigo) AS code, puntaje_maximo AS maximum
         FROM criterios_valoracion
        WHERE activo = TRUE
        ORDER BY orden`,
    )) as Array<{
      id: string;
      code: string;
      maximum: string | number;
    }>;
    const criterionByCode = new Map(
      criterionRows.map((row) => [row.code, row]),
    );
    const missingCriteria = [
      "A",
      "B",
      "C",
      "D",
      "E",
      "F",
      "G",
      "H",
      "I",
    ].filter((code) => !criterionByCode.has(code));
    if (missingCriteria.length > 0) {
      throw new ConflictException(
        `El catálogo de criterios de valoración está incompleto: faltan ${missingCriteria.join(", ")}.`,
      );
    }

    if (!this.hasScorableXlsmSnapshot(draft)) {
      await this.clearPersistedValuation(manager, centerId);
      return false;
    }

    const catalogs = await this.loadXlsmValuationCatalogs(manager);
    const result = calculateXlsmValuation(
      buildXlsmValuationInput(draft, catalogs),
    );
    const indicatorByCode = new Map(
      indicatorRows.map((row) => [row.code, row]),
    );

    // La publicación reemplaza el cálculo anterior dentro de la misma
    // transacción. Así los indicadores nunca quedan mezclados entre versiones.
    await manager.query(
      `DELETE FROM resultados_indicador WHERE centro_turistico_id = $1`,
      [centerId],
    );
    await manager.query(
      `DELETE FROM resultados_criterio WHERE centro_turistico_id = $1`,
      [centerId],
    );

    for (const criterion of result.criteria) {
      for (const indicator of criterion.indicators) {
        const catalogIndicator = indicatorByCode.get(indicator.code);
        if (!catalogIndicator) continue;
        const configuredIndicatorMaximum = Number(catalogIndicator.maximum);
        const indicatorMaximum = Number.isFinite(configuredIndicatorMaximum)
          ? configuredIndicatorMaximum
          : indicator.maximum;
        const indicatorScore = Math.min(indicator.score, indicatorMaximum);
        await manager.query(
          `INSERT INTO resultados_indicador
             (centro_turistico_id, indicador_valoracion_id, valor_base,
              puntaje_obtenido, detalle_calculo, observacion)
           VALUES ($1,$2,$3,$4,$5::jsonb,$6)`,
          [
            centerId,
            catalogIndicator.id,
            indicator.value,
            indicatorScore,
            JSON.stringify({
              source: "XLSM",
              indicator: indicator.code,
              ...indicator.detail,
            }),
            indicator.observation ?? null,
          ],
        );
      }
      const catalogCriterion = criterionByCode.get(criterion.code);
      if (!catalogCriterion) continue;
      const configuredCriterionMaximum = Number(catalogCriterion.maximum);
      const criterionMaximum = Number.isFinite(configuredCriterionMaximum)
        ? configuredCriterionMaximum
        : criterion.maximum;
      const criterionScore = Math.min(criterion.score, criterionMaximum);
      await manager.query(
        `INSERT INTO resultados_criterio
           (centro_turistico_id, criterio_valoracion_id,
            puntaje_obtenido, puntaje_maximo_aplicado)
         VALUES ($1,$2,$3,$4)`,
        [centerId, catalogCriterion.id, criterionScore, criterionMaximum],
      );
    }
    return true;
  }

  private hasScorableXlsmSnapshot(draft: CenterDraft): boolean {
    if (!Array.isArray(draft.activities)) return false;
    const requiredSections = [
      "accesibilidad",
      "planta",
      "conservacion",
      "higiene-seguridad",
      "politicas",
      "promocion",
      "visitantes",
      "recurso-humano",
    ];
    return requiredSections.every((code) => {
      const value = draft.sections?.[code];
      const section = isJsonRecord(value) ? value : null;
      return (
        section !== null &&
        typeof section.response === "string" &&
        section.response !== "SIN_INFORMACION"
      );
    });
  }

  private async clearPersistedValuation(
    manager: EntityManager,
    centerId: string,
  ) {
    await manager.query(
      `DELETE FROM resultados_indicador WHERE centro_turistico_id = $1`,
      [centerId],
    );
    await manager.query(
      `DELETE FROM resultados_criterio WHERE centro_turistico_id = $1`,
      [centerId],
    );
  }

  private async loadXlsmValuationCatalogs(
    manager: EntityManager,
  ): Promise<XlsmValuationCatalogs> {
    const [conditions, plants, activities, accessibility, hygiene] =
      await Promise.all([
        manager.query(
          `SELECT id, codigo FROM estados_condicion WHERE activo = TRUE`,
        ),
        manager.query(
          `SELECT id, nombre FROM tipos_planta_turistica WHERE activo = TRUE`,
        ),
        manager.query(
          `SELECT at.id, ga.codigo AS "groupCode"
             FROM actividades_turisticas at
             JOIN grupos_actividad ga ON ga.id = at.grupo_actividad_id
            WHERE at.activo = TRUE AND ga.activo = TRUE`,
        ),
        manager.query(
          `SELECT id, codigo, nombre
             FROM tipos_accesibilidad
            WHERE activo = TRUE`,
        ),
        manager.query(
          `SELECT 'BASIC_SERVICE' AS kind, id, nombre FROM tipos_servicio_basico WHERE activo = TRUE
           UNION ALL
           SELECT 'SIGNAGE' AS kind, id, nombre FROM tipos_senaletica WHERE activo = TRUE
           UNION ALL
           SELECT 'HEALTH' AS kind, id, nombre FROM tipos_servicio_salud WHERE activo = TRUE
           UNION ALL
           SELECT 'SECURITY' AS kind, id, nombre FROM tipos_servicio_seguridad WHERE activo = TRUE
           UNION ALL
           SELECT 'COMMUNICATION' AS kind, id, nombre FROM tipos_comunicacion WHERE activo = TRUE
           UNION ALL
           SELECT 'THREAT' AS kind, id, nombre FROM tipos_amenaza WHERE activo = TRUE`,
        ),
      ]);

    return {
      conditionCodes: new Map(
        (conditions as Array<{ id: string; codigo: string }>).map((row) => [
          Number(row.id),
          row.codigo,
        ]),
      ),
      plantNames: new Map(
        (plants as Array<{ id: string; nombre: string }>).map((row) => [
          Number(row.id),
          row.nombre,
        ]),
      ),
      activityGroups: new Map(
        (activities as Array<{ id: string; groupCode: string }>).map((row) => [
          Number(row.id),
          row.groupCode,
        ]),
      ),
      accessibilityNames: new Map(
        (
          accessibility as Array<{
            id: string;
            codigo: string;
            nombre: string;
          }>
        ).map((row) => [Number(row.id), `${row.codigo} ${row.nombre}`]),
      ),
      hygieneNames: new Map(
        (hygiene as Array<{ kind: string; id: string; nombre: string }>).map(
          (row) => [`${row.kind}:${row.id}`, row.nombre],
        ),
      ),
    };
  }

  private async applyCharacteristicsSection(
    manager: EntityManager,
    centerId: string,
    section: JsonRecord,
  ) {
    if (section.response === "NO_APLICA") {
      await manager.query(
        `DELETE FROM caracteristicas_climaticas WHERE centro_turistico_id = $1`,
        [centerId],
      );
      return;
    }

    if (!isJsonRecord(section.climate)) return;
    const climate = section.climate;
    const climateId = climate.climateId;
    if (!Number.isInteger(climateId) || Number(climateId) < 1) return;

    await manager.query(
      `INSERT INTO caracteristicas_climaticas
        (centro_turistico_id, tipo_clima_id, temperatura_min_c, temperatura_max_c,
         precipitacion_min_mm, precipitacion_max_mm, observacion)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       ON CONFLICT (centro_turistico_id) DO UPDATE SET
        tipo_clima_id = EXCLUDED.tipo_clima_id,
        temperatura_min_c = EXCLUDED.temperatura_min_c,
        temperatura_max_c = EXCLUDED.temperatura_max_c,
        precipitacion_min_mm = EXCLUDED.precipitacion_min_mm,
        precipitacion_max_mm = EXCLUDED.precipitacion_max_mm,
        observacion = EXCLUDED.observacion,
        updated_at = CURRENT_TIMESTAMP`,
      [
        centerId,
        Number(climateId),
        climate.minTemperature ?? null,
        climate.maxTemperature ?? null,
        climate.minRainfall ?? null,
        climate.maxRainfall ?? null,
        climate.observation ?? section.observation ?? null,
      ],
    );
  }

  private async applyVisitorsSection(
    manager: EntityManager,
    centerId: string,
    section: JsonRecord,
  ) {
    const visitors = isJsonRecord(section.visitors) ? section.visitors : null;
    if (section.response === "NO_APLICA") {
      await manager.query(
        `DELETE FROM temporada_meses
          WHERE temporada_visitacion_id IN (
            SELECT id FROM temporadas_visitacion WHERE centro_turistico_id = $1
          )`,
        [centerId],
      );
      await manager.query(
        `DELETE FROM temporadas_visitacion WHERE centro_turistico_id = $1`,
        [centerId],
      );
      await manager.query(
        `DELETE FROM procedencias_visitantes WHERE centro_turistico_id = $1`,
        [centerId],
      );
      await manager.query(
        `DELETE FROM informantes_clave WHERE centro_turistico_id = $1`,
        [centerId],
      );
      await manager.query(
        `DELETE FROM registros_visitantes WHERE centro_turistico_id = $1`,
        [centerId],
      );
      await manager.query(
        `DELETE FROM afluencia_visitantes WHERE centro_turistico_id = $1`,
        [centerId],
      );
      return;
    }
    if (!visitors) return;

    if (visitors.registry !== undefined) {
      const registry = isJsonRecord(visitors.registry)
        ? visitors.registry
        : null;
      if (!registry) {
        await manager.query(
          `DELETE FROM registros_visitantes WHERE centro_turistico_id = $1`,
          [centerId],
        );
      } else {
        await manager.query(
          `INSERT INTO registros_visitantes
             (centro_turistico_id, existe_registro, tipo_registro, anios_registro,
              genera_reportes, frecuencia_reporte, observacion)
           VALUES ($1,$2,$3,$4,$5,$6,$7)
           ON CONFLICT (centro_turistico_id) DO UPDATE SET
             existe_registro = EXCLUDED.existe_registro,
             tipo_registro = EXCLUDED.tipo_registro,
             anios_registro = EXCLUDED.anios_registro,
             genera_reportes = EXCLUDED.genera_reportes,
             frecuencia_reporte = EXCLUDED.frecuencia_reporte,
             observacion = EXCLUDED.observacion,
             updated_at = CURRENT_TIMESTAMP`,
          [
            centerId,
            sectionResponseToBoolean(registry.exists) ?? false,
            registry.type ?? null,
            registry.years ?? null,
            sectionResponseToBoolean(registry.reports) ?? false,
            registry.frequency ?? null,
            registry.observation ?? null,
          ],
        );
      }
    }

    if (Array.isArray(visitors.seasons)) {
      await manager.query(
        `DELETE FROM temporada_meses
          WHERE temporada_visitacion_id IN (
            SELECT id FROM temporadas_visitacion WHERE centro_turistico_id = $1
          )`,
        [centerId],
      );
      await manager.query(
        `DELETE FROM temporadas_visitacion WHERE centro_turistico_id = $1`,
        [centerId],
      );
      for (const season of visitors.seasons as JsonRecord[]) {
        const rows = (await manager.query(
          `INSERT INTO temporadas_visitacion
             (centro_turistico_id, tipo_temporada, cantidad_visitantes, anio, observacion)
           VALUES ($1,$2,$3,$4,$5)
           RETURNING id`,
          [
            centerId,
            season.type,
            season.quantity ?? null,
            season.year ?? null,
            season.observation ?? null,
          ],
        )) as Array<{ id: string }>;
        const seasonId = rows[0]?.id;
        if (!seasonId || !Array.isArray(season.months)) continue;
        for (const month of season.months) {
          await manager.query(
            `INSERT INTO temporada_meses (temporada_visitacion_id, mes_id)
             VALUES ($1,$2)`,
            [seasonId, month],
          );
        }
      }
    }

    if (Array.isArray(visitors.origins)) {
      await manager.query(
        `DELETE FROM procedencias_visitantes WHERE centro_turistico_id = $1`,
        [centerId],
      );
      for (const origin of visitors.origins as JsonRecord[]) {
        await manager.query(
          `INSERT INTO procedencias_visitantes
             (centro_turistico_id, tipo_procedencia, lugar, mes_id, anio,
              cantidad_visitantes, observacion)
           VALUES ($1,$2,$3,$4,$5,$6,$7)`,
          [
            centerId,
            origin.type,
            origin.place,
            origin.month ?? null,
            origin.year ?? null,
            origin.quantity ?? null,
            origin.observation ?? null,
          ],
        );
      }
    }

    if (Array.isArray(visitors.informants)) {
      await manager.query(
        `DELETE FROM informantes_clave WHERE centro_turistico_id = $1`,
        [centerId],
      );
      for (const informant of visitors.informants as JsonRecord[]) {
        await manager.query(
          `INSERT INTO informantes_clave
             (centro_turistico_id, nombre, contacto, observacion)
           VALUES ($1,$2,$3,$4)`,
          [
            centerId,
            informant.name,
            informant.contact ?? null,
            informant.observation ?? null,
          ],
        );
      }
    }

    if (visitors.influx !== undefined) {
      const influx = isJsonRecord(visitors.influx) ? visitors.influx : null;
      if (!influx) {
        await manager.query(
          `DELETE FROM afluencia_visitantes WHERE centro_turistico_id = $1`,
          [centerId],
        );
      } else {
        await manager.query(
          `INSERT INTO afluencia_visitantes
             (centro_turistico_id, cantidad_entre_semana, cantidad_fin_semana,
              cantidad_feriados, frecuencia_demanda, observacion)
           VALUES ($1,$2,$3,$4,$5,$6)
           ON CONFLICT (centro_turistico_id) DO UPDATE SET
             cantidad_entre_semana = EXCLUDED.cantidad_entre_semana,
             cantidad_fin_semana = EXCLUDED.cantidad_fin_semana,
             cantidad_feriados = EXCLUDED.cantidad_feriados,
             frecuencia_demanda = EXCLUDED.frecuencia_demanda,
             observacion = EXCLUDED.observacion,
             updated_at = CURRENT_TIMESTAMP`,
          [
            centerId,
            influx.weekday ?? null,
            influx.weekend ?? null,
            influx.holidays ?? null,
            influx.frequency ?? null,
            influx.observation ?? null,
          ],
        );
      }
    }
  }

  private async applyPoliciesSection(
    manager: EntityManager,
    centerId: string,
    section: JsonRecord,
  ) {
    if (section.response === "NO_APLICA") {
      await manager.query(
        `DELETE FROM respuestas_politica_centro WHERE centro_turistico_id = $1`,
        [centerId],
      );
      return;
    }
    if (!Array.isArray(section.policies)) return;
    const policies = section.policies as JsonRecord[];
    const codes = policies.map((policy) => String(policy.code));
    const rows = (await manager.query(
      `SELECT id, codigo FROM preguntas_politica
        WHERE activo = TRUE AND codigo = ANY($1::text[])`,
      [codes],
    )) as Array<{ id: string; codigo: string }>;
    const byCode = new Map(rows.map((row) => [row.codigo, row.id]));
    if (rows.length !== new Set(codes).size) {
      throw new ConflictException(
        "Una pregunta de política ya no está disponible en el catálogo.",
      );
    }
    await manager.query(
      `DELETE FROM respuestas_politica_centro WHERE centro_turistico_id = $1`,
      [centerId],
    );
    for (const policy of policies) {
      const questionId = byCode.get(String(policy.code));
      if (!questionId) continue;
      await manager.query(
        `INSERT INTO respuestas_politica_centro
           (centro_turistico_id, pregunta_politica_id, respuesta, anio,
            especificacion, observacion)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [
          centerId,
          questionId,
          sectionResponseToBoolean(policy.response) ?? false,
          policy.year ?? null,
          policy.specification ?? null,
          policy.observation ?? null,
        ],
      );
    }
  }

  private async applyPromotionSection(
    manager: EntityManager,
    centerId: string,
    section: JsonRecord,
  ) {
    if (section.response === "NO_APLICA") {
      await manager.query(
        `DELETE FROM medios_promocion_centro_turistico WHERE centro_turistico_id = $1`,
        [centerId],
      );
      await manager.query(
        `DELETE FROM promocion_centro_turistico WHERE centro_turistico_id = $1`,
        [centerId],
      );
      return;
    }
    const promotion = isJsonRecord(section.promotion)
      ? section.promotion
      : null;
    if (!promotion) return;
    await manager.query(
      `INSERT INTO promocion_centro_turistico
         (centro_turistico_id, tiene_plan_promocion, nombre_plan,
          incluido_en_plan, forma_parte_paquete, detalle_paquete, observacion)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       ON CONFLICT (centro_turistico_id) DO UPDATE SET
         tiene_plan_promocion = EXCLUDED.tiene_plan_promocion,
         nombre_plan = EXCLUDED.nombre_plan,
         incluido_en_plan = EXCLUDED.incluido_en_plan,
         forma_parte_paquete = EXCLUDED.forma_parte_paquete,
         detalle_paquete = EXCLUDED.detalle_paquete,
         observacion = EXCLUDED.observacion,
         updated_at = CURRENT_TIMESTAMP`,
      [
        centerId,
        sectionResponseToBoolean(promotion.hasPlan) ?? false,
        promotion.planName ?? null,
        sectionResponseToBoolean(promotion.includedInPlan),
        sectionResponseToBoolean(promotion.partOfPackage) ?? false,
        promotion.packageDetail ?? null,
        promotion.observation ?? section.observation ?? null,
      ],
    );
    if (Array.isArray(promotion.media)) {
      await manager.query(
        `DELETE FROM medios_promocion_centro_turistico WHERE centro_turistico_id = $1`,
        [centerId],
      );
      for (const medium of (promotion.media as JsonRecord[]).filter(
        (item) => item.response === "SI",
      )) {
        if (!Number.isInteger(medium.typeId) || Number(medium.typeId) < 1) {
          throw new ConflictException(
            "Cada medio de promoción requiere un tipo activo del catálogo.",
          );
        }
        await manager.query(
          `INSERT INTO medios_promocion_centro_turistico
             (centro_turistico_id, tipo_medio_promocion_id, nombre, url,
              periodicidad, detalle_otro, observacion)
           VALUES ($1,$2,$3,$4,$5,$6,$7)`,
          [
            centerId,
            medium.typeId,
            medium.name ?? null,
            medium.url ?? null,
            medium.periodicity ?? null,
            medium.detailOther ?? null,
            medium.observation ?? null,
          ],
        );
      }
    }
  }

  private async applyHumanResourcesSection(
    manager: EntityManager,
    centerId: string,
    section: JsonRecord,
  ) {
    if (section.response === "NO_APLICA") {
      await manager.query(
        `DELETE FROM formacion_personal_centro WHERE centro_turistico_id = $1`,
        [centerId],
      );
      await manager.query(
        `DELETE FROM resumen_recurso_humano WHERE centro_turistico_id = $1`,
        [centerId],
      );
      return;
    }
    const resources = isJsonRecord(section.humanResources)
      ? section.humanResources
      : null;
    if (!resources) return;
    const summary = isJsonRecord(resources.summary) ? resources.summary : null;
    if (summary) {
      await manager.query(
        `INSERT INTO resumen_recurso_humano
           (centro_turistico_id, personas_administracion_operacion,
            personal_especializado_turismo, observacion)
         VALUES ($1,$2,$3,$4)
         ON CONFLICT (centro_turistico_id) DO UPDATE SET
           personas_administracion_operacion = EXCLUDED.personas_administracion_operacion,
           personal_especializado_turismo = EXCLUDED.personal_especializado_turismo,
           observacion = EXCLUDED.observacion,
           updated_at = CURRENT_TIMESTAMP`,
        [
          centerId,
          summary.administrationOperation ?? null,
          summary.specializedTourism ?? null,
          summary.observation ?? section.observation ?? null,
        ],
      );
    }
    if (Array.isArray(resources.training)) {
      await manager.query(
        `DELETE FROM formacion_personal_centro WHERE centro_turistico_id = $1`,
        [centerId],
      );
      for (const training of resources.training as JsonRecord[]) {
        if (!Number.isInteger(training.typeId) || Number(training.typeId) < 1) {
          throw new ConflictException(
            "Cada formación requiere un tipo activo del catálogo.",
          );
        }
        await manager.query(
          `INSERT INTO formacion_personal_centro
             (centro_turistico_id, tipo_formacion_personal_id,
              cantidad_personas, detalle_otro, observacion)
           VALUES ($1,$2,$3,$4,$5)`,
          [
            centerId,
            training.typeId,
            training.quantity ?? 0,
            training.detailOther ?? null,
            training.observation ?? null,
          ],
        );
      }
    }
  }

  private async applyConservationSection(
    manager: EntityManager,
    centerId: string,
    section: JsonRecord,
  ) {
    await manager.query(
      `DELETE FROM evaluacion_factores_alteracion
        WHERE evaluacion_conservacion_id IN (
          SELECT id FROM evaluaciones_conservacion WHERE centro_turistico_id = $1
        )`,
      [centerId],
    );
    await manager.query(
      `DELETE FROM evaluaciones_conservacion WHERE centro_turistico_id = $1`,
      [centerId],
    );
    await manager.query(
      `DELETE FROM declaratorias_turisticas WHERE centro_turistico_id = $1`,
      [centerId],
    );
    if (section.response === "NO_APLICA") return;

    const conservation = isJsonRecord(section.conservation)
      ? section.conservation
      : null;
    if (conservation) {
      const entries = [
        ["ATRACTIVO", conservation.attraction],
        ["ENTORNO", conservation.environment],
      ] as const;
      const states: Array<{
        componentCode: "ATRACTIVO" | "ENTORNO";
        value: JsonRecord;
      }> = [];
      for (const [componentCode, value] of entries) {
        if (
          isJsonRecord(value) &&
          typeof value.state === "string" &&
          value.state.trim().length > 0
        ) {
          states.push({ componentCode, value });
        }
      }
      if (states.length > 0) {
        const stateCodes = states.map((entry) => String(entry.value.state));
        const stateRows = (await manager.query(
          `SELECT id, codigo FROM estados_conservacion
            WHERE activo = TRUE AND codigo = ANY($1::text[])`,
          [stateCodes],
        )) as Array<{ id: string; codigo: string }>;
        const stateByCode = new Map(
          stateRows.map((row) => [row.codigo, row.id]),
        );
        const componentRows = (await manager.query(
          `SELECT id, codigo FROM componentes_conservacion
            WHERE codigo = ANY($1::text[])`,
          [states.map((entry) => entry.componentCode)],
        )) as Array<{ id: string; codigo: string }>;
        const componentByCode = new Map(
          componentRows.map((row) => [row.codigo, row.id]),
        );
        for (const entry of states) {
          const stateId = stateByCode.get(String(entry.value.state));
          const componentId = componentByCode.get(entry.componentCode);
          if (!stateId || !componentId) continue;
          await manager.query(
            `INSERT INTO evaluaciones_conservacion
               (centro_turistico_id, componente_conservacion_id,
                estado_conservacion_id, observacion)
             VALUES ($1,$2,$3,$4)`,
            [
              centerId,
              componentId,
              stateId,
              entry.value.observation ?? section.observation ?? null,
            ],
          );
        }
      }
      if (
        Array.isArray(conservation.factors) &&
        conservation.factors.length > 0
      ) {
        const evaluationRows = (await manager.query(
          `SELECT ev.id, cc.codigo
             FROM evaluaciones_conservacion ev
             JOIN componentes_conservacion cc
               ON cc.id = ev.componente_conservacion_id
            WHERE ev.centro_turistico_id = $1`,
          [centerId],
        )) as Array<{ id: string; codigo: string }>;
        const evaluationByComponent = new Map(
          evaluationRows.map((row) => [row.codigo, row.id]),
        );
        for (const factor of conservation.factors as JsonRecord[]) {
          const component = String(factor.component || "ATRACTIVO");
          const evaluationId = evaluationByComponent.get(component);
          if (!evaluationId) {
            throw new ConflictException(
              "Cada factor requiere una evaluación de conservación para su componente.",
            );
          }
          if (
            !Number.isInteger(factor.factorId) ||
            Number(factor.factorId) < 1
          ) {
            throw new ConflictException(
              "Cada factor requiere un factor activo del catálogo.",
            );
          }
          await manager.query(
            `INSERT INTO evaluacion_factores_alteracion
               (evaluacion_conservacion_id, factor_alteracion_id,
                presente, detalle_otro, observacion)
             VALUES ($1,$2,$3,$4,$5)`,
            [
              evaluationId,
              factor.factorId,
              sectionResponseToBoolean(factor.response) ?? false,
              factor.detailOther ?? null,
              factor.observation ?? null,
            ],
          );
        }
      }
    }

    if (Array.isArray(section.declarations)) {
      for (const declaration of section.declarations as JsonRecord[]) {
        await manager.query(
          `INSERT INTO declaratorias_turisticas
             (centro_turistico_id, entidad_declarante, denominacion,
              fecha_declaratoria, ambito, observacion)
           VALUES ($1,$2,$3,$4::date,$5,$6)`,
          [
            centerId,
            declaration.entity,
            declaration.denomination,
            declaration.date ?? null,
            declaration.scope ?? null,
            declaration.observation ?? null,
          ],
        );
      }
    }
  }

  private async applyHygieneSection(
    manager: EntityManager,
    centerId: string,
    section: JsonRecord,
  ) {
    const hygiene = isJsonRecord(section.hygieneSafety)
      ? section.hygieneSafety
      : null;
    const clearEntries = async () => {
      await manager.query(
        `DELETE FROM servicios_basicos_centro WHERE centro_turistico_id = $1`,
        [centerId],
      );
      await manager.query(
        `DELETE FROM senaletica_centro WHERE centro_turistico_id = $1`,
        [centerId],
      );
      await manager.query(
        `DELETE FROM servicios_salud_centro WHERE centro_turistico_id = $1`,
        [centerId],
      );
      await manager.query(
        `DELETE FROM servicios_seguridad_centro WHERE centro_turistico_id = $1`,
        [centerId],
      );
      await manager.query(
        `DELETE FROM comunicaciones_centro WHERE centro_turistico_id = $1`,
        [centerId],
      );
      await manager.query(
        `DELETE FROM amenazas_centro WHERE centro_turistico_id = $1`,
        [centerId],
      );
    };
    if (section.response === "NO_APLICA") {
      await clearEntries();
      await manager.query(
        `DELETE FROM radios_portatiles_centro WHERE centro_turistico_id = $1`,
        [centerId],
      );
      await manager.query(
        `DELETE FROM planes_contingencia WHERE centro_turistico_id = $1`,
        [centerId],
      );
      return;
    }
    if (!hygiene) return;
    if (Array.isArray(hygiene.entries)) {
      await clearEntries();
      const entries = hygiene.entries as JsonRecord[];
      const scopeCodes = [
        ...new Set(
          entries
            .map((entry) => entry.scope)
            .filter((scope): scope is string => typeof scope === "string"),
        ),
      ];
      const scopeRows = scopeCodes.length
        ? ((await manager.query(
            `SELECT id, codigo FROM ambitos_ubicacion_servicio
              WHERE activo = TRUE AND codigo = ANY($1::text[])`,
            [scopeCodes],
          )) as Array<{ id: string; codigo: string }>)
        : [];
      const scopeByCode = new Map(scopeRows.map((row) => [row.codigo, row.id]));
      const conditionCodes = [
        ...new Set(
          entries
            .map((entry) => entry.condition)
            .filter(
              (condition): condition is string =>
                typeof condition === "string" && condition.length > 0,
            ),
        ),
      ];
      const conditionRows = conditionCodes.length
        ? ((await manager.query(
            `SELECT id, codigo FROM estados_condicion
              WHERE activo = TRUE AND codigo = ANY($1::text[])`,
            [conditionCodes],
          )) as Array<{ id: string; codigo: string }>)
        : [];
      const conditionByCode = new Map(
        conditionRows.map((row) => [row.codigo, row.id]),
      );
      for (const entry of entries) {
        const kind = String(entry.kind);
        const response = entry.response;
        if (kind !== "THREAT" && response !== "SI") continue;
        if (kind === "THREAT" && !isBinarySectionResponse(response)) continue;
        if (!Number.isInteger(entry.typeId) || Number(entry.typeId) < 1) {
          throw new ConflictException(
            "Cada registro de higiene requiere un tipo activo del catálogo.",
          );
        }
        const scopeId =
          typeof entry.scope === "string"
            ? scopeByCode.get(entry.scope)
            : undefined;
        if (
          ["BASIC_SERVICE", "HEALTH", "COMMUNICATION"].includes(kind) &&
          !scopeId
        ) {
          throw new ConflictException(
            "Los servicios de higiene requieren un ámbito activo del catálogo.",
          );
        }
        if (kind === "BASIC_SERVICE") {
          await manager.query(
            `INSERT INTO servicios_basicos_centro
               (centro_turistico_id, ambito_ubicacion_servicio_id,
                tipo_servicio_basico_id, proveedor, especificacion, observacion)
             VALUES ($1,$2,$3,$4,$5,$6)`,
            [
              centerId,
              scopeId,
              entry.typeId,
              entry.provider ?? null,
              entry.secondary ?? null,
              entry.observation ?? null,
            ],
          );
        } else if (kind === "SIGNAGE") {
          await manager.query(
            `INSERT INTO senaletica_centro
               (centro_turistico_id, tipo_senaletica_id,
                material_senaletica_id, cantidad, estado_condicion_id,
                detalle, observacion)
             VALUES ($1,$2,$3,$4,$5,$6,$7)`,
            [
              centerId,
              entry.typeId,
              entry.secondaryId ?? null,
              entry.quantity ?? null,
              typeof entry.condition === "string"
                ? (conditionByCode.get(entry.condition) ?? null)
                : null,
              entry.secondary ?? null,
              entry.observation ?? null,
            ],
          );
        } else if (kind === "HEALTH") {
          await manager.query(
            `INSERT INTO servicios_salud_centro
               (centro_turistico_id, ambito_ubicacion_servicio_id,
                tipo_servicio_salud_id, cantidad, detalle_otro, observacion)
             VALUES ($1,$2,$3,$4,$5,$6)`,
            [
              centerId,
              scopeId,
              entry.typeId,
              entry.quantity ?? null,
              entry.secondary ?? null,
              entry.observation ?? null,
            ],
          );
        } else if (kind === "SECURITY") {
          await manager.query(
            `INSERT INTO servicios_seguridad_centro
               (centro_turistico_id, tipo_servicio_seguridad_id,
                detalle, observacion)
             VALUES ($1,$2,$3,$4)`,
            [
              centerId,
              entry.typeId,
              entry.secondary ?? null,
              entry.observation ?? null,
            ],
          );
        } else if (kind === "COMMUNICATION") {
          await manager.query(
            `INSERT INTO comunicaciones_centro
               (centro_turistico_id, ambito_ubicacion_servicio_id,
                tipo_comunicacion_id, observacion)
             VALUES ($1,$2,$3,$4)`,
            [centerId, scopeId, entry.typeId, entry.observation ?? null],
          );
        } else if (kind === "THREAT") {
          await manager.query(
            `INSERT INTO amenazas_centro
               (centro_turistico_id, tipo_amenaza_id, presente, observacion)
             VALUES ($1,$2,$3,$4)`,
            [
              centerId,
              entry.typeId,
              sectionResponseToBoolean(response) ?? false,
              entry.observation ?? null,
            ],
          );
        }
      }
    }
    const radios = isJsonRecord(hygiene.radios) ? hygiene.radios : null;
    if (radios) {
      await manager.query(
        `INSERT INTO radios_portatiles_centro
           (centro_turistico_id, disponible, uso_visitantes, uso_interno,
            uso_emergencias, cantidad, observacion)
         VALUES ($1,$2,$3,$4,$5,$6,$7)
         ON CONFLICT (centro_turistico_id) DO UPDATE SET
           disponible = EXCLUDED.disponible,
           uso_visitantes = EXCLUDED.uso_visitantes,
           uso_interno = EXCLUDED.uso_interno,
           uso_emergencias = EXCLUDED.uso_emergencias,
           cantidad = EXCLUDED.cantidad,
           observacion = EXCLUDED.observacion,
           updated_at = CURRENT_TIMESTAMP`,
        [
          centerId,
          sectionResponseToBoolean(radios.available) ?? false,
          sectionResponseToBoolean(radios.visitorUse) ?? false,
          sectionResponseToBoolean(radios.internalUse) ?? false,
          sectionResponseToBoolean(radios.emergencyUse) ?? false,
          radios.quantity ?? null,
          radios.observation ?? section.observation ?? null,
        ],
      );
    }
    const contingency = isJsonRecord(hygiene.contingency)
      ? hygiene.contingency
      : null;
    if (contingency) {
      await manager.query(
        `INSERT INTO planes_contingencia
           (centro_turistico_id, existe, institucion_responsable,
            nombre_documento, anio, observacion)
         VALUES ($1,$2,$3,$4,$5,$6)
         ON CONFLICT (centro_turistico_id) DO UPDATE SET
           existe = EXCLUDED.existe,
           institucion_responsable = EXCLUDED.institucion_responsable,
           nombre_documento = EXCLUDED.nombre_documento,
           anio = EXCLUDED.anio,
           observacion = EXCLUDED.observacion,
           updated_at = CURRENT_TIMESTAMP`,
        [
          centerId,
          sectionResponseToBoolean(contingency.exists) ?? false,
          contingency.institution ?? null,
          contingency.document ?? null,
          contingency.year ?? null,
          contingency.observation ?? section.observation ?? null,
        ],
      );
    }
  }

  private async applyAnnexesSection(
    manager: EntityManager,
    centerId: string,
    section: JsonRecord,
  ) {
    const annexes = isJsonRecord(section.annexes) ? section.annexes : null;
    if (section.response === "NO_APLICA") {
      await manager.query(
        `DELETE FROM responsables_ficha WHERE centro_turistico_id = $1`,
        [centerId],
      );
      await manager.query(
        `DELETE FROM levantamientos_accesibilidad WHERE centro_turistico_id = $1`,
        [centerId],
      );
      await manager.query(
        `DELETE FROM validaciones_gad WHERE centro_turistico_id = $1`,
        [centerId],
      );
      return;
    }
    if (!annexes) return;

    const survey = isJsonRecord(annexes.accessibilitySurvey)
      ? annexes.accessibilitySurvey
      : null;
    await manager.query(
      `DELETE FROM levantamientos_accesibilidad WHERE centro_turistico_id = $1`,
      [centerId],
    );
    if (
      survey &&
      [survey.date, survey.responsible, survey.scope, survey.observation].some(
        (value) => typeof value === "string" && value.trim().length > 0,
      )
    ) {
      await manager.query(
        `INSERT INTO levantamientos_accesibilidad
           (centro_turistico_id, fecha, responsable_nombre,
            responsable_institucion, observacion)
         VALUES ($1,$2::date,$3,$4,$5)`,
        [
          centerId,
          survey.date ?? null,
          survey.responsible ?? null,
          survey.scope ?? null,
          survey.observation ?? section.observation ?? null,
        ],
      );
    }

    const gad = isJsonRecord(annexes.gadValidation)
      ? annexes.gadValidation
      : null;
    await manager.query(
      `DELETE FROM validaciones_gad WHERE centro_turistico_id = $1`,
      [centerId],
    );
    if (gad) {
      await manager.query(
        `INSERT INTO validaciones_gad
           (centro_turistico_id, nombre_validador, telefono, email,
            institucion, cargo, fecha, acepta_publicacion, observacion)
         VALUES ($1,$2,$3,$4,$5,$6,$7::date,$8,$9)`,
        [
          centerId,
          gad.name,
          gad.phone ?? null,
          gad.email ?? null,
          gad.institution,
          gad.position ?? null,
          gad.date ?? null,
          sectionResponseToBoolean(gad.acceptance),
          gad.observation ?? section.observation ?? null,
        ],
      );
    }

    if (Array.isArray(annexes.responsibles)) {
      await manager.query(
        `DELETE FROM responsables_ficha WHERE centro_turistico_id = $1`,
        [centerId],
      );
      for (const responsible of annexes.responsibles as JsonRecord[]) {
        if (
          !Number.isInteger(responsible.typeId) ||
          Number(responsible.typeId) < 1
        ) {
          throw new ConflictException(
            "Cada responsable requiere un tipo activo de responsabilidad.",
          );
        }
        await manager.query(
          `INSERT INTO responsables_ficha
             (centro_turistico_id, tipo_responsabilidad_ficha_id, nombre,
              institucion, cargo, email, telefono, fecha, observacion)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8::date,$9)`,
          [
            centerId,
            responsible.typeId,
            responsible.name,
            responsible.institution ?? null,
            responsible.role ?? null,
            responsible.email ?? null,
            responsible.phone ?? null,
            responsible.date ?? null,
            responsible.observation ?? null,
          ],
        );
      }
    }
  }

  private async applyAccessibilitySection(
    manager: EntityManager,
    centerId: string,
    section: JsonRecord,
  ) {
    if (section.localityId !== undefined && section.localityId !== null) {
      await manager.query(
        `INSERT INTO centro_localidad_cercana
           (centro_turistico_id, localidad_id, distancia_km, observacion)
         VALUES ($1,$2,$3,$4)
         ON CONFLICT (centro_turistico_id) DO UPDATE SET
           localidad_id = EXCLUDED.localidad_id,
           distancia_km = EXCLUDED.distancia_km,
           observacion = EXCLUDED.observacion,
           updated_at = CURRENT_TIMESTAMP`,
        [
          centerId,
          section.localityId,
          section.distanceKm ?? null,
          section.observation ?? null,
        ],
      );
    }

    const details = isJsonRecord(section.accessibilityDetails)
      ? section.accessibilityDetails
      : null;
    if (!details) return;

    if (Array.isArray(details.roads) && details.roads.length > 0) {
      await manager.query(
        `DELETE FROM vias_acceso_terrestre WHERE centro_turistico_id = $1`,
        [centerId],
      );
      for (const item of details.roads as JsonRecord[]) {
        await manager.query(
          `INSERT INTO vias_acceso_terrestre
             (centro_turistico_id, tipo_via_terrestre_id, latitud_inicio,
              longitud_inicio, latitud_fin, longitud_fin, distancia_km,
              material_via_id, estado_condicion_id, observacion)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
          [
            centerId,
            item.roadTypeId,
            item.startLatitude ?? null,
            item.startLongitude ?? null,
            item.endLatitude ?? null,
            item.endLongitude ?? null,
            item.distanceKm ?? null,
            item.materialId ?? null,
            item.conditionId ?? null,
            item.observation ?? null,
          ],
        );
      }
    }

    if (Array.isArray(details.aquatic) && details.aquatic.length > 0) {
      await manager.query(
        `DELETE FROM accesos_acuaticos WHERE centro_turistico_id = $1`,
        [centerId],
      );
      for (const item of details.aquatic as JsonRecord[]) {
        await manager.query(
          `INSERT INTO accesos_acuaticos
             (centro_turistico_id, modalidad_acceso_acuatico_id,
              puerto_embarque, estado_puerto_embarque_id, puerto_llegada,
              estado_puerto_llegada_id, observacion)
           VALUES ($1,$2,$3,$4,$5,$6,$7)`,
          [
            centerId,
            item.modalityId,
            item.departure ?? null,
            item.departureConditionId ?? null,
            item.arrival ?? null,
            item.arrivalConditionId ?? null,
            item.observation ?? null,
          ],
        );
      }
    }

    if (Array.isArray(details.aerial) && details.aerial.length > 0) {
      await manager.query(
        `DELETE FROM accesos_aereos WHERE centro_turistico_id = $1`,
        [centerId],
      );
      for (const item of details.aerial as JsonRecord[]) {
        await manager.query(
          `INSERT INTO accesos_aereos
             (centro_turistico_id, cobertura_acceso_aereo_id, observacion)
           VALUES ($1,$2,$3)`,
          [centerId, item.coverageId, item.observation ?? null],
        );
      }
    }

    if (
      Array.isArray(details.transportTypes) &&
      details.transportTypes.length > 0
    ) {
      await manager.query(
        `DELETE FROM centro_tipos_transporte WHERE centro_turistico_id = $1`,
        [centerId],
      );
      await manager.query(
        `DELETE FROM transporte_centro WHERE centro_turistico_id = $1`,
        [centerId],
      );
      const selected = (details.transportTypes as JsonRecord[]).filter(
        (item) => item.applies === true,
      );
      for (const item of selected) {
        await manager.query(
          `INSERT INTO centro_tipos_transporte
             (centro_turistico_id, tipo_transporte_id)
           VALUES ($1,$2)`,
          [centerId, item.typeId],
        );
      }
      const other = (details.transportTypes as JsonRecord[])
        .map((item) => String(item.detailOther ?? "").trim())
        .filter(Boolean)
        .join("; ");
      const observations = (details.transportTypes as JsonRecord[])
        .map((item) => String(item.observation ?? "").trim())
        .filter(Boolean)
        .join("; ");
      if (other || observations) {
        await manager.query(
          `INSERT INTO transporte_centro
             (centro_turistico_id, detalle_otro, observacion)
           VALUES ($1,$2,$3)`,
          [centerId, other || null, observations || null],
        );
      }
    }

    if (
      Array.isArray(details.transportDetails) &&
      details.transportDetails.length > 0
    ) {
      await manager.query(
        `DELETE FROM detalles_transporte WHERE centro_turistico_id = $1`,
        [centerId],
      );
      for (const item of details.transportDetails as JsonRecord[]) {
        await manager.query(
          `INSERT INTO detalles_transporte
             (centro_turistico_id, operador_cooperativa, estacion_terminal,
              frecuencia_servicio_id, detalle_traslado, observacion)
           VALUES ($1,$2,$3,$4,$5,$6)`,
          [
            centerId,
            item.operator,
            item.terminal ?? null,
            item.frequencyId ?? null,
            item.transferDetail ?? null,
            item.observation ?? null,
          ],
        );
      }
    }

    if (Array.isArray(details.criteria) && details.criteria.length > 0) {
      await manager.query(
        `DELETE FROM respuestas_accesibilidad WHERE centro_turistico_id = $1`,
        [centerId],
      );
      for (const item of details.criteria as JsonRecord[]) {
        await manager.query(
          `INSERT INTO respuestas_accesibilidad
             (centro_turistico_id, criterio_accesibilidad_id, cumple, detalle, observacion)
           VALUES ($1,$2,$3,$4,$5)`,
          [
            centerId,
            item.criterionId,
            sectionResponseToBoolean(item.response),
            item.detail ?? null,
            item.observation ?? null,
          ],
        );
      }
    }

    if (isJsonRecord(details.signage)) {
      const available = details.signage.available;
      if (available === "SI" || available === "NO") {
        await manager.query(
          `INSERT INTO senalizaciones_aproximacion
             (centro_turistico_id, disponible, estado_condicion_id, observacion)
           VALUES ($1,$2,$3,$4)
           ON CONFLICT (centro_turistico_id) DO UPDATE SET
             disponible = EXCLUDED.disponible,
             estado_condicion_id = EXCLUDED.estado_condicion_id,
             observacion = EXCLUDED.observacion,
             updated_at = CURRENT_TIMESTAMP`,
          [
            centerId,
            available === "SI",
            details.signage.conditionId ?? null,
            details.signage.observation ?? null,
          ],
        );
      }
    }
  }

  private async applyPlantSection(
    manager: EntityManager,
    centerId: string,
    section: JsonRecord,
  ) {
    const scopes = (await manager.query(
      `SELECT id, codigo AS code FROM ambitos_ubicacion_servicio WHERE activo = TRUE`,
    )) as Array<{ id: string; code: string }>;
    const scopeId = (code: unknown) => {
      const row = scopes.find((item) => item.code === code);
      if (!row) {
        throw new ConflictException(
          "El ámbito de ubicación ya no está disponible para publicar.",
        );
      }
      return row.id;
    };

    if (section.plant !== undefined) {
      await manager.query(
        `DELETE FROM planta_turistica_centro WHERE centro_turistico_id = $1`,
        [centerId],
      );
      for (const item of section.plant as JsonRecord[]) {
        await manager.query(
          `INSERT INTO planta_turistica_centro
             (centro_turistico_id, ambito_ubicacion_servicio_id, tipo_planta_turistica_id,
              cantidad_1, cantidad_2, cantidad_3, observacion)
           VALUES ($1,$2,$3,$4,$5,$6,$7)`,
          [
            centerId,
            scopeId(item.scope),
            item.typeId,
            item.quantity1 ?? null,
            item.quantity2 ?? null,
            item.quantity3 ?? null,
            item.observation ?? null,
          ],
        );
      }
    }

    if (
      Array.isArray(section.facilitiesDetails) &&
      section.facilitiesDetails.length > 0
    ) {
      await manager.query(
        `DELETE FROM facilidades_centro WHERE centro_turistico_id = $1`,
        [centerId],
      );
      for (const item of section.facilitiesDetails as JsonRecord[]) {
        await manager.query(
          `INSERT INTO facilidades_centro
             (centro_turistico_id, tipo_facilidad_id, cantidad, latitud, longitud,
              administrador, accesibilidad_universal, estado_condicion_id, detalle_otro, observacion)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
          [
            centerId,
            item.typeId,
            item.quantity,
            item.latitude ?? null,
            item.longitude ?? null,
            item.administrator ?? null,
            sectionResponseToBoolean(item.universalAccessibility),
            item.conditionId ?? null,
            item.detailOther ?? null,
            item.observation ?? null,
          ],
        );
      }
    }

    if (section.complementaryServices !== undefined) {
      await manager.query(
        `DELETE FROM servicios_complementarios_centro WHERE centro_turistico_id = $1`,
        [centerId],
      );
      for (const item of section.complementaryServices as JsonRecord[]) {
        await manager.query(
          `INSERT INTO servicios_complementarios_centro
             (centro_turistico_id, ambito_ubicacion_servicio_id,
              tipo_servicio_complementario_id, especificacion, observacion)
           VALUES ($1,$2,$3,$4,$5)`,
          [
            centerId,
            scopeId(item.scope),
            item.typeId,
            item.specification ?? null,
            item.observation ?? null,
          ],
        );
      }
    }
  }

  private async readPublishedAccessibilitySection(
    manager: EntityManager,
    centerId: string,
  ): Promise<Record<string, unknown> | null> {
    const [
      localityRows,
      roadsRows,
      aquaticRows,
      aerialRows,
      transportRows,
      detailRows,
      criteriaRows,
      signageRows,
    ] = (await Promise.all([
      manager.query(
        `SELECT json_build_object(
                    'localityId', localidad_id,
                    'distanceKm', distancia_km,
                    'observation', observacion
                  ) AS data
             FROM centro_localidad_cercana
            WHERE centro_turistico_id = $1`,
        [centerId],
      ),
      manager.query(
        `SELECT COALESCE(json_agg(json_build_object(
                    'roadTypeId', tipo_via_terrestre_id,
                    'startLatitude', latitud_inicio,
                    'startLongitude', longitud_inicio,
                    'endLatitude', latitud_fin,
                    'endLongitude', longitud_fin,
                    'distanceKm', distancia_km,
                    'materialId', material_via_id,
                    'conditionId', estado_condicion_id,
                    'observation', observacion
                  ) ORDER BY id), '[]'::json) AS data
             FROM vias_acceso_terrestre
            WHERE centro_turistico_id = $1`,
        [centerId],
      ),
      manager.query(
        `SELECT COALESCE(json_agg(json_build_object(
                    'modalityId', modalidad_acceso_acuatico_id,
                    'departure', puerto_embarque,
                    'departureConditionId', estado_puerto_embarque_id,
                    'arrival', puerto_llegada,
                    'arrivalConditionId', estado_puerto_llegada_id,
                    'observation', observacion
                  ) ORDER BY id), '[]'::json) AS data
             FROM accesos_acuaticos
            WHERE centro_turistico_id = $1`,
        [centerId],
      ),
      manager.query(
        `SELECT COALESCE(json_agg(json_build_object(
                    'coverageId', cobertura_acceso_aereo_id,
                    'observation', observacion
                  ) ORDER BY id), '[]'::json) AS data
             FROM accesos_aereos
            WHERE centro_turistico_id = $1`,
        [centerId],
      ),
      manager.query(
        `SELECT COALESCE(json_agg(json_build_object(
                    'typeId', ctt.tipo_transporte_id,
                    'applies', TRUE,
                    'detailOther', tc.detalle_otro,
                    'observation', tc.observacion
                  ) ORDER BY ctt.tipo_transporte_id), '[]'::json) AS data
             FROM centro_tipos_transporte ctt
             LEFT JOIN transporte_centro tc
               ON tc.centro_turistico_id = ctt.centro_turistico_id
            WHERE ctt.centro_turistico_id = $1`,
        [centerId],
      ),
      manager.query(
        `SELECT COALESCE(json_agg(json_build_object(
                    'operator', operador_cooperativa,
                    'terminal', estacion_terminal,
                    'frequencyId', frecuencia_servicio_id,
                    'transferDetail', detalle_traslado,
                    'observation', observacion
                  ) ORDER BY id), '[]'::json) AS data
             FROM detalles_transporte
            WHERE centro_turistico_id = $1`,
        [centerId],
      ),
      manager.query(
        `SELECT COALESCE(json_agg(json_build_object(
                    'criterionId', ra.criterio_accesibilidad_id,
                    'accessibilityTypeId', ca.tipo_accesibilidad_id,
                    'label', ca.descripcion,
                    'response', CASE
                      WHEN ra.cumple IS TRUE THEN 'SI'
                      WHEN ra.cumple IS FALSE THEN 'NO'
                      ELSE 'SIN_INFORMACION'
                    END,
                    'detail', ra.detalle,
                    'observation', ra.observacion
                  ) ORDER BY ca.orden, ra.criterio_accesibilidad_id), '[]'::json) AS data
             FROM respuestas_accesibilidad ra
             JOIN criterios_accesibilidad ca
               ON ca.id = ra.criterio_accesibilidad_id
            WHERE ra.centro_turistico_id = $1`,
        [centerId],
      ),
      manager.query(
        `SELECT json_build_object(
                    'available', CASE WHEN disponible THEN 'SI' ELSE 'NO' END,
                    'conditionId', estado_condicion_id,
                    'observation', observacion
                  ) AS data
             FROM senalizaciones_aproximacion
            WHERE centro_turistico_id = $1`,
        [centerId],
      ),
    ])) as Array<Array<{ data: unknown }>>;
    const locality = localityRows[0]?.data;
    const localityRecord = isJsonRecord(locality) ? locality : {};
    const roads = roadsRows[0]?.data;
    const aquatic = aquaticRows[0]?.data;
    const aerial = aerialRows[0]?.data;
    const transportTypes = transportRows[0]?.data;
    const transportDetails = detailRows[0]?.data;
    const criteria = criteriaRows[0]?.data;
    const signage = signageRows[0]?.data;
    const hasRows = [
      roads,
      aquatic,
      aerial,
      transportTypes,
      transportDetails,
      criteria,
    ].some((value) => Array.isArray(value) && value.length > 0);
    if (
      localityRecord.localityId === undefined &&
      localityRecord.distanceKm === undefined &&
      !hasRows &&
      signage === undefined
    ) {
      return null;
    }
    return {
      schemaVersion: 1,
      response: "SI",
      localityId: localityRecord.localityId ?? null,
      distanceKm: localityRecord.distanceKm ?? null,
      accessibilityDetails: {
        roads: roads ?? [],
        aquatic: aquatic ?? [],
        aerial: aerial ?? [],
        transportTypes: transportTypes ?? [],
        transportDetails: transportDetails ?? [],
        criteria: criteria ?? [],
        signage: signage ?? {
          available: "SIN_INFORMACION",
          conditionId: null,
          observation: "",
        },
      },
      observation: localityRecord.observation ?? "",
    };
  }

  private async readPublishedPlantSection(
    manager: EntityManager,
    centerId: string,
  ): Promise<Record<string, unknown> | null> {
    const [plantRows, facilityRows, complementaryRows] = (await Promise.all([
      manager.query(
        `SELECT COALESCE(json_agg(json_build_object(
                  'scope', aus.codigo,
                  'typeId', ptc.tipo_planta_turistica_id,
                  'quantity1', ptc.cantidad_1,
                  'quantity2', ptc.cantidad_2,
                  'quantity3', ptc.cantidad_3,
                  'observation', ptc.observacion
                ) ORDER BY aus.codigo, ptc.tipo_planta_turistica_id), '[]'::json) AS data
           FROM planta_turistica_centro ptc
           JOIN ambitos_ubicacion_servicio aus
             ON aus.id = ptc.ambito_ubicacion_servicio_id
          WHERE ptc.centro_turistico_id = $1`,
        [centerId],
      ),
      manager.query(
        `SELECT COALESCE(json_agg(json_build_object(
                  'categoryId', tf.categoria_facilidad_id,
                  'typeId', fc.tipo_facilidad_id,
                  'quantity', fc.cantidad,
                  'latitude', fc.latitud,
                  'longitude', fc.longitud,
                  'administrator', fc.administrador,
                  'universalAccessibility', CASE
                    WHEN fc.accesibilidad_universal IS TRUE THEN 'SI'
                    WHEN fc.accesibilidad_universal IS FALSE THEN 'NO'
                    ELSE 'SIN_INFORMACION'
                  END,
                  'conditionId', fc.estado_condicion_id,
                  'detailOther', fc.detalle_otro,
                  'observation', fc.observacion
                ) ORDER BY fc.tipo_facilidad_id), '[]'::json) AS data
           FROM facilidades_centro fc
           JOIN tipos_facilidad tf ON tf.id = fc.tipo_facilidad_id
          WHERE fc.centro_turistico_id = $1`,
        [centerId],
      ),
      manager.query(
        `SELECT COALESCE(json_agg(json_build_object(
                  'scope', aus.codigo,
                  'typeId', scc.tipo_servicio_complementario_id,
                  'specification', scc.especificacion,
                  'observation', scc.observacion
                ) ORDER BY aus.codigo, scc.tipo_servicio_complementario_id), '[]'::json) AS data
           FROM servicios_complementarios_centro scc
           JOIN ambitos_ubicacion_servicio aus
             ON aus.id = scc.ambito_ubicacion_servicio_id
          WHERE scc.centro_turistico_id = $1`,
        [centerId],
      ),
    ])) as Array<Array<{ data: unknown }>>;
    const plant = plantRows[0]?.data;
    const facilities = facilityRows[0]?.data;
    const complementary = complementaryRows[0]?.data;
    if (
      (!Array.isArray(plant) || plant.length === 0) &&
      (!Array.isArray(facilities) || facilities.length === 0) &&
      (!Array.isArray(complementary) || complementary.length === 0)
    ) {
      return null;
    }
    return {
      schemaVersion: 1,
      response: "SI",
      plant: plant ?? [],
      facilitiesDetails: facilities ?? [],
      complementaryServices: complementary ?? [],
    };
  }

  private async readPublishedVisitorsSection(
    manager: EntityManager,
    centerId: string,
  ): Promise<Record<string, unknown> | null> {
    const [registryRows, seasonRows, originRows, informantRows, influxRows] =
      (await Promise.all([
        manager.query(
          `SELECT json_build_object(
                    'exists', CASE WHEN existe_registro THEN 'SI' ELSE 'NO' END,
                    'type', tipo_registro,
                    'years', anios_registro,
                    'reports', CASE WHEN genera_reportes THEN 'SI' ELSE 'NO' END,
                    'frequency', frecuencia_reporte,
                    'observation', observacion
                  ) AS data
             FROM registros_visitantes
            WHERE centro_turistico_id = $1`,
          [centerId],
        ),
        manager.query(
          `SELECT COALESCE(json_agg(json_build_object(
                    'type', tv.tipo_temporada,
                    'quantity', tv.cantidad_visitantes,
                    'year', tv.anio,
                    'months', COALESCE(months.data, '[]'::json),
                    'observation', tv.observacion
                  ) ORDER BY tv.tipo_temporada, tv.anio NULLS LAST, tv.id), '[]'::json) AS data
             FROM temporadas_visitacion tv
             LEFT JOIN LATERAL (
               SELECT json_agg(tm.mes_id ORDER BY tm.mes_id) AS data
                 FROM temporada_meses tm
                WHERE tm.temporada_visitacion_id = tv.id
             ) months ON TRUE
            WHERE tv.centro_turistico_id = $1`,
          [centerId],
        ),
        manager.query(
          `SELECT COALESCE(json_agg(json_build_object(
                    'type', tipo_procedencia,
                    'place', lugar,
                    'month', mes_id,
                    'year', anio,
                    'quantity', cantidad_visitantes,
                    'observation', observacion
                  ) ORDER BY id), '[]'::json) AS data
             FROM procedencias_visitantes
            WHERE centro_turistico_id = $1`,
          [centerId],
        ),
        manager.query(
          `SELECT COALESCE(json_agg(json_build_object(
                    'name', nombre,
                    'contact', contacto,
                    'observation', observacion
                  ) ORDER BY id), '[]'::json) AS data
             FROM informantes_clave
            WHERE centro_turistico_id = $1`,
          [centerId],
        ),
        manager.query(
          `SELECT json_build_object(
                    'weekday', cantidad_entre_semana,
                    'weekend', cantidad_fin_semana,
                    'holidays', cantidad_feriados,
                    'frequency', frecuencia_demanda,
                    'observation', observacion
                  ) AS data
             FROM afluencia_visitantes
            WHERE centro_turistico_id = $1`,
          [centerId],
        ),
      ])) as Array<Array<{ data: unknown }>>;
    const registry = registryRows[0]?.data;
    const seasons = seasonRows[0]?.data;
    const origins = originRows[0]?.data;
    const informants = informantRows[0]?.data;
    const influx = influxRows[0]?.data;
    const hasRows =
      registry !== undefined ||
      influx !== undefined ||
      [seasons, origins, informants].some(
        (value) => Array.isArray(value) && value.length > 0,
      );
    if (!hasRows) return null;
    return {
      schemaVersion: 1,
      response: "SI",
      visitors: {
        registry: registry ?? {
          exists: "SIN_INFORMACION",
          type: null,
          years: null,
          reports: "SIN_INFORMACION",
          frequency: "",
          observation: "",
        },
        seasons: seasons ?? [],
        origins: origins ?? [],
        informants: informants ?? [],
        influx: influx ?? {
          weekday: null,
          weekend: null,
          holidays: null,
          frequency: null,
          observation: "",
        },
      },
    };
  }

  private async readPublishedPoliciesSection(
    manager: EntityManager,
    centerId: string,
  ): Promise<Record<string, unknown> | null> {
    const rows = (await manager.query(
      `SELECT COALESCE(json_agg(json_build_object(
                'code', qp.codigo,
                'question', qp.pregunta,
                'response', CASE WHEN rpc.respuesta THEN 'SI' ELSE 'NO' END,
                'year', rpc.anio,
                'specification', rpc.especificacion,
                'observation', rpc.observacion
              ) ORDER BY qp.orden), '[]'::json) AS data
         FROM respuestas_politica_centro rpc
         JOIN preguntas_politica qp ON qp.id = rpc.pregunta_politica_id
        WHERE rpc.centro_turistico_id = $1`,
      [centerId],
    )) as Array<{ data: unknown }>;
    const policies = rows[0]?.data;
    if (!Array.isArray(policies) || policies.length === 0) return null;
    return {
      schemaVersion: 1,
      response: "SI",
      policies,
    };
  }

  private async readPublishedPromotionSection(
    manager: EntityManager,
    centerId: string,
  ): Promise<Record<string, unknown> | null> {
    const [promotionRows, mediaRows] = (await Promise.all([
      manager.query(
        `SELECT json_build_object(
                  'hasPlan', CASE WHEN tiene_plan_promocion THEN 'SI' ELSE 'NO' END,
                  'planName', nombre_plan,
                  'includedInPlan', CASE
                    WHEN incluido_en_plan IS TRUE THEN 'SI'
                    WHEN incluido_en_plan IS FALSE THEN 'NO'
                    ELSE 'SIN_INFORMACION'
                  END,
                  'partOfPackage', CASE WHEN forma_parte_paquete THEN 'SI' ELSE 'NO' END,
                  'packageDetail', detalle_paquete,
                  'observation', observacion
                ) AS data
           FROM promocion_centro_turistico
          WHERE centro_turistico_id = $1`,
        [centerId],
      ),
      manager.query(
        `SELECT COALESCE(json_agg(json_build_object(
                  'response', 'SI',
                  'typeId', mpc.tipo_medio_promocion_id,
                  'name', mpc.nombre,
                  'url', mpc.url,
                  'periodicity', mpc.periodicidad,
                  'detailOther', mpc.detalle_otro,
                  'observation', mpc.observacion
                ) ORDER BY mpc.id), '[]'::json) AS data
           FROM medios_promocion_centro_turistico mpc
          WHERE mpc.centro_turistico_id = $1`,
        [centerId],
      ),
    ])) as Array<Array<{ data: unknown }>>;
    const promotion = promotionRows[0]?.data;
    const media = mediaRows[0]?.data;
    if (
      promotion === undefined &&
      (!Array.isArray(media) || media.length === 0)
    ) {
      return null;
    }
    return {
      schemaVersion: 1,
      response: "SI",
      promotion: promotion ?? {
        hasPlan: "SIN_INFORMACION",
        planName: "",
        includedInPlan: "SIN_INFORMACION",
        partOfPackage: "SIN_INFORMACION",
        packageDetail: "",
        observation: "",
      },
      media: media ?? [],
    };
  }

  private async readPublishedHumanResourcesSection(
    manager: EntityManager,
    centerId: string,
  ): Promise<Record<string, unknown> | null> {
    const [summaryRows, trainingRows] = (await Promise.all([
      manager.query(
        `SELECT json_build_object(
                  'administrationOperation', personas_administracion_operacion,
                  'specializedTourism', personal_especializado_turismo,
                  'observation', observacion
                ) AS data
           FROM resumen_recurso_humano
          WHERE centro_turistico_id = $1`,
        [centerId],
      ),
      manager.query(
        `SELECT COALESCE(json_agg(json_build_object(
                  'typeId', fpc.tipo_formacion_personal_id,
                  'quantity', fpc.cantidad_personas,
                  'detailOther', fpc.detalle_otro,
                  'observation', fpc.observacion
                ) ORDER BY fpc.id), '[]'::json) AS data
           FROM formacion_personal_centro fpc
          WHERE fpc.centro_turistico_id = $1`,
        [centerId],
      ),
    ])) as Array<Array<{ data: unknown }>>;
    const summary = summaryRows[0]?.data;
    const training = trainingRows[0]?.data;
    if (
      summary === undefined &&
      (!Array.isArray(training) || training.length === 0)
    ) {
      return null;
    }
    return {
      schemaVersion: 1,
      response: "SI",
      humanResources: {
        summary: summary ?? {
          administrationOperation: null,
          specializedTourism: null,
          observation: "",
        },
        training: training ?? [],
      },
    };
  }

  private async readPublishedConservationSection(
    manager: EntityManager,
    centerId: string,
  ): Promise<Record<string, unknown> | null> {
    const [evaluationRows, factorRows, declarationRows] = (await Promise.all([
      manager.query(
        `SELECT COALESCE(json_agg(json_build_object(
                  'component', cc.codigo,
                  'state', ec.codigo,
                  'observation', ev.observacion
                ) ORDER BY cc.codigo), '[]'::json) AS data
           FROM evaluaciones_conservacion ev
           JOIN componentes_conservacion cc ON cc.id = ev.componente_conservacion_id
           JOIN estados_conservacion ec ON ec.id = ev.estado_conservacion_id
          WHERE ev.centro_turistico_id = $1`,
        [centerId],
      ),
      manager.query(
        `SELECT COALESCE(json_agg(json_build_object(
                  'component', cc.codigo,
                  'factorId', fa.id,
                  'origin', fa.origen,
                  'name', fa.nombre,
                  'response', CASE WHEN efa.presente THEN 'SI' ELSE 'NO' END,
                  'detailOther', efa.detalle_otro,
                  'observation', efa.observacion
                ) ORDER BY efa.id), '[]'::json) AS data
           FROM evaluacion_factores_alteracion efa
           JOIN evaluaciones_conservacion ev
             ON ev.id = efa.evaluacion_conservacion_id
           JOIN componentes_conservacion cc
             ON cc.id = ev.componente_conservacion_id
           JOIN factores_alteracion fa
             ON fa.id = efa.factor_alteracion_id
          WHERE ev.centro_turistico_id = $1`,
        [centerId],
      ),
      manager.query(
        `SELECT COALESCE(json_agg(json_build_object(
                  'entity', entidad_declarante,
                  'denomination', denominacion,
                  'date', fecha_declaratoria,
                  'scope', ambito,
                  'observation', observacion
                ) ORDER BY id), '[]'::json) AS data
           FROM declaratorias_turisticas
          WHERE centro_turistico_id = $1`,
        [centerId],
      ),
    ])) as Array<Array<{ data: unknown }>>;
    const evaluations = evaluationRows[0]?.data;
    const factors = factorRows[0]?.data;
    const declarations = declarationRows[0]?.data;
    const hasEvaluations = Array.isArray(evaluations) && evaluations.length > 0;
    const hasFactors = Array.isArray(factors) && factors.length > 0;
    const hasDeclarations =
      Array.isArray(declarations) && declarations.length > 0;
    if (!hasEvaluations && !hasFactors && !hasDeclarations) return null;
    const conservation: JsonRecord = {
      attraction: { state: null, observation: "" },
      environment: { state: null, observation: "" },
      factors: factors ?? [],
    };
    if (hasEvaluations) {
      for (const item of evaluations as JsonRecord[]) {
        if (item.component === "ATRACTIVO") conservation.attraction = item;
        if (item.component === "ENTORNO") conservation.environment = item;
      }
    }
    return {
      schemaVersion: 1,
      response: "SI",
      conservation,
      declarations: declarations ?? [],
    };
  }

  private async readPublishedHygieneSection(
    manager: EntityManager,
    centerId: string,
  ): Promise<Record<string, unknown> | null> {
    const [entryRows, radioRows, contingencyRows] = (await Promise.all([
      manager.query(
        `SELECT COALESCE(json_agg(entry ORDER BY sort_order, row_id), '[]'::json) AS data
           FROM (
                 SELECT 1 AS sort_order, sbc.id AS row_id,
                        json_build_object(
                          'kind', 'BASIC_SERVICE',
                          'scope', aus.codigo,
                          'typeId', sbc.tipo_servicio_basico_id,
                          'name', tsb.nombre,
                          'provider', sbc.proveedor,
                          'secondary', sbc.especificacion,
                          'response', 'SI',
                          'quantity', NULL,
                          'condition', NULL,
                          'observation', sbc.observacion
                        ) AS entry
                   FROM servicios_basicos_centro sbc
                   JOIN ambitos_ubicacion_servicio aus
                     ON aus.id = sbc.ambito_ubicacion_servicio_id
                   JOIN tipos_servicio_basico tsb
                     ON tsb.id = sbc.tipo_servicio_basico_id
                  WHERE sbc.centro_turistico_id = $1
                 UNION ALL
                 SELECT 2, sc.id,
                        json_build_object(
                          'kind', 'SIGNAGE',
                          'scope', NULL,
                          'typeId', sc.tipo_senaletica_id,
                          'name', tsg.nombre,
                          'secondaryId', sc.material_senaletica_id,
                          'secondary', sc.detalle,
                          'response', 'SI',
                          'quantity', sc.cantidad,
                          'condition', ec.codigo,
                          'observation', sc.observacion
                        )
                   FROM senaletica_centro sc
                   JOIN tipos_senaletica tsg ON tsg.id = sc.tipo_senaletica_id
                   LEFT JOIN estados_condicion ec ON ec.id = sc.estado_condicion_id
                  WHERE sc.centro_turistico_id = $1
                 UNION ALL
                 SELECT 3, ssc.id,
                        json_build_object(
                          'kind', 'HEALTH',
                          'scope', aus.codigo,
                          'typeId', ssc.tipo_servicio_salud_id,
                          'name', tss.nombre,
                          'secondary', ssc.detalle_otro,
                          'response', 'SI',
                          'quantity', ssc.cantidad,
                          'condition', NULL,
                          'observation', ssc.observacion
                        )
                   FROM servicios_salud_centro ssc
                   JOIN ambitos_ubicacion_servicio aus
                     ON aus.id = ssc.ambito_ubicacion_servicio_id
                   JOIN tipos_servicio_salud tss
                     ON tss.id = ssc.tipo_servicio_salud_id
                  WHERE ssc.centro_turistico_id = $1
                 UNION ALL
                 SELECT 4, ssec.id,
                        json_build_object(
                          'kind', 'SECURITY',
                          'scope', NULL,
                          'typeId', ssec.tipo_servicio_seguridad_id,
                          'name', tssg.nombre,
                          'secondary', ssec.detalle,
                          'response', 'SI',
                          'quantity', NULL,
                          'condition', NULL,
                          'observation', ssec.observacion
                        )
                   FROM servicios_seguridad_centro ssec
                   JOIN tipos_servicio_seguridad tssg
                     ON tssg.id = ssec.tipo_servicio_seguridad_id
                  WHERE ssec.centro_turistico_id = $1
                 UNION ALL
                 SELECT 5, cc.id,
                        json_build_object(
                          'kind', 'COMMUNICATION',
                          'scope', aus.codigo,
                          'typeId', cc.tipo_comunicacion_id,
                          'name', tc.nombre,
                          'secondary', NULL,
                          'response', 'SI',
                          'quantity', NULL,
                          'condition', NULL,
                          'observation', cc.observacion
                        )
                   FROM comunicaciones_centro cc
                   JOIN ambitos_ubicacion_servicio aus
                     ON aus.id = cc.ambito_ubicacion_servicio_id
                   JOIN tipos_comunicacion tc ON tc.id = cc.tipo_comunicacion_id
                  WHERE cc.centro_turistico_id = $1
                 UNION ALL
                 SELECT 6, ac.id,
                        json_build_object(
                          'kind', 'THREAT',
                          'scope', NULL,
                          'typeId', ac.tipo_amenaza_id,
                          'name', ta.nombre,
                          'secondary', NULL,
                          'response', CASE WHEN ac.presente THEN 'SI' ELSE 'NO' END,
                          'quantity', NULL,
                          'condition', NULL,
                          'observation', ac.observacion
                        )
                   FROM amenazas_centro ac
                   JOIN tipos_amenaza ta ON ta.id = ac.tipo_amenaza_id
                  WHERE ac.centro_turistico_id = $1
                ) entries`,
        [centerId],
      ),
      manager.query(
        `SELECT json_build_object(
                  'available', CASE WHEN disponible THEN 'SI' ELSE 'NO' END,
                  'visitorUse', CASE WHEN uso_visitantes THEN 'SI' ELSE 'NO' END,
                  'internalUse', CASE WHEN uso_interno THEN 'SI' ELSE 'NO' END,
                  'emergencyUse', CASE WHEN uso_emergencias THEN 'SI' ELSE 'NO' END,
                  'quantity', cantidad,
                  'observation', observacion
                ) AS data
           FROM radios_portatiles_centro
          WHERE centro_turistico_id = $1`,
        [centerId],
      ),
      manager.query(
        `SELECT json_build_object(
                  'exists', CASE WHEN existe THEN 'SI' ELSE 'NO' END,
                  'institution', institucion_responsable,
                  'document', nombre_documento,
                  'year', anio,
                  'observation', observacion
                ) AS data
           FROM planes_contingencia
          WHERE centro_turistico_id = $1`,
        [centerId],
      ),
    ])) as Array<Array<{ data: unknown }>>;
    const entries = entryRows[0]?.data;
    const radios = radioRows[0]?.data;
    const contingency = contingencyRows[0]?.data;
    if (
      (!Array.isArray(entries) || entries.length === 0) &&
      radios === undefined &&
      contingency === undefined
    ) {
      return null;
    }
    return {
      schemaVersion: 1,
      response: "SI",
      hygieneSafety: {
        entries: entries ?? [],
        radios: radios ?? {
          available: "SIN_INFORMACION",
          visitorUse: "SIN_INFORMACION",
          internalUse: "SIN_INFORMACION",
          emergencyUse: "SIN_INFORMACION",
          quantity: null,
          observation: "",
        },
        contingency: contingency ?? {
          exists: "SIN_INFORMACION",
          institution: "",
          document: "",
          year: null,
          observation: "",
        },
      },
    };
  }

  private async readPublishedAnnexesSection(
    manager: EntityManager,
    centerId: string,
  ): Promise<Record<string, unknown> | null> {
    const [surveyRows, gadRows, responsibleRows, documentRows] =
      (await Promise.all([
        manager.query(
          `SELECT json_build_object(
                  'date', fecha,
                  'responsible', responsable_nombre,
                  'scope', responsable_institucion,
                  'observation', observacion
                ) AS data
           FROM levantamientos_accesibilidad
          WHERE centro_turistico_id = $1
          ORDER BY id DESC LIMIT 1`,
          [centerId],
        ),
        manager.query(
          `SELECT json_build_object(
                  'acceptance', CASE
                    WHEN acepta_publicacion IS TRUE THEN 'SI'
                    WHEN acepta_publicacion IS FALSE THEN 'NO'
                    ELSE 'SIN_INFORMACION'
                  END,
                  'name', nombre_validador,
                  'institution', institucion,
                  'position', cargo,
                  'phone', telefono,
                  'email', email,
                  'date', fecha,
                  'observation', observacion
                ) AS data
           FROM validaciones_gad
          WHERE centro_turistico_id = $1
          ORDER BY id DESC LIMIT 1`,
          [centerId],
        ),
        manager.query(
          `SELECT COALESCE(json_agg(json_build_object(
                  'typeId', rf.tipo_responsabilidad_ficha_id,
                  'name', rf.nombre,
                  'institution', rf.institucion,
                  'role', rf.cargo,
                  'phone', rf.telefono,
                  'email', rf.email,
                  'date', rf.fecha,
                  'observation', rf.observacion
                ) ORDER BY rf.id), '[]'::json) AS data
           FROM responsables_ficha rf
          WHERE rf.centro_turistico_id = $1`,
          [centerId],
        ),
        manager.query(
          `SELECT COALESCE(json_agg(json_build_object(
                  'fileId', a.id,
                  'type', t.codigo,
                  'source', a.fuente_autor,
                  'author', NULL,
                  'description', a.descripcion,
                  'visibility', 'ADMINISTRATIVA',
                  'observation', a.observacion
                ) ORDER BY a.orden NULLS LAST, a.id), '[]'::json) AS data
           FROM archivos_centro_turistico a
           JOIN tipos_archivo_centro_turistico t
             ON t.id = a.tipo_archivo_centro_id
          WHERE a.centro_turistico_id = $1
            AND a.estado = 'PUBLICADO'
            AND t.codigo IN ('MAPA', 'PLAN_CONTINGENCIA', 'OTRO')`,
          [centerId],
        ),
      ])) as Array<Array<{ data: unknown }>>;
    const survey = surveyRows[0]?.data;
    const gadValidation = gadRows[0]?.data;
    const responsibles = responsibleRows[0]?.data;
    const documents = documentRows[0]?.data;
    if (
      survey === undefined &&
      gadValidation === undefined &&
      (!Array.isArray(responsibles) || responsibles.length === 0) &&
      (!Array.isArray(documents) || documents.length === 0)
    ) {
      return null;
    }
    return {
      schemaVersion: 1,
      response: "SI",
      annexes: {
        documents: documents ?? [],
        responsibles: responsibles ?? [],
        accessibilitySurvey: survey ?? {
          date: null,
          responsible: "",
          scope: "",
          observation: "",
        },
        gadValidation: gadValidation ?? {
          acceptance: "SIN_INFORMACION",
          name: "",
          institution: "",
          position: "",
          phone: "",
          email: "",
          date: null,
          observation: "",
        },
      },
    };
  }

  private centerToDraft(center: CenterRow): CenterDraft {
    return {
      name: center.name,
      subtypeId: Number(center.subtypeId),
      touristZoneId: Number(center.touristZoneId),
      parishId: Number(center.parishId),
      productLineId: Number(center.productLineId),
      scenarioId: Number(center.scenarioId),
      hierarchyId: Number(center.hierarchyId),
      latitude: Number(center.latitude),
      longitude: Number(center.longitude),
      altitudeMeters: center.altitudeMeters ?? undefined,
      description: center.description ?? undefined,
      address: {
        barrio: center.barrio ?? undefined,
        street: center.street ?? undefined,
        number: center.addressNumber ?? undefined,
        crossStreet: center.crossStreet ?? undefined,
      },
      administration: center.administration ?? undefined,
      climate: center.climate ?? undefined,
      admission: center.admission ?? undefined,
      activities: normalizeActivities(center.activities),
      accessibility: normalizeAccessibility(center.accessibility),
      facilities: normalizeFacilities(center.facilities),
    };
  }

  private requireComplete(
    value: SaveAdminCenterDto | CenterDraft,
  ): CenterDraft {
    const required = [
      "name",
      "subtypeId",
      "touristZoneId",
      "parishId",
      "productLineId",
      "scenarioId",
      "hierarchyId",
      "latitude",
      "longitude",
    ] as const;
    for (const key of required) {
      const current = value[key];
      if (current === undefined || current === null || current === "") {
        throw new ConflictException(`Falta completar el campo ${key}.`);
      }
    }
    return value as CenterDraft;
  }

  private async ensureProvisionalHierarchy(
    manager: EntityManager,
    value: SaveAdminCenterDto | CenterDraft,
  ): Promise<SaveAdminCenterDto | CenterDraft> {
    if (
      typeof value.hierarchyId === "number" &&
      Number.isInteger(value.hierarchyId) &&
      value.hierarchyId > 0
    ) {
      return value;
    }
    const rows = (await manager.query(
      `SELECT id FROM rangos_jerarquia WHERE codigo = '00' AND activo = TRUE LIMIT 1`,
    )) as Array<{ id: string }>;
    const provisional = rows[0];
    if (!provisional) {
      throw new ConflictException(
        "No está configurada la jerarquía provisional de recurso.",
      );
    }
    return { ...value, hierarchyId: Number(provisional.id) };
  }

  private async validateReferences(
    manager: EntityManager,
    draft: CenterDraft,
    forPublication = false,
    centerId?: string,
  ) {
    this.validateSectionMap(draft.sections);
    const references: Array<[string, number, string]> = [
      ["subtipos_atractivo", draft.subtypeId, "subtipo"],
      ["zonas_turisticas", draft.touristZoneId, "zona turística"],
      ["parroquias", draft.parishId, "parroquia"],
      ["lineas_producto", draft.productLineId, "línea de producto"],
      ["escenarios", draft.scenarioId, "escenario"],
      ["rangos_jerarquia", draft.hierarchyId, "jerarquía"],
    ];
    for (const [table, id, label] of references) {
      const rows = await manager.query(
        `SELECT 1 FROM ${table} WHERE id = $1 AND activo = TRUE LIMIT 1`,
        [id],
      );
      if (!rows[0])
        throw new ConflictException(
          `La ${label} seleccionada no está disponible.`,
        );
    }
    if (draft.climate)
      await this.ensureReference(
        manager,
        "catalogo_clima",
        draft.climate.climateId,
        "clima",
      );
    if (draft.admission) {
      await this.ensureReference(
        manager,
        "tipos_ingreso",
        draft.admission.incomeTypeId,
        "tipo de ingreso",
      );
      await this.ensureReference(
        manager,
        "modalidades_atencion",
        draft.admission.attentionModeId,
        "modalidad de atención",
      );
    }
    await this.validateTechnicalSections(
      manager,
      draft,
      forPublication,
      centerId,
    );
  }

  private validateSectionMap(sections: Record<string, unknown> | undefined) {
    if (!sections) return;
    const invalid = Object.keys(sections).filter(
      (key) =>
        !ADMIN_CENTER_SECTION_CODES.includes(
          key as (typeof ADMIN_CENTER_SECTION_CODES)[number],
        ),
    );
    if (invalid.length > 0) {
      throw new ConflictException(
        `La sección de ficha no está disponible: ${invalid[0]}.`,
      );
    }
    for (const [code, content] of Object.entries(sections)) {
      const error = validateAdminSectionContent(content);
      if (error) {
        throw new ConflictException(
          `La sección ${code} no es válida: ${error}`,
        );
      }
    }
    if (JSON.stringify(sections).length > 300_000) {
      throw new ConflictException(
        "El snapshot de secciones supera el tamaño permitido.",
      );
    }
  }

  private async validateTechnicalSections(
    manager: EntityManager,
    draft: CenterDraft,
    forPublication = false,
    centerId?: string,
  ) {
    const unique = (values: number[], label: string) => {
      if (new Set(values).size !== values.length) {
        throw new ConflictException(`No repitas elementos en ${label}.`);
      }
    };
    if (draft.activities) {
      unique(
        draft.activities.map((item) => item.activityId),
        "actividades",
      );
      const rows = (await manager.query(
        `SELECT at.id
           FROM actividades_turisticas at
           JOIN grupos_actividad ga ON ga.id = at.grupo_actividad_id
           JOIN subtipos_atractivo sa ON sa.id = $2
           JOIN tipos_atractivo ta ON ta.id = sa.tipo_atractivo_id
          WHERE at.id = ANY($1::bigint[])
            AND at.activo = TRUE AND ga.activo = TRUE
            AND ga.categoria_atractivo_id = ta.categoria_id`,
        [draft.activities.map((item) => item.activityId), draft.subtypeId],
      )) as { id: string }[];
      if (rows.length !== draft.activities.length) {
        throw new ConflictException(
          "Una actividad no está disponible o no corresponde a la categoría del atractivo.",
        );
      }
    }
    if (draft.accessibility) {
      unique(
        draft.accessibility.map((item) => item.typeId),
        "accesibilidad",
      );
      await this.ensureReferences(
        manager,
        "tipos_accesibilidad",
        draft.accessibility.map((item) => item.typeId),
        "condición de accesibilidad",
      );
    }
    if (draft.facilities) {
      unique(
        draft.facilities.map((item) => item.typeId),
        "facilidades",
      );
      await this.ensureReferences(
        manager,
        "tipos_facilidad",
        draft.facilities.map((item) => item.typeId),
        "facilidad",
      );
    }
    if (forPublication) {
      await this.validatePlantSectionReferences(manager, draft);
      await this.validateAccessibilitySectionReferences(manager, draft);
      await this.validateVisitorsSectionReferences(manager, draft);
      await this.validatePoliciesSectionReferences(manager, draft);
      await this.validatePromotionSectionReferences(manager, draft);
      await this.validateHumanResourcesSectionReferences(manager, draft);
      await this.validateConservationSectionReferences(manager, draft);
      await this.validateHygieneSectionReferences(manager, draft);
      await this.validateAnnexesSectionReferences(manager, draft, centerId);
    }
    await this.validateCharacteristicsSectionReferences(
      manager,
      draft,
      forPublication,
    );
  }

  private async validateCharacteristicsSectionReferences(
    manager: EntityManager,
    draft: CenterDraft,
    forPublication: boolean,
  ) {
    const section = getAdminSectionRecord(draft, "caracteristicas");
    const climate = isJsonRecord(section?.climate) ? section.climate : null;
    if (!section || !climate) return;

    const climateId = climate.climateId;
    if (
      forPublication &&
      section.response === "SI" &&
      (!Number.isInteger(climateId) || Number(climateId) < 1)
    ) {
      throw new ConflictException(
        "La sección características requiere seleccionar un clima del catálogo antes de publicar.",
      );
    }
    if (Number.isInteger(climateId) && Number(climateId) > 0) {
      await this.ensureReference(
        manager,
        "catalogo_clima",
        Number(climateId),
        "clima",
      );
    }
  }

  private async validateVisitorsSectionReferences(
    manager: EntityManager,
    draft: CenterDraft,
  ) {
    const section = getAdminSectionRecord(draft, "visitantes");
    if (!section || section.response === "NO_APLICA") return;
    const visitors = isJsonRecord(section.visitors) ? section.visitors : null;
    if (!visitors) return;

    const registry = isJsonRecord(visitors.registry) ? visitors.registry : null;
    if (registry) {
      if (
        !isBinarySectionResponse(registry.exists) ||
        !isBinarySectionResponse(registry.reports)
      ) {
        throw new ConflictException(
          "La sección visitantes requiere respuestas SI o NO para publicar el registro.",
        );
      }
    }

    const monthIds: number[] = [];
    const seasonKeys = new Set<string>();
    if (Array.isArray(visitors.seasons)) {
      for (const season of visitors.seasons as JsonRecord[]) {
        const year = season.year === null ? "" : String(season.year ?? "");
        const key = `${String(season.type)}:${year}`;
        if (season.year !== null && season.year !== undefined) {
          if (seasonKeys.has(key)) {
            throw new ConflictException(
              "No repitas una temporada del mismo tipo y año.",
            );
          }
          seasonKeys.add(key);
        }
        if (Array.isArray(season.months)) {
          for (const month of season.months) monthIds.push(Number(month));
        }
      }
    }
    if (Array.isArray(visitors.origins)) {
      for (const origin of visitors.origins as JsonRecord[]) {
        if (origin.month !== null && origin.month !== undefined) {
          monthIds.push(Number(origin.month));
        }
      }
    }
    const uniqueMonthIds = [...new Set(monthIds)];
    if (uniqueMonthIds.length === 0) return;
    const rows = (await manager.query(
      `SELECT id FROM meses WHERE id = ANY($1::smallint[])`,
      [uniqueMonthIds],
    )) as Array<{ id: number }>;
    if (rows.length !== uniqueMonthIds.length) {
      throw new ConflictException(
        "Un mes de visitantes ya no está disponible en el catálogo.",
      );
    }
  }

  private async validatePoliciesSectionReferences(
    manager: EntityManager,
    draft: CenterDraft,
  ) {
    const section = getAdminSectionRecord(draft, "politicas");
    if (!section || section.response === "NO_APLICA") return;
    if (!Array.isArray(section.policies)) return;
    const policies = section.policies as JsonRecord[];
    if (
      section.response === "SI" &&
      new Set(policies.map((policy) => String(policy.code))).size !==
        POLICY_CODES.size
    ) {
      throw new ConflictException(
        "La sección políticas requiere las cuatro preguntas antes de publicar.",
      );
    }
    for (const policy of policies) {
      if (!isBinarySectionResponse(policy.response)) {
        throw new ConflictException(
          "La sección políticas requiere respuestas SI o NO para publicar.",
        );
      }
    }
    const codes = policies.map((policy) => String(policy.code));
    const rows = (await manager.query(
      `SELECT codigo FROM preguntas_politica
        WHERE activo = TRUE AND codigo = ANY($1::text[])`,
      [codes],
    )) as Array<{ codigo: string }>;
    if (rows.length !== new Set(codes).size) {
      throw new ConflictException(
        "Una pregunta de política ya no está disponible en el catálogo.",
      );
    }
  }

  private async validatePromotionSectionReferences(
    manager: EntityManager,
    draft: CenterDraft,
  ) {
    const section = getAdminSectionRecord(draft, "promocion");
    if (!section || section.response === "NO_APLICA") return;
    const promotion = isJsonRecord(section.promotion)
      ? section.promotion
      : null;
    if (!promotion) return;
    for (const key of ["hasPlan", "partOfPackage"]) {
      if (!isBinarySectionResponse(promotion[key])) {
        throw new ConflictException(
          "La sección promoción requiere respuestas SI o NO para publicar el plan.",
        );
      }
    }
    if (
      promotion.includedInPlan !== undefined &&
      promotion.includedInPlan !== null
    ) {
      if (!isBinarySectionResponse(promotion.includedInPlan)) {
        throw new ConflictException(
          "La inclusión en un plan debe responderse como SI o NO antes de publicar.",
        );
      }
    }
    if (Array.isArray(promotion.media) && promotion.media.length > 0) {
      const media = promotion.media as JsonRecord[];
      for (const medium of media) {
        if (!isBinarySectionResponse(medium.response)) {
          throw new ConflictException(
            "Cada medio de promoción requiere una respuesta SI o NO antes de publicar.",
          );
        }
      }
      const activeMedia = media.filter((medium) => medium.response === "SI");
      const typeIds = activeMedia.map((medium) => medium.typeId);
      if (
        typeIds.some(
          (typeId) => !Number.isInteger(typeId) || Number(typeId) < 1,
        )
      ) {
        throw new ConflictException(
          "Los medios de promoción requieren un tipo activo del catálogo antes de publicar.",
        );
      }
      const uniqueTypeIds = [...new Set(typeIds as number[])];
      if (uniqueTypeIds.length !== typeIds.length) {
        throw new ConflictException(
          "No repitas tipos de formación en la misma ficha.",
        );
      }
      const rows = (await manager.query(
        `SELECT id FROM tipos_medio_promocion
          WHERE activo = TRUE AND id = ANY($1::bigint[])`,
        [uniqueTypeIds],
      )) as Array<{ id: string }>;
      if (rows.length !== uniqueTypeIds.length) {
        throw new ConflictException(
          "Un tipo de medio de promoción ya no está disponible en el catálogo.",
        );
      }
    }
  }

  private async validateHumanResourcesSectionReferences(
    manager: EntityManager,
    draft: CenterDraft,
  ) {
    const section = getAdminSectionRecord(draft, "recurso-humano");
    if (!section || section.response === "NO_APLICA") return;
    const resources = isJsonRecord(section.humanResources)
      ? section.humanResources
      : null;
    if (!resources) return;
    if (Array.isArray(resources.training) && resources.training.length > 0) {
      const typeIds = resources.training.map((training) => training.typeId);
      if (
        typeIds.some(
          (typeId) => !Number.isInteger(typeId) || Number(typeId) < 1,
        )
      ) {
        throw new ConflictException(
          "La formación del personal requiere un tipo activo del catálogo antes de publicar.",
        );
      }
      const uniqueTypeIds = [...new Set(typeIds as number[])];
      if (uniqueTypeIds.length !== typeIds.length) {
        throw new ConflictException(
          "No repitas tipos de responsabilidad en la misma ficha.",
        );
      }
      const rows = (await manager.query(
        `SELECT id FROM tipos_formacion_personal
          WHERE activo = TRUE AND id = ANY($1::bigint[])`,
        [uniqueTypeIds],
      )) as Array<{ id: string }>;
      if (rows.length !== uniqueTypeIds.length) {
        throw new ConflictException(
          "Un tipo de formación ya no está disponible en el catálogo.",
        );
      }
    }
  }

  private async validateConservationSectionReferences(
    manager: EntityManager,
    draft: CenterDraft,
  ) {
    const section = getAdminSectionRecord(draft, "conservacion");
    if (!section || section.response === "NO_APLICA") return;
    const conservation = isJsonRecord(section.conservation)
      ? section.conservation
      : null;
    if (!conservation) return;
    const stateCodes: string[] = [];
    for (const component of ["attraction", "environment"]) {
      const entry = isJsonRecord(conservation[component])
        ? conservation[component]
        : null;
      if (entry?.state !== undefined && entry.state !== null) {
        stateCodes.push(String(entry.state));
      }
    }
    if (section.response === "SI" && stateCodes.length !== 2) {
      throw new ConflictException(
        "La sección conservación requiere el estado del atractivo y del entorno antes de publicar.",
      );
    }
    if (stateCodes.length > 0) {
      const rows = (await manager.query(
        `SELECT codigo FROM estados_conservacion
          WHERE activo = TRUE AND codigo = ANY($1::text[])`,
        [stateCodes],
      )) as Array<{ codigo: string }>;
      if (rows.length !== new Set(stateCodes).size) {
        throw new ConflictException(
          "Un estado de conservación ya no está disponible en el catálogo.",
        );
      }
    }
    if (isJsonRecord(conservation) && Array.isArray(conservation.factors)) {
      const factors = conservation.factors as JsonRecord[];
      if (factors.length === 0) return;
      const stateByComponent = new Map<string, string>();
      for (const [component, key] of [
        ["ATRACTIVO", "attraction"],
        ["ENTORNO", "environment"],
      ] as const) {
        const entry = isJsonRecord(conservation[key])
          ? conservation[key]
          : null;
        if (typeof entry?.state === "string" && entry.state.trim().length > 0) {
          stateByComponent.set(component, entry.state);
        }
      }
      const factorIds: number[] = [];
      const uniqueFactors = new Set<string>();
      for (const factor of factors) {
        if (!isBinarySectionResponse(factor.response)) {
          throw new ConflictException(
            "Cada factor de alteración requiere una respuesta SI o NO antes de publicar.",
          );
        }
        const component = String(factor.component ?? "");
        if (!CONSERVATION_COMPONENT_VALUES.has(component)) {
          throw new ConflictException(
            "Cada factor de alteración requiere un componente válido antes de publicar.",
          );
        }
        const factorId = factor.factorId;
        if (!Number.isInteger(factorId) || Number(factorId) < 1) {
          throw new ConflictException(
            "Cada factor de alteración requiere un factor activo del catálogo antes de publicar.",
          );
        }
        if (!stateByComponent.has(component)) {
          throw new ConflictException(
            "Cada factor de alteración requiere el estado de conservación de su componente.",
          );
        }
        const uniqueKey = `${component}:${factorId}`;
        if (uniqueFactors.has(uniqueKey)) {
          throw new ConflictException(
            "No repitas el mismo factor para un componente de conservación.",
          );
        }
        uniqueFactors.add(uniqueKey);
        factorIds.push(Number(factorId));
      }
      const rows = (await manager.query(
        `SELECT id, origen FROM factores_alteracion
          WHERE activo = TRUE AND id = ANY($1::bigint[])`,
        [[...new Set(factorIds)]],
      )) as Array<{ id: string; origen: string }>;
      const factorById = new Map(rows.map((row) => [String(row.id), row]));
      if (factorById.size !== new Set(factorIds).size) {
        throw new ConflictException(
          "Un factor de alteración ya no está disponible en el catálogo.",
        );
      }
      for (const factor of factors) {
        const catalogFactor = factorById.get(String(factor.factorId));
        if (!catalogFactor) continue;
        if (
          factor.origin !== undefined &&
          String(factor.origin) !== catalogFactor.origen
        ) {
          throw new ConflictException(
            "El origen del factor de alteración no coincide con su catálogo.",
          );
        }
      }
    }
  }

  private async validateHygieneSectionReferences(
    manager: EntityManager,
    draft: CenterDraft,
  ) {
    const section = getAdminSectionRecord(draft, "higiene-seguridad");
    if (!section || section.response === "NO_APLICA") return;
    const hygiene = isJsonRecord(section.hygieneSafety)
      ? section.hygieneSafety
      : null;
    if (!hygiene) return;
    const radios = isJsonRecord(hygiene.radios) ? hygiene.radios : null;
    if (radios) {
      for (const key of [
        "available",
        "visitorUse",
        "internalUse",
        "emergencyUse",
      ]) {
        if (!isBinarySectionResponse(radios[key])) {
          throw new ConflictException(
            "La sección higiene requiere respuestas SI o NO para publicar las radios.",
          );
        }
      }
    }
    const contingency = isJsonRecord(hygiene.contingency)
      ? hygiene.contingency
      : null;
    if (contingency && !isBinarySectionResponse(contingency.exists)) {
      throw new ConflictException(
        "El plan de contingencia requiere una respuesta SI o NO antes de publicar.",
      );
    }
    if (Array.isArray(hygiene.entries) && hygiene.entries.length > 0) {
      const entries = hygiene.entries as JsonRecord[];
      const typeTableByKind: Record<string, string> = {
        BASIC_SERVICE: "tipos_servicio_basico",
        SIGNAGE: "tipos_senaletica",
        HEALTH: "tipos_servicio_salud",
        SECURITY: "tipos_servicio_seguridad",
        COMMUNICATION: "tipos_comunicacion",
        THREAT: "tipos_amenaza",
      };
      const activeEntries = entries.filter(
        (entry) => entry.kind === "THREAT" || entry.response === "SI",
      );
      const typeIdsByKind = new Map<string, number[]>();
      const scopeCodes = new Set<string>();
      const conditionCodes = new Set<string>();
      const uniqueRows = new Set<string>();
      for (const entry of entries) {
        if (!isBinarySectionResponse(entry.response)) {
          throw new ConflictException(
            "Cada registro de higiene requiere una respuesta SI o NO antes de publicar.",
          );
        }
        if (!activeEntries.includes(entry)) continue;
        const kind = String(entry.kind);
        const typeId = entry.typeId;
        if (!Number.isInteger(typeId) || Number(typeId) < 1) {
          throw new ConflictException(
            "Los registros de higiene requieren tipos activos de catálogo antes de publicar.",
          );
        }
        const table = typeTableByKind[kind];
        if (!table) {
          throw new ConflictException(
            "El tipo de registro de higiene no es válido.",
          );
        }
        const ids = typeIdsByKind.get(kind) ?? [];
        ids.push(Number(typeId));
        typeIdsByKind.set(kind, ids);
        if (["BASIC_SERVICE", "HEALTH", "COMMUNICATION"].includes(kind)) {
          if (!SERVICE_SCOPE_VALUES.has(String(entry.scope))) {
            throw new ConflictException(
              "Los servicios de higiene requieren un ámbito antes de publicar.",
            );
          }
          scopeCodes.add(String(entry.scope));
          const key = `${kind}:${entry.scope}:${typeId}`;
          if (uniqueRows.has(key)) {
            throw new ConflictException(
              "No repitas el mismo servicio y ámbito de higiene.",
            );
          }
          uniqueRows.add(key);
        } else if (["SECURITY", "THREAT"].includes(kind)) {
          const key = `${kind}:${typeId}`;
          if (uniqueRows.has(key)) {
            throw new ConflictException(
              "No repitas el mismo tipo de seguridad o amenaza.",
            );
          }
          uniqueRows.add(key);
        }
        if (kind === "SIGNAGE") {
          const secondaryIdError = validateOptionalPositiveInteger(
            entry.secondaryId,
            "material de señalética",
          );
          if (secondaryIdError) throw new ConflictException(secondaryIdError);
          if (entry.condition !== undefined && entry.condition !== null) {
            conditionCodes.add(String(entry.condition));
          }
        }
      }
      for (const [kind, ids] of typeIdsByKind) {
        const uniqueIds = [...new Set(ids)];
        const rows = (await manager.query(
          `SELECT id FROM ${typeTableByKind[kind]}
            WHERE activo = TRUE AND id = ANY($1::bigint[])`,
          [uniqueIds],
        )) as Array<{ id: string }>;
        if (rows.length !== uniqueIds.length) {
          throw new ConflictException(
            "Un tipo de higiene o seguridad ya no está disponible en el catálogo.",
          );
        }
      }
      if (scopeCodes.size > 0) {
        const rows = (await manager.query(
          `SELECT codigo FROM ambitos_ubicacion_servicio
            WHERE activo = TRUE AND codigo = ANY($1::text[])`,
          [[...scopeCodes]],
        )) as Array<{ codigo: string }>;
        if (rows.length !== scopeCodes.size) {
          throw new ConflictException(
            "Un ámbito de higiene ya no está disponible en el catálogo.",
          );
        }
      }
      if (conditionCodes.size > 0) {
        const rows = (await manager.query(
          `SELECT codigo FROM estados_condicion
            WHERE activo = TRUE AND codigo = ANY($1::text[])`,
          [[...conditionCodes]],
        )) as Array<{ codigo: string }>;
        if (rows.length !== conditionCodes.size) {
          throw new ConflictException(
            "Un estado de señalética ya no está disponible en el catálogo.",
          );
        }
      }
      const materialIds = entries
        .filter((entry) => entry.kind === "SIGNAGE" && entry.response === "SI")
        .map((entry) => entry.secondaryId)
        .filter((id): id is number => Number.isInteger(id) && Number(id) > 0);
      if (materialIds.length > 0) {
        const uniqueIds = [...new Set(materialIds)];
        const rows = (await manager.query(
          `SELECT id FROM materiales_senaletica
            WHERE activo = TRUE AND id = ANY($1::bigint[])`,
          [uniqueIds],
        )) as Array<{ id: string }>;
        if (rows.length !== uniqueIds.length) {
          throw new ConflictException(
            "Un material de señalética ya no está disponible en el catálogo.",
          );
        }
      }
    }
  }

  private async validateAnnexesSectionReferences(
    manager: EntityManager,
    draft: CenterDraft,
    centerId?: string,
  ) {
    const section = getAdminSectionRecord(draft, "anexos");
    if (!section || section.response === "NO_APLICA") return;
    const annexes = isJsonRecord(section.annexes) ? section.annexes : null;
    if (!annexes) return;
    if (Array.isArray(annexes.documents) && annexes.documents.length > 0) {
      if (!centerId) {
        throw new ConflictException(
          "Los anexos documentales requieren una ficha persistida antes de publicar.",
        );
      }
      const fileIds = annexes.documents.map((document) => document.fileId);
      if (
        fileIds.some(
          (fileId) => !Number.isInteger(fileId) || Number(fileId) < 1,
        )
      ) {
        throw new ConflictException(
          "Cada anexo documental requiere seleccionar un archivo cargado.",
        );
      }
      const uniqueFileIds = [...new Set(fileIds as number[])];
      if (uniqueFileIds.length !== fileIds.length) {
        throw new ConflictException(
          "No repitas el mismo archivo en los anexos documentales.",
        );
      }
      const rows = (await manager.query(
        `SELECT a.id
           FROM archivos_centro_turistico a
           JOIN tipos_archivo_centro_turistico t
             ON t.id = a.tipo_archivo_centro_id
          WHERE a.centro_turistico_id = $1
            AND a.id = ANY($2::bigint[])
            AND a.estado <> 'ELIMINADO'
            AND t.activo = TRUE
            AND t.codigo IN ('MAPA', 'PLAN_CONTINGENCIA', 'OTRO')`,
        [centerId, uniqueFileIds],
      )) as Array<{ id: string }>;
      if (rows.length !== uniqueFileIds.length) {
        throw new ConflictException(
          "Un archivo de anexo no está disponible o no corresponde a un tipo documental activo.",
        );
      }
    }
    if (
      Array.isArray(annexes.responsibles) &&
      annexes.responsibles.length > 0
    ) {
      const typeIds = annexes.responsibles.map(
        (responsible) => responsible.typeId,
      );
      if (
        typeIds.some(
          (typeId) => !Number.isInteger(typeId) || Number(typeId) < 1,
        )
      ) {
        throw new ConflictException(
          "Los responsables requieren un tipo de responsabilidad activo antes de publicar.",
        );
      }
      const uniqueTypeIds = [...new Set(typeIds as number[])];
      const rows = (await manager.query(
        `SELECT id FROM tipos_responsabilidad_ficha
          WHERE id = ANY($1::bigint[])`,
        [uniqueTypeIds],
      )) as Array<{ id: string }>;
      if (rows.length !== uniqueTypeIds.length) {
        throw new ConflictException(
          "Un tipo de responsabilidad ya no está disponible en el catálogo.",
        );
      }
    }
    const gad = isJsonRecord(annexes.gadValidation)
      ? annexes.gadValidation
      : null;
    if (gad) {
      if (!isBinarySectionResponse(gad.acceptance)) {
        throw new ConflictException(
          "La validación del GAD requiere una aceptación SI o NO antes de publicar.",
        );
      }
      if (
        typeof gad.name !== "string" ||
        gad.name.trim().length === 0 ||
        typeof gad.institution !== "string" ||
        gad.institution.trim().length === 0
      ) {
        throw new ConflictException(
          "La validación del GAD requiere nombre e institución antes de publicar.",
        );
      }
    }
  }

  private async validatePlantSectionReferences(
    manager: EntityManager,
    draft: CenterDraft,
  ) {
    const section = getAdminSectionRecord(draft, "planta");
    if (!section) return;

    const requireCatalogId = (
      item: JsonRecord,
      idKey: string,
      label: string,
    ): number => {
      const id = item[idKey];
      if (!Number.isInteger(id) || Number(id) < 1) {
        throw new ConflictException(
          `La sección planta requiere seleccionar un ${label} del catálogo antes de publicar.`,
        );
      }
      return Number(id);
    };
    const ensureScope = async (value: unknown) => {
      if (typeof value !== "string") {
        throw new ConflictException(
          "La sección planta requiere un ámbito de ubicación válido.",
        );
      }
      await this.ensureCodeReference(
        manager,
        "ambitos_ubicacion_servicio",
        value,
        "ámbito de ubicación",
      );
    };

    if (section.plant !== undefined) {
      if (!Array.isArray(section.plant)) {
        throw new ConflictException("La planta turística no es válida.");
      }
      const seenPlant = new Set<string>();
      for (const item of section.plant) {
        if (!isJsonRecord(item)) {
          throw new ConflictException(
            "Un registro de planta turística no es válido.",
          );
        }
        await ensureScope(item.scope);
        const typeId = requireCatalogId(
          item,
          "typeId",
          "tipo de planta turística",
        );
        const plantKey = `${item.scope}:${typeId}`;
        if (seenPlant.has(plantKey)) {
          throw new ConflictException(
            "No repitas el mismo tipo de planta dentro del mismo ámbito.",
          );
        }
        seenPlant.add(plantKey);
        await this.ensureReference(
          manager,
          "tipos_planta_turistica",
          typeId,
          "tipo de planta turística",
        );
      }
    }

    if (section.facilitiesDetails !== undefined) {
      if (!Array.isArray(section.facilitiesDetails)) {
        throw new ConflictException(
          "Las facilidades del entorno no son válidas.",
        );
      }
      for (const item of section.facilitiesDetails) {
        if (!isJsonRecord(item)) {
          throw new ConflictException(
            "Una facilidad del entorno no es válida.",
          );
        }
        const typeId = requireCatalogId(item, "typeId", "tipo de facilidad");
        await this.ensureReference(
          manager,
          "tipos_facilidad",
          typeId,
          "facilidad",
        );
        if (item.categoryId !== undefined && item.categoryId !== null) {
          await this.ensureReference(
            manager,
            "categorias_facilidad",
            requireCatalogId(item, "categoryId", "categoría de facilidad"),
            "categoría de facilidad",
          );
        }
        if (item.conditionId !== undefined && item.conditionId !== null) {
          await this.ensureReference(
            manager,
            "estados_condicion",
            requireCatalogId(item, "conditionId", "estado de facilidad"),
            "estado de facilidad",
          );
        }
      }
    }

    if (section.complementaryServices !== undefined) {
      if (!Array.isArray(section.complementaryServices)) {
        throw new ConflictException(
          "Los servicios complementarios no son válidos.",
        );
      }
      const seenComplementary = new Set<string>();
      for (const item of section.complementaryServices) {
        if (!isJsonRecord(item)) {
          throw new ConflictException(
            "Un servicio complementario no es válido.",
          );
        }
        await ensureScope(item.scope);
        const typeId = requireCatalogId(
          item,
          "typeId",
          "tipo de servicio complementario",
        );
        const complementaryKey = `${item.scope}:${typeId}:${String(item.specification ?? "")}`;
        if (seenComplementary.has(complementaryKey)) {
          throw new ConflictException(
            "No repitas el mismo servicio complementario dentro del mismo ámbito.",
          );
        }
        seenComplementary.add(complementaryKey);
        await this.ensureReference(
          manager,
          "tipos_servicio_complementario",
          typeId,
          "tipo de servicio complementario",
        );
      }
    }
  }

  private async validateAccessibilitySectionReferences(
    manager: EntityManager,
    draft: CenterDraft,
  ) {
    const section = getAdminSectionRecord(draft, "accesibilidad");
    if (!section) return;
    const details = isJsonRecord(section.accessibilityDetails)
      ? section.accessibilityDetails
      : null;
    if (!details) {
      if (
        section.response === "SI" &&
        (section.localityId === undefined || section.localityId === null)
      ) {
        throw new ConflictException(
          "La sección accesibilidad requiere seleccionar la localidad cercana antes de publicar.",
        );
      }
      return;
    }
    if (section.localityId !== undefined && section.localityId !== null) {
      if (
        !Number.isInteger(section.localityId) ||
        Number(section.localityId) < 1
      ) {
        throw new ConflictException(
          "La localidad cercana no es válida para publicar.",
        );
      }
      await this.ensureReference(
        manager,
        "localidades",
        Number(section.localityId),
        "localidad cercana",
      );
    }

    const requireCatalogId = (
      item: JsonRecord,
      idKey: string,
      label: string,
    ): number => {
      const id = item[idKey];
      if (!Number.isInteger(id) || Number(id) < 1) {
        throw new ConflictException(
          `La sección accesibilidad requiere seleccionar un ${label} del catálogo antes de publicar.`,
        );
      }
      return Number(id);
    };
    const ensureOptional = async (
      item: JsonRecord,
      key: string,
      table: string,
      label: string,
    ) => {
      if (item[key] !== undefined && item[key] !== null) {
        await this.ensureReference(
          manager,
          table,
          requireCatalogId(item, key, label),
          label,
        );
      }
    };

    if (Array.isArray(details.roads) && details.roads.length > 0) {
      for (const item of details.roads) {
        if (!isJsonRecord(item))
          throw new ConflictException(
            "Una vía terrestre no es válida para publicar.",
          );
        await this.ensureReference(
          manager,
          "tipos_via_terrestre",
          requireCatalogId(item, "roadTypeId", "tipo de vía terrestre"),
          "tipo de vía terrestre",
        );
        await ensureOptional(
          item,
          "materialId",
          "materiales_via",
          "material de vía",
        );
        await ensureOptional(
          item,
          "conditionId",
          "estados_condicion",
          "estado de vía",
        );
      }
    }
    if (Array.isArray(details.aquatic) && details.aquatic.length > 0) {
      for (const item of details.aquatic) {
        if (!isJsonRecord(item))
          throw new ConflictException(
            "Un acceso acuático no es válido para publicar.",
          );
        await this.ensureReference(
          manager,
          "modalidades_acceso_acuatico",
          requireCatalogId(item, "modalityId", "modalidad de acceso acuático"),
          "modalidad de acceso acuático",
        );
        await ensureOptional(
          item,
          "departureConditionId",
          "estados_condicion",
          "estado del puerto o muelle",
        );
        await ensureOptional(
          item,
          "arrivalConditionId",
          "estados_condicion",
          "estado del puerto o muelle",
        );
      }
    }
    if (Array.isArray(details.aerial) && details.aerial.length > 0) {
      for (const item of details.aerial) {
        if (!isJsonRecord(item))
          throw new ConflictException(
            "Un acceso aéreo no es válido para publicar.",
          );
        await this.ensureReference(
          manager,
          "coberturas_acceso_aereo",
          requireCatalogId(item, "coverageId", "cobertura de acceso aéreo"),
          "cobertura de acceso aéreo",
        );
      }
    }
    if (
      Array.isArray(details.transportTypes) &&
      details.transportTypes.length > 0
    ) {
      for (const item of details.transportTypes) {
        if (!isJsonRecord(item))
          throw new ConflictException(
            "Un tipo de transporte no es válido para publicar.",
          );
        await this.ensureReference(
          manager,
          "tipos_transporte",
          requireCatalogId(item, "typeId", "tipo de transporte"),
          "tipo de transporte",
        );
      }
    }
    if (
      Array.isArray(details.transportDetails) &&
      details.transportDetails.length > 0
    ) {
      for (const item of details.transportDetails) {
        if (!isJsonRecord(item))
          throw new ConflictException(
            "Un detalle de transporte no es válido para publicar.",
          );
        await ensureOptional(
          item,
          "frequencyId",
          "frecuencias_servicio",
          "frecuencia de transporte",
        );
      }
    }
    if (Array.isArray(details.criteria) && details.criteria.length > 0) {
      for (const item of details.criteria) {
        if (!isJsonRecord(item))
          throw new ConflictException(
            "Un criterio de accesibilidad no es válido para publicar.",
          );
        await this.ensureReference(
          manager,
          "criterios_accesibilidad",
          requireCatalogId(item, "criterionId", "criterio de accesibilidad"),
          "criterio de accesibilidad",
        );
        await ensureOptional(
          item,
          "accessibilityTypeId",
          "tipos_accesibilidad",
          "tipo de accesibilidad",
        );
      }
    }
    if (isJsonRecord(details.signage)) {
      const available = details.signage.available;
      if (
        available !== undefined &&
        available !== null &&
        available !== "SI" &&
        available !== "NO" &&
        available !== "SIN_INFORMACION" &&
        available !== "NO_APLICA"
      ) {
        throw new ConflictException(
          "La señalización de aproximación requiere Sí o No antes de publicar.",
        );
      }
      await ensureOptional(
        details.signage,
        "conditionId",
        "estados_condicion",
        "estado de señalización",
      );
    }
  }

  private async ensureReferences(
    manager: EntityManager,
    table: string,
    ids: number[],
    label: string,
  ) {
    if (ids.length === 0) return;
    const rows = await manager.query(
      `SELECT id FROM ${table} WHERE id = ANY($1::bigint[]) AND activo = TRUE`,
      [ids],
    );
    if (rows.length !== ids.length) {
      throw new ConflictException(
        `La ${label} seleccionada no está disponible.`,
      );
    }
  }

  private async ensureReference(
    manager: EntityManager,
    table: string,
    id: number,
    label: string,
  ) {
    const rows = await manager.query(
      `SELECT 1 FROM ${table} WHERE id = $1 AND activo = TRUE LIMIT 1`,
      [id],
    );
    if (!rows[0])
      throw new ConflictException(
        `El ${label} seleccionado no está disponible.`,
      );
  }

  private async ensureCodeReference(
    manager: EntityManager,
    table: string,
    code: string,
    label: string,
  ) {
    const rows = await manager.query(
      `SELECT 1 FROM ${table} WHERE codigo = $1 AND activo = TRUE LIMIT 1`,
      [code],
    );
    if (!rows[0]) {
      throw new ConflictException(
        `El ${label} seleccionado no está disponible para publicar.`,
      );
    }
  }

  private async nextSequence(
    manager: EntityManager,
    parishId: number,
  ): Promise<number> {
    await manager.query("SELECT id FROM parroquias WHERE id = $1 FOR UPDATE", [
      parishId,
    ]);
    const rows = (await manager.query(
      "SELECT COALESCE(MAX(secuencial_atractivo), 0) + 1 AS next FROM centros_turisticos WHERE parroquia_id = $1",
      [parishId],
    )) as { next: number }[];
    const next = Number(rows[0]?.next ?? 1);
    if (next > 999)
      throw new ConflictException(
        "La parroquia alcanzó el máximo de 999 atractivos.",
      );
    return next;
  }

  private async setCenterState(
    manager: EntityManager,
    centerId: string,
    code: string,
  ) {
    const state = await this.stateId(manager, code);
    await manager.query(
      "UPDATE centros_turisticos SET estado_resenia_id = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $1",
      [centerId, state.id],
    );
  }

  private async stateId(
    manager: EntityManager,
    code: string,
  ): Promise<{ id: string; name: string }> {
    const rows = (await manager.query(
      "SELECT id, nombre AS name FROM estados_resenia WHERE codigo = $1 AND activo = TRUE",
      [code],
    )) as { id: string; name: string }[];
    if (!rows[0])
      throw new ConflictException(`El estado ${code} no está configurado.`);
    return rows[0];
  }

  private async audit(
    manager: EntityManager,
    centerId: string,
    actorId: number,
    action: string,
    previous: unknown,
    next: unknown,
    sectionCode?: string,
  ) {
    await manager.query(
      `INSERT INTO auditoria_fichas
        (centro_turistico_id, usuario_id, accion, seccion_codigo, datos_anteriores, datos_nuevos)
       VALUES ($1,$2,$3,$4,$5::jsonb,$6::jsonb)`,
      [
        centerId,
        actorId,
        action,
        sectionCode ?? null,
        previous ? JSON.stringify(previous) : null,
        next ? JSON.stringify(next) : null,
      ],
    );
  }
}

function mergeDraft(base: CenterDraft, input: SaveAdminCenterDto): CenterDraft {
  const {
    address,
    administration,
    climate,
    admission,
    activities,
    accessibility,
    facilities,
  } = input;
  const scalar = Object.fromEntries(
    Object.entries(input).filter(
      ([key, value]) => key !== "version" && value !== undefined,
    ),
  ) as Partial<CenterDraft>;
  return {
    ...base,
    ...defined(scalar),
    ...(address ? { address: { ...base.address, ...defined(address) } } : {}),
    ...(administration
      ? {
          administration: {
            ...base.administration,
            ...defined(administration),
          } as AdminAdministrationDto,
        }
      : {}),
    ...(climate
      ? { climate: { ...base.climate, ...defined(climate) } as AdminClimateDto }
      : {}),
    ...(admission
      ? {
          admission: {
            ...base.admission,
            ...defined(admission),
          } as AdminAdmissionDto,
        }
      : {}),
    ...(activities ? { activities } : {}),
    ...(accessibility ? { accessibility } : {}),
    ...(facilities ? { facilities } : {}),
  };
}

function defined<T extends object>(value: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).filter(
      ([, item]) => item !== undefined,
    ),
  ) as Partial<T>;
}

function normalizeActivities(value: unknown): AdminActivityDto[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => {
    const row = item as Record<string, unknown>;
    return {
      activityId: Number(row.activityId),
      active: row.active !== false,
      detailOther:
        typeof row.detailOther === "string" ? row.detailOther : undefined,
      observation:
        typeof row.observation === "string" ? row.observation : undefined,
    };
  });
}

function normalizeAccessibility(value: unknown): AdminAccessibilityDto[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => {
    const row = item as Record<string, unknown>;
    return {
      typeId: Number(row.typeId),
      applies: row.applies === true,
      observation:
        typeof row.observation === "string" ? row.observation : undefined,
    };
  });
}

function normalizeFacilities(value: unknown): AdminFacilityDto[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => {
    const row = item as Record<string, unknown>;
    return {
      typeId: Number(row.typeId),
      quantity: row.quantity == null ? undefined : Number(row.quantity),
      detailOther:
        typeof row.detailOther === "string" ? row.detailOther : undefined,
      observation:
        typeof row.observation === "string" ? row.observation : undefined,
    };
  });
}
