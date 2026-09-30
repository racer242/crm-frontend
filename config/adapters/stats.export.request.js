/**
 * Адаптер запроса выгрузки отчёта в xlsx (POST ops/stats/reports/[id]/export).
 *
 * §5.6 ТЗ: format передаётся в теле запроса; page/limit для xlsx не используются
 * (выгрузка — «файл целиком, без ограничения по строкам»).
 *
 * Период (startDate/endDate) конвертируется в настенное время пояса сервера
 * API (env BITRIX_API_TIMEZONE, по умолчанию Europe/Moscow) и уходит в
 * replacements в формате "YYYY-MM-DD HH:mm:ss":
 * { format: "xlsx", replacements: { "startDate": "...", "endDate": "..." } }.
 * Значения подставляются в SQL связанными параметрами (не текстом), поэтому
 * должны быть в поясе хранения данных сервера. Пустые даты в replacements
 * не включаются. Замены макросов {{startDate}}/{{endDate}} выполняет сервер API.
 */
function transform(params = {}) {
  const result = { format: "xlsx" };
  if (params.startDate || params.endDate) {
    result.replacements = {};
    const start = toZonedDateTime(params.startDate, getApiTimezone());
    const end = toZonedDateTime(params.endDate, getApiTimezone());
    if (start) {
      result.replacements.startDate = start;
    }
    if (end) {
      result.replacements.endDate = end;
    }
  }

  return result;
}
