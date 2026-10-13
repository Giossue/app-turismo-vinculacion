export const VALUATION_CRITERIA = [
  { code: "A", name: "Accesibilidad y conectividad", maximum: 18 },
  { code: "B", name: "Planta turística y servicios", maximum: 18 },
  { code: "C", name: "Estado de conservación e integración", maximum: 14 },
  { code: "D", name: "Higiene y seguridad turística", maximum: 14 },
  { code: "E", name: "Políticas y regulaciones", maximum: 10 },
  { code: "F", name: "Actividades que se practican", maximum: 9 },
  { code: "G", name: "Difusión y promoción", maximum: 7 },
  { code: "H", name: "Registro de visitantes y afluencia", maximum: 5 },
  { code: "I", name: "Recurso humano", maximum: 5 },
] as const;

export type ValuationCriterionCode =
  (typeof VALUATION_CRITERIA)[number]["code"];

export type ValuationIndicatorInput = {
  code: string;
  value: number;
  maximum: number;
  detail?: Record<string, unknown>;
  observation?: string;
};

export type ValuationCriterionInput = {
  code: ValuationCriterionCode;
  indicators: ValuationIndicatorInput[];
};

export type ValuationIndicatorResult = ValuationIndicatorInput & {
  score: number;
};

export type ValuationCriterionResult = {
  code: ValuationCriterionCode;
  name: string;
  maximum: number;
  score: number;
  indicators: ValuationIndicatorResult[];
};

export type ValuationResult = {
  total: number;
  hierarchyCode: "00" | "01" | "02" | "03" | "04";
  criteria: ValuationCriterionResult[];
};

/**
 * Señales que usa la hoja `Jerarquia`/`Calculos` del XLSM. Se mantienen
 * separadas de los DTO HTTP para que el traslado de las fórmulas no dependa
 * de nombres de celdas ni de texto ejecutable almacenado en la base.
 */
export type XlsmCondition = "BUENO" | "REGULAR" | "MALO" | null;
export type XlsmConservationState =
  "CONSERVADO" | "ALTERADO" | "EN_PROCESO_DE_DETERIORO" | "DETERIORADO" | null;

export type XlsmValuationInput = Readonly<{
  accessibility: Readonly<{
    transport: Readonly<{
      terrestrial: Readonly<{
        enabled: boolean;
        routes: readonly Readonly<{
          selected: boolean;
          condition: XlsmCondition;
        }>[];
      }>;
      aquatic: Readonly<{
        enabled: boolean;
        routes: readonly Readonly<{
          selected: boolean;
          departure: XlsmCondition;
          arrival: XlsmCondition;
        }>[];
      }>;
      aerial: Readonly<{ enabled: boolean }>;
    }>;
    physicalAccess: readonly boolean[];
    connectivity: readonly boolean[];
  }>;
  plant: readonly boolean[];
  conservation: Readonly<{
    attraction: XlsmConservationState;
    environment: XlsmConservationState;
  }>;
  hygieneSafety: readonly boolean[];
  policies: readonly boolean[];
  activities: readonly boolean[];
  promotion: readonly boolean[];
  visitors: readonly boolean[];
  humanResources: readonly boolean[];
}>;

/**
 * Fragmentos del borrador que alimentan las señales de la ficha XLSM. El
 * adaptador acepta `unknown` porque el borrador se conserva como JSONB; nunca
 * interpreta el texto de `regla_calculo` como código.
 */
export type XlsmValuationDraft = Readonly<{
  sections?: Readonly<Record<string, unknown>>;
  activities?: readonly unknown[];
  accessibility?: readonly unknown[];
}>;

export type XlsmValuationCatalogs = Readonly<{
  conditionCodes?: ReadonlyMap<number, string>;
  plantNames?: ReadonlyMap<number, string>;
  activityGroups?: ReadonlyMap<number, string>;
  accessibilityNames?: ReadonlyMap<number, string>;
  hygieneNames?: ReadonlyMap<string, string>;
  facilityCategoryNames?: ReadonlyMap<number, string>;
}>;

