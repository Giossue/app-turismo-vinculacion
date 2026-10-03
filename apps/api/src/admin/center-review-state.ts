/** Current editorial state, including compatible reads of historical state codes. */
export function centerReviewStateSql(
  code: string,
  publishedAt = "NULL",
): string {
  return `CASE
    WHEN ${code} IN ('EN_REVISION', 'APROBADO') THEN 'EN_REVISION'
    WHEN ${code} = 'PUBLICADO' OR (${code} = 'INACTIVO' AND ${publishedAt} IS NOT NULL) THEN 'PUBLICADO'
    ELSE 'BORRADOR'
  END`;
}
