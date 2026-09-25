/**
 * Адаптер запроса для сохранения статистического отчёта (PATCH ops/stats/reports/[id])
 * Собирает тело запроса из состояния страницы; fieldsText (JSON из textarea)
 * парсится в массив fields — при ошибке парсинга запрос падает с сообщением.
 *
 * Пустое fieldsText (пусто/пробелы) ИЛИ распарсенный пустой массив [] —
 * ключ fields в тело запроса вообще не включается: API трактует отсутствие
 * поля как «выводить все доступные поля запроса».
 */
function transform(params = {}) {
  const body = {
    title: params.title,
    sql: params.sql,
    is_active: params.is_active === true || params.is_active === "true",
  };

  if (params.fieldsText !== undefined) {
    let fields;
    const text = String(params.fieldsText || "").trim();
    if (text !== "") {
      try {
        fields = JSON.parse(text);
      } catch (e) {
        throw new Error("Некорректный JSON в поле «Поля выдачи»");
      }
      if (!Array.isArray(fields)) {
        throw new Error("Поля выдачи должны быть JSON-массивом");
      }
    }
    if (fields && fields.length > 0) body.fields = fields;
    else body.fields = "";
  }

  return body;
}
