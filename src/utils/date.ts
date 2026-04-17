/**
 * Утилиты для работы с датами
 */

/**
 * Проверка, является ли строка ISO датой (YYYY-MM-DD или YYYY-MM-DDTHH:mm:ss)
 */
export function isIsoDateLike(str: string): boolean {
  return /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2})?$/.test(str);
}

/**
 * Преобразование строки в формат ISO к строке формата dd.mm.yyyy HH:mm:ss
 */
export function isoToCustomFormat(isoStr: string): string {
  const date = new Date(isoStr);
  if (isNaN(date.getTime())) return "";

  const pad = (n: number): string => n.toString().padStart(2, "0");

  const day = pad(date.getDate());
  const month = pad(date.getMonth() + 1);
  const year = date.getFullYear();
  const hour = pad(date.getHours());
  const minute = pad(date.getMinutes());
  const second = pad(date.getSeconds());

  return `${day}.${month}.${year} ${hour}:${minute}:${second}`;
}

/**
 * Утилита для парсинга строки даты в форматах:
 * - dd.mm.yy / dd.mm.yyyy (с временем или без)
 * - dd.mm.yyyy HH:mm
 * - dd.mm.yyyy HH:mm:ss
 */
export function parseDateString(dateStr: string): Date | null {
  if (!dateStr) return null;

  // Формат: dd.mm.yyyy HH:mm:ss или dd.mm.yyyy HH:mm
  const dateTimeMatch = dateStr.match(
    /^(\d{1,2})\.(\d{1,2})\.(\d{4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?$/,
  );
  if (dateTimeMatch) {
    const [, day, month, year, hour, minute, second = "0"] = dateTimeMatch;
    const fullYear = parseInt(year, 10);
    return new Date(
      fullYear,
      parseInt(month, 10) - 1,
      parseInt(day, 10),
      parseInt(hour, 10),
      parseInt(minute, 10),
      parseInt(second, 10),
    );
  }

  // Формат: dd.mm.yy или dd.mm.yyyy (без времени)
  const dateMatch = dateStr.match(/^(\d{1,2})\.(\d{1,2})\.(\d{2,4})$/);
  if (dateMatch) {
    const [, day, month, year] = dateMatch;
    const parsedYear = parseInt(year, 10);

    // Если год двухзначный (меньше 100), считаем что это 20xx
    const fullYear = parsedYear < 100 ? 2000 + parsedYear : parsedYear;

    // Месяцы в JS начинаются с 0
    return new Date(fullYear, parseInt(month, 10) - 1, parseInt(day, 10));
  }

  return null;
}
