/**
 * Адаптер ответа для деталей статистического отчёта (ops/stats/reports/[id])
 * Готовит состояние страницы отчёта:
 *  - fieldsText  — fields[] в виде форматированного JSON для textarea-редактора
 *  - _columns    — колонки таблицы результата из fields[] (field = name, header = title)
 */
function transform(source) {
  const data = source.status === "ok" ? source.data : source;
  if (!data || typeof data !== "object") return data;

  const fields = Array.isArray(data.fields) ? data.fields : [];

  const fieldsText = JSON.stringify(fields, null, 2);

  const _columns = fields
    .filter((f) => f && f.name)
    .map((f) => ({
      field: f.name,
      header: f.title || f.name,
      dataType:
        f.type === "datetime" || f.type === "date" ? "date" : undefined,
    }));

  return {
    ...data,
    fields,
    fieldsText,
    _columns,
  };
}
