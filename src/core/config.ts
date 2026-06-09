import * as fs from "fs/promises";
import * as path from "path";
import $RefParser from "@apidevtools/json-schema-ref-parser";
import { BaseElement, LocaleConfig } from "@/types";
import { setServerConfig } from "./DataFeedServerService";

/**
 * CRM Configuration Loader
 * Loads and resolves full CRM configuration with $ref support
 */

export interface CrmConfig {
  id?: string;
  type?: string;
  title?: string;
  version?: string;
  name?: string;
  pages: any[];
  components: Record<string, any>;
  settings: Record<string, any>;
  navbar?: any;
  userMenu?: any;
  state?: Record<string, any>;
  api?: {
    baseUrl?: string;
    timeout?: number;
  };
  /** Настройки локали */
  locale?: LocaleConfig;
  [key: string]: any;
}

/**
 * Index structure: { pageId: { elementId: element, ... }, ... }
 */
export type PageIndex = Record<string, BaseElement>;
export type FullIndex = Record<string, PageIndex>;

export interface AppInitResult {
  config: CrmConfig;
}

let cachedConfig: CrmConfig | null = null;
let initPromise: Promise<AppInitResult> | null = null;
let isInitialized = false;

// ==================== Index Building ====================

/**
 * Build index for all pages
 */
export function buildFullIndex(config: CrmConfig): FullIndex {
  const index: FullIndex = {};
  for (const page of config.pages) {
    index[page.id] = buildPageIndex(page);
  }
  return index;
}

/**
 * Build index for a single page
 */
export function buildPageIndex(page: BaseElement): PageIndex {
  const index: PageIndex = {};
  addSubtreeToIndex(page, index);
  return index;
}

/**
 * Recursively add all elements of a subtree to the index
 */
function addSubtreeToIndex(element: BaseElement, index: PageIndex) {
  if (element.id) {
    index[element.id] = element;
  }

  const children = getChildren(element);
  for (const child of children) {
    addSubtreeToIndex(child, index);
  }
}

/**
 * Get child elements
 */
function getChildren(element: BaseElement): BaseElement[] {
  const el = element as any;
  const children: BaseElement[] = [];

  // Sections (in page)
  if (Array.isArray(el.sections)) children.push(...el.sections);
  // Blocks (in section)
  if (Array.isArray(el.blocks)) children.push(...el.blocks);
  // Components (in block)
  if (Array.isArray(el.components)) children.push(...el.components);
  // Pages (in app)
  if (Array.isArray(el.pages)) children.push(...el.pages);

  return children;
}

// ==================== App Initialization ====================

/**
 * Application Singleton Initialization
 * Loads configuration only once per application lifetime
 */
export async function initApp(): Promise<AppInitResult> {
  // Return immediately if already initialized
  if (cachedConfig) {
    return { config: cachedConfig };
  }

  // Prevent parallel loading during concurrent requests
  if (initPromise) {
    return initPromise;
  }

  initPromise = (async () => {
    const configPath = process.env.CONFIG_PATH || "./config/crm-config.json";
    const absolutePath = path.resolve(process.cwd(), configPath);

    try {
      await fs.access(absolutePath);

      const parser = new $RefParser();
      const resolvedConfig = (await parser.dereference(
        absolutePath,
      )) as CrmConfig;

      cachedConfig = resolvedConfig;

      // Notify DataFeedServerService of the config
      setServerConfig(cachedConfig);

      // Print banner only once per process lifetime
      if (!isInitialized) {
        printStartupBanner(resolvedConfig, configPath);
        isInitialized = true;
      }

      return { config: cachedConfig };
    } catch (error) {
      initPromise = null;

      console.error(`❌ Failed to load CRM configuration from ${configPath}`);

      if (error instanceof Error) {
        console.error(`   Error: ${error.message}`);
      }

      throw new Error(
        `Configuration loading failed: ${(error as Error).message}`,
      );
    }
  })();

  return initPromise;
}

/**
 * Get already loaded config (synchronous access)
 */
export function getConfig(): CrmConfig {
  if (!cachedConfig) {
    throw new Error("Configuration not loaded. Call loadConfig() first.");
  }

  return cachedConfig;
}

/**
 * Clear config cache
 */