/** Todos los indicadores que debe tener el catálogo para activar el cálculo. */
export const XLSM_INDICATOR_CODES = [
  "A.TRANSPORT",
  ...Array.from(
    { length: 5 },
    (_, index) => `A.ACCESS_PHYSICAL_${String(index + 1).padStart(2, "0")}`,
  ),
  ...Array.from(
    { length: 3 },
    (_, index) => `A.CONNECTIVITY_${String(index + 1).padStart(2, "0")}`,
  ),
  ...Array.from(
    { length: 15 },
    (_, index) => `B.PLANT_${String(index + 1).padStart(2, "0")}`,
  ),
  "C.ATTR_CONSERVATION",
  "C.ENV_CONSERVATION",
  ...Array.from(
    { length: 13 },
    (_, index) => `D.HYGIENE_SAFETY_${String(index + 1).padStart(2, "0")}`,
  ),
  ...Array.from(
    { length: 4 },
    (_, index) => `E.POLICIES_${String(index + 1).padStart(2, "0")}`,
  ),
  ...Array.from(
    { length: 4 },
    (_, index) => `F.ACTIVITIES_${String(index + 1).padStart(2, "0")}`,
  ),
  ...Array.from(
    { length: 3 },
    (_, index) => `G.PROMOTION_${String(index + 1).padStart(2, "0")}`,
  ),
  ...Array.from(
    { length: 3 },
    (_, index) => `H.VISITORS_${String(index + 1).padStart(2, "0")}`,
  ),
  ...Array.from(
    { length: 3 },
    (_, index) => `I.HUMAN_RESOURCES_${String(index + 1).padStart(2, "0")}`,
  ),
] as const;

const XLSM_PLANT_WEIGHTS = [
  1.5, 1.5, 1.5, 1.5, 1.5, 1.5, 1.5, 1.5, 0.6, 0.6, 0.6, 0.6, 0.6, 1.5, 1.5,
] as const;
const XLSM_HYGIENE_WEIGHTS = [
  1.5, 1.5, 0.6, 0.6, 0.6, 0.6, 0.6, 1.5, 1.5, 2, 1, 1, 1,
] as const;
const XLSM_POLICY_WEIGHTS = [3, 3, 2, 2] as const;
const XLSM_ACTIVITY_WEIGHTS = [3, 3, 3, 9] as const;
const XLSM_PROMOTION_WEIGHTS = [2, 2, 3] as const;
const XLSM_VISITOR_WEIGHTS = [3, 2, 2] as const;
const XLSM_HUMAN_RESOURCE_WEIGHTS = [2, 2, 1] as const;
const XLSM_PHYSICAL_ACCESS_WEIGHTS = [2, 1, 1, 1, 1] as const;
const XLSM_CONNECTIVITY_WEIGHTS = [3, 2, 1] as const;

/**
 * Traslada el snapshot JSONB de las secciones a las señales de `Jerarquia`.
 * Las posiciones de cada arreglo siguen el orden de la ficha ecuatoriana; los
 * catálogos solo aportan nombres/códigos para no depender de IDs cambiantes.
 */
export function buildXlsmValuationInput(
  draft: XlsmValuationDraft,
  catalogs: XlsmValuationCatalogs = {},
): XlsmValuationInput {
  const sections = draft.sections ?? {};
  const accessibility = record(sections.accesibilidad);
  const accessibilityDetails = record(accessibility?.accessibilityDetails);
  const roads = records(accessibilityDetails?.roads);
  const aquatic = records(accessibilityDetails?.aquatic);
  const aerial = records(accessibilityDetails?.aerial);
  const signage = record(accessibilityDetails?.signage);

  const physicalAccess = [
    "GENERAL",
    "FISICA",
    "VISUAL",
    "AUDITIVA",
    "COGNITIVA",
  ].map((kind) => accessibilitySignal(draft.accessibility, catalogs, kind));

  const plant = plantSignals(record(sections.planta), catalogs);
  const conservation = conservationSignals(record(sections.conservacion));
  const hygieneSafety = hygieneSignals(
    record(sections["higiene-seguridad"]),
    catalogs.hygieneNames,
  );
  const policies = policySignals(record(sections.politicas));
  const activities = activitySignals(draft.activities, catalogs.activityGroups);
  const promotion = promotionSignals(record(sections.promocion));
  const visitors = visitorSignals(record(sections.visitantes));
  const humanResources = humanResourceSignals(
    record(sections["recurso-humano"]),
  );

  return {
    accessibility: {
      transport: {
        terrestrial: {
          enabled: roads.some(hasMeaningfulValue),
          routes: roads.map((road) => ({
            selected: hasMeaningfulValue(road),
            condition: conditionFrom(
              road.condition,
              road.conditionId,
              catalogs.conditionCodes,
            ),
          })),
        },
        aquatic: {
          enabled: aquatic.some(hasMeaningfulValue),
          routes: aquatic.map((access) => ({
            selected: hasMeaningfulValue(access),
            departure: conditionFrom(
              access.departureCondition,
              access.departureConditionId,
              catalogs.conditionCodes,
            ),
            arrival: conditionFrom(
              access.arrivalCondition,
              access.arrivalConditionId,
              catalogs.conditionCodes,
            ),
          })),
        },
        aerial: { enabled: aerial.some(hasMeaningfulValue) },
      },
      physicalAccess,
      // Señalización de aproximación (4.5): estado Bueno, Regular o Malo.
      connectivity: approachSignageStates(signage, catalogs),
    },
    plant,
    conservation,
    hygieneSafety,
    policies,
    activities,
    promotion,
    visitors,
    humanResources,
  };
}

