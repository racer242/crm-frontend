/**
 * Константы для системы авторизации
 * Все параметры читаются из process.env.* с fallback на значения по умолчанию.
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
export const COOKIE_KEYS = {
  ACCESS_TOKEN:
    (process.env.AUTH_COOKIE_NAMES || "access_token,refresh_token,user_data")
      .split(",")
      .map((s) => s.trim())[0] || "access_token",
  REFRESH_TOKEN:
    (process.env.AUTH_COOKIE_NAMES || "access_token,refresh_token,user_data")
      .split(",")
      .map((s) => s.trim())[1] || "refresh_token",
  USER_DATA:
    (process.env.AUTH_COOKIE_NAMES || "access_token,refresh_token,user_data")
      .split(",")
      .map((s) => s.trim())[2] || "user_data",
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
