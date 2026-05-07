import * as fs from "fs/promises";
import * as path from "path";
import $RefParser from "@apidevtools/json-schema-ref-parser";
import {
  DataFeedConfig,
  DataFeedResult,
  ApiRouteConfig,
  MacroSources,
  BaseElement,
  LocaleConfig,
} from "@/types";
import { MacroEngine } from "./MacroEngine";
import { getServerEnv } from "@/utils/env";
import { applyAdapter } from "./DataAdapterEngine";

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
 * Get page configuration by route
 */
export function getPageConfigByRoute(route: string): any | null {
  if (!cachedConfig) {
    return null;
  }
  const normalizedRoute = route === "" ? "/" : route;
  return (
    cachedConfig.pages?.find((p: any) => p.route === normalizedRoute) || null
  );
}

/**
 * Execute server-side data feeds for a page
 * Returns array of results with any errors
 */
export async function executeServerDataFeeds(
  pageId: string,
  pageConfig: any,
  serverSources: MacroSources,
): Promise<DataFeedResult[]> {
  const dataFeeds: DataFeedConfig[] | undefined = pageConfig?.dataFeed;

  if (!dataFeeds || dataFeeds.length === 0) {
    return [];
  }

  // Auth token is no longer used - globalState removed
  const authToken: string | undefined = undefined;

  // Get API routes config
  const apiRoutes: ApiRouteConfig[] | undefined =
    cachedConfig?.config?.apiRoutes;

  // For server-side execution, we need a minimal StateManager-like interface
  // Since we're running on the server, we'll execute the requests and collect results
  // without actually updating state (state will be updated on the client)

  const results: DataFeedResult[] = [];

  const macroEngine = new MacroEngine(serverSources);

  for (const feed of dataFeeds) {
    try {
      // Resolve macros in URL
      let url = macroEngine.apply(feed.url) as string;

      // Resolve macros in data
      let data = feed.data
        ? (macroEngine.apply(feed.data) as Record<string, any>)
        : undefined;

      // Resolve the URL (check if it's a router URL)
      if (url.startsWith("/api/")) {
        const routeName = url.substring(5);
        const routeConfig = apiRoutes?.find((r) => r.path === routeName);
        if (routeConfig) {
          // Apply macros to the route URL
          url = macroEngine.apply(routeConfig.url) as string;
        }
      }

      // Build headers
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        Accept: "application/json",
      };

      if (authToken) {
        headers["Authorization"] = `Bearer ${authToken}`;
      }

      // Execute the request
      const options: RequestInit = {
        method: feed.method,
        headers,
      };

      if (data && ["POST", "PUT", "PATCH"].includes(feed.method)) {
        options.body = JSON.stringify(data);
      }

      const response = await fetch(url, options);

      if (!response.ok) {
        const errorText = await response.text().catch(() => "");
        results.push({
          success: false,
          target: feed.target,
          error: `HTTP ${response.status}: ${response.statusText}${errorText ? ` - ${errorText}` : ""}`,
        });
        continue;
      }

      // Parse response
      const contentType = response.headers.get("content-type");
      let responseData: any;
      if (contentType && contentType.includes("application/json")) {
        responseData = await response.json();
      } else {
        responseData = await response.text();
      }

      // Apply adapter if specified
      if (feed.adapter) {
        try {
          const adapter = cachedConfig?.adapters?.[feed.adapter];
          if (!adapter) {
            results.push({
              success: false,
              target: feed.target,
              error: `Adapter not found: ${feed.adapter}`,
            });
            continue;
          }
          responseData = await applyAdapter(responseData, adapter);
        } catch (adapterError) {
          results.push({
            success: false,
            target: feed.target,
            error: `Adapter error: ${(adapterError as Error).message}`,
          });
          continue;
        }
      }

      results.push({
        success: true,
        data: responseData,
        target: feed.target,
      });
    } catch (error) {
      results.push({
        success: false,
        target: feed.target,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return results;
}

/**
 * Resolve macros in element state recursively (server-side)
 * Traverses all elements and applies macro substitution to their state
 */
export function resolveElementStateMacros(
  element: any,
  sources: Partial<MacroSources>,
): void {
  if (!element) return;

  const macroEngine = new MacroEngine(sources);

  resolveStateRecursive(element, macroEngine);
}

function resolveStateRecursive(element: any, macroEngine: MacroEngine) {
  if (element.state) {
    element.state = macroEngine.apply(element.state);
  }

  const children = getChildren(element);
  for (const child of children) {
    resolveStateRecursive(child, macroEngine);
  }
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
    "╚═════════════════════════════════════════════════════════════╝",
  );
  console.log("");
}
