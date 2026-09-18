/**
 * Клиентское форматирование дат (шаг 2 переноса с серверных адаптеров).
 *
 * Адаптеры передают даты сырыми ISO; форматирование выполняется здесь —
 * на клиенте, в часовом поясе ЗРИТЕЛЯ (Intl/Date используют локальную
 * зону браузера). Сервер (SSR) рендерит сырое значение.
 *
 * Паттерн-токены (как в макросах {$now.*}): DD, MM, YYYY, HH, mm, ss.
 */

/** Паттерн по умолчанию для колонок таблиц и текстов */
export const DEFAULT_DATETIME_PATTERN = "DD.MM.YYYY HH:mm";

/** Паттерн «только дата» */
export const DEFAULT_DATE_PATTERN = "DD.MM.YYYY";

/** Похож ли значение на дату (ISO-строка, Date или timestamp) */
export function isDateLike(value: unknown): boolean {
  if (value instanceof Date) return !isNaN(value.getTime());
  if (typeof value === "number") return Number.isFinite(value) && value > 0;
  if (typeof value === "string") {
    // ISO-подобные: 2026-09-18 или 2026-09-18T00:54:15+03:00 / 2026-09-18 00:54:15
    return /^\d{4}-\d{2}-\d{2}([T ]\d{2}:\d{2})?/.test(value);
  }
  return false;
}

/**
 * Форматирует значение по паттерну в ЛОКАЛЬНОЙ зоне среды выполнения.
 * Не-датные значения возвращаются как есть (строкой), пустые — пустой строкой.
 */
export function formatDateByPattern(
  value: unknown,
  pattern: string = DEFAULT_DATETIME_PATTERN,
): string {
  if (value === null || value === undefined || value === "") return "";
  const date =
    value instanceof Date ? value : new Date(value as string | number);
  if (isNaN(date.getTime())) {
    return typeof value === "string" ? value : String(value);
  }
  const pad = (n: number) => String(n).padStart(2, "0");
  const tokens: Record<string, string> = {
    YYYY: String(date.getFullYear()),
    MM: pad(date.getMonth() + 1),
    DD: pad(date.getDate()),
    HH: pad(date.getHours()),
    mm: pad(date.getMinutes()),
    ss: pad(date.getSeconds()),
  };
  return pattern.replace(/YYYY|MM|DD|HH|mm|ss/g, (t) => tokens[t]);
}
