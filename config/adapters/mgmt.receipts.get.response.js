/**
 * Преобразует формат API (columns/rows/meta) в формат таблицы (value/flat columns)
 * @param {Object} source - Исходный ответ сервера
 * @returns {Object} Преобразованные данные
 */
/**
 * Подставляет читаемые названия вместо кодов: для каждого поля *_label
 * (fns_status_label, status_label, ...) переписывает значение базового кодового
 * поля, если оно есть в строке и лейбл непустой; дополнительно обрабатывает
 * историческую пару status_label → moderation_status. Сами *_label остаются
 * в строке; колонки продолжают ссылаться на кодовые поля — сортировка
 * и фильтры работают по кодам.
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
  if (hasText(values.status_label) && "moderation_status" in values) {
    values.moderation_status = values.status_label;
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
  //    Даты остаются сырыми ISO — форматирование выполняется на клиенте.
  //    Кодовые статусы (fns_status, status/moderation_status) заменяются
  //    читаемыми названиями из *_label — см. applyLabels
  const value = (source.rows || []).map((row) => {
    const values = applyLabels({ ...(row.values || {}) });
    return {
      ...values,
      // Опционально: сохраняем ID строки, если он есть и нужен
      ...(row.id && { _rowId: row.id }),
    };
  });

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
