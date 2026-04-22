/**
 * Macro Engine types
 *
 * Macro format: {$PREFIX.PATH.TO.FIELD}
 *
 * Supported macro prefixes:
 * - ELEMENT_ID.state.PATH — element state
 * - state.PATH — current page state
 * - config.PATH — app config
 * - location.PROP — URL properties (href, protocol, host, pathname, search, hash)
 * - location.query.PARAM — query parameters
 * - location.slug.N — path segments
 * - now.FORMAT — date/time (iso, timestamp, DD.MM.YY, DD.MM.YYYY, etc.)
 * - session.PROP — sessionStorage
 * - localStorage.PROP — localStorage
 * - cookie.PROP — document cookies
 * - window.PROP — any window property
 * - user.PROP — user data (stub)
 * - auth.PROP — auth data (stub)
 * - math.random — random number 0-1
 * - math.randomInt.MIN.MAX — random integer
 * - math.uuid — UUID v4
 * - math.guid — GUID
 * - device.platform — platform (win32, linux, etc.)
 * - device.mobile — is mobile device (boolean)
 * - browser.userAgent — user agent string
 * - env.VAR — NEXT_PUBLIC_* environment variables
 */

import { StateManager } from "@/core";

/** Options for MacroEngine */
export interface MacroOptions {
  /** Maximum recursion depth for nested macros (default: 3) */
  maxRecursion?: number;
  /** Current page ID for state resolution */
  pageId?: string;
}

/** Sources available for macro resolution */
export interface MacroSources {
  /** State manager for resolving state macros */
  stateManager?: StateManager;
  /** App configuration */
  config?: Record<string, any>;
  /** Window location (client only) */
  location?: Location;
  /** Window object (client only) */
  window?: Window;
  /** Environment variables (NEXT_PUBLIC_*) */
  env?: Record<string, string>;
  /** Current page ID */
  pageId?: string;
}