const ATTRACTION = "EN_ATRACTIVO";
const NEARBY_TOWN = "EN_POBLADO_CERCANO";

/**
 * Las 15 casillas de Planta de `Jerarquia`: alojamiento, alimentos y bebidas,
 * agencias y guías, cada uno en el atractivo y en la ciudad cercana; las cinco
 * categorías de facilidades del entorno y los complementarios en el atractivo
 * y en la ciudad.
 */
function plantSignals(
  section: JsonRecord | null,
  catalogs: XlsmValuationCatalogs,
): boolean[] {
  const rows: Array<JsonRecord & { label: string }> = records(
    section?.plant,
  ).map((item) => ({
    ...item,
    label: normalize(
      [
        text(item.group),
        text(item.typeLabel),
        catalogs.plantNames?.get(integer(item.typeId) ?? -1) ?? "",
      ].join(" "),
    ),
  }));
  const inGroup = (pattern: RegExp, scope: string) =>
    rows.some(
      (row) =>
        row.scope === scope && pattern.test(row.label) && positiveQuantity(row),
    );
  const lodging =
    /ALOJAMIENTO|HOTEL|HOSTAL|HOSTERIA|HACIENDA|LODGE|RESORT|REFUGIO|CAMPAMENTO|CASA DE HUESPED/;
  const food = /ALIMENTO|BEBIDA|RESTAUR|CAFETER|BARES|FUENTE DE SODA/;
  const agencies = /AGENCIA|OPERADORA|MAYORISTA|INTERNACIONAL/;
  const guides = /GUIA|GUIANZA|ESPECIALIZADO/;

  // Las casillas de facilidades del Excel son una por categoría (a–e).
  const facilityCategories = records(section?.facilitiesDetails).map((item) =>
    normalize(
      catalogs.facilityCategoryNames?.get(integer(item.categoryId) ?? -1) ?? "",
    ),
  );
  const hasFacility = (pattern: RegExp) =>
    facilityCategories.some((label) => pattern.test(label));
  const services = records(section?.complementaryServices);
  const hasService = (scope: string) =>
    services.some((item) => item.scope === scope);

  return [
    inGroup(lodging, ATTRACTION),
    inGroup(lodging, NEARBY_TOWN),
    inGroup(food, ATTRACTION),
    inGroup(food, NEARBY_TOWN),
    inGroup(agencies, ATTRACTION),
    inGroup(agencies, NEARBY_TOWN),
    inGroup(guides, ATTRACTION),
    inGroup(guides, NEARBY_TOWN),
    hasFacility(/APOYO/),
    hasFacility(/OBSERVACION/),
    hasFacility(/RECORRIDO/),
    hasFacility(/SERVICIO/),
    hasFacility(/^OTROS?$/),
    hasService(ATTRACTION),
    hasService(NEARBY_TOWN),
  ];
}

function conservationSignals(
  section: JsonRecord | null,
): XlsmValuationInput["conservation"] {
  const conservation = record(section?.conservation);
  return {
    attraction: conservationState(record(conservation?.attraction)?.state),
    environment: conservationState(record(conservation?.environment)?.state),
  };
}

