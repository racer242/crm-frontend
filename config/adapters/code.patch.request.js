/**
 * Преобразует данные перед отправкой PATCH запроса к /api/codes/[id]
 * @param {Object} data - Данные формы (registration_date, code)
 * @returns {Object} Данные для отправки на сервер с ISO датой
 */
function transform(data) {
  if (!data || typeof data !== "object") return data;

  // Парсинг даты из DD.MM.YYYY HH:mm в ISO формат
  const parseDateValue = (value) => {
    if (!value) return null;
    if (value instanceof Date) return value.toISOString();

    const match = String(value).match(
      /^(\d{2})\.(\d{2})\.(\d{4})\s+(\d{2}):(\d{2})$/,
    );
    if (match) {
      const [, day, month, year, hours, minutes] = match;
      const date = new Date(year, month - 1, day, hours, minutes);
      return isNaN(date.getTime()) ? null : date.toISOString();
    }

    return value;
  };

  return {
    code: data.code,
    registration_date: parseDateValue(data.registration_date),
  };
}
