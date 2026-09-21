/**
 * Преобразует формат API (columns/rows/meta) в формат таблицы (value/flat columns)
 * @param {Object} source - Исходный ответ сервера
 * @returns {Object} Преобразованные данные
 */
function transform(source) {
  // 1. Преобразуем колонки: id→field, title→header, оставляем sortable
  //    UUID-поля (§5.1 ТЗ: receipt_id, user_id) помечаем dataType:"uuid" —
  //    ячейки выводятся сокращённо (01a0...afef) на клиенте.
  //    Колонка user_id в таблицу не выводится — вместо неё кастомная
  //    кнопка-иконка «Участник» (переход на карточку участника).
  const UUID_FIELDS = ["receipt_id", "user_id"];
  const columns = (source.columns || [])
    .filter((col) => col.id !== "user_id")
    .map((col) => {
      const isUuid =
        UUID_FIELDS.includes(col.id) ||
        (col.type && String(col.type).toLowerCase().includes("uuid"));
      return {
        field: col.id,
        header: col.title || col.id,
        sortable: !!col.sortable,
        // Даты форматируются на клиенте (DataTableComponent: dataType === "date")
        dataType: isUuid
          ? "uuid"
          : col.type === "datetime" || col.type === "date"
            ? "date"
            : undefined,
        ...col.props,
      };
    });

  // 2. Преобразуем строки: из { values: {...} } в плоские объекты
  //    Даты остаются сырыми ISO — форматирование выполняется на клиенте
  const value = (source.rows || []).map((row) => ({
    ...(row.values || {}),
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
    search: source.search || null,
  };
}