/**
 * Las 13 casillas de Higiene y seguridad: servicios básicos, cinco señales
 * puntuales, salud, seguridad y comunicación (en el atractivo y en la ciudad
 * cercana, salvo seguridad) y el plan de contingencia.
 */
function hygieneSignals(
  section: JsonRecord | null,
  names?: ReadonlyMap<string, string>,
): boolean[] {
  const hygiene = record(section?.hygieneSafety);
  const entries = records(hygiene?.entries).filter((entry) =>
    responseIsYes(entry.response),
  );
  const has = (kind: string, scope?: string) =>
    entries.some(
      (entry) =>
        entry.kind === kind && (scope === undefined || entry.scope === scope),
    );
  const signageLabels = entries
    .filter((entry) => entry.kind === "SIGNAGE")
    .map((entry) =>
      normalize(
        [
          text(entry.name),
          names?.get(`SIGNAGE:${String(integer(entry.typeId) ?? "")}`) ?? "",
        ].join(" "),
      ),
    );
  const hasSignage = (pattern: RegExp) =>
    signageLabels.some((label) => pattern.test(label));
  const contingency = record(hygiene?.contingency);
  return [
    has("BASIC_SERVICE", ATTRACTION),
    has("BASIC_SERVICE", NEARBY_TOWN),
    hasSignage(/PICTOGRAMAS? DE RESTRICCION/),
    hasSignage(/PANELES? DE DIRECCIONAMIENTO/),
    hasSignage(/NORMATIVOS/),
    hasSignage(/PROTECCION DE LOS ELEMENTOS/),
    hasSignage(/^OTROS?$/),
    has("HEALTH", ATTRACTION),
    has("HEALTH", NEARBY_TOWN),
    has("SECURITY"),
    has("COMMUNICATION", ATTRACTION),
    has("COMMUNICATION", NEARBY_TOWN),
    responseIsYes(contingency?.exists),
  ];
}

function policySignals(section: JsonRecord | null): boolean[] {
  return records(section?.policies)
    .slice(0, 4)
    .map((policy) => responseIsYes(policy.response))
    .concat([false, false, false, false])
    .slice(0, 4);
}

function activitySignals(
  activities: readonly unknown[] | undefined,
  groups?: ReadonlyMap<number, string>,
): boolean[] {
  const values = records(activities)
    .filter((activity) => activity.active === true)
    .map((activity) =>
      normalize(
        [
          groups?.get(integer(activity.activityId) ?? -1) ?? "",
          text(activity.group),
          text(activity.name),
        ].join(" "),
      ),
    );
  return [
    values.some((value) => /AGUA|ACUAT/.test(value)),
    values.some((value) => /AIRE|AERE/.test(value)),
    values.some((value) => /TIERRA|TERREST/.test(value)),
    values.some((value) => /CULTUR|ARTESAN|HISTOR/.test(value)),
  ];
}

function promotionSignals(section: JsonRecord | null): boolean[] {
  const promotion = record(section?.promotion);
  return [
    responseIsYes(promotion?.hasPlan),
    responseIsYes(promotion?.includedInPlan),
    responseIsYes(promotion?.partOfPackage),
  ];
}

function visitorSignals(section: JsonRecord | null): boolean[] {
  const visitors = record(section?.visitors);
  const registry = record(visitors?.registry);
  const influx = record(visitors?.influx);
  // 11.2 «Frecuencia de visita según informantes clave»: puntúa por
  // informantes o demanda declarada, no por las temporadas ni los orígenes (11.1).
  const hasVisitData =
    records(visitors?.informants).some(hasMeaningfulValue) ||
    [influx?.weekday, influx?.weekend, influx?.holidays].some(
      (value) => typeof value === "number" && value > 0,
    ) ||
    (typeof influx?.frequency === "string" &&
      influx.frequency !== "INEXISTENTE");
  return [
    responseIsYes(registry?.exists),
    responseIsYes(registry?.reports),
    hasVisitData,
  ];
}

/**
 * Recurso humano: personas especializadas en turismo, capacitación por
 * temática e idiomas. Los niveles de instrucción no puntúan.
 */
