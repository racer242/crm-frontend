/**
 * Серверный хелпер для получения текущего пользователя
 * Используется в Server Components (layout.tsx).
 * Читает access_token из cookies, верифицирует локально.
 * Если токен истёк — возвращает null (refresh сделает middleware).
 */

import { cookies } from "next/headers";
import { verifyToken } from "./tokenService";
import { COOKIE_KEYS } from "./constants";
import type { User } from "@/types";

/**
 * Возвращает информацию о пользователе из access_token
 * Верифицирует токен локально через JWT_SECRET.
 * Если токен невалиден или истёк — возвращает null.
 * Middleware (proxy.ts) отвечает за refresh до того, как этот код выполнится.
 */
export async function getServerUser(): Promise<User | null> {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get(COOKIE_KEYS.ACCESS_TOKEN)?.value;

    if (!accessToken) {
      return null;
    }

    const result = await verifyToken(accessToken);

    if (result.valid) {
      return {
        id: result.payload.sub,
        login: result.payload.login,
        email: result.payload.email,
        name: result.payload.name,
        avatar: result.payload.avatar,
        role: result.payload.role,
        groups: result.payload.groups,
      };
    }

    return null;
  } catch {
    return null;
  }
}
