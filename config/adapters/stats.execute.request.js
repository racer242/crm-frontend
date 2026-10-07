/**
 * Адаптер запроса для выполнения статистического отчёта (POST ops/stats/reports/[id]/execute)
 * Преобразует параметры таблицы результата (first/rows) в query-параметры API
 * (page/limit, §5.6 ТЗ). Маршрут помечен query: true — значения уходят в URL, а не в тело.
 *
 * Период (startDate/endDate) конвертируется в настенное время пояса сервера
 * API (env BITRIX_API_TIMEZONE, по умолчанию Europe/Moscow) и уходит в
 * replacements в формате "YYYY-MM-DD HH:mm:ss":
 * { replacements: { "startDate": "...", "endDate": "..." } }.
 * Значения подставляются в SQL связанными параметрами (не текстом), поэтому
 * должны быть в поясе хранения данных сервера. Пустые даты в replacements
 * не включаются; замены макросов {{startDate}}/{{endDate}} выполняет сервер API.
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

  // Даты конвертируются в пояс сервера API; пустые → null → ключ не включается.
  // Подстановки из поля «Подстановки» (JSON) добавляются поверх дат — при
  // конфликте ключей значение из JSON побеждает значение календаря.
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
      result.replacements.startDate = start;
    }
    if (end) {
      result.replacements.endDate = end;
    }
    Object.assign(result.replacements, extra);
  }

  return result;
}
