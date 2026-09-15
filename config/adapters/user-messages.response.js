/**
 * Адаптер для списка сообщений участника (ops/users/[user_id]/messages)
 * Преобразует ответ API инстанса ({status:"ok", data:{items, pagination}})
 * в формат lazy-таблицы {value, columns, totalRecords, first, rows}
 */
function transform(source) {
  const payload = source.status === "ok" ? source.data : source;

  const value = (payload.items || []).map((message) => ({
    ...message,
    created_at_formatted: message.created_at
      ? convertDateValue(message.created_at)
      : "",
    // Сокращённый текст для колонки «Сообщение» (полный текст — в попапе по клику)
    message_short: truncateMessage(message.message),
  }));

  const columns = [
    { field: "created_at_formatted", header: "Дата", width: "12rem" },
    { field: "subject", header: "Тема", width: "20rem" },
    { field: "message_short", header: "Сообщение" },
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

/**
 * Сокращает текст до 25 символов, добавляя «...» при обрезке
 */
function truncateMessage(text) {
  const str = typeof text === "string" ? text : "";
  return str.length > 25 ? str.slice(0, 25) + "..." : str;
}