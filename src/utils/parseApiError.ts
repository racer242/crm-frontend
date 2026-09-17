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

/**
 * Максимальное число строк details в тосте — защита от слишком длинных сообщений
 */
const MAX_DETAILS_LINES = 10;

/**
 * formatApiError: готовит полный текст ошибки для Toast.
 *
 * Результат:
 *   <baseMessage>            — опциональная базовая строка из конфига (onError-тост)
 *   <error.message>          — если отличается от baseMessage
 *   • field: issue           — по строке на каждый элемент details
 *   • …и ещё N               — если details больше лимита
 *
 * Принимает и ApiError-объект, и строку (некоторые источники ошибок
 * кладут в result.error просто строку), и null/undefined.
 */
export function formatApiError(
  error: ApiError | string | null | undefined,
  baseMessage?: string,
): string {
  const base = (baseMessage || "").trim();

  if (error === null || error === undefined) {
    return base || "Unknown error";
  }

  // Строковая ошибка — просто добавляем к базовому сообщению
  if (typeof error === "string") {
    const text = error.trim();
    if (!text) return base || "Unknown error";
    return base && text !== base ? `${base}\n${text}` : text;
  }

  const lines: string[] = base ? [base] : [];

  const main = (error.message || error.rawText || "").trim();
  if (main && main !== base) {
    lines.push(main);
  }

  if (Array.isArray(error.details)) {
    const items = error.details.slice(0, MAX_DETAILS_LINES);
    for (const d of items) {
      const field = String(d?.field ?? "").trim();
      const issue = String(d?.issue ?? "").trim();
      if (!field && !issue) continue;
      lines.push(`• ${field ? `${field}: ` : ""}${issue}`);
    }
    const hidden = error.details.length - items.length;
    if (hidden > 0) {
      lines.push(`• …и ещё ${hidden}`);
    }
  }

  if (lines.length === 0) {
    return "Unknown error";
  }
  return lines.join("\n");
}