function humanResourceSignals(section: JsonRecord | null): boolean[] {
  const resources = record(section?.humanResources);
  const summary = record(resources?.summary);
  const training = records(resources?.training);
  const trained = (group: string) =>
    training.some((item) => item.group === group && positive(item.quantity));
  return [
    positive(summary?.specializedTourism),
    trained("CAPACITACION"),
    trained("IDIOMA"),
  ];
}

/**
 * Condiciones de accesibilidad (4.4): la casilla de cada tipo de discapacidad.
 * Las respuestas del detalle por criterio no puntúan, igual que en el libro.
 */
function accessibilitySignal(
  summary: readonly unknown[] | undefined,
  catalogs: XlsmValuationCatalogs,
  kind: string,
): boolean {
  const labels = records(summary)
    .filter((item) => item.applies === true)
    .map((item) =>
      normalize(
        catalogs.accessibilityNames?.get(integer(item.typeId) ?? -1) ??
          text(item.name),
      ),
    );
  const pattern = {
    GENERAL: /GENERAL/,
    FISICA: /FISIC/,
    VISUAL: /VISUAL/,
    AUDITIVA: /AUDIT/,
    COGNITIVA: /COGNIT|INTELECT|PSICOSOCIAL/,
  }[kind];
  return pattern ? labels.some((label) => pattern.test(label)) : false;
}

/** Estado (Bueno, Regular, Malo) de la señalización de aproximación. */
function approachSignageStates(
  signage: JsonRecord | null,
  catalogs: XlsmValuationCatalogs,
): boolean[] {
  const state = conditionFrom(
    signage?.condition,
    signage?.conditionId,
    catalogs.conditionCodes,
  );
  return [state === "BUENO", state === "REGULAR", state === "MALO"];
}

function conditionFrom(
  direct: unknown,
  id: unknown,
  codes?: ReadonlyMap<number, string>,
): XlsmCondition {
  const value = normalize(
    typeof direct === "string" ? direct : (codes?.get(integer(id) ?? -1) ?? ""),
  );
  if (value.includes("BUENO")) return "BUENO";
  if (value.includes("REGULAR")) return "REGULAR";
  if (value.includes("MALO")) return "MALO";
  return null;
}

function conservationState(value: unknown): XlsmConservationState {
  const normalized = normalize(value);
  if (normalized.includes("CONSERVADO")) return "CONSERVADO";
  if (normalized.includes("ALTERADO")) return "ALTERADO";
  if (normalized.includes("PROCESO") && normalized.includes("DETERIOR")) {
    return "EN_PROCESO_DE_DETERIORO";
  }
  if (normalized.includes("DETERIORADO")) return "DETERIORADO";
  return null;
}

function responseIsYes(value: unknown): boolean {
  return value === true || value === "SI";
}

function positive(value: unknown): boolean {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function positiveQuantity(value: JsonRecord): boolean {
  return [
    value.quantity1,
    value.quantity2,
    value.quantity3,
    value.quantity,
  ].some(positive);
}

function hasMeaningfulValue(value: JsonRecord): boolean {
  return Object.entries(value).some(([key, item]) => {
    if (key === "observation") return false;
    if (typeof item === "number") return Number.isFinite(item) && item !== 0;
    return typeof item === "string" && item.trim().length > 0;
  });
}

type JsonRecord = Record<string, unknown>;

function record(value: unknown): JsonRecord | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as JsonRecord)
    : null;
}

function records(value: unknown): JsonRecord[] {
  return Array.isArray(value)
    ? value.filter((item): item is JsonRecord => record(item) !== null)
    : [];
}

