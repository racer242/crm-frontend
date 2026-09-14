/**
 * Адаптер для списка сообщений участника (ops/users/[user_id]/messages)
 * Преобразует ответ API инстанса ({status:"ok", data:{items, pagination}})
 * в формат lazy-таблицы {value, columns, totalRecords, first, rows}
 */
function transform(source) {
  const payload = source.status === "ok" ? source.data : source;

  const value = (payload.items || []).map((message) => ({
    ...message,
    id: message.message_id || "",
    created_at_formatted: message.created_at
      ? convertDateValue(message.created_at)
      : "",
  }));

  const columns = [
    { field: "id", header: "ID", width: "12rem" },
    { field: "subject", header: "Тема", width: "20rem" },
    { field: "message", header: "Сообщение" },
    { field: "created_at_formatted", header: "Дата", width: "12rem" },
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