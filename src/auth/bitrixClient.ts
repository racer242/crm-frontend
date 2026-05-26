/**
 * HTTP клиент для запросов к 1С Битрикс
 * Всегда передаёт X-Internal-Secret в заголовке.
 * Работает только на сервере.
 */

import { buildUrlWithParams } from "@/utils/http";
import { decodeSecret } from "@/auth/secretUtils";

export class BitrixApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = "BitrixApiError";
  }
}

/** Кэшированные значения — вычисляются один раз */
let _cachedUrl: string | null = null;
let _cachedSecret: string | null = null;
let _cachedMethod: string | null = null;

function getBitrixApiUrl(): string {
  if (_cachedUrl === null) {
    const url = process.env.BITRIX_API_URL;
    if (!url) {
      console.error("[bitrixClient] BITRIX_API_URL is not configured");
      throw new Error("BITRIX_API_URL is not configured");
    }
    _cachedUrl = url;
  }
  return _cachedUrl;
}

function getInternalSecret(): string {
  if (_cachedSecret === null) {
    const secret = process.env.BITRIX_INTERNAL_SECRET;
    if (!secret) {
      console.error("[bitrixClient] BITRIX_INTERNAL_SECRET is not configured");
      throw new Error("BITRIX_INTERNAL_SECRET is not configured");
    }
    _cachedSecret = decodeSecret(secret);
  }
  return _cachedSecret;
}

function getRequestMethod(): string {
  if (_cachedMethod === null) {
    _cachedMethod = process.env.BITRIX_REQUEST_METHOD || "POST";
  }
  return _cachedMethod;
}

interface BitrixRequestOptions {
  method?: string;
  body?: unknown;
}

/**
 * Выполняет запрос к API Битрикс
 * Метод по умолчанию берётся из BITRIX_REQUEST_METHOD (из .env).
 * Если метод GET — body сериализуется в URL-параметры.
 */
export async function bitrixRequest<T>(
  path: string,
  options: BitrixRequestOptions = {},
): Promise<T> {
  const method = options.method || getRequestMethod();
  const baseUrl = getBitrixApiUrl();
  const secret = getInternalSecret();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
    "X-Internal-Secret": secret,
  };

  // Для GET-запросов сериализуем body в URL-параметры
  let requestUrl: string;
  let requestBody: string | undefined;

  if (method === "GET" && options.body) {
    requestUrl = buildUrlWithParams(
      baseUrl + path,
      options.body as Record<string, unknown>,
    );
    requestBody = undefined;
  } else {
    requestUrl = baseUrl + path;
    requestBody = options.body ? JSON.stringify(options.body) : undefined;
  }

  console.log(
    `[bitrixClient] → ${method} ${requestUrl}`,
    options.body ? JSON.stringify(options.body).slice(0, 200) : "",
  );

  let response: Response;
  try {
    response = await fetch(requestUrl, {
      method,
      headers,
      body: requestBody,
    });
  } catch (fetchError) {
    const message =
      fetchError instanceof Error ? fetchError.message : String(fetchError);
    console.error(`[bitrixClient] ✘ Network error — ${message}`);
    throw new BitrixApiError(`Bitrix API request failed: ${message}`, 502);
  }

  if (!response.ok) {
    let errorMessage = `Bitrix API error: ${response.status}`;
    try {
      const errorBody = await response.json();
      if (errorBody.error_description) {
        errorMessage = errorBody.error_description;
      } else if (errorBody.error) {
        errorMessage = errorBody.error;
      }
    } catch {
      // ignore parse error, use default message
    }
    console.error(`[bitrixClient] ✘ ${response.status} — ${errorMessage}`);
    throw new BitrixApiError(errorMessage, response.status);
  }

  let body: T;
  try {
    body = await response.json();
  } catch (parseError) {
    const message =
      parseError instanceof Error ? parseError.message : String(parseError);
    console.error(`[bitrixClient] ✘ Parse error — ${message}`);
    throw new BitrixApiError("Failed to parse Bitrix API response", 502);
  }

  console.log(`[bitrixClient] ✓ ${response.status}`);
  return body;
}
