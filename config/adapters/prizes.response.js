/**
 * Адаптер для общего списка призов — пула (ops/prizes)
 * Преобразует ответ API инстанса ({status:"ok", data:{items, pagination}})
 * в формат lazy-таблицы {value, columns, totalRecords, first, rows}
 */
function transform(source) {
  const payload = source.status === "ok" ? source.data : source;

  // Единый словарь статусов выдачи приза (обновление 29.09.26): PENDING,
  // ACT_UPLOADED, APPROVED, REJECTED. API отдаёт готовый status_label —
  // словарь остаётся фолбэком для старых ответов.
  const statusLabels = {
    pending: "Ожидает",
    act_uploaded: "Акт загружен",
    approved: "Одобрен",
    rejected: "Отклонен",
  };
  const statusSeverities = {
    pending: "warning",
    act_uploaded: "info",
    approved: "success",
    rejected: "danger",
  };

  const value = (payload.items || []).map((prize) => {
    const statusKey = String(prize.status || "").toLowerCase();
    return {
      ...prize,
      id: prize.prize_id || "",
      status_label:
        prize.status_label || statusLabels[statusKey] || prize.status || "",
      status_severity: statusSeverities[statusKey] || "secondary",
      is_active_label: prize.is_active ? "Да" : "Нет",
      act_required_label: prize.act_required ? "Да" : "Нет",
    };
  });

  const columns = [
    { field: "id", header: "ID", width: "12rem", dataType: "uuid" },
    { field: "title", header: "Название" },
    { field: "price", header: "Стоимость", width: "8rem" },
    { field: "act_required_label", header: "Требует акта", width: "9rem" },
    { field: "status_label", header: "Статус", width: "10rem" },
    { field: "is_active_label", header: "Активен", width: "7rem" },
    // Владелец: dataType uuid — сокращённая форма (01a0...afef);
    // у свободного приза ячейка пустая
    { field: "user_id", header: "Владелец", dataType: "uuid" },
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