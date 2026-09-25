/**
 * Request-адаптер шансов розыгрыша
 * (ops/raffles/[raffle_id]/chances → GET /api/v1/crm/raffles/{id}/chances, §8.9).
 * Пагинация lazy-таблицы first/rows → page/limit. При смене страницы из
 * таблицы свежие first/rows приходят в event — слияние по паттерну
 * users.get.request (event переопределяет state только при наличии).
 */
function transform(data) {
  const body = data || {};
  const event = body.event || {};
  const mergedFirst = event.first !== undefined ? event.first : body.first;
  const mergedRows = event.rows !== undefined ? event.rows : body.rows;
  const first = Number(mergedFirst) || 0;
  const rows = Number(mergedRows) || 10;
  return {
    page: Math.floor(first / rows) + 1,
    limit: rows,
  };
}