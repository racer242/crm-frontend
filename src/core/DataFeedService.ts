/**
 * DataFeedService
 *
 * Core service for executing external API data feed requests.
 * Handles request execution, macro substitution, and state updates.
 * Adaptation is handled server-side via API route.
 */

import { DataFeedResult, SendRequestParams, MacroSources } from "@/types";
import { StateManager } from "./StateManager";
import { MacroEngine } from "./MacroEngine";
import { PathResolver } from "./PathResolver";
import { getPublicEnv } from "@/utils/env";
import { buildUrlWithParams } from "@/utils/http";
import { parseApiError, ApiError } from "@/utils/parseApiError";

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
  let finalUrl = url;

  const options: RequestInit = {
    method,
    headers,
  };

  // Add body for methods that support it, or convert to query params for GET
  if (data) {
    if (["POST", "PUT", "PATCH"].includes(method.toUpperCase())) {
      options.body = JSON.stringify(data);
    } else {
      finalUrl = buildUrlWithParams(url, data);
    }
  }

  const response = await fetch(finalUrl, options);

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    const apiError = parseApiError(errorText);
    const errorMessage = apiError.message || `HTTP ${response.status}`;
    const error: Error & { apiError?: ApiError } = new Error(errorMessage);
    error.apiError = apiError;
    throw error;
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
    env: getPublicEnv(),
  };
}

/**
 * Client-side data feed execution
 * Uses the API router for requests
 * Data adaptation is handled server-side via API route
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
    let resolvedData = params.data
      ? (macroEngine.apply(params.data) as Record<string, any>)
      : undefined;

    // Build headers with auth
    const headers = buildHeaders(authToken);

    // Execute the request
    let responseData = await executeRequest(
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
  } catch (error: any) {
    result.success = false;
    // Сохраняем полный объект ошибки если он есть
    if (error?.apiError) {
      result.error = error.apiError;
    } else if (error instanceof Error) {
      result.error = { message: error.message, rawText: error.message };
    } else {
      result.error = { rawText: String(error) };
    }
  }

  return result;
}
