/**
 * Request-адаптер истории баллов участника
 * (ops/users/[user_id]/points/history → GET /api/v1/crm/users/{id}/points/history, §6.3).
 * Пагинация first/rows → page/limit; при пагинации из таблицы свежие значения
 * приходят в event — слияние по паттерну users.get.request.
 * Фильтр type (тип операции) пробрасывается только если задан
 * (пустая строка/null = «Все типы»).
 */
function transform(data) {
  const body = data || {};
  const event = body.event || {};
  const mergedFirst = event.first !== undefined ? event.first : body.first;
  const mergedRows = event.rows !== undefined ? event.rows : body.rows;
  const first = Number(mergedFirst) || 0;
  const rows = Number(mergedRows) || 10;
  const result = {
    page: Math.floor(first / rows) + 1,
    limit: rows,
  };
  const type =
    body.type === undefined || body.type === null ? "" : String(body.type);
  if (type !== "") {
    result.type = type;
  }
  return result;
}