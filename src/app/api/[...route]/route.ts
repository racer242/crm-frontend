/**
 * API Router
 *
 * Handles requests to /api/[route] and forwards them to external API endpoints.
 * This allows the client to make requests without directly calling external APIs.
 *
 * Usage:
 * - Client sends request to /api/ROUTE_NAME
 * - Router looks up the route in config.apiRoutes
 * - Forwards the request to the external API URL
 * - Returns the response back to the client
 */

import { NextRequest, NextResponse } from "next/server";
import { initApp } from "@/core/config";
import {
  ApiRouteConfig,
  DataFeedMethod,
  MacroSources,
  DataFeedAdapter,
} from "@/types";
import { MacroEngine } from "@/core";
import { getServerEnv } from "@/utils/env";
import { applyAdapter } from "@/core/DataAdapterEngine";

/**
 * Finds a route configuration by path name
 */
function findRouteConfig(
  routeName: string,
  apiRoutes: ApiRouteConfig[] | undefined,
): ApiRouteConfig | undefined {
  return apiRoutes?.find((r) => r.path === routeName);
}

/**
 * Builds fetch options for the external API request
 */
function buildFetchOptions(request: NextRequest): RequestInit {
  const headers: Record<string, string> = {};

  // Copy relevant headers from the original request
  const authHeader = request.headers.get("authorization");
  if (authHeader) {
    headers["Authorization"] = authHeader;
  }

  headers["Content-Type"] = "application/json";
  headers["Accept"] = "application/json";

  // Forward cookie if present
  const cookie = request.headers.get("cookie");
  if (cookie) {
    headers["Cookie"] = cookie;
  }

  return {
    method: request.method as DataFeedMethod,
    headers,
    body: ["POST", "PUT", "PATCH"].includes(request.method)
      ? request.body
      : undefined,
    // @ts-expect-error - duplex is needed for streaming responses
    duplex: ["POST", "PUT", "PATCH"].includes(request.method)
      ? "half"
      : undefined,
  };
}

/**
 * Handles all HTTP methods for API routes
 */
async function handleRequest(
  request: NextRequest,
  { params }: { params: Promise<{ route: string[] }> },
): Promise<NextResponse> {
  try {
    // Resolve the route parameter
    const resolvedParams = await params;
    const routeSegments = resolvedParams.route;
    const routeName = routeSegments.join("/");

    // Load the app config to get apiRoutes
    const { config } = await initApp();
    const apiRoutes = config.config?.apiRoutes;

    // Find the route configuration
    const routeConfig = findRouteConfig(routeName, apiRoutes);

    // Read request body for methods that have one
    let requestBody: any;
    if (["POST", "PUT", "PATCH"].includes(request.method)) {
      try {
        const contentType = request.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          requestBody = await request.json();
        }
      } catch {
        // Body not parseable, continue without it
      }
    }

    if (!routeConfig) {
      return NextResponse.json(
        { error: `Route not found: ${routeName}` },
        { status: 404 },
      );
    }

    // Resolve macros in the route URL
    const serverSources: MacroSources = {
      config: config.config,
      env: getServerEnv(),
    };
    const macroEngine = new MacroEngine(serverSources);
    const resolvedUrl = macroEngine.apply(routeConfig.url) as string;

    // Apply request adapter if specified in route config
    let adaptedBody = requestBody;
    const routeAdapter = routeConfig.adapter as
      | string
      | DataFeedAdapter
      | undefined;
    if (routeAdapter && requestBody) {
      const requestAdapterName =
        typeof routeAdapter === "string"
          ? null
          : (routeAdapter as DataFeedAdapter)?.request;
      if (requestAdapterName) {
        const adapter = config.adapters?.[requestAdapterName];
        if (adapter) {
          adaptedBody = await applyAdapter(requestBody, adapter);
        }
      }
    }

    // Build the fetch options with adapted body
    const fetchOptions = buildFetchOptions(request);
    if (adaptedBody && fetchOptions.body === undefined) {
      fetchOptions.body = JSON.stringify(adaptedBody);
    } else if (adaptedBody) {
      fetchOptions.body = JSON.stringify(adaptedBody);
    }

    // Forward the request to the external API
    const externalResponse = await fetch(resolvedUrl, fetchOptions);

    // Get the response content type
    const contentType = externalResponse.headers.get("content-type");

    // Read the response body
    let responseData: any;
    if (contentType && contentType.includes("application/json")) {
      responseData = await externalResponse.json();
    } else {
      responseData = await externalResponse.text();
    }

    // Apply response adapter if specified in the route config
    if (routeAdapter) {
      try {
        const responseAdapterName =
          typeof routeAdapter === "string"
            ? routeAdapter
            : (routeAdapter as DataFeedAdapter)?.response;

        if (responseAdapterName) {
          const adapter = config.adapters?.[responseAdapterName];
          if (!adapter) {
            return NextResponse.json(
              { error: `Response adapter not found: ${responseAdapterName}` },
              { status: 500 },
            );
          }
          responseData = await applyAdapter(responseData, adapter);
        }
      } catch (adapterError) {
        return NextResponse.json(
          {
            error: `Response adapter error: ${(adapterError as Error).message}`,
          },
          { status: 500 },
        );
      }
    }

    // Return the response with the same status code
    return NextResponse.json(responseData, { status: externalResponse.status });
  } catch (error) {
    console.error("API Router error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 },
    );
  }
}

// Export handlers for all HTTP methods
export const GET = handleRequest;
export const POST = handleRequest;
export const PUT = handleRequest;
export const PATCH = handleRequest;
export const DELETE = handleRequest;
