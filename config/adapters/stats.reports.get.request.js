/**
 * Адаптер запроса для списка статистических отчётов (ops/stats/reports)
 * Преобразует параметры пагинации и фильтры из формата таблицы в формат API
 */
function transform(params = {}) {
  const { event = {}, ...base } = params;

  // 1. Слияние: event переопределяет base только если значение передано явно
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

  // Поиск по названию отчёта
  if (base.search) {
    result.search = base.search;
  }

  // Фильтр активности: из Dropdown приходит строка "true"/"false" или пусто
  if (
    base.is_active !== undefined &&
    base.is_active !== null &&
    base.is_active !== ""
  ) {
    result.is_active = base.is_active === true || base.is_active === "true";
  }

  return result;
}
