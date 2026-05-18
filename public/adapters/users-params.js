/**
 * Трансформирует состояние таблицы + событие в параметры API-запроса
 * @param {Object} params - Объект с полями состояния и вложенным event
 * @returns {Object} Параметры для GET-запроса к API
 */
function transform(params = {}) {
  const { event = {}, ...base } = params;

  // 1. Слияние: event переопределяет base только если значение передано явно
  const merged = {
    first: event.first !== undefined ? event.first : base.first,
    rows: event.rows !== undefined ? event.rows : base.rows,
    sortField: event.sortField !== undefined ? event.sortField : base.sortField,
    sortOrder: event.sortOrder !== undefined ? event.sortOrder : base.sortOrder,
    search: event.search !== undefined ? event.search : base.search,
    filters: event.filters !== undefined ? event.filters : base.filters,
  };

  // 2. Пагинация: first (индекс) → page (номер страницы)
  const limit = merged.rows;
  const first = merged.first ?? 0;
  const page = limit ? Math.floor(first / limit) : 0;

  // 3. Сортировка: 1/-1 → 'asc'/'desc'
  const sort = merged.sortField || null;
  const direction = sort ? (merged.sortOrder === -1 ? "desc" : "asc") : null;

  // 4. Фильтры: объект → массив
  const filters = transformFilters(merged.filters);

  // 5. Итоговый объект
  let a = {
    page,
    limit: limit ?? null,
    sort,
    direction,
    search: merged.search || "",
    filters,
  };
  console.log("??", a);

  return a;
}

/**
 * Преобразует фильтры PrimeReact → формат API
 */
function transformFilters(prFilters) {
  if (!prFilters || typeof prFilters !== "object") return [];

  return Object.entries(prFilters)
    .filter(
      ([_, f]) =>
        f?.value !== undefined && f?.value !== null && f?.value !== "",
    )
    .map(([id, { value, matchMode }]) => {
      const result = { id, value };
      if (matchMode) result.matchMode = matchMode;
      return result;
    });
}
