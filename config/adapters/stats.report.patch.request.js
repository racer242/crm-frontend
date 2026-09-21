/**
 * Адаптер запроса для сохранения статистического отчёта (PATCH ops/stats/reports/[id])
 * Собирает тело запроса из состояния страницы; fieldsText (JSON из textarea)
 * парсится в массив fields — при ошибке парсинга запрос падает с сообщением.
 *
 * Пустое fieldsText (пусто/пробелы) → body.fields = null:
 * API трактует null как «выводить все доступные поля запроса».
 * Пустой массив [] означал бы «не выводить ни одного поля».
 */
function transform(params = {}) {
  const body = {
    title: params.title,
    sql: params.sql,
    is_active: params.is_active === true || params.is_active === "true",
  };

  if (params.fieldsText !== undefined) {
    const text = String(params.fieldsText || "").trim();
    if (text === "") {
      // Пустая textarea = «все доступные поля» (null), а не пустой список
      body.fields = null;
    } else {
      let fields;
      try {
        fields = JSON.parse(text);
      } catch (e) {
        throw new Error("Некорректный JSON в поле «Поля выдачи»");
      }
      if (!Array.isArray(fields)) {
        throw new Error("Поля выдачи должны быть JSON-массивом");
      }
      body.fields = fields;
    }
  }

  return body;
}

