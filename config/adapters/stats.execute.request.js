/**
 * Адаптер запроса для выполнения статистического отчёта (POST ops/stats/reports/[id]/execute)
 * Преобразует параметры таблицы результата (first/rows) в query-параметры API
 * (page/limit, §5.6 ТЗ). Маршрут помечен query: true — значения уходят в URL, а не в тело.
 *
 * Период (startDate/endDate) отправляется как есть в параметре replacements:
 * { replacements: { "startDate": "...", "endDate": "..." } }.
 * Замену макросов {{startDate}}/{{endDate}} в SQL выполняет сервер API перед запуском.
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

  // Период передаётся без изменений — замены на стороне сервера API
  if (
    base.startDate !== undefined ||
    base.endDate !== undefined
  ) {
    result.replacements = {};
    if (base.startDate) {
      result.replacements.startDate = base.startDate;
    }
    if (base.endDate) {
      result.replacements.endDate = base.endDate;
    }
  }

  return result;
}
