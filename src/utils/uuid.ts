/**
 * Сокращённая форма UUID для ячеек таблиц: «01a0...afef»
 * (4 первых + 4 последних символа). Не-UUID значения возвращаются как есть.
 */
export function formatUuid(value: unknown): string {
  if (typeof value !== "string") {
    return value === null || value === undefined ? "" : String(value);
  }
  if (
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      value,
    )
  ) {
    return `${value.slice(0, 4)}...${value.slice(-4)}`;
  }
  return value;
}
