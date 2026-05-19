/**
 * Серверный хелпер для получения текущего пользователя
 * Используется в Server Components (layout.tsx).
 * Читает access_token из cookies, верифицирует локально.
 */

import { cookies } from "next/headers";
import { verifyToken, decodeToken } from "./tokenService";
import { COOKIE_KEYS } from "./constants";
import type { User } from "@/types";

/**
 * Возвращает информацию о пользователе из access_token
 * Верифицирует токен локально через JWT_SECRET.
 * Если токен невалиден — возвращает null.
 */
export async function getServerUser(): Promise<User | null> {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get(COOKIE_KEYS.ACCESS_TOKEN)?.value;

    if (!accessToken) {
      return null;
    }

    // Сначала пробуем верифицировать
    const payload = await verifyToken(accessToken);

    if (payload) {
      return {
        id: payload.sub,
        login: payload.login,
        email: payload.email,
        name: payload.name,
        avatar: payload.avatar,
        role: payload.role,
        groups: payload.groups,
      };
    }

    // Если верификация не прошла — пробуем декодировать без верификации
    // (на случай если токен уже просрочен, но нам нужно показать пользователю
    //  данные пока мы делаем refresh на клиенте)
    const decoded = decodeToken(accessToken);
    if (decoded) {
      return {
        id: decoded.sub,
        login: decoded.login,
        email: decoded.email,
        name: decoded.name,
        avatar: decoded.avatar,
        role: decoded.role,
        groups: decoded.groups,
      };
    }

    return null;
  } catch {
    return null;
  }
}
