/**
 * Адаптер запроса для выполнения статистического отчёта (POST ops/stats/reports/[id]/execute)
 * Преобразует параметры таблицы результата (first/rows) в query-параметры API
 * (page/limit, §5.6 ТЗ). Маршрут помечен query: true — значения уходят в URL, а не в тело.
 *
 * SQL отчёта передаётся с запросом с подстановкой макросов периода:
 * {{startDate}} / {{endDate}} заменяются значениями пикеров, пустые значения —
 * текущей датой-временем (now).
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

  // Подстановка макросов периода в SQL. split/join вместо replace,
  // чтобы символы "$" в датах/SQL не трактовались как паттерны замены.
  if (base.sql !== undefined && base.sql !== null && base.sql !== "") {
    const startDate = base.startDate ? String(base.startDate) : new Date().toISOString();
    const endDate = base.endDate ? String(base.endDate) : new Date().toISOString();

    result.sql = String(base.sql)
      .split("{{startDate}}")
      .join(startDate)
      .split("{{endDate}}")
      .join(endDate);
  }

  return result;
}
