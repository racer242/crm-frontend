/**
 * Адаптер ответа для списка статистических отчётов (ops/stats/reports)
 */
function transform(source) {
  const payload = source.status === "ok" ? source.data : source;

  const value = (payload.items || []).map((report) => ({
    ...report,
    is_active_label: report.is_active ? "Активен" : "Не активен",
    is_active_severity: report.is_active ? "success" : "secondary",
  }));

  const columns = [
    { field: "title", header: "Название" },
    { field: "is_active_label", header: "Статус", width: "9rem" },
  ];

  return {
    value,
    columns,
    totalRecords: payload.pagination?.total_items || 0,
    first:
      ((payload.pagination?.page || 1) - 1) * (payload.pagination?.limit || 25),
    rows: payload.pagination?.limit || 25,
  };
}
