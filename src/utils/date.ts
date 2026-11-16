/**
 * Утилиты для работы с датами
 */

/**
 * Проверка, является ли строка ISO датой:
 * YYYY-MM-DD | YYYY-MM-DDTHH:mm:ss | с миллисекундами (.SSS) и зоной (Z или ±HH:MM)
 */
export function isIsoDateLike(str: string): boolean {
  return /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{1,9})?(Z|[+-]\d{2}:?\d{2})?)?$/.test(
    str,
  );
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

/**
 * Форматирование Date в календарную дату 'YYYY-MM-DD' по локальным частям.
 * Контракт period-фильтров: date-only выбор Calendar (у дня нет времени)
 * хранится строкой wall-даты — вне поясов, пояс ОС оператора не влияет
 * на границы периода.
 */
export function formatDateOnly(date: Date): string {
  const pad = (n: number): string => n.toString().padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/**
 * Разбор календарной даты 'YYYY-MM-DD' в локальный Date из частей.
 * В отличие от new Date('YYYY-MM-DD') (парсит такую строку как UTC-полночь —
 * в поясах с отрицательным смещением даёт предыдущий день) части берутся
 * как есть; строка, не являющаяся реальной датой (напр. '2026-02-30'),
 * отбрасывается — проверка обратным форматированием (new Date молча
 * «прокручивает» избыток дней/месяцев).
 */
export function parseDateOnly(str: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(str);
  if (!match) return null;
  const date = new Date(
    parseInt(match[1], 10),
    parseInt(match[2], 10) - 1,
    parseInt(match[3], 10),
  );
  if (isNaN(date.getTime()) || formatDateOnly(date) !== str) return null;
  return date;
}
