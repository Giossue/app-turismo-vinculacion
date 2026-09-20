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

export type ValuationCriterionCode = (typeof VALUATION_CRITERIA)[number]["code"];

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
    Math.min(100, criteria.reduce((sum, criterion) => sum + criterion.score, 0)),
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

function finiteNonNegative(value: number) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? value
    : 0;
}

function roundTwo(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
