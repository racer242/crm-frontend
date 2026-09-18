/**
 * Адаптер для списка сообщений участника (ops/users/[user_id]/messages)
 * Преобразует ответ API инстанса ({status:"ok", data:{items, pagination}})
 * в формат lazy-таблицы {value, columns, totalRecords, first, rows}
 */
function transform(source) {
  const payload = source.status === "ok" ? source.data : source;

  // Статус доставки сообщения: подпись и severity для Tag
  const statusLabels = {
    delivered: "Доставлено",
    failed: "Не доставлено",
  };
  const statusSeverities = {
    delivered: "success",
    failed: "danger",
  };

  const value = (payload.items || []).map((message) => ({
    ...message,
    // Отправитель может быть не авторизован (sender_* === null) — «—»
    sender_name_label: message.sender_name || "—",
    sender_email_label: message.sender_email || "—",
    // Тема и статус доставки для попапа
    subject_label: message.subject || "Без темы",
    status_label:
      statusLabels[String(message.status || "").toLowerCase()] ||
      message.status ||
      "—",
    status_severity:
      statusSeverities[String(message.status || "").toLowerCase()] || "info",
    // Кнопка «Написать письмо» в попапе: готовый mailto-линк (тема в subject)
    mailto_link: message.sender_email
      ? `mailto:${message.sender_email}?subject=${encodeURIComponent(
          message.subject || "Без темы",
        )}`
      : "",
    mailto_disabled: !message.sender_email,
    // Сокращённый текст для колонки «Сообщение» (полный текст — в попапе по клику)
    message_short: truncateMessage(message.message),
  }));

  const columns = [
    { field: "created_at", header: "Дата", width: "12rem", dataType: "date" },
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