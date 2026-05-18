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
