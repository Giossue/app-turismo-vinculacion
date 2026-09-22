/** Expo Router search params can repeat; screens only read the first value. */
export type SearchParamValue = string | string[] | undefined;

/** Returns the first trimmed value of a search param, or `undefined` if empty. */
export function firstSearchParam(value: SearchParamValue): string | undefined {
  const result = Array.isArray(value) ? value[0] : value;
  return result?.trim() || undefined;
}
