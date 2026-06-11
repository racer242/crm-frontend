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
 *
 * Route URL macros:
 * - {$config.PATH} — app config values
 * - {$env.VAR} — server environment variables
 * - {$location.routeParams.PARAM} — extracted route params (e.g., id from users/[id])
 * - {$location.query.PARAM} — URL query params
 * - {$location.pathname}, {$location.href}, etc.
 */

import { NextRequest, NextResponse } from "next/server";
import { initApp } from "@/core/config";
import {
  ApiRouteConfig,
  DataFeedMethod,
  MacroSources,
  DataFeedAdapter,
  LoginResponse,
} from "@/types";
import { MacroEngine } from "@/core";
import { getServerEnv } from "@/utils/env";
import { applyAdapter } from "@/core/DataAdapterEngine";
import { buildUrlWithParams, parseSearchParams } from "@/utils/http";
import { getAccessTokenFromRequest } from "@/utils/getAccessToken";
import { getServerLocation } from "@/utils/location";
import { verifyToken, isTokenExpiringSoon } from "@/auth/tokenService";
import { bitrixRequest } from "@/auth/bitrixClient";
import { COOKIE_KEYS, AUTH_REFRESH_URL } from "@/auth/constants";

/**
 * Converts a route path pattern like "users/[id]/docs" into a regex
 * and extracts named parameter positions.
 * Returns null if no match.
 */
function matchRoutePattern(
  routeName: string,
  apiRoute: ApiRouteConfig,
): Record<string, string> | null {
  const patternSegments = apiRoute.path.split("/").filter(Boolean);
  const requestSegments = routeName.split("/").filter(Boolean);

  if (patternSegments.length !== requestSegments.length) {
    return null;
  }

  const routeParams: Record<string, string> = {};

  for (let i = 0; i < patternSegments.length; i++) {
    const patternPart = patternSegments[i];
    const requestPart = requestSegments[i];

    // Dynamic segment like [id] or [product_id]
    const dynamicMatch = patternPart.match(/^\[(.+)\]$/);
    if (dynamicMatch) {
      routeParams[dynamicMatch[1]] = requestPart;
    } else if (patternPart !== requestPart) {
      // Static segment mismatch
      return null;
    }
  }

  return routeParams;
}

/**
 * Finds a route configuration by path name with support for dynamic segments.
 * Returns the route config and extracted route params (e.g., { id: "123" }).
 */
function findRouteConfig(
  routeName: string,
  apiRoutes: ApiRouteConfig[] | undefined,
): { config: ApiRouteConfig; routeParams: Record<string, string> } | undefined {
  if (!apiRoutes) return undefined;

  for (const route of apiRoutes) {
    const routeParams = matchRoutePattern(routeName, route);
    if (routeParams !== null) {
      return { config: route, routeParams };
    }
  }

  return undefined;
}

/**
 * Попытка refresh токена напрямую через Битрикс (без внутреннего HTTP-запроса).
 * Аналогично proxy.ts, но не создаёт NextResponse, а возвращает только токены.
 * Возвращает новый access_token или undefined, если refresh не удался.
 */
async function tryRefreshToken(
  request: NextRequest,
): Promise<{ accessToken?: string; refreshToken?: string; userData?: string }> {
  const refreshToken = request.cookies.get(COOKIE_KEYS.REFRESH_TOKEN)?.value;

  if (!refreshToken) {
    return {};
  }

  try {
    const response = await bitrixRequest<LoginResponse>(AUTH_REFRESH_URL, {
      body: { refresh_token: refreshToken },
    });

    return {
      accessToken: response.access_token,
      refreshToken: response.refresh_token,
      userData: JSON.stringify(response.user),
    };
  } catch (error) {
    console.error("[api-router] Refresh token error:", error);
    return {};
  }
}

/**
 * Устанавливает cookie с обновлёнными токенами на ответ
 */
function setCookiesOnResponse(
  response: NextResponse,
  tokens: { accessToken?: string; refreshToken?: string; userData?: string },
): void {
  const isProd = process.env.NODE_ENV === "production";
  const lifetimeAccess =
    Number(process.env.AUTH_TOKEN_LIFETIME_ACCESS) || 15 * 60;
  const lifetimeRefresh =
    Number(process.env.AUTH_TOKEN_LIFETIME_REFRESH) || 7 * 24 * 3600;
  const lifetimeUser =
    Number(process.env.AUTH_TOKEN_LIFETIME_USERDATA) || 7 * 24 * 3600;

  if (tokens.accessToken) {
    response.cookies.set(COOKIE_KEYS.ACCESS_TOKEN, tokens.accessToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: "lax",
      path: "/",
      maxAge: lifetimeAccess,
    });
  }
  if (tokens.refreshToken) {
    response.cookies.set(COOKIE_KEYS.REFRESH_TOKEN, tokens.refreshToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: "lax",
      path: "/",
      maxAge: lifetimeRefresh,
    });
  }
  if (tokens.userData) {
    response.cookies.set(COOKIE_KEYS.USER_DATA, tokens.userData, {
      httpOnly: false,
      secure: isProd,
      sameSite: "lax",
      path: "/",
      maxAge: lifetimeUser,
    });
  }
}

/**
 * Builds fetch options for the external API request.
 * Если передан accessTokenOverride — использует его вместо токена из запроса.
 */
