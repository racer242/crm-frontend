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
 * receipts («Просмотр чеков» — основная страница «Чеки», с 09.10.26 переведена
 * из эксперимента receipts-v2): алиасы колонок, которые
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
const RECEIPTS_SORTABLE_COLUMNS = [
  "registration_date",
  "purchase_date",
  "participant_code",
  "email",
  "total_amount",
  "retail_chain",
  "fns_status",
  "moderation_status",
];

function isReceiptsSortable(column) {
  return RECEIPTS_SORTABLE_COLUMNS.indexOf(String(column || "")) >= 0;
}

/**
 * users для кампании avito_to_the_top (config_patch → авито-версии адаптеров
 * stats.users.execute.request.avito.js / stats.users.report.response.avito.js):
 * алиасы колонок, которые умеет сортировать SQL отчёта кампании (маппинг
 * .prompts/avito_req.md — avito_id/telegram_id из bot_users, category_name/
 * league_name сортируются по алиасу выдачи). Единый белый список для двух
 * авито-адаптеров; эталонный список сохранён целиком (колонки, отсутствующие
 * в метаданных кампании, просто не показываются).
 */
const USERS_AVITO_SORTABLE_COLUMNS = [
  "user_id",
  "email",
  "status",
  "participant_status",
  "balance",
  "total_earned",
  "mailing",
  "created_at",
  "avito_id",
  "telegram_id",
  "category_name",
  "league_name",
];

function isUsersAvitoSortable(column) {
  return USERS_AVITO_SORTABLE_COLUMNS.indexOf(String(column || "")) >= 0;
}

/**
 * users для кампании avito_to_the_top: сентинел-код пункта «Не назначено» в
 * dropdown-фильтрах «Категория»/«Лига». Пункт в options добавляет
 * dictionaries.response.avito.js (статические api-маршруты dict_categories /
 * dict_leagues кампании в config/camps/avito_to_the_top/patch.json),
 * SQL-фрагмент собирает stats.users.execute.request.avito.js: выбор пункта →
 * AND (col IS NULL OR col = '') — участники без назначенного значения.
 * Значение выбрано так, чтобы не совпасть с реальными кодами справочников,
 * и переживает URL-синхронизацию (?category=__none__).
 */
const AVITO_UNASSIGNED_CODE = "__none__";

/**
 * users для кампании avito_to_the_top: обобщённые пункты пар лиг
 * «*ML / *ML_big» в dropdown-фильтре «Лига» (обновление 11.11.26). У каждой
 * лиги с кодом, заканчивающимся на _ML, есть расширенная пара с кодом
 * _ML_big (Cargo/Evacuation/Passenger); логика рейтинга считает их одной
 * лигой (общие агрегации — место в рейтинге, позиция относительно участников),
 * поэтому в справочнике лиг dictionaries.response.avito.js для каждой такой
 * пары после _big вставляется обобщённый пункт с лейблом «<имя base> (все)» и
 * псевдо-кодом pair:<base>. stats.users.execute.request.avito.js разворачивает
 * его синтаксически в IN ('base', 'base_big') — как и сентинел выше, правило
 * самосогласовано между двумя адаптерами через _shared.js. Префикс pair: не
 * встречается в реальных кодах справочников и переживает URL-синхронизацию
 * (?league=pair:Passenger_ML); правило привязано к суффиксам кодов, поэтому в
 * справочниках без пар (например категорий) инъекций не бывает.
 */
const AVITO_ML_PAIR_SUFFIX = "_big";
const AVITO_ML_PAIR_PREFIX = "pair:";

/**
 * users для кампании avito_to_the_top, запрос «Задания участника» (query_id
 * user-avito-tasks, .prompts/user-page-sql2_1.md): алиасы колонок, которые
 * умеет сортировать SQL запроса (маппинг сортировки из дока — 16 алиасов,
 * description → null: длинный текст без индекса не сортируется), единый
 * белый список для двух адаптеров:
 *  - stats.users.tasks.execute.request.avito.js: ORDER_BY принимает только
 *    алиас из списка (чужое значение → дефолт assigned_at + DESC);
 *  - stats.users.tasks.report.response.avito.js: колонки метаданных получают
 *    sortable по этому же списку — DataTable не предлагает сортировку,
 *    которую SQL не применит.
 */
const USERS_AVITO_TASKS_SORTABLE_COLUMNS = [
  "task_id",
  "task_code",
  "title",
  "start_date",
  "finish_date",
  "is_continuous",
  "league_code",
  "segment",
  "status",
  "display_status",
  "accrued_at",
  "avito_id",
  "telegram_id",
  "assigned_at",
  "updated_at",
];

function isUsersAvitoTasksSortable(column) {
  return USERS_AVITO_TASKS_SORTABLE_COLUMNS.indexOf(String(column || "")) >= 0;
}
