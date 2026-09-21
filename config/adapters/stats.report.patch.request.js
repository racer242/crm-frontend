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
    const text = String(params.fieldsText || "").trim();
    if (text !== "") {
      let fields;
      try {
        fields = JSON.parse(text);
      } catch (e) {
        throw new Error("Некорректный JSON в поле «Поля выдачи»");
      }
      if (!Array.isArray(fields)) {
        throw new Error("Поля выдачи должны быть JSON-массивом");
      }
      if (fields.length > 0) {
        body.fields = fields;
      }
      // fields.length === 0 → ключ не добавляем («все доступные поля»)
    }
    // text === "" → ключ не добавляем («все доступные поля»)
  }

  return body;
}


