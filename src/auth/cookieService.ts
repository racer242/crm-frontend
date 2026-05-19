/**
 * Сервис для управления auth cookies
 * Работает в Route Handlers и Server Components (через next/headers).
 * НЕ используется в middleware — там работаем напрямую с request.cookies.
 */

import { cookies } from "next/headers";
import { COOKIE_KEYS, TOKEN_LIFETIMES } from "./constants";
import type { User } from "@/types";

/**
 * Устанавливает auth cookies
 * access_token и refresh_token — httpOnly
 * user_data — не httpOnly (доступен клиенту для инициализации Context)
 */
export async function setAuthCookies(
  accessToken: string,
  refreshToken: string,
  user: User,
): Promise<void> {
  const cookieStore = await cookies();

  cookieStore.set(COOKIE_KEYS.ACCESS_TOKEN, accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: TOKEN_LIFETIMES.ACCESS_TOKEN,
  });

  cookieStore.set(COOKIE_KEYS.REFRESH_TOKEN, refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: TOKEN_LIFETIMES.REFRESH_TOKEN,
  });

  cookieStore.set(COOKIE_KEYS.USER_DATA, JSON.stringify(user), {
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: TOKEN_LIFETIMES.USER_DATA,
  });
}

/**
 * Удаляет все auth cookies
 */
export async function clearAuthCookies(): Promise<void> {
  const cookieStore = await cookies();

  cookieStore.set(COOKIE_KEYS.ACCESS_TOKEN, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });

  cookieStore.set(COOKIE_KEYS.REFRESH_TOKEN, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });

  cookieStore.set(COOKIE_KEYS.USER_DATA, "", {
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}
