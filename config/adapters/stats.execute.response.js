/**
 * Адаптер ответа выполнения статистического отчёта (POST ops/stats/reports/[id]/execute, format=json)
 * {items, pagination} → состояние таблицы результата (value/totalRecords/first/rows).
 * Колонки таблицы берутся из state.reportData._columns (строятся из fields[] при загрузке отчёта).
 */
function transform(source) {
  const payload = source.status === "ok" ? source.data : source;

  const page = payload.pagination?.page || 1;
  const limit = payload.pagination?.limit || 20;

  return {
    value: payload.items || [],
    totalRecords: payload.pagination?.total_items || 0,
    first: (page - 1) * limit,
    rows: limit,
  };
}
