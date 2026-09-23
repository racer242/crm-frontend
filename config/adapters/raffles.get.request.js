/**
 * Request-адаптер списка розыгрышей (ops/raffles → GET /api/v1/crm/raffles).
 * Пагинация lazy-таблицы first/rows → page/limit (§8.1).
 * Фильтры (status, chance_source_type, published) добавляются здесь по мере
 * появления фильтров на странице — параметры не смешиваются с другими разделами.
 */
function transform(data) {
  const body = data || {};
  const first = Number(body.first) || 0;
  const rows = Number(body.rows) || 25;
  return {
    page: Math.floor(first / rows) + 1,
    limit: rows,
  };
}