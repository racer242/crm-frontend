/**
 * DataFeedService
 *
 * Core service for executing external API data feed requests.
 * Handles request execution, macro substitution, and state updates.
 */

import {
  DataFeedConfig,
  DataFeedResult,
  SendRequestParams,
  ApiRouteConfig,
  MacroSources,
} from "@/types";
import { StateManager } from "./StateManager";
import { MacroEngine } from "./MacroEngine";
import { PathResolver } from "./PathResolver";
import { getServerEnv } from "@/utils/env";

/**
 * Resolves the target element ID for a data feed request.
 * If no element ID is specified, defaults to the current page.
 */
function resolveTargetElementId(
  parsedTarget: { elementId: string | null; statePath: string },
  pageId: string,
): string {
  return parsedTarget.elementId || pageId;
}

/**
 * Resolves the full URL for a request.
 * If URL starts with /api/, looks up the route in apiRoutes config.
 * Macro resolution in route URL is handled by the caller (macroEngine).
 */
function resolveUrl(
  url: string,
  apiRoutes: ApiRouteConfig[] | undefined,
  macroEngine?: MacroEngine,
): string {
  // Check if this is a router URL (/api/ROUTE_NAME)
  if (url.startsWith("/api/")) {
    const routeName = url.substring(5); // Remove "/api/"
    const route = apiRoutes?.find((r) => r.path === routeName);
    if (route) {
      // Apply macros to the route URL if macroEngine is provided
      return macroEngine ? (macroEngine.apply(route.url) as string) : route.url;
    }
    // If route not found, return as-is (might be internal Next.js route)
    return url;
  }
  // External URL or relative URL
  return url;
}

/**
 * Builds request headers including authentication
 */
function buildHeaders(
  authToken: string | undefined,
  customHeaders?: Record<string, string>,
): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };

  // Add authorization header if token is available
  if (authToken) {
    headers["Authorization"] = `Bearer ${authToken}`;
  }

  // Merge custom headers
  if (customHeaders) {
    Object.assign(headers, customHeaders);
  }

  return headers;
}

/**
 * Executes a single HTTP request
 */
async function executeRequest(
  url: string,
  method: string,
  data: Record<string, any> | undefined,
  headers: Record<string, string>,
): Promise<any> {
  const options: RequestInit = {
    method,
    headers,
  };

  // Add body for methods that support it
  if (data && ["POST", "PUT", "PATCH"].includes(method.toUpperCase())) {
    options.body = JSON.stringify(data);
  }

  const response = await fetch(url, options);

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(
      `HTTP ${response.status}: ${response.statusText}${errorText ? ` - ${errorText}` : ""}`,
    );
  }

  // Parse JSON response
  const contentType = response.headers.get("content-type");
  if (contentType && contentType.includes("application/json")) {
    return response.json();
  }

  return response.text();
}

/**
 * Stores the response data in the target element's state
 */
function storeInState(
  stateManager: StateManager,
  elementId: string,
  statePath: string,
  data: any,
): void {
  if (!statePath) {
    // Merge data into existing state (preserves existing fields)
    if (typeof data === "object" && data !== null) {
      stateManager.mergeState(elementId, data);
    } else {
      stateManager.setStateField(elementId, statePath, data);
    }
  } else {
    // Set specific field in state
    stateManager.setStateField(elementId, statePath, data);
  }
}

/**
 * Create MacroSources for macro resolution
 */
function createMacroSources(
  stateManager: StateManager,
  pageId: string,
  appConfig?: Record<string, any>,
): MacroSources {
  return {
    stateManager,
    pageId,
    config: appConfig,
    env: getServerEnv(),
  };
}

/**
 * Executes a single data feed request
 */
export async function executeDataFeed(
  feed: DataFeedConfig,
  stateManager: StateManager,
  pageId: string,
  authToken?: string,
  apiRoutes?: ApiRouteConfig[],
  appConfig?: Record<string, any>,
): Promise<DataFeedResult> {
  const result: DataFeedResult = {
    success: false,
    target: feed.target,
  };

  try {
    const macroEngine = new MacroEngine(
      createMacroSources(stateManager, pageId, appConfig),
    );

    // Resolve macros in URL
    const resolvedUrl = macroEngine.apply(feed.url) as string;

    // Resolve macros in data
    const resolvedData = feed.data
      ? (macroEngine.apply(feed.data) as Record<string, any>)
      : undefined;

    // Resolve the actual URL (check if it's a router URL)
    // Note: macros in route URLs are resolved inside resolveUrl via macroEngine
    const finalUrl = resolveUrl(resolvedUrl, apiRoutes, macroEngine);

    // Build headers with auth
    const headers = buildHeaders(authToken);

    // Execute the request
    const responseData = await executeRequest(
      finalUrl,
      feed.method,
      resolvedData,
      headers,
    );

    // Parse target and resolve element ID
    const parsedTarget = PathResolver.parseTarget(feed.target);
    const elementId = resolveTargetElementId(parsedTarget, pageId);

    // Store response in state
    storeInState(stateManager, elementId, parsedTarget.statePath, responseData);

    result.success = true;
    result.data = responseData;
  } catch (error) {
    result.success = false;
    result.error = error instanceof Error ? error.message : String(error);
  }

  return result;
}

/**
 * Executes all data feed requests for a page
 */
export async function executePageDataFeeds(
  dataFeeds: DataFeedConfig[] | undefined,
  stateManager: StateManager,
  pageId: string,
  authToken?: string,
  apiRoutes?: ApiRouteConfig[],
  appConfig?: Record<string, any>,
): Promise<DataFeedResult[]> {
  if (!dataFeeds || dataFeeds.length === 0) {
    return [];
  }

  // Execute all data feeds in parallel
  const promises = dataFeeds.map((feed) =>
    executeDataFeed(
      feed,
      stateManager,
      pageId,
      authToken,
      apiRoutes,
      appConfig,
    ),
  );

  return Promise.all(promises).then((results) => {
    return results;
  });
}

/**
 * Client-side data feed execution
 * Uses the API router for requests
 */
export async function executeClientDataFeed(
  params: SendRequestParams,
  stateManager: StateManager,
  pageId: string,
  authToken?: string,
  appConfig?: Record<string, any>,
): Promise<DataFeedResult> {
  const result: DataFeedResult = {
    success: false,
    target: params.target,
  };

  try {
    const macroEngine = new MacroEngine(
      createMacroSources(stateManager, pageId, appConfig),
    );

    // Resolve macros in URL
    const resolvedUrl = macroEngine.apply(params.url) as string;

    // Resolve macros in data
    const resolvedData = params.data
      ? (macroEngine.apply(params.data) as Record<string, any>)
      : undefined;

    // Build headers with auth
    const headers = buildHeaders(authToken);

    // Execute the request
    const responseData = await executeRequest(
      resolvedUrl,
      params.method,
      resolvedData,
      headers,
    );

    // Parse target and resolve element ID
    const parsedTarget = PathResolver.parseTarget(params.target);
    const elementId = resolveTargetElementId(parsedTarget, pageId);

    // Store response in state
    storeInState(stateManager, elementId, parsedTarget.statePath, responseData);

    result.success = true;
    result.data = responseData;
  } catch (error) {
    result.success = false;
    result.error = error instanceof Error ? error.message : String(error);
  }

  return result;
}
