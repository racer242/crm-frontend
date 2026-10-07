/**
 * Преобразует ответ API /api/receipts/[id]/products в формат для DataTable
 * @param {Object} data - Исходный ответ сервера (columns, rows, filters, meta)
 * @returns {Object} Преобразованные данные для State (value, columns, totalRecords)
 */
/**
 * Подставляет читаемые названия вместо кодов: для каждого поля *_label
 * (status_label, ...) переписывает значение базового кодового поля, если оно
 * есть в строке и лейбл непустой; дополнительно обрабатывает историческую пару
 * status_label → product_status. Сами *_label остаются в строке; колонки
 * продолжают ссылаться на кодовые поля — сортировка и фильтры работают по кодам.
 * @param {Object} values - Плоские значения строки
 * @returns {Object} Те же значения с кодами, заменёнными на лейблы
 */
function applyLabels(values) {
  Object.keys(values).forEach((key) => {
    if (key.endsWith("_label")) {
      const base = key.slice(0, -"_label".length);
      if (base in values && hasText(values[key])) {
        values[base] = values[key];
      }
    }
  });
  if (hasText(values.status_label) && "product_status" in values) {
    values.product_status = values.status_label;
  }
  return values;
}

/**
 * Непустая строка/значение (не undefined, не null, не "").
 * @param {*} value - Проверяемое значение
 * @returns {boolean} true, если значение непустое
 */
function hasText(value) {
  return value !== undefined && value !== null && value !== "";
}

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

  // Преобразуем строки: из { id, values: {...} } в плоские объекты.
  //    Кодовый статус продукта (product_status/status) заменяется читаемым
  //    названием из status_label — см. applyLabels
  const value = (data.rows || []).map((row) => {
    const values = applyLabels({ ...row.values });
    return {
      ...values,
      ...(row.id && { _rowId: row.id }),
      // Добавляем кастомные поля для иконки is_promo (Prime Icons + severity)
      is_promo_icon: values.is_promo ? "pi pi-check-circle" : "",
      is_promo_severity: values.is_promo ? "success" : "secondary",
    };
  });

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
