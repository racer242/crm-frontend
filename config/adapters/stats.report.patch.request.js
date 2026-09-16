/**
 * Адаптер запроса для сохранения статистического отчёта (PATCH ops/stats/reports/[id])
 * Собирает тело запроса из состояния страницы; fieldsText (JSON из textarea)
 * парсится в массив fields — при ошибке парсинга запрос падает с сообщением
 */
function transform(params = {}) {
  const body = {
    title: params.title,
    sql: params.sql,
    is_active: params.is_active === true || params.is_active === "true",
  };

  if (params.fieldsText !== undefined) {
    let fields;
    try {
      fields = JSON.parse(params.fieldsText || "[]");
    } catch (e) {
      throw new Error("Некорректный JSON в поле «Поля выдачи»");
    }
    if (!Array.isArray(fields)) {
      throw new Error("Поля выдачи должны быть JSON-массивом");
    }
    body.fields = fields;
  }

  return body;
}
