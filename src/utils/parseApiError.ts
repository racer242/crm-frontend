/**
 * parseApiError
 *
 * Парсит строку ошибки от сервера в объект для дальнейшего использования.
 *
 * Поддерживаемые форматы на входе:
 *   1. Сырой ответ API:   { "error": { "code": "...", "message": "...", "details": [...] } }
 *   2. Объект ошибки:     { "code": "...", "message": "...", "details": [...] }
 *   3. Простая строка:    "Неверный логин или пароль"
 *
 * Результат:
 *   { code: "AUTH_REQUIRED", message: "Для выполнения действия нужна авторизация", details: [...] }
 */

export interface ApiErrorDetail {
  field?: string;
  issue?: string;
}

export interface ApiError {
  code?: string;
  message?: string;
  details?: ApiErrorDetail[];
  rawText?: string; // Для случаев когда не удалось распарсить
}

function parseErrorObj(obj: any): ApiError {
  const result: ApiError = {};

  if (obj.code) result.code = obj.code;
  if (obj.message) result.message = obj.message;
  if (obj.details && Array.isArray(obj.details)) {
    result.details = obj.details.map((d: any) => ({
      field: d.field,
      issue: d.issue,
    }));
  }

  return result;
}

export function parseApiError(text: string): ApiError {
  if (!text) {
    return { rawText: "" };
  }

  // Пробуем распарсить как JSON
  let parsed: any;
  try {
    parsed = JSON.parse(text);
  } catch {
    // Не JSON — возвращаем как rawText
    return { rawText: text };
  }

  // Формат 1: { error: { code, message, details } }
  if (parsed?.error) {
    return parseErrorObj(parsed.error);
  }

  // Формат 2: { code, message, details } (уже извлечённый объект)
  if (parsed?.code || parsed?.message) {
    return parseErrorObj(parsed);
  }

  // Ничего не распознано — возвращаем как rawText
  return { rawText: text };
}
