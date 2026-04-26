/**
 * DataAdapterEngine
 *
 * Applies adapters to transform API response data into CRM-compatible format.
 * Two adapter types:
 * - "replace": dictionary-based property name/value replacement
 * - "js": JavaScript script transformation
 *
 * Adapters run only on the server side.
 */

import * as fs from "fs/promises";
import * as path from "path";
import { Adapter, ReplaceRule } from "@/types/adapter";

/**
 * Apply a replace adapter to data
 * Recursively walks through the data, replacing keys and values based on rules
 */
function applyReplace(data: any, rules: Record<string, ReplaceRule>): any {
  if (data === null || data === undefined) {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map((item) => applyReplace(item, rules));
  }

  if (typeof data !== "object") {
    return data;
  }

  const result: Record<string, any> = {};

  for (const [key, value] of Object.entries(data)) {
    const rule = rules[key];

    if (rule) {
      // Rule found
      const targetKey = rule.name !== undefined ? rule.name : key;

      if (rule.value !== undefined) {
        // Value specified: apply $value$ macro, NO recursion
        result[targetKey] = replaceValueMacro(rule.value, value);
      } else {
        // Value not specified: recurse into original value
        result[targetKey] = applyReplace(value, rules);
      }
    } else {
      // No rule: keep original key, recurse if object/array
      result[key] = applyReplace(value, rules);
    }
  }

  return result;
}

/**
 * Replace $value$ macro in a value with the original value
 * Handles both string and non-string target values
 */
function replaceValueMacro(template: any, originalValue: any): any {
  if (typeof template === "string" && template.includes("$value$")) {
    return template.replace(/\$value\$/g, String(originalValue));
  }
  // If template is an object, recursively replace $value$ macros
  if (typeof template === "object" && template !== null) {
    return replaceMacroInObject(template, originalValue);
  }
  return template;
}

/**
 * Recursively replace $value$ macro in an object
 */
function replaceMacroInObject(obj: any, originalValue: any): any {
  if (Array.isArray(obj)) {
    return obj.map((item) =>
      typeof item === "object" && item !== null
        ? replaceMacroInObject(item, originalValue)
        : typeof item === "string"
          ? item.replace(/\$value\$/g, String(originalValue))
          : item,
    );
  }

  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === "string") {
      result[key] = value.replace(/\$value\$/g, String(originalValue));
    } else if (typeof value === "object" && value !== null) {
      result[key] = replaceMacroInObject(value, originalValue);
    } else {
      result[key] = value;
    }
  }
  return result;
}

/**
 * Apply a JS adapter to data
 * Loads the script from public/ directory and executes it
 */
async function applyJs(data: any, scriptPath: string): Promise<any> {
  const fullPath = path.join(process.cwd(), "public", scriptPath);

  let scriptContent: string;
  try {
    scriptContent = await fs.readFile(fullPath, "utf-8");
  } catch (error) {
    throw new Error(
      `JS adapter script not found: ${fullPath}. Error: ${(error as Error).message}`,
    );
  }

  // Execute the script in a sandboxed function
  // The script should be a function that takes `data` and returns transformed data
  // We wrap it to handle both export default and direct function
  try {
    const adapterFn = new Function(
      "data",
      `${scriptContent}; return transform(data);`,
    );
    return adapterFn(data);
  } catch (error) {
    // If direct execution fails, try to evaluate as a module
    try {
      // Wrap the script content and execute
      const wrappedScript = `
        const exports = {};
        ${scriptContent}
        const fn = exports.default || exports.transform || transform;
        return fn(data);
      `;
      const adapterFn = new Function("data", wrappedScript);
      return adapterFn(data);
    } catch (innerError) {
      throw new Error(
        `JS adapter execution failed: ${(innerError as Error).message}`,
      );
    }
  }
}

/**
 * Main entry point: apply an adapter to data
 * @param data - The raw API response data
 * @param adapter - The adapter configuration
 * @returns Transformed data
 */
export async function applyAdapter(data: any, adapter: Adapter): Promise<any> {
  switch (adapter.type) {
    case "replace":
      return applyReplace(data, adapter.rules);

    case "js":
      return applyJs(data, adapter.script);

    default:
      throw new Error(`Unknown adapter type: ${(adapter as any).type}`);
  }
}
