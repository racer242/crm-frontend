/**
 * Proxy для проверки авторизации
 *
 * 1. Определяет тип роута: защищённый, гостевой, остальные
 * 2. Проверяет access_token локально через tokenService
 * 3. Если токен истекает — пробует refresh через /api/auth/refresh
 * 4. Защищённый роут без сессии → редирект на /login?returnUrl=...
 * 5. Гостевой роут с сессией → редирект на /dashboard
 *
 * ВАЖНО: proxy работает с request.cookies напрямую,
 * т.к. next/headers несовместим с Edge Runtime.
 */

import { NextRequest, NextResponse } from "next/server";
import {
  verifyToken,
  isTokenExpiringSoon,
  decodeToken,
} from "@/auth/tokenService";
import {
  COOKIE_KEYS,
  PROTECTED_ROUTES,
  GUEST_ROUTES,
  MAX_REFRESH_ATTEMPTS,
} from "@/auth/constants";

function isProtectedRoute(pathname: string): boolean {
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
  return fullPath !== "/login" ? fullPath : "/dashboard";
}

/**
 * Попытка refresh токена через внутренний API
 */
async function tryRefreshToken(
  request: NextRequest,
): Promise<{ ok: boolean; response?: NextResponse }> {
  const refreshToken = request.cookies.get(COOKIE_KEYS.REFRESH_TOKEN)?.value;

  if (!refreshToken) {
    return { ok: false };
  }

  try {
    const origin = request.nextUrl.origin;
    const refreshResponse = await fetch(`${origin}/api/auth/refresh`, {
      method: "POST",
      headers: {
        Cookie: `refresh_token=${refreshToken}`,
      },
    });

    if (refreshResponse.ok) {
      // Создаём ответ и переносим Set-Cookie из refresh-ответа
      const response = NextResponse.next();
      const setCookieHeaders = refreshResponse.headers.getSetCookie();
      setCookieHeaders.forEach((cookie) => {
        response.headers.append("Set-Cookie", cookie);
      });
      return { ok: true, response };
    }

    return { ok: false };
  } catch {
    return { ok: false };
  }
}

export async function proxy(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;

  // Пропускаем статические файлы, API, _next и т.д.
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/") ||
    pathname.startsWith("/static/") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  const accessToken = request.cookies.get(COOKIE_KEYS.ACCESS_TOKEN)?.value;
  const isProtected = isProtectedRoute(pathname);
  const isGuest = isGuestRoute(pathname);

  // Проверяем access_token локально
  let payload = accessToken ? await verifyToken(accessToken) : null;

  // Если токен истекает — пробуем refresh
  if (payload && isTokenExpiringSoon(payload)) {
    const refreshResult = await tryRefreshToken(request);
    if (refreshResult.ok && refreshResult.response) {
      // Обновляем payload из новых cookies (декодируем без верификации,
      // т.к. новые куки уже установлены в ответе)
      return refreshResult.response;
    }
    // Если refresh не удался — payload остаётся, может быть ещё валиден
  }

  // Если токен не прошёл верификацию — пробуем декодировать
  // (токен может быть ещё валиден по времени, но мы его не верифицировали)
  if (!payload && accessToken) {
    const decoded = decodeToken(accessToken);
    if (decoded && decoded.exp * 1000 > Date.now()) {
      payload = decoded as any;
    }
  }

  const hasSession = !!payload;

  // Защищённый роут без сессии → редирект на /login
  if (isProtected && !hasSession) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("returnUrl", getReturnUrl(request));
    return NextResponse.redirect(loginUrl);
  }

  // Гостевой роут с сессией → редирект на /dashboard
  if (isGuest && hasSession) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
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
