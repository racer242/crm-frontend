/**
 * Macro Substitution Utility
 *
 * Resolves macros in the format:
 * - {$ELEMENT_ID.state.PATH.TO.FIELD} - from element state
 * - {$state.PATH.TO.FIELD} - from current page state
 * - {$config.PATH.TO.FIELD} - from app config
 *
 * within strings and objects.
 *
 * Examples:
 * - "url": "api/{$users.state.selected.id}/profile" → "api/123/profile"
 * - "data": {$orders.state} → { orders: [...], total: 100 }
 * - "data": {"name": "{$users.state.name}"} → {"name": "John"}
 * - "url": "{$config.baseURL}/api/stats" → "http://localhost:3000/api/stats"
 * - "timeout": {$config.timeout} → 10000
 */

import { StateManager, ElementIndex } from "@/core";
import { ElementPath } from "@/types";

/**
 * Regex pattern to match macros: {$...}
 */
const MACRO_PATTERN = /\{\$([^}]+)\}/g;

/**
 * Checks if a string contains macros
 */
export function hasMacro(value: string): boolean {
  return MACRO_PATTERN.test(value);
}

/**
 * Replaces a single macro in a string with its resolved value
 */
function resolveMacro(
  macroContent: string,
  stateManager: StateManager,
  pageId: string | null,
  appConfig?: Record<string, any>,
): any {
  const parts = macroContent.split(".");

  // Check if first part is "config" - resolve from app config
  if (parts[0] === "config") {
    if (!appConfig) {
      return undefined;
    }
    const configPath = parts.slice(1).join(".");
    return getNestedValue(appConfig, configPath);
  }

  let elementId: string | null = null;
  let statePath: string;

  // Check if first part is "state" - use current page
  if (parts[0] === "state") {
    elementId = pageId;
    statePath = parts.slice(1).join(".");
  } else {
    // First part is element ID
    elementId = parts[0];
    // Find "state" in the path
    const stateIndex = parts.indexOf("state");
    if (stateIndex === -1) {
      // No "state" found - treat entire string as element ID with empty state path
      statePath = "";
    } else {
      statePath = parts.slice(stateIndex + 1).join(".");
    }
  }

  // Get the element's state
  if (!elementId) {
    return undefined;
  }

  const elementPath: ElementPath = elementId;
  const state = stateManager.getState(elementPath);

  if (!state) {
    return undefined;
  }

  // If no further path, return entire state
  if (!statePath) {
    return state;
  }

  // Get nested value from state
  return getNestedValue(state, statePath);
}

/**
 * Gets a nested value from an object using dot notation
 */
function getNestedValue(obj: Record<string, any>, path: string): any {
  const parts = path.split(".").filter(Boolean);
  let current: any = obj;

  for (const part of parts) {
    if (current === null || current === undefined) {
      return undefined;
    }
    current = current[part];
  }

  return current;
}

/**
 * Resolves all macros in a string value
 */
export function resolveMacrosInString(
  value: string,
  stateManager: StateManager,
  pageId: string | null,
  appConfig?: Record<string, any>,
): string | any {
  // Check if the entire string is a single macro (no surrounding text)
  const singleMacroMatch = value.match(/^\{\$([^}]+)\}$/);
  if (singleMacroMatch) {
    // Return the resolved value directly (could be any type)
    return resolveMacro(singleMacroMatch[1], stateManager, pageId, appConfig);
  }

  // Replace all macros in the string
  return value.replace(MACRO_PATTERN, (match, macroContent) => {
    const resolved = resolveMacro(
      macroContent,
      stateManager,
      pageId,
      appConfig,
    );
    return resolved !== undefined ? String(resolved) : match;
  });
}

/**
 * Recursively resolves macros in an object (including nested objects and arrays)
 */
export function resolveMacrosInObject(
  value: any,
  stateManager: StateManager,
  pageId: string | null,
  appConfig?: Record<string, any>,
): any {
  if (value === null || value === undefined) {
    return value;
  }

  if (typeof value === "string") {
    return resolveMacrosInString(value, stateManager, pageId, appConfig);
  }

  if (Array.isArray(value)) {
    return value.map((item) =>
      resolveMacrosInObject(item, stateManager, pageId, appConfig),
    );
  }

  if (typeof value === "object") {
    const result: Record<string, any> = {};
    for (const [key, val] of Object.entries(value)) {
      result[key] = resolveMacrosInObject(val, stateManager, pageId, appConfig);
    }
    return result;
  }

  // Primitive types (number, boolean, etc.)
  return value;
}

/**
 * Parses a target address in the format "[ELEMENT_ID.]state[.PATH.TO.FIELD]"
 *
 * Examples:
 * - "ordersTable.state.data" → { elementId: "ordersTable", statePath: "data" }
 * - "state.feed.orders" → { elementId: null, statePath: "feed.orders" }
 * - "state.loading" → { elementId: null, statePath: "loading" }
 */
export function parseTarget(target: string): {
  elementId: string | null;
  statePath: string;
} {
  const parts = target.split(".");

  // Check if first part is "state"
  if (parts[0] === "state") {
    return {
      elementId: null,
      statePath: parts.slice(1).join("."),
    };
  }

  // First part is element ID
  // Find "state" in the path
  const stateIndex = parts.indexOf("state");
  if (stateIndex === -1) {
    // No "state" found - treat entire string as element ID
    return {
      elementId: target,
      statePath: "",
    };
  }

  return {
    elementId: parts.slice(0, stateIndex).join("."),
    statePath: parts.slice(stateIndex + 1).join("."),
  };
}
