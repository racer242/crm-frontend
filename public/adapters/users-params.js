/**
 * Трансформирует параметры PrimeReact DataTable в формат API запроса
 * @param {Object} params - Объект с data и event
 * @param {Object} params.data - Текущее состояние таблицы
 * @param {Object} params.event - Событие с актуальными изменениями
 * @returns {Object} Параметры для GET-запроса к API
 */
function transformToApiParams({ data = {}, event = {} }) {
  // 1. Мердж параметров: event имеет приоритет, но только для определённых значений
  const merged = {
    search: event.search !== undefined ? event.search : data.search,
    filters: event.filters !== undefined ? event.filters : data.filters,
    first: event.first !== undefined ? event.first : data.first,
    sortField: event.sortField !== undefined ? event.sortField : data.sortField,
    sortOrder: event.sortOrder !== undefined ? event.sortOrder : data.sortOrder,
    rows: event.rows !== undefined ? event.rows : data.rows,
  };

  // 2. Пагинация: first (индекс записи) → page (номер страницы)
  const limit = merged.rows ?? 50;
  const first = merged.first ?? 0;
  const page = limit ? Math.floor(first / limit) : 0;

  // 3. Сортировка: sortOrder (1/-1) → direction ('asc'/'desc')
  const sort = merged.sortField || null;
  const direction = sort ? (merged.sortOrder === -1 ? "desc" : "asc") : null;

  // 4. Фильтры: трансформация из формата PrimeReact в формат API
  const filters = transformFilters(merged.filters);

  // 5. Формируем итоговый объект (исключаем null/undefined для чистоты запроса)
  return {
    page,
    limit: limit || null, // null = без лимита
    sort,
    direction,
    search: merged.search || "",
    filters,
  };
}

/**
 * Трансформирует фильтры из формата PrimeReact в формат API
 *
 * PrimeReact: { fieldName: { value, matchMode }, ... }
 * API:        [{ id: fieldName, value, matchMode }, ...]
 *
 * @param {Object} prFilters - Фильтры из PrimeReact
 * @returns {Array} Массив фильтров для API
 */
function transformFilters(prFilters) {
  if (!prFilters || typeof prFilters !== "object") {
    return [];
  }

  return Object.entries(prFilters)
    .filter(
      ([_, filter]) =>
        filter &&
        filter.value !== undefined &&
        filter.value !== null &&
        filter.value !== "",
    )
    .map(([field, filter]) => {
      const result = { id: field, value: filter.value };
      if (filter.matchMode) {
        result.matchMode = filter.matchMode;
      }
      return result;
    });
}
