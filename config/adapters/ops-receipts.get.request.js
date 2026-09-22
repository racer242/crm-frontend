/**
 * Request-адаптер общего списка чеков (ops/receipts, 2.11)
 * Параметры: first/rows (пагинация), search, status (модерация),
 * fns_status (ФНС), user_id (счётчики на карточке участника).
 * Формат API: page/limit (1-based), пустые параметры не отправляются.
 */
function transform(params = {}) {
  const { event = {}, ...base } = params;

  const merged = {
    first: event.first !== undefined ? event.first : base.first,
    rows: event.rows !== undefined ? event.rows : base.rows,
  };

  const first = Number(merged.first) || 0;
  const rows = Number(merged.rows) || 25;
  const page = Math.floor(first / rows) + 1;

  const result = {
    page: page,
    limit: rows,
  };

  if (base.search) {
    result.search = base.search;
  }
  if (base.status) {
    result.status = base.status;
  }
  if (base.fns_status) {
    result.fns_status = base.fns_status;
  }
  if (base.user_id) {
    result.user_id = base.user_id;
  }

  return result;
}
