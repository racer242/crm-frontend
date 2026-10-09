/**
 * Адаптер запроса выгрузки отчёта в xlsx (POST ops/stats/reports/[id]/export).
 *
 * §5.6 ТЗ: format передаётся в теле запроса; page/limit для xlsx не используются
 * (выгрузка — «файл целиком, без ограничения по строкам»).
 *
 * Период (startDate/endDate) конвертируется в настенное время пояса сервера
 * API (env BITRIX_API_TIMEZONE, по умолчанию Europe/Moscow) и уходит в
 * replacements строковыми литералами SQL — в одинарных кавычках
 * ("'YYYY-MM-DD HH:mm:ss'"):
 * { format: "xlsx", replacements: { "startDate": "'2026-10-08 00:00:00'", ... } }.
 * Сервер подставляет значения в текст SQL как есть и кавычки сам не
 * добавляет (обновление 08.10.26), поэтому кавычки ставит фронтенд
 * (sqlString из _shared.js); значения должны быть в поясе хранения данных
 * сервера. Пустые даты в replacements не включаются. Замены макросов
 * {{startDate}}/{{endDate}} выполняет сервер API. Пары из поля
 * «Подстановки» подставляются как введены — строковые значения указываются
 * в кавычках пользователем.
 *
 * replacementsText («Подстановки» на странице запроса, JSON-объект) добавляется
 * в replacements поверх дат: каждый ключ становится макросом {{KEY}}. Пустое
 * или незаданное поле игнорируется; некорректный JSON прерывает выгрузку.
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
  const result = { format: "xlsx" };

  // Подстановки из поля «Подстановки» (JSON) добавляются поверх дат — при
  // конфликте ключей значение из JSON побеждает значение календаря.
  const extra = parseReplacements(params.replacementsText);

  if (params.startDate || params.endDate || Object.keys(extra).length > 0) {
    result.replacements = {};
    const start = toZonedDateTime(params.startDate, getApiTimezone());
    const end = toZonedDateTime(params.endDate, getApiTimezone());
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
