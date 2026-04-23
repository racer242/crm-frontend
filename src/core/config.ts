import * as fs from "fs/promises";
import * as path from "path";
import $RefParser from "@apidevtools/json-schema-ref-parser";
import {
  DataFeedConfig,
  DataFeedResult,
  ApiRouteConfig,
  MacroSources,
} from "@/types";
import { MacroEngine } from "./MacroEngine";
import { getServerEnv } from "@/utils/env";

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
  [key: string]: any;
}

let cachedConfig: CrmConfig | null = null;
let initPromise: Promise<CrmConfig> | null = null;
let isInitialized = false;

/**
 * Application Singleton Initialization
 * Loads configuration only once per application lifetime
 */
export async function initApp(): Promise<CrmConfig> {
  // Return immediately if already initialized
  if (cachedConfig) {
    return cachedConfig;
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

      return resolvedConfig;
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

  // Get app config for macro resolution
  const appConfig = cachedConfig?.config;

  // Server-side macro sources (no state manager, no client APIs)
  const serverSources: MacroSources = {
    config: appConfig,
    env: getServerEnv(),
  };

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
