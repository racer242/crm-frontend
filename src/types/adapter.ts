/**
 * Data Adapter Types
 * Configuration for transforming API responses into CRM-compatible data format
 */

/**
 * Rule for a single property replacement
 */
export interface ReplaceRule {
  /** New name for the property */
  name: string;
  /**
   * New value for the property.
   * Can be any type. May contain $value$ macro for the original value.
   */
  value?: any;
}

/**
 * Dictionary-based adapter that replaces property names and values
 */
export interface ReplaceAdapter {
  type: "replace";
  /** Map of original property names to their replacement rules */
  rules: Record<string, ReplaceRule>;
}

/**
 * JavaScript-based adapter that uses a script file for transformation
 */
export interface JsAdapter {
  type: "js";
  /** Path to the script file relative to public/ */
  script: string;
}

/**
 * Union type for all adapters
 */
export type Adapter = ReplaceAdapter | JsAdapter;

/**
 * Collection of adapters indexed by their ID
 */
export type AdaptersConfig = Record<string, Adapter>;
