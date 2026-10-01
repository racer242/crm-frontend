/**
 * Адаптер для списка призов участника (ops/users/[user_id]/prizes)
 * Преобразует ответ API инстанса ({status:"ok", data:{items, pagination}})
 * в формат lazy-таблицы {value, columns, totalRecords, first, rows}
 */
function transform(source) {
  const payload = source.status === "ok" ? source.data : source;

  // Жёсткий словарь статусов выдачи приза — фолбэк для ответов без
  // справочника (обновление 29.09.26: PENDING, ACT_UPLOADED, APPROVED,
  // REJECTED). Первичный источник подписей — data.statuses из ответа.
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
    free: "secondary",
    sending: "info",
    sent: "info",
    error: "danger",
    received: "success",
    download: "info",
    data_needed: "warning",
    processing: "info",
    ready_for_delivery: "info",
    need_code: "warning",
    deleted: "danger",
  };
  // Справочник статусов из ответа API (data.statuses, {value, name}):
  // ключи и в оригинальном регистре (UPPERCASE), и в нижнем
  const dictLabels = {};
  for (const s of Array.isArray(payload.statuses) ? payload.statuses : []) {
    if (s && s.value) {
      dictLabels[s.value] = s.name;
      dictLabels[String(s.value).toLowerCase()] = s.name;
    }
  }

  const value = (payload.items || []).map((prize) => {
    const statusKey = String(prize.status || "").toLowerCase();
    return {
      ...prize,
      id: prize.prize_id || "",
      status_label:
        prize.status_label ||
        dictLabels[prize.status] ||
        dictLabels[statusKey] ||
        statusLabels[statusKey] ||
        prize.status ||
        "",
      status_severity: statusSeverities[statusKey] || "secondary",
      act_required_label: prize.act_required ? "Да" : "Нет",
    };
  });

  const columns = [
    { field: "id", header: "ID", width: "12rem", dataType: "uuid" },
    { field: "title", header: "Название" },
    { field: "price", header: "Стоимость (баллы)", width: "12rem" },
    { field: "act_required_label", header: "Требует акта", width: "9rem" },
    { field: "status_label", header: "Статус", width: "10rem" },
  ];

  return {
    value,
    columns,
    // Справочник статусов из ответа (data.statuses) — опции фильтра «Статус...»
    statuses: Array.isArray(payload.statuses) ? payload.statuses : [],
    totalRecords: payload.pagination?.total_items || 0,
    first:
      ((payload.pagination?.page || 1) - 1) * (payload.pagination?.limit || 25),
    rows: payload.pagination?.limit || 25,
  };
}