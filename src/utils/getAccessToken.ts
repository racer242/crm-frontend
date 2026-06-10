/**
 * getAccessToken
 *
 * Утилиты для получения access_token из cookies.
 * Используется на сервере для добавления Bearer-токена к внешним API-запросам.
 *
 * Два режима:
 * - getAccessTokenFromRequest(request: NextRequest) — для Route Handlers (API Router)
 * - getAccessTokenServer() — для Server Components (через next/headers)
 */

import { NextRequest } from "next/server";
import { COOKIE_KEYS } from "@/auth/constants";

/**
 * Читает access_token из cookies объекта NextRequest.
 * Используется в Route Handlers (например, API Router в route.ts).
 */
export function getAccessTokenFromRequest(
  request: NextRequest,
): string | undefined {
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
