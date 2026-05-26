/**
 * Серверный хелпер для получения текущего пользователя
 * Используется в Server Components (layout.tsx).
 *
 * 1. Читает access_token из cookies, верифицирует локально — подтверждает, что сессия жива.
 * 2. Извлекает полный User из user_data cookie (не httpOnly, устанавливается при логине/refresh'е).
 * 3. Если user_data отсутствует — fallback на сборку User из JWT-claims.
 * 4. Если токен истёк — возвращает null (refresh сделает middleware).
 */

import { cookies } from "next/headers";
import { verifyToken } from "./tokenService";
import { COOKIE_KEYS } from "./constants";
import type { User } from "@/types";

/**
 * Парсит JSON из user_data cookie.
 * Возвращает null, если cookie нет или JSON невалиден.
 */
function parseUserDataCookie(cookieValue: string | undefined): User | null {
  if (!cookieValue) return null;
  try {
    return JSON.parse(cookieValue) as User;
  } catch {
    return null;
  }
}

/**
 * Собирает User из верифицированного JWT-пэйлоада (fallback).
 * Некоторые поля (name, role, groups) могут отсутствовать, если Bitrix
 * не включает их в JWT.
 */
function buildUserFromPayload(payload: Record<string, unknown>): User {
  return {
    id: (payload.sub as string) || "",
    login: (payload.login as string) || "",
    email: (payload.email as string) || "",
    name: (payload.name as string) || "",
    avatar: payload.avatar as string | undefined,
    role: (payload.role as string) || "",
    groups: (payload.groups as string[]) || [],
  };
}

/**
 * Возвращает информацию о пользователе из cookies.
 *
 * Приоритет: user_data cookie → JWT claims.
 * Токен всё равно верифицируется — если он невалиден, возвращаем null.
 *
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

    if (!result.valid) {
      return null;
    }

    // Пытаемся прочитать полные данные из user_data cookie
    const userDataCookie = cookieStore.get(COOKIE_KEYS.USER_DATA)?.value;
    const userFromCookie = parseUserDataCookie(userDataCookie);

    if (userFromCookie) {
      return userFromCookie;
    }

    // Fallback: собираем User из JWT-claims
    return buildUserFromPayload(
      result.payload as unknown as Record<string, unknown>,
    );
  } catch {
    return null;
  }
}
