/**
 * Преобразует формат API (columns/rows/meta) в формат таблицы (value/flat columns)
 * @param {Object} source - Исходный ответ сервера
 * @returns {Object} Преобразованные данные
 */
function transform(source) {
  // 1. Преобразуем колонки: id→field, title→header, оставляем sortable
  const columns = (source.columns || []).map((col) => ({
    field: col.id,
    header: col.title || col.id,
    sortable: !!col.sortable,
    ...col.props,
  }));

  // 2. Преобразуем строки: из { values: {...} } в плоские объекты
  const value = (source.rows || []).map((row) => ({
    ...row.values,
    // Опционально: сохраняем ID строки, если он есть и нужен
    ...(row.id && { _rowId: row.id }),
  }));

  // 3. Преобразуем направление сортировки: asc→1, desc→-1
  const sortOrder = source.meta?.direction === "desc" ? -1 : 1;

  // 4. Формируем итоговый объект
  return {
    value,
    columns,
    filters: source.filters,
    totalRecords: source.meta?.total_count ?? value.length,
    rows: source.meta?.limit ?? value.length,
    first: source.meta?.first ?? 0,
    sortField: source.meta?.sort || null,
    sortOrder,
  };
}
