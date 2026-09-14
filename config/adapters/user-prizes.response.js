/**
 * Адаптер для списка призов участника (ops/users/[user_id]/prizes)
 * Преобразует ответ API инстанса ({status:"ok", data:{items, pagination}})
 * в формат lazy-таблицы {value, columns, totalRecords, first, rows}
 */
function transform(source) {
  const payload = source.status === "ok" ? source.data : source;

  // Словарь статусов приза (русские лейблы + severity для Tag).
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

  const value = (payload.items || []).map((prize) => {
    const statusKey = String(prize.status || "").toLowerCase();
    return {
      ...prize,
      id: prize.prize_id || "",
      status_label: statusLabels[statusKey] || prize.status || "",
      status_severity: statusSeverities[statusKey] || "secondary",
    };
  });

  const columns = [
    { field: "id", header: "ID", width: "12rem" },
    { field: "title", header: "Название" },
    { field: "price", header: "Стоимость (баллы)", width: "12rem" },
    { field: "status_label", header: "Статус", width: "10rem" },
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