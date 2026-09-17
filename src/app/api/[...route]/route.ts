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
import crypto from "crypto";
import { initApp, getConfig } from "@/core/config";
import {
  ApiRouteConfig,
  DataFeedMethod,
  MacroSources,
  DataFeedAdapter,
  LoginResponse,
  CampItem,
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
 * Supports a trailing wildcard segment "**": it matches one or more
 * remaining request segments, joined back into a single "path" param
 * (used by the universal file proxy route "ops/files/**").
 * Returns null if no match.
 */
function matchRoutePattern(
  routeName: string,
  apiRoute: ApiRouteConfig,
): Record<string, string> | null {
  const patternSegments = apiRoute.path.split("/").filter(Boolean);
  const requestSegments = routeName.split("/").filter(Boolean);

  // Trailing wildcard: pattern "ops/files/**" matches "ops/files/<any/tail/path>"
  // and captures the tail as routeParams.path
  const wildcardIndex = patternSegments.indexOf("**");
  if (wildcardIndex !== -1) {
    // At least one segment must follow the wildcard prefix
    if (requestSegments.length <= wildcardIndex) {
      return null;
    }
    const routeParams: Record<string, string> = {};
    for (let i = 0; i < wildcardIndex; i++) {
      const patternPart = patternSegments[i];
      const requestPart = requestSegments[i];
      const dynamicMatch = patternPart.match(/^\[(.+)\]$/);
      if (dynamicMatch) {
        routeParams[dynamicMatch[1]] = requestPart;
      } else if (patternPart !== requestPart) {
        // Static segment mismatch
        return null;
      }
    }
    routeParams["path"] = requestSegments.slice(wildcardIndex).join("/");
    return routeParams;
  }

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
 * Finds a route configuration by path name and method with support for dynamic segments.
 * Returns the route config and extracted route params (e.g., { id: "123" }).
 */
function findRouteConfig(
  routeName: string,
  requestMethod: string,
  apiRoutes: ApiRouteConfig[] | undefined,
): { config: ApiRouteConfig; routeParams: Record<string, string> } | undefined {
  if (!apiRoutes) return undefined;

  // First pass: try to match both path and method
  for (const route of apiRoutes) {
    if (route.method !== requestMethod) continue;
    const routeParams = matchRoutePattern(routeName, route);
    if (routeParams !== null) {
      return { config: route, routeParams };
    }
  }

  // Second pass: fallback — match path only (for backward compatibility)
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

  // NOTE: the incoming cookie header is deliberately NOT forwarded to the
  // external API. The campaign API authenticates via Authorization (management
  // channel) or via HMAC signature headers (instance channel), so forwarding the
  // panel's session cookies would only leak access/refresh tokens to the campaign
  // host. It could also break the outgoing request: cookie values may contain
  // non-Latin-1 characters (e.g. user_data with a Cyrillic user name) and
  // fetch() rejects such header values with a ByteString conversion error.

  return {
    method: request.method as DataFeedMethod,
    headers,
  };
}

/**
 * Generates HMAC-SHA256 signature for instance requests
 * Canonical string: METHOD\nPATH\nBODY_HASH\nTIMESTAMP\nNONCE
 */
function generateSignature(
  secret: string,
  method: string,
  path: string,
  bodyHash: string, // SHA256 hash of the request body (or empty string hash)
  timestamp: number,
  nonce: string,
): string {
  const stringToSign = `${method.toUpperCase()}\n${path}\n${bodyHash}\n${timestamp}\n${nonce}`;
  console.log(
    `[API Router] 🧩 String to sign:\n"${stringToSign.replace(/\n/g, "\\n")}"`,
  );
  return crypto.createHmac("sha256", secret).update(stringToSign).digest("hex");
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
    const routeResult = findRouteConfig(routeName, request.method, apiRoutes);

    // Read request body — from JSON body for POST/PUT/PATCH, from URL params for others
    let requestBody: any;
    let rawBodyText: string | undefined;
    if (["POST", "PUT", "PATCH"].includes(request.method)) {
      try {
        // Read the body as text regardless of Content-Type: some clients
        // (e.g. downloadFile) send JSON without an explicit content-type
        // header, and the browser then defaults to text/plain.
        rawBodyText = await request.text();
        if (rawBodyText && rawBodyText.trim()) {
          requestBody = JSON.parse(rawBodyText);
        }
      } catch {
        // Body is not valid JSON — rawBodyText is kept for raw forwarding
      }
    } else {
      const searchParams = request.nextUrl.searchParams;
      if (searchParams) {
        requestBody = parseSearchParams(searchParams);
      }
    }

    if (!routeResult) {
      return NextResponse.json(
        { error: { message: `Route not found: ${routeName}` } },
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

    // --- Resolve campaign URL based on channel ---
    const campIdCookie = request.cookies.get("camp_id")?.value;
    const allCamps: CampItem[] = (config as any)?.camps || [];
    const currentCampId = campIdCookie
      ? Number(campIdCookie)
      : allCamps[0]?.id || 0;
    const currentCamp =
      allCamps.find((c: CampItem) => c.id === currentCampId) || allCamps[0];

    const channel = routeConfig.channel || "management";
    let baseUrl: string | undefined;
    let signingSecret: string | undefined;
    let keyId: string | undefined;

    if (channel === "instance") {
      baseUrl = currentCamp?.crm_api_url;
      signingSecret = currentCamp?.crm_signature;
      keyId = currentCamp?.crm_key_id;
    } else {
      baseUrl = currentCamp?.base_api_url;
    }

    if (baseUrl) {
      const cleanBaseUrl = baseUrl.replace(/\/+$/, "");
      const path = resolvedUrl.startsWith("/")
        ? resolvedUrl
        : "/" + resolvedUrl;
      resolvedUrl = cleanBaseUrl + path;
    } else if (
      !resolvedUrl.startsWith("http://") &&
      !resolvedUrl.startsWith("https://")
    ) {
      return NextResponse.json(
        {
          error: {
            message: `Campaign not found or no API URL configured for channel '${channel}'. Set camp_id cookie or check camps configuration.`,
          },
        },
        { status: 400 },
      );
    }
    // --- End campaign URL resolution ---

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

    // --- Compute the outgoing body BEFORE signing ---
    // The HMAC signature must cover exactly the string that is sent to the
    // external API, so the body is serialized ONCE here and the resulting
    // string is reused for both the signature body hash and the fetch() call.
    const isBodyMethod = ["POST", "PUT", "PATCH"].includes(request.method);
    let outgoingBody: string | undefined;
    if (isBodyMethod) {
      if (adaptedBody !== undefined && adaptedBody !== null) {
        if (routeConfig.query === true) {
          // Route opted in: adapted body goes to the URL query string instead
          // of the JSON body (e.g. stats execute takes page/limit as query).
          resolvedUrl = buildUrlWithParams(resolvedUrl, adaptedBody);
          // Parameters travel in the query string, so the request body — and
          // therefore the signed body hash — stays empty.
          outgoingBody = undefined;
        } else {
          outgoingBody = JSON.stringify(adaptedBody);
        }
      } else if (rawBodyText && rawBodyText.trim()) {
        // No adapter produced a body — forward the raw request body as-is
        // (also covers non-JSON bodies that failed to parse).
        outgoingBody = rawBodyText;
      }
    } else if (adaptedBody && Object.keys(adaptedBody).length > 0) {
      // GET/DELETE: adapted params are appended to the URL query string.
      resolvedUrl = buildUrlWithParams(resolvedUrl, adaptedBody);
    }
    fetchOptions.body = outgoingBody;

    // Add HMAC signature headers for instance channel
    if (channel === "instance") {
      console.log(
        `[API Router] 🔑 Instance channel detected. Secret: ${!!signingSecret}, KeyId: ${keyId}`,
      );

      if (signingSecret) {
        const timestamp = Math.floor(Date.now() / 1000);
        const nonce = crypto.randomBytes(16).toString("hex");

        // Calculate body hash over EXACTLY the outgoing body string
        // (empty string when the request carries no body).
        let bodyToHash = "";
        if (isBodyMethod && outgoingBody !== undefined) {
          bodyToHash = outgoingBody;
        }
        const bodyHash = crypto
          .createHash("sha256")
          .update(bodyToHash)
          .digest("hex");

        let urlPath;
        try {
          const resolvedUrlObj = new URL(resolvedUrl);

          urlPath =
            resolvedUrlObj.pathname +
            (resolvedUrlObj.search ? resolvedUrlObj.search : "");
        } catch {
          urlPath = resolvedUrl;
        }

        console.log(`[API Router] 📝 Signing path: ${urlPath}`);

        const signature = generateSignature(
          signingSecret,
          request.method,
          urlPath,
          bodyHash,
          timestamp,
          nonce,
        );

        console.log(`[API Router] ✅ Signature: ${signature}`);

        console.log(
          `[API Router] ✅ Signature: ${signature.substring(0, 15)}...`,
        );

        if (fetchOptions.headers) {
          (fetchOptions.headers as Record<string, string>)["X-Crm-Key-Id"] =
            keyId || "";
          (fetchOptions.headers as Record<string, string>)["X-Crm-Signature"] =
            signature;
          (fetchOptions.headers as Record<string, string>)["X-Crm-Timestamp"] =
            timestamp.toString();
          (fetchOptions.headers as Record<string, string>)["X-Crm-Nonce"] =
            nonce;
          (fetchOptions.headers as Record<string, string>)[
            "X-Exchange-Version"
          ] = macroEngine.apply("{$config.apiExchangeVersion}") as string;

          delete (fetchOptions.headers as Record<string, string>)[
            "Authorization"
          ];
        }
      } else {
        console.error(
          `[API Router] ❌ CRITICAL: Instance channel selected but signing secret is MISSING! Check camps.json`,
        );
      }
    }

    console.log("------ Request --", resolvedUrl);
    console.log(
      "------ Headers --",
      JSON.stringify(fetchOptions.headers, null, 2),
    );
    console.log("------ Body --", outgoingBody ?? "(empty)");

    // Forward the request to the external API
    const externalResponse = await fetch(resolvedUrl, fetchOptions);

    // If external API returned an error — forward it as-is to the client
    if (!externalResponse.ok) {
      const errorBody = await externalResponse.text().catch(() => "");

      console.log("------ Response Error --\n", errorBody);

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

    console.log("------ Response Data--");
    console.dir(responseData, { depth: null, colors: true });

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
              {
                error: {
                  message: `Response adapter not found: ${responseAdapterName}`,
                },
              },
              { status: 500 },
            );
          }
          responseData = await applyAdapter(responseData, adapter);
        }
      } catch (adapterError) {
        return NextResponse.json(
          {
            error: {
              message: `Response adapter error: ${(adapterError as Error).message}`,
            },
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
        error: {
          message:
            error instanceof Error ? error.message : "Internal server error",
        },
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
