/**
 * Общие функции для response-адаптеров
 * Подгружаются автоматически через DataAdapterEngine
 *
 * ВАЖНО: функции форматирования дат удалены — адаптеры передают даты
 * сырыми ISO, а форматирование в часовом поясе зрителя выполняется
 * на клиенте (DataTable type:datetime, Text props.format).
 */

/**
 * Форматирует сумму из копеек в рубли («1 234,56 ₽»).
 * Все API отдают денежные значения в копейках.
 */
function formatSum(sum) {
  if (sum === undefined || sum === null || sum === "") return "—";
  const value = Number(sum);
  if (isNaN(value)) return String(sum);
  return (
    (value / 100)
      .toLocaleString("ru-RU", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
      // toLocaleString('ru-RU') использует неразрывный пробел (U+00A0) —
      // нормализуем к обычному пробелу для одинакового вывода в Node и браузере
      .replace(/\u00A0/g, " ") + " ₽"
  );
}
