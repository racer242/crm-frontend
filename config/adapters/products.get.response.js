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
  //    Поля c type: 'datetime' в колонках автоматически преобразуются в DD.MM.YYYY HH:mm
  const value = (source.rows || []).map((row) => ({
    ...convertDateColumns(row.values, source.columns),
    // Опционально: сохраняем ID строки, если он есть и нужен
    ...(row.id && { _rowId: row.id }),
    // Добавляем кастомные поля для иконки is_promo (Unicode символы)
    is_promo_icon: row.values.is_promo ? "\u2713" : "\u2717",
    is_promo_className: row.values.is_promo
      ? "text-green-500 text-xl font-bold"
      : "text-gray-400 text-xl font-bold",
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
    search: source.search || null,
  };
}