function buildFetchOptions(
  request: NextRequest,
  accessTokenOverride?: string,
): RequestInit {
  const headers: Record<string, string> = {};

  // Inject access_token from override, or from request (Authorization header or cookies)
  const accessToken = accessTokenOverride || getAccessTokenFromRequest(request);
  if (accessToken) {
    headers["Authorization"] = `Bearer ${accessToken}`;
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
    const apiRoutes = config.apiRoutes;

    // Find the route configuration (with pattern matching and route params)
    const routeResult = findRouteConfig(routeName, apiRoutes);

    // Read request body — from JSON body for POST/PUT/PATCH, from URL params for others
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
    } else {
      const searchParams = request.nextUrl.searchParams;
      if (searchParams.size > 0) {
        requestBody = parseSearchParams(searchParams);
      }
    }

    if (!routeResult) {
      return NextResponse.json(
        { error: `Route not found: ${routeName}` },
        { status: 404 },
      );
    }

    const { config: routeConfig, routeParams } = routeResult;

    // Build server location for macro resolution (supports {$location.*} macros)
    const serverLocation = await getServerLocation(
      Object.fromEntries(request.nextUrl.searchParams.entries()),
      request.nextUrl.pathname,
      routeSegments,
      routeParams,
    );

    // Resolve macros in the route URL
    const serverSources: MacroSources = {
      config: config.config,
      env: await getServerEnv(),
      location: serverLocation,
    };
    const macroEngine = new MacroEngine(serverSources);
    let resolvedUrl = macroEngine.apply(routeConfig.url) as string;

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

    // --- Проверка и обновление access_token ---
    const accessToken = getAccessTokenFromRequest(request);
    let refreshedAccessToken: string | undefined;
    let refreshedTokens:
      | { accessToken?: string; refreshToken?: string; userData?: string }
      | undefined;

    if (accessToken) {
      const tokenResult = await verifyToken(accessToken);

      // tokenResult is a discriminated union: { valid: true; payload } | { valid: false; reason }
      const shouldRefresh =
        // Токен истёк (valid=false, reason=expired) — пробуем refresh
        (!tokenResult.valid && tokenResult.reason === "expired") ||
        // Токен скоро истечёт (valid=true) — пробуем refresh
        (tokenResult.valid && isTokenExpiringSoon(tokenResult.payload));

      if (shouldRefresh) {
        refreshedTokens = await tryRefreshToken(request);
        refreshedAccessToken = refreshedTokens?.accessToken;
      }
    } else {
      // access_token отсутствует, но есть refresh_token — пробуем refresh
      const hasRefreshCookie = request.cookies.get(
        COOKIE_KEYS.REFRESH_TOKEN,
      )?.value;
      if (hasRefreshCookie) {
        refreshedTokens = await tryRefreshToken(request);
        refreshedAccessToken = refreshedTokens?.accessToken;
      }
    }
    // --- Конец проверки токена ---

    // Build the fetch options with refreshed token if available
    const fetchOptions = buildFetchOptions(request, refreshedAccessToken);

    if (adaptedBody) {
      if (["POST", "PUT", "PATCH"].includes(request.method)) {
        fetchOptions.body = JSON.stringify(adaptedBody);
      } else {
        resolvedUrl = buildUrlWithParams(resolvedUrl, adaptedBody);
      }
    }

    console.log("------ Request --", resolvedUrl, fetchOptions);

    // Forward the request to the external API
    const externalResponse = await fetch(resolvedUrl, fetchOptions);

    // If external API returned an error — forward it as-is to the client
    if (!externalResponse.ok) {
      const errorBody = await externalResponse.text().catch(() => "");

      console.log("------ Response Error --", errorBody);

      const errorResponse = new NextResponse(errorBody, {
        status: externalResponse.status,
        headers: { "Content-Type": "application/json" },
      });

      // Если был refresh — проставляем обновлённые cookies в ответ с ошибкой
      if (refreshedTokens) {
        setCookiesOnResponse(errorResponse, refreshedTokens);
      }

      return errorResponse;
    }

    console.log("------ Response --", externalResponse);

    // Check if this is a file route — return binary response as-is
    if (routeConfig.type === "file") {
      console.log("------ Response File --");
      const blob = await externalResponse.blob();
      const responseHeaders: Record<string, string> = {};

      // Forward relevant headers for file download
      const contentType = externalResponse.headers.get("content-type");
      if (contentType) {
        responseHeaders["Content-Type"] = contentType;
      }
      const contentDisposition = externalResponse.headers.get(
        "content-disposition",
      );
      if (contentDisposition) {
        responseHeaders["Content-Disposition"] = contentDisposition;
      }
      const contentLength = externalResponse.headers.get("content-length");
      if (contentLength) {
        responseHeaders["Content-Length"] = contentLength;
      }

      const fileResponse = new NextResponse(blob, {
        status: externalResponse.status,
        headers: responseHeaders,
      });

      // Если был refresh — проставляем обновлённые cookies
      if (refreshedTokens) {
        setCookiesOnResponse(fileResponse, refreshedTokens);
      }

      return fileResponse;
    }

    // Get the response content type
    const contentType = externalResponse.headers.get("content-type");

    // Read the response body
    let responseData: any;
    if (contentType && contentType.includes("application/json")) {
      responseData = await externalResponse.json();
    } else {
      responseData = await externalResponse.text();
    }

    // console.log("------ Response Data--", responseData);

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

    // console.log("------ Adapted Data--", responseData);

    // Return the response with the same status code
    const jsonResponse = NextResponse.json(responseData, {
      status: externalResponse.status,
    });

    // Если был refresh — проставляем обновлённые cookies в ответ
    if (refreshedTokens) {
      setCookiesOnResponse(jsonResponse, refreshedTokens);
    }

    return jsonResponse;
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
