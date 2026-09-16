/**
 * Адаптер запроса для выполнения статистического отчёта (POST ops/stats/reports/[id]/execute)
 * Преобразует параметры таблицы результата (first/rows) в query-параметры API
 * (page/limit, §5.6 ТЗ). Маршрут помечен query: true — значения уходят в URL, а не в тело.
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

  return {
    page: page,
    limit: Math.min(rows, 100),
  };
}
