type CodedOption = Readonly<{ code: string; name: string }>;

/**
 * Removes options that repeat a `code`. The first occurrence keeps its
 * position and the last one provides the value, like `Map` insertion.
 */
export function uniqueByCode<T extends CodedOption>(
  values: readonly T[],
  { sortByName = false }: Readonly<{ sortByName?: boolean }> = {},
): T[] {
  const unique = [
    ...new Map(values.map((value) => [value.code, value])).values(),
  ];
  return sortByName
    ? unique.sort((left, right) => left.name.localeCompare(right.name))
    : unique;
}
