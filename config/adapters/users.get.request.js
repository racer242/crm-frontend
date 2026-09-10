/**
 * Адаптер запроса для списка участников (ops/users)
 * Преобразует параметры пагинации и фильтры из формата таблицы в формат API инстанса
 */
function transform(params = {}) {
  const { event = {}, ...base } = params;

  // 1. Слияние: event переопределяет base только если значение передано явно
  const merged = {
    first: event.first !== undefined ? event.first : base.first,
    rows: event.rows !== undefined ? event.rows : base.rows,
  };

  const first = Number(merged.first) || 0;
  const rows = Number(merged.rows) || 20;

  // Вычисляем номер страницы (API использует 1-based index)
  const page = Math.floor(first / rows) + 1;

  const result = {
    page: page,
    limit: rows,
  };

  // Добавляем поиск, если он задан
  if (base.search) {
    result.search = base.search;
  }

  // Добавляем фильтр по статусу, если он задан
  if (base.status) {
    result.status = base.status;
  }

  return result;
}
