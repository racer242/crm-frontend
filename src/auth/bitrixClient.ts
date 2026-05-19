/**
 * HTTP клиент для запросов к 1С Битрикс
 * Всегда передаёт X-Internal-Secret в заголовке.
 * Работает только на сервере.
 */

export class BitrixApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = "BitrixApiError";
  }
}

function getBitrixApiUrl(): string {
  const url = process.env.BITRIX_API_URL;
  if (!url) {
    throw new Error("BITRIX_API_URL is not configured");
  }
  return url;
}

function getInternalSecret(): string {
  const secret = process.env.BITRIX_INTERNAL_SECRET;
  if (!secret) {
    throw new Error("BITRIX_INTERNAL_SECRET is not configured");
  }
  return secret;
}

interface BitrixRequestOptions {
  method?: string;
  body?: unknown;
}

/**
 * Выполняет запрос к API Битрикс
 */
export async function bitrixRequest<T>(
  path: string,
  options: BitrixRequestOptions = {},
): Promise<T> {
  const url = `${getBitrixApiUrl()}${path}`;
  const secret = getInternalSecret();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
    "X-Internal-Secret": secret,
  };

  const response = await fetch(url, {
    method: options.method || "POST",
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

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
    throw new BitrixApiError(errorMessage, response.status);
  }

  return response.json() as Promise<T>;
}
