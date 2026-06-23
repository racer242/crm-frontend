/**
 * Преобразует значение даты из ISO формата в локальный формат DD.MM.YYYY HH:mm
 * @param {*} value - Значение для преобразования
 * @returns {*} Преобразованное значение или оригинал
 */
function convertDateValue(value) {
  if (!value) return value;

  const date = new Date(value);
  if (isNaN(date.getTime())) return value;

  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${day}.${month}.${year} ${hours}:${minutes}`;
}

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

  // 2. Находим ID колонок с типом 'datetime' (вычисляем один раз)
  const dateColumnIds = new Set(
    (source.columns || [])
      .filter((col) => col.type === "datetime")
      .map((col) => col.id),
  );

  // 3. Преобразуем строки: из { values: {...} } в плоские объекты
  const value = (source.rows || []).map((row) => {
    const flatValues = { ...row.values };

    // Преобразуем только поля, соответствующие datetime-колонкам
    dateColumnIds.forEach((key) => {
      if (flatValues[key] !== undefined) {
        flatValues[key] = convertDateValue(flatValues[key]);
      }
    });

    return {
      ...flatValues,
      // Опционально: сохраняем ID строки, если он есть и нужен
      ...(row.id && { _rowId: row.id }),
    };
  });

  // 4. Преобразуем направление сортировки: asc→1, desc→-1
  const sortOrder = source.meta?.direction === "desc" ? -1 : 1;

  // 5. Формируем итоговый объект
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
