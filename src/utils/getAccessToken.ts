/**
 * getAccessToken
 *
 * Утилиты для получения access_token из cookies или заголовка Authorization.
 * Используется на сервере для добавления Bearer-токена к внешним API-запросам.
 *
 * Три режима:
 * - getAccessTokenFromRequest(request: NextRequest) — для Route Handlers (API Router)
 *   Проверяет заголовок Authorization, затем fallback на cookies
 * - getAccessTokenServer() — для Server Components (через next/headers)
 */

import { NextRequest } from "next/server";
import { COOKIE_KEYS } from "@/auth/constants";

/**
 * Читает access_token из запроса.
 * Приоритет:
 *   1. Заголовок Authorization (Bearer <token>)
 *   2. Cookies (access_token)
 * Используется в Route Handlers (например, API Router в route.ts).
 */
export function getAccessTokenFromRequest(
  request: NextRequest,
): string | undefined {
  // 1. Проверяем заголовок Authorization
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }

  // 2. Fallback на cookies
  return request.cookies.get(COOKIE_KEYS.ACCESS_TOKEN)?.value;
}

/**
 * Читает access_token из cookies через next/headers.
 * Используется в Server Components (например, page.tsx).
 * Может быть вызван ТОЛЬКО на сервере.
 */
export async function getAccessTokenServer(): Promise<string | undefined> {
  try {
    const { cookies } = await import("next/headers");
    const cookieStore = await cookies();
    return cookieStore.get(COOKIE_KEYS.ACCESS_TOKEN)?.value;
  } catch {
    // Если вызов происходит не на сервере — возвращаем undefined
    return undefined;
  }
}
