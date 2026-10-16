/** Compara versiones `x.y.z`; un número positivo significa que `a` es más nueva. */
export function compareVersions(a: string, b: string): number {
  const left = a.split(".").map(Number);
  const right = b.split(".").map(Number);
  for (let i = 0; i < 3; i += 1) {
    const diff = (left[i] ?? 0) - (right[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

/** Hay una versión publicada más nueva que la instalada y el usuario no la descartó. */
export function shouldOfferUpdate(
  installed: string,
  latest: string,
  dismissed: string | null,
): boolean {
  if (compareVersions(latest, installed) <= 0) return false;
  return dismissed === null || compareVersions(latest, dismissed) > 0;
}
