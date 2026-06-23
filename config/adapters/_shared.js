/**
 * Общие функции для response-адаптеров
 * Подгружаются автоматически через DataAdapterEngine
 */

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
 * Находит ID колонок с типом 'datetime' и преобразует соответствующие поля в значениях
 * Список datetime-колонок вычисляется один раз для оптимальной производительности
 * @param {Object} values - Объект значений (row.values)
 * @param {Array} columns - Массив колонок (source.columns)
 * @returns {Object} Объект с преобразованными датами
 */
function convertDateColumns(values, columns) {
  const dateColumnIds = new Set(
    (columns || [])
      .filter((col) => col.type === "datetime")
      .map((col) => col.id),
  );

  const result = { ...values };
  dateColumnIds.forEach((key) => {
    if (result[key] !== undefined) {
      result[key] = convertDateValue(result[key]);
    }
  });

  return result;
}
