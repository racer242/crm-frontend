/**
 * Утилиты для работы с секретами, переданными через переменные окружения.
 * Поддерживает Base64-кодированные значения с префиксом "Base64_".
 */

const PREFIX = "Base64_";

/**
 * Декодирует секрет, если он начинается с префикса "Base64_".
 * Если префикс отсутствует — возвращает значение как есть.
 */
export function decodeSecret(value: string): string {
  if (value.startsWith(PREFIX)) {
    return Buffer.from(value.slice(PREFIX.length), "base64").toString("utf-8");
  }
  return value;
}
