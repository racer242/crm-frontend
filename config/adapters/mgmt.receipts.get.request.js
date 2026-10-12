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
    filters: base.filters,
  };

  // 2. Пагинация: first (индекс) → page (номер страницы)
  const limit = merged.rows ?? 10;
  const first = merged.first ?? 0;
  const page = limit ? Math.floor(first / limit) : 0;

  // 3. Сортировка: 1/-1 → 'asc'/'desc'
  const sort = merged.sortField || null;
  const direction = sort ? (merged.sortOrder === -1 ? "desc" : "asc") : null;

  // 4. Фильтры: объект → массив
  const filters = transformFilters(merged.filters);

  // 5. Итоговый объект (спецификация API: first, limit, sort, direction, search, filters)
  let a = {
    first,
    limit,
    sort,
    direction,
    search: merged.search || "",
    filters,
  };

  return a;
}

/**
 * Преобразует фильтры PrimeReact → формат API
 */
function transformFilters(prFilters) {
  // The URL: the SSR dataFeed resolves {$location.params.filters} into a raw
  // JSON string (getServerLocation keeps params as strings), so a JSON-array
  // string is parsed here — same hardening as stats.receipts.execute /
  // stats.users.execute request adapters; the client path (array from state)
  // and "everything deselected" ([]) are untouched
  let filters = prFilters;
  if (
    !Array.isArray(filters) &&
    typeof filters === "string" &&
    filters.charAt(0) === "["
  ) {
    try {
      const parsed = JSON.parse(filters);
      filters = Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      filters = [];
    }
  }
  if (!Array.isArray(filters)) return [];

  return filters
    .filter(
      (f) => f?.value !== undefined && f?.value !== null && f?.value !== "",
    )
    .map(({ id, value, matchMode }) => {
      const result = { id, value };
      if (matchMode) result.matchMode = matchMode;
      return result;
    });
}
