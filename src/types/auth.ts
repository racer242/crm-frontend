/**
 * Типы для системы авторизации (NextJS + Bitrix)
 */

/** Учётные данные для входа */
export interface LoginCredentials {
  login: string;
  password: string;
}

/** Пользователь системы */
export interface User {
  id: string;
  login: string;
  email: string;
  name: string;
  avatar?: string;
  role: string;
  groups: string[];
}

/** Токены авторизации */
export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

/** Ответ от Битрикс после логина */
export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  user: User;
}

/** Полезная нагрузка JWT токена */
export interface TokenPayload {
  sub: string;
  login: string;
  email: string;
  name: string;
  avatar?: string;
  role: string;
  groups: string[];
  iat: number;
  exp: number;
  type: "access" | "refresh";
}
