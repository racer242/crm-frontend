/**
 * Сервис для работы с JWT токенами через jose
 * Верификация, декодирование, проверка истечения.
 * Работает только на сервере.
 */

import { jwtVerify, decodeJwt, SignJWT } from "jose";
import type { TokenPayload } from "@/types";

/** Кэшированный секрет — вычисляется один раз, не создаёт лишних объектов */
let _jwtSecretCache: Uint8Array | null = null;

function getJwtSecret(): Uint8Array {
  if (!_jwtSecretCache) {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error("JWT_SECRET is not configured");
    }
    _jwtSecretCache = new TextEncoder().encode(secret);
  }
  return _jwtSecretCache;
}

/**
 * Верифицирует JWT токен и возвращает payload
 */
export async function verifyToken(token: string): Promise<TokenPayload | null> {
  try {
    const secret = getJwtSecret();
    const { payload } = await jwtVerify(token, secret);
    return payload as unknown as TokenPayload;
  } catch {
    return null;
  }
}

/**
 * Декодирует JWT токен без верификации (только для чтения)
 */
export function decodeToken(token: string): TokenPayload | null {
  try {
    const payload = decodeJwt(token);
    return payload as unknown as TokenPayload;
  } catch {
    return null;
  }
}

/**
 * Проверяет, истекает ли токен в ближайшие N минут
 */
export function isTokenExpiringSoon(
  payload: TokenPayload,
  minutes = 5,
): boolean {
  const now = Math.floor(Date.now() / 1000);
  const threshold = now + minutes * 60;
  return payload.exp < threshold;
}

/**
 * Создаёт JWT токен (для тестирования или если NextJS сам выпускает токены)
 */
export async function createToken(
  payload: Omit<TokenPayload, "iat" | "exp">,
  expiresIn: number,
): Promise<string> {
  const secret = getJwtSecret();
  return new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${expiresIn}s`)
    .sign(secret);
}
