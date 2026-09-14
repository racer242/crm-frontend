/**
 * Адаптер для списка актов участника (ops/users/[user_id]/acts)
 * Преобразует ответ API инстанса ({status:"ok", data:{items, pagination}})
 * в формат lazy-таблицы {value, columns, totalRecords, first, rows}
 */
function transform(source) {
  const payload = source.status === "ok" ? source.data : source;

  // Словарь статусов акта (русские лейблы + severity для Tag)
  const statusLabels = {
    pending: "Ожидает",
    approved: "Одобрен",
    delivered: "Доставлен",
    rejected: "Отклонен",
  };
  const statusSeverities = {
    pending: "warning",
    approved: "success",
    delivered: "info",
    rejected: "danger",
  };

  const value = (payload.items || []).map((act) => ({
    ...act,
    id: act.act_id || "",
    status_label: statusLabels[act.status] || act.status || "",
    status_severity: statusSeverities[act.status] || "secondary",
    created_at: act.created_at ? convertDateValue(act.created_at) : "",
  }));

  const columns = [
    { field: "id", header: "ID", width: "12rem" },
    { field: "prize_id", header: "Приз" },
    { field: "status_label", header: "Статус", width: "10rem" },
    { field: "created_at", header: "Создан", width: "12rem" },
  ];

  return {
    value,
    columns,
    totalRecords: payload.pagination?.total_items || 0,
    first:
      ((payload.pagination?.page || 1) - 1) * (payload.pagination?.limit || 20),
    rows: payload.pagination?.limit || 20,
  };
}