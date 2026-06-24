/**
 * Recursively resolves {#field} and {#row.*} macros in a component definition
 * tree using the current row data from the DataTable.
 *
 * - "{#field}" -> rowData[fieldName]   (the current column's field value)
 * - "{#row.some.path}" -> nested property access from rowData
 *
 * Uses {#...} syntax to avoid conflicts with @state linkage system.
 */

function resolveValue(
  value: any,
  rowData: Record<string, any>,
  fieldName: string,
): any {
  if (typeof value === "string") {
    if (value === "{#field}") {
      return rowData[fieldName];
    }
    if (value.startsWith("{#row.")) {
      // Remove "{#row." prefix and trailing "}"
      const inner = value.slice(6, -1); // removes "{#row." and "}"
      return inner
        .split(".")
        .reduce(
          (obj, key) => (obj && obj[key] !== undefined ? obj[key] : undefined),
          rowData as any,
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
