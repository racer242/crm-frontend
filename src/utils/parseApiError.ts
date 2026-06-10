/**
 * parseApiError
 *
 * Парсит тело ответа API в формате:
 *   { "error": { "code": "AUTH_REQUIRED", "message": "...", "details": [...] } }
 * и возвращает читаемую строку для отображения в Toast.
 *
 * Если тело не JSON или не соответствует формату — возвращает сырой текст.
 */

interface ApiErrorBody {
  error?: {
    code?: string;
    message?: string;
    details?: Array<{ field?: string; issue?: string }>;
  };
}

export function parseApiError(bodyText: string): string {
  if (!bodyText) return "";

  let parsed: ApiErrorBody;
  try {
    parsed = JSON.parse(bodyText);
  } catch {
    // Не JSON — возвращаем как есть
    return bodyText;
  }

  if (!parsed.error) return bodyText;

  const { code, message, details } = parsed.error;
  const parts: string[] = [];

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

  return parts.length > 0 ? parts.join("; ") : bodyText;
}
