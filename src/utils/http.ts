/**
 * HTTP utility functions
 */

/**
 * Build a URL with query parameters from a data object.
 * Used when method is GET (or similar) and data needs to be passed as query params.
 */
export function buildUrlWithParams(
  url: string,
  data: Record<string, any>,
): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(data)) {
    if (value === null || value === undefined) continue;
    params.append(
      key,
      typeof value === "object" && value !== null
        ? JSON.stringify(value)
        : String(value),
    );
  }
  return `${url}?${params.toString()}`;
}

/**
 * Parse URL search parameters back into a data object.
 * Reverse operation of buildUrlWithParams — tries JSON.parse for each value,
 * falls back to raw string for primitive values.
 */
export function parseSearchParams(
  searchParams: URLSearchParams,
): Record<string, any> {
  const result: Record<string, any> = {};
  for (const [key, value] of searchParams.entries()) {
    try {
      result[key] = JSON.parse(value);
    } catch {
      result[key] = value;
    }
  }
  return result;
}
