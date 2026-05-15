/**
 * DataFeedServerService
 *
 * Server-side DataFeed execution and macro resolution.
 * Extracted from config.ts to separate concerns.
 */

import {
  DataFeedConfig,
  DataFeedResult,
  MacroSources,
  ApiRouteConfig,
} from "@/types";
import { MacroEngine } from "./MacroEngine";
import { applyAdapter } from "./DataAdapterEngine";

let cachedConfig: any = null;

/**
 * Set the cached config reference (called from initApp)
 */
export function setServerConfig(config: any): void {
  cachedConfig = config;
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

function getChildren(element: any): any[] {
  const children: any[] = [];

  // Sections (in page)
  if (Array.isArray(element.sections)) children.push(...element.sections);
  // Blocks (in section)
  if (Array.isArray(element.blocks)) children.push(...element.blocks);
  // Components (in block)
  if (Array.isArray(element.components)) children.push(...element.components);
  // Pages (in app)
  if (Array.isArray(element.pages)) children.push(...element.pages);

  return children;
}
