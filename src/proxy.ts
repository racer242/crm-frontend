/**
 * Proxy для проверки авторизации
 *
 * 1. Определяет тип роута: защищённый, гостевой, остальные
 * 2. Проверяет access_token локально через tokenService
 * 3. Если токен истекает — пробует refresh напрямую через bitrixClient
 * 4. Защищённый роут без сессии → редирект на /login?return_url=...
 * 5. Гостевой роут с сессией → редирект на /
 *
 * ВАЖНО: proxy работает с request.cookies напрямую,
 * т.к. next/headers несовместим с Edge Runtime.
 */

import { NextRequest, NextResponse } from "next/server";
import {
  verifyToken,
  isTokenExpiringSoon,
  type TokenVerifyResult,
} from "@/auth/tokenService";
import { bitrixRequest, BitrixApiError } from "@/auth/bitrixClient";
import {
  COOKIE_KEYS,
  PROTECTED_ROUTES,
  GUEST_ROUTES,
  AUTH_REFRESH_URL,
} from "@/auth/constants";
import type { LoginResponse } from "@/types";

function isProtectedRoute(pathname: string): boolean {
  if (PROTECTED_ROUTES.length === 0 && GUEST_ROUTES.length > 0) {
    // Всё защищено — проверяем что это НЕ guest роут
    return !isGuestRoute(pathname);
  }
  return PROTECTED_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(route + "/"),
  );
}

function isGuestRoute(pathname: string): boolean {
  return GUEST_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(route + "/"),
  );
}

function getReturnUrl(request: NextRequest): string {
  const { pathname, search } = request.nextUrl;
  const fullPath = pathname + search;
  return fullPath !== "/login" ? fullPath : "/";
}

/**
 * Попытка refresh токена напрямую через Битрикс (без внутреннего HTTP-запроса).
 * Это предотвращает цепочку request → fetch → /api/auth/refresh → bitrixClient.
 */
async function tryRefreshToken(
  request: NextRequest,
): Promise<{ ok: boolean; response?: NextResponse }> {
  const refreshToken = request.cookies.get(COOKIE_KEYS.REFRESH_TOKEN)?.value;

  if (!refreshToken) {
    return { ok: false };
  }

  try {
    const response = await bitrixRequest<LoginResponse>(AUTH_REFRESH_URL, {
      body: { refresh_token: refreshToken },
    });

    // Создаём ответ с новыми cookies
    const nextResponse = NextResponse.next();
    const lifetimeAccess =
      Number(process.env.AUTH_TOKEN_LIFETIME_ACCESS) || 15 * 60;
    const lifetimeRefresh =
      Number(process.env.AUTH_TOKEN_LIFETIME_REFRESH) || 7 * 24 * 3600;
    const lifetimeUser =
      Number(process.env.AUTH_TOKEN_LIFETIME_USERDATA) || 7 * 24 * 3600;
    const isProd = process.env.NODE_ENV === "production";

    nextResponse.cookies.set(COOKIE_KEYS.ACCESS_TOKEN, response.access_token, {
      httpOnly: true,
      secure: isProd,
      sameSite: "lax",
      path: "/",
      maxAge: lifetimeAccess,
    });

    nextResponse.cookies.set(
      COOKIE_KEYS.REFRESH_TOKEN,
      response.refresh_token,
      {
        httpOnly: true,
        secure: isProd,
        sameSite: "lax",
        path: "/",
        maxAge: lifetimeRefresh,
      },
    );

    nextResponse.cookies.set(
      COOKIE_KEYS.USER_DATA,
      JSON.stringify(response.user),
      {
        httpOnly: false,
        secure: isProd,
        sameSite: "lax",
        path: "/",
        maxAge: lifetimeUser,
      },
    );

    return { ok: true, response: nextResponse };
  } catch (error) {
    // Логируем только неожиданные ошибки (BitrixApiError ожидаемы)
    if (!(error instanceof BitrixApiError)) {
      console.error("[proxy] Refresh token error:", error);
    }
    return { ok: false };
  }
}

export async function proxy(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;

  // Пропускаем статические файлы, API, _next, mocks и т.д.
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/") ||
    pathname.startsWith("/static/") ||
    pathname.startsWith("/mocks/") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  const accessToken = request.cookies.get(COOKIE_KEYS.ACCESS_TOKEN)?.value;
  const refreshToken = request.cookies.get(COOKIE_KEYS.REFRESH_TOKEN)?.value;
  const isProtected = isProtectedRoute(pathname);
  const isGuest = isGuestRoute(pathname);

  let hasSession = false;

  // Если access_token отсутствует, но refresh_token есть — пробуем refresh
  if (!accessToken && refreshToken) {
    const refreshResult = await tryRefreshToken(request);
    if (refreshResult.ok && refreshResult.response) {
      return refreshResult.response;
    }
  }

  // Проверяем access_token локально
  const result: TokenVerifyResult | null = accessToken
    ? await verifyToken(accessToken)
    : null;

  if (result?.valid) {
    // Токен валиден
    hasSession = true;

    // Если скоро истекает — пробуем refresh
    if (isTokenExpiringSoon(result.payload)) {
      const refreshResult = await tryRefreshToken(request);
      if (refreshResult.ok && refreshResult.response) {
        return refreshResult.response;
      }
      // Если refresh не удался — текущий токен ещё жив, продолжаем
    }
  } else if (result?.reason === "expired") {
    // Токен истёк — пробуем обновить, если есть refresh_token
    if (refreshToken) {
      const refreshResult = await tryRefreshToken(request);
      if (refreshResult.ok && refreshResult.response) {
        return refreshResult.response;
      }
    }
    // Refresh не удался — сессии нет
    hasSession = false;
  }
  // Если reason === "invalid" или accessToken отсутствует — сессии нет, идём к проверке роутов

  // Защищённый роут без сессии → редирект на /login
  if (isProtected && !hasSession) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("return_url", getReturnUrl(request));
    return NextResponse.redirect(loginUrl);
  }

  // Гостевой роут с сессией → редирект на /
  if (isGuest && hasSession) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    "/((?!_next/static|_next/image|favicon\\.ico).*)",
  ],
};
