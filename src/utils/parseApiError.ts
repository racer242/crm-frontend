/**
 * parseApiError
 *
 * Парсит строку ошибки в читаемый формат для отображения в Toast.
 *
 * Поддерживаемые форматы на входе:
 *   1. Сырой ответ API:   { "error": { "code": "...", "message": "...", "details": [...] } }
 *   2. Объект ошибки:     { "code": "...", "message": "...", "details": [...] }
 *   3. Простая строка:    "Неверный логин или пароль"
 *
 * Результат:
 *   [AUTH_REQUIRED] Для выполнения действия нужна авторизация.
 *   email: Неверный формат почты; password: Пароль слишком короткий
 */

interface ErrorShape {
  code?: string;
  message?: string;
  details?: Array<{ field?: string; issue?: string }>;
}

function formatErrorObj(obj: ErrorShape): string {
  const parts: string[] = [];
  const { code, message, details } = obj;

  // [CODE] message
  if (code || message) {
    let mainMsg = "";
    if (code) mainMsg += `[${code}] `;
    if (message) mainMsg += message;
    if (mainMsg) parts.push(mainMsg.trim());
  }

  // details: field — issue
  if (details && details.length > 0) {
    for (const d of details) {
      if (d.field && d.issue) {
        parts.push(`${d.field}: ${d.issue}`);
      } else if (d.issue) {
        parts.push(d.issue);
      }
    }
  }

  return parts.join("; ");
}

export function parseApiError(text: string): string {
  if (!text) return "";

  // Пробуем распарсить как JSON
  let parsed: any;
  try {
    parsed = JSON.parse(text);
  } catch {
    // Не JSON — возвращаем как есть
    return text;
  }

  // Формат 1: { error: { code, message, details } }
  if (parsed?.error) {
    const formatted = formatErrorObj(parsed.error);
    if (formatted) return formatted;
  }

  // Формат 2: { code, message, details } (уже извлечённый объект)
  if (parsed?.code || parsed?.message) {
    const formatted = formatErrorObj(parsed);
    if (formatted) return formatted;
  }

  // Ничего не распознано — возвращаем исходный текст
  return text;
}
