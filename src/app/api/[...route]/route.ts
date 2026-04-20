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
import { ApiRouteConfig, DataFeedMethod } from "@/types";

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
    const config = await initApp();
    const apiRoutes = config.config?.apiRoutes;

    // Find the route configuration
    const routeConfig = findRouteConfig(routeName, apiRoutes);

    if (!routeConfig) {
      return NextResponse.json(
        { error: `Route not found: ${routeName}` },
        { status: 404 },
      );
    }

    // Build the fetch options
    const fetchOptions = buildFetchOptions(request);

    // Forward the request to the external API
    const externalResponse = await fetch(routeConfig.url, fetchOptions);

    // Get the response content type
    const contentType = externalResponse.headers.get("content-type");

    // Read the response body
    let responseData: any;
    if (contentType && contentType.includes("application/json")) {
      responseData = await externalResponse.json();
    } else {
      responseData = await externalResponse.text();
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
