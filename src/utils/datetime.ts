/**
 * Помощники диапазонов дат для макросов статистики
 * ({$todayStart}, {$todayEnd}, {$currentWeekStart}, {$currentWeekEnd}).
 *
 * Все функции возвращают ISO-строки (UTC), вычисленные из ЛОКАЛЬНОГО времени
 * среды, где разрешается макрос (браузер администратора): настенные границы
 * «сегодня» / «текущая неделя» сохраняются как абсолютные мгновения и
 * корректно интерпретируются сервером независимо от его таймзоны.
 *
 * Неделя начинается с понедельника (русская локаль).
 * Конец дня/недели — 23:59:59.999.
 */

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

/** Сегодня 00:00:00.000 */
export function getTodayStartISO(now: Date = new Date()): string {
  return startOfDay(now).toISOString();
}

/** Сегодня 23:59:59.999 */
export function getTodayEndISO(now: Date = new Date()): string {
  return endOfDay(now).toISOString();
}

/** Понедельник текущей недели 00:00:00.000 */
export function getCurrentWeekStartISO(now: Date = new Date()): string {
  const d = startOfDay(now);
  const day = d.getDay(); // 0 = воскресенье … 6 = суббота
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day));
  return d.toISOString();
}

/** Воскресенье текущей недели 23:59:59.999 */
export function getCurrentWeekEndISO(now: Date = new Date()): string {
  const d = endOfDay(now);
  const day = d.getDay();
  d.setDate(d.getDate() + (day === 0 ? 0 : 7 - day));
  return d.toISOString();
}