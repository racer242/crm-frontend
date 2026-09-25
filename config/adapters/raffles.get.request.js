/**
 * Request-адаптер списка розыгрышей (ops/raffles → GET /api/v1/crm/raffles).
 * Пагинация lazy-таблицы first/rows → page/limit (§8.1).
 * Фильтры (status, chance_source_type, published) добавляются здесь по мере
 * появления фильтров на странице — параметры не смешиваются с другими разделами.
 */
function transform(data) {
  const body = data || {};
  const event = body.event || {};
  // Слияние по паттерну users.get.request: при пагинации из таблицы свежие
  // first/rows приходят в event и переопределяют значения из state.
  const mergedFirst = event.first !== undefined ? event.first : body.first;
  const mergedRows = event.rows !== undefined ? event.rows : body.rows;
  const first = Number(mergedFirst) || 0;
  const rows = Number(mergedRows) || 25;
  return {
    page: Math.floor(first / rows) + 1,
    limit: rows,
  };
}