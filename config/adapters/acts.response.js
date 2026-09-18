/**
 * Адаптер для общего списка актов (ops/acts)
 * Преобразует ответ API инстанса ({status:"ok", data:{items, pagination}})
 * в формат lazy-таблицы {value, columns, totalRecords, first, rows}
 */
function transform(source) {
  const payload = source.status === "ok" ? source.data : source;

  // Словарь статусов акта (русские лейблы + severity для Tag).
  // В API статусы приходят в верхнем регистре (PENDING, APPROVED, ...) —
  // ключи словаря в нижнем регистре, нормализация ниже.
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

  const value = (payload.items || []).map((act) => {
    const statusKey = String(act.status || "").toLowerCase();
    return {
      ...act,
      id: act.act_id || "",
      status_label: statusLabels[statusKey] || act.status || "",
      status_severity: statusSeverities[statusKey] || "secondary",
    };
  });

  const columns = [
    { field: "id", header: "ID", width: "12rem" },
    { field: "user_id", header: "Участник" },
    { field: "prize_id", header: "Приз" },
    { field: "status_label", header: "Статус", width: "10rem" },
    { field: "created_at", header: "Дата создания", width: "12rem", dataType: "date" },
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