function text(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function integer(value: unknown): number | null {
  return typeof value === "number" && Number.isInteger(value) ? value : null;
}

function normalize(value: unknown): string {
  return text(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, " ")
    .trim();
}

/**
 * Reproduce las fórmulas observables del libro de referencia sin ejecutar
 * `regla_calculo` como código. Los indicadores devueltos incluyen el detalle
 * de cada señal para que la persistencia futura pueda guardar una explicación.
 */
export function calculateXlsmValuation(
  input: XlsmValuationInput,
): ValuationResult {
  const criteria = [
    buildXlsmCriterion(
      "A",
      [
        indicator(
          "A.TRANSPORT",
          normalizeTransportModes([
            input.accessibility.transport.terrestrial.enabled
              ? scoreTerrestrialTransport(
                  input.accessibility.transport.terrestrial.routes,
                )
              : null,
            input.accessibility.transport.aquatic.enabled
              ? scoreAquaticTransport(
                  input.accessibility.transport.aquatic.routes,
                )
              : null,
            input.accessibility.transport.aerial.enabled ? 9 : null,
          ]),
          9,
          {
            formula: "Calculos!I18",
            modeScores: {
              terrestrial: input.accessibility.transport.terrestrial.enabled
                ? scoreTerrestrialTransport(
                    input.accessibility.transport.terrestrial.routes,
                  )
                : null,
              aquatic: input.accessibility.transport.aquatic.enabled
                ? scoreAquaticTransport(
                    input.accessibility.transport.aquatic.routes,
                  )
                : null,
              aerial: input.accessibility.transport.aerial.enabled ? 9 : null,
            },
          },
        ),
        ...weightedIndicators(
          "A.ACCESS_PHYSICAL",
          input.accessibility.physicalAccess,
          XLSM_PHYSICAL_ACCESS_WEIGHTS,
        ),
        ...weightedIndicators(
          "A.CONNECTIVITY",
          input.accessibility.connectivity,
          XLSM_CONNECTIVITY_WEIGHTS,
        ),
      ],
      18,
    ),
    buildXlsmCriterion(
      "B",
      weightedIndicators("B.PLANT", input.plant, XLSM_PLANT_WEIGHTS),
      18,
    ),
    buildXlsmCriterion(
      "C",
      [
        indicator(
          "C.ATTR_CONSERVATION",
          conservationScore(input.conservation.attraction),
          7,
          { formula: "Jerarquia!C37:C40" },
        ),
        indicator(
          "C.ENV_CONSERVATION",
          conservationScore(input.conservation.environment),
          7,
          { formula: "Jerarquia!C41:C44" },
        ),
      ],
      14,
    ),
    buildXlsmCriterion(
      "D",
      weightedIndicators(
        "D.HYGIENE_SAFETY",
        input.hygieneSafety,
        XLSM_HYGIENE_WEIGHTS,
      ),
      14,
    ),
    buildXlsmCriterion(
      "E",
      weightedIndicators("E.POLICIES", input.policies, XLSM_POLICY_WEIGHTS),
      10,
    ),
    buildXlsmCriterion(
      "F",
      weightedIndicators(
        "F.ACTIVITIES",
        input.activities,
        XLSM_ACTIVITY_WEIGHTS,
      ),
      9,
    ),
    buildXlsmCriterion(
      "G",
      weightedIndicators(
        "G.PROMOTION",
        input.promotion,
        XLSM_PROMOTION_WEIGHTS,
      ),
      7,
    ),
    buildXlsmCriterion(
      "H",
      weightedIndicators("H.VISITORS", input.visitors, XLSM_VISITOR_WEIGHTS),
      5,
    ),
    buildXlsmCriterion(
      "I",
      weightedIndicators(
        "I.HUMAN_RESOURCES",
        input.humanResources,
        XLSM_HUMAN_RESOURCE_WEIGHTS,
      ),
      5,
    ),
  ];
  const total = roundTwo(criteria.reduce((sum, item) => sum + item.score, 0));
  return { total, hierarchyCode: hierarchyForScore(total), criteria };
}

/**
 * Calculates the A–I result without evaluating spreadsheet text as code.
 * Each indicator supplies a numeric value and its declared maximum. Criterion
 * totals are capped at the official maximum, which prevents the XLSM F/H
 * overflows from producing an invalid hierarchy.
 */
export function calculateValuation(
  input: ValuationCriterionInput[],
): ValuationResult {
  const byCode = new Map(input.map((criterion) => [criterion.code, criterion]));
  const criteria = VALUATION_CRITERIA.map((definition) => {
    const source = byCode.get(definition.code);
    const indicators = (source?.indicators ?? []).map((indicator) => {
      const maximum = finiteNonNegative(indicator.maximum);
      const value = finiteNonNegative(indicator.value);
      return {
        ...indicator,
        maximum,
        value,
        score: roundTwo(Math.min(value, maximum)),
      };
    });
    const score = roundTwo(
      Math.min(
        definition.maximum,
        indicators.reduce((sum, indicator) => sum + indicator.score, 0),
      ),
    );
    return {
      code: definition.code,
      name: definition.name,
      maximum: definition.maximum,
      score,
      indicators,
    };
  });
  const total = roundTwo(
    Math.min(
      100,
      criteria.reduce((sum, criterion) => sum + criterion.score, 0),
    ),
  );
  return {
    total,
    hierarchyCode: hierarchyForScore(total),
    criteria,
  };
}

export function hierarchyForScore(
  score: number,
): ValuationResult["hierarchyCode"] {
  const normalized = Math.max(0, Math.min(100, finiteNonNegative(score)));
  if (normalized <= 10) return "00";
  if (normalized <= 35) return "01";
  if (normalized <= 60) return "02";
  if (normalized <= 85) return "03";
  return "04";
}

function buildXlsmCriterion(
  code: ValuationCriterionCode,
  indicators: ValuationIndicatorResult[],
  maximum: number,
): ValuationCriterionResult {
  const definition = VALUATION_CRITERIA.find((item) => item.code === code);
  if (!definition) throw new Error(`Criterio XLSM desconocido: ${code}`);
  return {
    code,
    name: definition.name,
    maximum,
    score: roundTwo(
      Math.min(
        maximum,
        indicators.reduce((sum, item) => sum + item.score, 0),
      ),
    ),
    indicators,
  };
}

function weightedIndicators(
  prefix: string,
  flags: readonly boolean[],
  weights: readonly number[],
): ValuationIndicatorResult[] {
  return weights.map((maximum, index) =>
    indicator(
      `${prefix}_${String(index + 1).padStart(2, "0")}`,
      flags[index] === true ? maximum : 0,
      maximum,
      {
        formula: "IF(seleccionado=TRUE,peso,0)",
        selected: flags[index] === true,
      },
    ),
  );
}

function indicator(
  code: string,
  value: number,
  maximum: number,
  detail: Record<string, unknown>,
): ValuationIndicatorResult {
  const normalizedMaximum = finiteNonNegative(maximum);
  const normalizedValue = finiteNonNegative(value);
  return {
    code,
    value: roundTwo(normalizedValue),
    maximum: roundTwo(normalizedMaximum),
    detail,
    score: roundTwo(Math.min(normalizedValue, normalizedMaximum)),
  };
}

function scoreTerrestrialTransport(
  routes: readonly Readonly<{
    selected: boolean;
    condition: XlsmCondition;
  }>[],
): number {
  const selected = routes.filter((route) => route.selected);
  if (selected.length === 0) return 0;
  const sum = selected.reduce(
    (total, route) => total + conditionPoints(route.condition),
    0,
  );
  return roundTwo((sum * 9) / (selected.length * 3));
}

function scoreAquaticTransport(
  routes: readonly Readonly<{
    selected: boolean;
    departure: XlsmCondition;
    arrival: XlsmCondition;
  }>[],
): number {
  const selected = routes.filter((route) => route.selected);
  if (selected.length === 0) return 0;
  const sum = selected.reduce(
    (total, route) =>
      total +
      (conditionPoints(route.departure) + conditionPoints(route.arrival)) / 2,
    0,
  );
  return roundTwo((sum * 9) / (selected.length * 3));
}

function normalizeTransportModes(scores: readonly (number | null)[]): number {
  const selected = scores.filter((score): score is number => score !== null);
  if (selected.length === 0) return 0;
  return roundTwo(
    (selected.reduce((sum, score) => sum + finiteNonNegative(score), 0) * 9) /
      (selected.length * 9),
  );
}

function conditionPoints(condition: XlsmCondition): number {
  switch (condition) {
    case "BUENO":
      return 3;
    case "REGULAR":
      return 2;
    case "MALO":
      return 1;
    default:
      return 0;
  }
}

function conservationScore(condition: XlsmConservationState): number {
  switch (condition) {
    case "CONSERVADO":
      return 7;
    case "ALTERADO":
      return 5;
    case "EN_PROCESO_DE_DETERIORO":
      return 3;
    case "DETERIORADO":
      return 1;
    default:
      return 0;
  }
}

function finiteNonNegative(value: number) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? value
    : 0;
}

function roundTwo(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
