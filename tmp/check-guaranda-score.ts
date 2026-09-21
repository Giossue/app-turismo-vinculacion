import { readFileSync } from "node:fs";

import {
  buildXlsmValuationInput,
  calculateXlsmValuation,
} from "../apps/api/src/admin/valuation";

type JsonObject = Record<string, unknown>;

const source = JSON.parse(
  readFileSync("../../tmp/guaranda-valuation-source.json", "utf8"),
) as {
  draft: JsonObject;
  conditionCodes: JsonObject;
  plantNames: JsonObject;
  activityGroups: JsonObject;
  accessibilityNames: JsonObject;
  hygieneNames: JsonObject;
};

const numberMap = (value: JsonObject) =>
  new Map(
    Object.entries(value).map(([key, item]) => [Number(key), String(item)] as const),
  );
const stringMap = (value: JsonObject) =>
  new Map(Object.entries(value).map(([key, item]) => [key, String(item)] as const));

const input = buildXlsmValuationInput(source.draft, {
  conditionCodes: numberMap(source.conditionCodes),
  plantNames: numberMap(source.plantNames),
  activityGroups: numberMap(source.activityGroups),
  accessibilityNames: numberMap(source.accessibilityNames),
  hygieneNames: stringMap(source.hygieneNames),
});
const result = calculateXlsmValuation(input);

console.log(
  JSON.stringify(
    {
      criteria: result.criteria.map(({ code, score }) => ({ code, score })),
      total: result.total,
      hierarchyCode: result.hierarchyCode,
      input,
    },
    null,
    2,
  ),
);
