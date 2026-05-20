/**
 * Константы для системы авторизации
 * Все параметры читаются из process.env.* с fallback на значения по умолчанию.
 * Вычисляются один раз при первом импорте.
 */

/**
 * Получить список роутов из env-переменной (через запятую)
 */
function getRoutes(envVar: string | undefined, defaults: string[]): string[] {
  if (envVar) {
    return envVar
      .split(",")
      .map((r) => r.trim())
      .filter(Boolean);
  }
  return defaults;
}

/** Ключи cookie */
const _cookieNames =
  process.env.AUTH_COOKIE_NAMES || "access_token,refresh_token,user_data";
const _cookieArray = _cookieNames.split(",").map((s) => s.trim());

export const COOKIE_KEYS = {
  ACCESS_TOKEN: _cookieArray[0] || "access_token",
  REFRESH_TOKEN: _cookieArray[1] || "refresh_token",
  USER_DATA: _cookieArray[2] || "user_data",
} as const;

/** Время жизни токенов (в секундах) */
export const TOKEN_LIFETIMES = {
  ACCESS_TOKEN: Number(process.env.AUTH_TOKEN_LIFETIME_ACCESS) || 15 * 60, // по умолчанию 15 минут
  REFRESH_TOKEN:
    Number(process.env.AUTH_TOKEN_LIFETIME_REFRESH) || 7 * 24 * 3600, // по умолчанию 7 дней
  USER_DATA: Number(process.env.AUTH_TOKEN_LIFETIME_USERDATA) || 7 * 24 * 3600, // по умолчанию 7 дней
} as const;

/** Защищённые роуты — требуют авторизации */
export const PROTECTED_ROUTES = getRoutes(
  process.env.AUTH_PROTECTED_ROUTES,
  [],
);

/** Гостевые роуты — только для неавторизованных */
export const GUEST_ROUTES = getRoutes(process.env.AUTH_GUEST_ROUTES, [
  "/login",
]);

/** Максимальное количество попыток refresh */
export const MAX_REFRESH_ATTEMPTS =
  Number(process.env.AUTH_MAX_REFRESH_ATTEMPTS) || 1;

/** URL путей аутентификации — Next.js API route handlers (для клиентских fetch) */
export const AUTH_LOGIN_URL: string =
  process.env.AUTH_LOGIN_URL || "/api/auth/login";
export const AUTH_LOGOUT_URL: string =
  process.env.AUTH_LOGOUT_URL || "/api/auth/logout";

/** URL пути refresh — используется на сервере (в proxy и route) */
export const AUTH_REFRESH_URL: string =
  process.env.AUTH_REFRESH_URL || "/api/auth/refresh";