export function clearConfigCache(): void {
  cachedConfig = null;
}

/**
 * Result of matching an actual route against a route pattern with [id]-style placeholders
 */
export interface RouteMatchResult {
  matched: boolean;
  params: Record<string, string>; // e.g. { id: "123", group: "admin" }
}

/**
 * Result of finding a page by route with pattern support
 */
export interface PageRouteMatch {
  pageConfig: any;
  route: string; // the matched route pattern e.g. "/users/[id]"
  routeParams: Record<string, string>; // e.g. { id: "123" }
}

/**
 * Match an actual route against a route pattern that may contain [id]-style placeholders
 * Example: matchRoute("/users/123/edit", "/users/[id]/edit") -> { matched: true, params: { id: "123" } }
 */
export function matchRoute(
  actualRoute: string,
  routePattern: string,
): RouteMatchResult {
  const actualSegments = actualRoute.split("/").filter(Boolean);
  const patternSegments = routePattern.split("/").filter(Boolean);

  if (actualSegments.length !== patternSegments.length) {
    return { matched: false, params: {} };
  }

  const params: Record<string, string> = {};
  for (let i = 0; i < patternSegments.length; i++) {
    const patternSegment = patternSegments[i];
    const actualSegment = actualSegments[i];

    // Dynamic segment e.g. [id]
    const dynamicMatch = patternSegment.match(/^\[(.+)\]$/);
    if (dynamicMatch) {
      params[dynamicMatch[1]] = actualSegment;
    } else if (patternSegment !== actualSegment) {
      // Static segment mismatch
      return { matched: false, params: {} };
    }
  }

  return { matched: true, params };
}

/**
 * Find a page configuration by route with support for [id]-style patterns.
 * First tries exact match, then pattern matching across all pages.
 */
export function findPageByRoute(route: string | null): PageRouteMatch | null {
  if (!cachedConfig || route === null) {
    return null;
  }

  const normalizedRoute = route === "" ? "/" : route;

  // 1. Try exact match first (fast path)
  const exactMatch = cachedConfig.pages?.find(
    (p: any) => p.route === normalizedRoute,
  );
  if (exactMatch) {
    return { pageConfig: exactMatch, route: normalizedRoute, routeParams: {} };
  }

  // 2. Try pattern matching across all pages
  for (const page of cachedConfig.pages || []) {
    if (!page.route) continue;
    const result = matchRoute(normalizedRoute, page.route);
    if (result.matched) {
      return {
        pageConfig: page,
        route: page.route,
        routeParams: result.params,
      };
    }
  }

  return null;
}

/**
 * Get page configuration by exact route match (exact match only, no pattern support)
 * Kept for backward compatibility and index page resolution
 */
export function getPageConfigByRoute(route: string | null): any | null {
  if (!cachedConfig) {
    return null;
  }
  const normalizedRoute = route === "" ? "/" : route;
  return (
    cachedConfig.pages?.find((p: any) => p.route === normalizedRoute) || null
  );
}

/**
 * Print startup banner with configuration info
 */
function printStartupBanner(config: CrmConfig, configPath: string): void {
  console.log("");
  console.log(
    "╔═════════════════════════════════════════════════════════════╗",
  );
  console.log(
    "║                    🚀 CRM PLATFORM STARTED                  ║",
  );
  console.log(
    "╠═════════════════════════════════════════════════════════════╣",
  );
  console.log(`║  Name:      ${(config.title || "CRM Platform").padEnd(48)}║`);
  console.log(`║  Version:   ${(config.version || "0.1.0").padEnd(48)}║`);
  console.log(`║  Config:    ${configPath.padEnd(48)}║`);
  console.log(`║  Pages:     ${String(config.pages?.length || 0).padEnd(48)}║`);
  console.log(
    `║  Mode:      ${(process.env.NODE_ENV || "development").padEnd(48)}║`,
  );
  console.log(
    `║  Auth URL:  ${(process.env.BITRIX_API_URL || "not set").padEnd(48)}║`,
  );
  console.log(
    `║  Method:    ${(process.env.BITRIX_REQUEST_METHOD || "POST").padEnd(48)}║`,
  );
  console.log(
    "╚═════════════════════════════════════════════════════════════╝",
  );
  console.log("");
}
