/**
 * Recursively resolves {#field} and {#row.*} macros in a component definition
 * tree using the current row data from the DataTable.
 *
 * Supports both exact matches ("{#field}") and inline macros ("mailto:{#field}", "/users/{#row.id}/edit").
 *
 * Uses {#...} syntax to avoid conflicts with @state linkage system.
 */

// Regex to match {#field} or {#row.*} patterns within strings
const MACRO_REGEX = /\{#(?:field|row\.[^}]+)\}/g;

function resolveMacro(
  match: string,
  rowData: Record<string, any>,
  fieldName: string,
): string {
  if (match === "{#field}") {
    const val = rowData[fieldName];
    return val !== undefined && val !== null ? String(val) : match;
  }
  if (match.startsWith("{#row.")) {
    // Remove "{#row." prefix and trailing "}"
    const inner = match.slice(6, -1);
    const result = inner
      .split(".")
      .reduce(
        (obj, key) => (obj && obj[key] !== undefined ? obj[key] : undefined),
        rowData as any,
      );
    return result !== undefined && result !== null ? String(result) : match;
  }
  return match;
}

function resolveValue(
  value: any,
  rowData: Record<string, any>,
  fieldName: string,
): any {
  if (typeof value === "string") {
    // Check if the string contains any macros to replace
    if (MACRO_REGEX.test(value)) {
      // Reset regex state
      MACRO_REGEX.lastIndex = 0;
      // Replace all occurrences of {#field} or {#row.*} in the string
      return value.replace(MACRO_REGEX, (match) =>
        resolveMacro(match, rowData, fieldName),
      );
    }
    return value;
  }
  return value;
}

function processObject(
  obj: Record<string, any>,
  rowData: Record<string, any>,
  fieldName: string,
): Record<string, any> {
  const result: Record<string, any> = {};
  for (const [key, val] of Object.entries(obj)) {
    result[key] = processValue(val, rowData, fieldName);
  }
  return result;
}

function processArray(
  arr: any[],
  rowData: Record<string, any>,
  fieldName: string,
): any[] {
  return arr.map((item) => processValue(item, rowData, fieldName));
}

function processValue(
  value: any,
  rowData: Record<string, any>,
  fieldName: string,
): any {
  if (Array.isArray(value)) {
    return processArray(value, rowData, fieldName);
  }
  if (value && typeof value === "object") {
    return processObject(value, rowData, fieldName);
  }
  return resolveValue(value, rowData, fieldName);
}

/**
 * Takes a component definition (or any object containing @field / @row.* tokens)
 * and returns a new definition with those tokens replaced by actual row data values.
 */
export function resolveRowBindings(
  componentDef: Record<string, any>,
  rowData: Record<string, any>,
  fieldName: string,
): Record<string, any> {
  return processObject(componentDef, rowData, fieldName);
}
