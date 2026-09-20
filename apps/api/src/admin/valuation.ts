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
          "C.ATTRACTION_CONSERVATION",
          conservationScore(input.conservation.attraction),
          7,
          { formula: "Jerarquia!C37:C40" },
        ),
        indicator(
          "C.ENVIRONMENT_CONSERVATION",
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
