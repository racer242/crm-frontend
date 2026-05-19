/**
 * Константы для системы авторизации
 */

/** Ключи cookie */
export const COOKIE_KEYS = {
  ACCESS_TOKEN: "access_token",
  REFRESH_TOKEN: "refresh_token",
  USER_DATA: "user_data",
} as const;

/** Время жизни токенов */
export const TOKEN_LIFETIMES = {
  ACCESS_TOKEN: 15 * 60, // 15 минут в секундах
  REFRESH_TOKEN: 7 * 24 * 3600, // 7 дней в секундах
  USER_DATA: 7 * 24 * 3600, // 7 дней в секундах
} as const;

/** Защищённые роуты — требуют авторизации */
export const PROTECTED_ROUTES = ["/dashboard", "/profile"];

/** Гостевые роуты — только для неавторизованных */
export const GUEST_ROUTES = ["/login"];

/** Максимальное количество попыток refresh */
export const MAX_REFRESH_ATTEMPTS = 1;
