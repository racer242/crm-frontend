/**
 * Преобразует ответ API /api/receipts/[id]/products в формат для DataTable
 * @param {Object} data - Исходный ответ сервера (columns, rows, filters, meta)
 * @returns {Object} Преобразованные данные для State (value, columns, totalRecords)
 */
function transform(data) {
  if (!data || typeof data !== "object") return data;

  // Трансформация колонок из формата API в формат DataTable
  // API: { id, title, type, sortable, props } → DataTable: { field, header, ...props }
  const transformedColumns = (data.columns || []).map((col) => ({
    field: col.id,
    header: col.title,
    sortable: col.sortable,
    ...col.props,
  }));

  // Преобразуем строки: из { id, values: {...} } в плоские объекты
  const value = (data.rows || []).map((row) => ({
    ...row.values,
    ...(row.id && { _rowId: row.id }),
  }));

  return {
    value,
    columns: transformedColumns,
    totalRecords: data.meta?.total_count || 0,
    first: data.meta?.first || 0,
    rows: data.meta?.limit || 50,
    sortField: data.meta?.sort || "",
    sortOrder: data.meta?.direction === "desc" ? -1 : 1,
    filters: data.filters || [],
    search: data.search || "",
  };
}
