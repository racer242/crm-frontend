/**
 * Адаптер запроса для выполнения статистического отчёта (POST ops/stats/reports/[id]/execute)
 * Преобразует параметры таблицы результата (first/rows) в query-параметры API
 * (page/limit, §5.6 ТЗ). Маршрут помечен query: true — значения уходят в URL, а не в тело.
 *
 * Период (startDate/endDate) конвертируется в настенное время пояса сервера
 * API (env BITRIX_API_TIMEZONE, по умолчанию Europe/Moscow) и уходит в
 * replacements строковыми литералами SQL — в одинарных кавычках
 * ("'YYYY-MM-DD HH:mm:ss'"):
 * { replacements: { "startDate": "'2026-10-08 00:00:00'", ... } }.
 * Сервер подставляет значения в текст SQL как есть и кавычки сам не
 * добавляет (обновление 08.10.26), поэтому кавычки ставит фронтенд
 * (sqlString из _shared.js); значения должны быть в поясе хранения данных
 * сервера. Пустые даты в replacements не включаются; замены макросов
 * {{startDate}}/{{endDate}} выполняет сервер API. Пары из поля
 * «Подстановки» подставляются как введены — строковые значения указываются
 * в кавычках пользователем.
 *
 * replacementsText («Подстановки» на странице запроса, JSON-объект) добавляется
 * в replacements поверх дат: каждый ключ становится макросом {{KEY}}. Пустое
 * или незаданное поле игнорируется; некорректный JSON прерывает запрос.
 */
function parseReplacements(text) {
  if (text === undefined || text === null || String(text).trim() === "") {
    return {};
  }
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (e) {
    throw new Error("Некорректный JSON в поле «Подстановки»");
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(
      "Подстановки должны быть JSON-объектом {\"NAME\": \"Значение\"}",
    );
  }
  return parsed;
}

function transform(params = {}) {
  const { event = {}, ...base } = params;

  const merged = {
    first: event.first !== undefined ? event.first : base.first,
    rows: event.rows !== undefined ? event.rows : base.rows,
  };

  const first = Number(merged.first) || 0;
  const rows = Number(merged.rows) || 20;
  const page = Math.floor(first / rows) + 1;

  const result = {
    page: page,
    limit: Math.min(rows, 100),
  };

  // Даты конвертируются в пояс сервера API и отправляются закавыченными
  // (сервер подставляет значения в SQL текстом, кавычки не добавляет);
  // пустые → null → ключ не включается. Подстановки из поля «Подстановки»
  // (JSON) добавляются поверх дат — при конфликте ключей значение из JSON
  // побеждает значение календаря.
  const extra = parseReplacements(base.replacementsText);

  if (
    base.startDate !== undefined ||
    base.endDate !== undefined ||
    Object.keys(extra).length > 0
  ) {
    result.replacements = {};
    const start = toZonedDateTime(base.startDate, getApiTimezone());
    const end = toZonedDateTime(base.endDate, getApiTimezone());
    if (start) {
      result.replacements.startDate = sqlString(start);
    }
    if (end) {
      result.replacements.endDate = sqlString(end);
    }
    Object.assign(result.replacements, extra);
  }

  return result;
}
