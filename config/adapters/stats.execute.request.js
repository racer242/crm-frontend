/**
 * Адаптер запроса для выполнения статистического отчёта (POST ops/stats/reports/[id]/execute)
 * Преобразует параметры таблицы результата (first/rows) в query-параметры API
 * (page/limit, §5.6 ТЗ). Маршрут помечен query: true — значения уходят в URL, а не в тело.
 *
 * Период (startDate/endDate) конвертируется в настенное время пояса сервера
 * API (env BITRIX_API_TIMEZONE, по умолчанию Europe/Moscow) и уходит в
 * replacements в формате "YYYY-MM-DD HH:mm:ss":
 * { replacements: { "startDate": "...", "endDate": "..." } }.
 * Значения подставляются в SQL связанными параметрами (не текстом), поэтому
 * должны быть в поясе хранения данных сервера. Пустые даты в replacements
 * не включаются; замены макросов {{startDate}}/{{endDate}} выполняет сервер API.
 */
function transform(params = {}) {
  const { event = {}, ...base } = params;

  const merged = {
    first: event.first !== undefined ? event.first : base.first,
    rows: event.rows !== undefined ? event.rows : base.rows,
  };

  const first = Number(merged.first) || 0;
  const rows = Number(merged.rows) || 20;
  const page = Math.floor(first / rows) + 1;

  const result = {
    page: page,
    limit: Math.min(rows, 100),
  };

  // Даты конвертируются в пояс сервера API; пустые → null → ключ не включается
  if (
    base.startDate !== undefined ||
    base.endDate !== undefined
  ) {
    result.replacements = {};
    const start = toZonedDateTime(base.startDate, getApiTimezone());
    const end = toZonedDateTime(base.endDate, getApiTimezone());
    if (start) {
      result.replacements.startDate = start;
    }
    if (end) {
      result.replacements.endDate = end;
    }
  }

  return result;
}
