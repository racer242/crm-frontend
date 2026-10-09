/**
 * Общие функции для адаптеров (request и response)
 * Подгружаются автоматически через DataAdapterEngine
 *
 * ВАЖНО: функции форматирования дат для отображения удалены — адаптеры
 * передают даты сырыми ISO, а форматирование в часовом поясе зрителя
 * выполняется на клиенте (DataTable type:datetime, Text props.format).
 * Исключение — request-адаптеры статистики: даты подстановки (replacements)
 * конвертируются в пояс сервера API (toZonedDateTime) и отправляются
 * закавыченными (sqlString), т.к. сервер подставляет значения в текст SQL
 * как есть (без кавычек) и они должны быть в поясе хранения данных.
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

/**
 * Форматирует сумму, уже выраженную в рублях («590.30» → «590,30 ₽»).
 * Канал CRM-управления (mgmt): деньги приходят рублями с копейками (§2 ТЗ),
 * делить на 100 не нужно — в отличие от formatSum (промо-инстанс, копейки).
 */
function formatRubles(value) {
  if (value === undefined || value === null || value === "") return "—";
  const num = Number(value);
  if (isNaN(num)) return String(value);
  return (
    num
      .toLocaleString("ru-RU", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
      .replace(/\u00A0/g, " ") + " ₽"
  );
}

/**
 * Пояс сервера API промо-инстанса для дат подстановки статистических
 * отчётов (replacements.startDate/endDate). Настраивается переменной
 * окружения BITRIX_API_TIMEZONE, по умолчанию — Europe/Moscow.
 */
function getApiTimezone() {
  try {
    return (
      (typeof process !== "undefined" &&
        process.env &&
        process.env.BITRIX_API_TIMEZONE) ||
      "Europe/Moscow"
    );
  } catch (e) {
    return "Europe/Moscow";
  }
}

/**
 * Конвертирует дату (Date | ISO-строка с Z/offset | timestamp) в настенное
 * время заданного пояса в формате "YYYY-MM-DD HH:mm:ss" — для replacements
 * статистических отчётов: значения подставляются в текст SQL как есть,
 * поэтому должны быть в поясе хранения данных сервера (см. getApiTimezone);
 * перед заменой макроса строка оборачивается в кавычки (sqlString).
 *
 * Пустое значение → null (адаптер не включает ключ в replacements).
 * Невалидная дата → возвращается как есть (не ломаем запрос).
 * Невалидный пояс → fallback на Europe/Moscow (Intl бросает RangeError).
 */
function toZonedDateTime(value, timeZone) {
  if (value === undefined || value === null || value === "") return null;

  const date = value instanceof Date ? value : new Date(value);
  if (isNaN(date.getTime())) return value;

  const options = {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    // h23 — чтобы полночь была "00", а не "24" (hour12: false недостаточно)
    hourCycle: "h23",
  };

  let parts;
  try {
    parts = new Intl.DateTimeFormat("en-CA", {
      ...options,
      timeZone: timeZone || getApiTimezone(),
    }).formatToParts(date);
  } catch (e) {
    // Невалидная таймзона (RangeError) — откатываемся на дефолт
    parts = new Intl.DateTimeFormat("en-CA", {
      ...options,
      timeZone: "Europe/Moscow",
    }).formatToParts(date);
  }

  const get = (type) => {
    const p = parts.find((x) => x.type === type);
    return p ? p.value : "";
  };

  return (
    get("year") +
    "-" +
    get("month") +
    "-" +
    get("day") +
    " " +
    get("hour") +
    ":" +
    get("minute") +
    ":" +
    get("second")
  );
}

/**
 * Оборачивает значение в одинарные кавычки для подстановки в SQL текстом.
 * Сервер подставляет значения макросов (replacements) в SQL как есть и
 * кавычки сам не добавляет (обновление 08.10.26), поэтому строковые значения
 * — даты startDate/endDate — фронтенд отправляет уже закавыченными.
 * Апострофы внутри значения удваиваются (' → '').
 */
function sqlString(value) {
  return "'" + String(value).replace(/'/g, "''") + "'";
}

/**
 * users-v2 (экспериментальный список участников): алиасы колонок, которые
 * умеет сортировать SQL отчёта — единый белый список для двух адаптеров:
 *  - stats.users.execute.request.js: ORDER_BY принимает только алиас из
 *    списка (чужое значение → дефолт created_at + DESC);
 *  - stats.users.report.response.js: колонки вне списка получают
 *    sortable: false — DataTable не предлагает сортировку, которую SQL
 *    не применит (например full_name — вычисляемое выражение CONCAT(...),
 *    participant_code — исключён по решению).
 */
const USERS_V2_SORTABLE_COLUMNS = [
  "user_id",
  "email",
  "status",
  "participant_status",
  "balance",
  "total_earned",
  "mailing",
  "created_at",
];

function isUsersV2Sortable(column) {
  return USERS_V2_SORTABLE_COLUMNS.indexOf(String(column || "")) >= 0;
}

/**
 * receipts-v2 («Просмотр чеков», эксперимент): алиасы колонок, которые
 * умеет сортировать SQL отчёта — сортировочная карта §4 спеки
 * .prompts/new_req_receipts.md (null = не сортируется), единый белый список
 * для двух адаптеров:
 *  - stats.receipts.execute.request.js: ORDER_BY принимает только алиас из
 *    списка (чужое значение → дефолт registration_date + DESC);
 *  - stats.receipts.report.response.js: колонки вне списка получают
 *    sortable: false — DataTable не предлагает сортировку, которую SQL
 *    не применит (full_name — вычисляемое выражение CONCAT_WS(...),
 *    promo_products_count / promo_products_amount — агрегаты подзапроса).
 */
const RECEIPTS_V2_SORTABLE_COLUMNS = [
  "registration_date",
  "purchase_date",
  "participant_code",
  "email",
  "total_amount",
  "retail_chain",
  "fns_status",
  "moderation_status",
];

function isReceiptsV2Sortable(column) {
  return RECEIPTS_V2_SORTABLE_COLUMNS.indexOf(String(column || "")) >= 0;
}
