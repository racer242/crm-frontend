/**
 * Адаптер истории баллов участника (ops/users/[user_id]/points/history →
 * GET /api/v1/crm/users/{id}/points/history, §6.3).
 * Ответ API ({status:"ok", data:{items, pagination}}) → формат lazy-таблицы
 * {value, columns, totalRecords, first, rows, typeOptions}.
 * Колонки (§6.3): ID транзакции (uuid — сокращённый формат), Дата (created_at),
 * Тип (type_name), Изменение (amount со знаком: +N/−N), Комментарий («—» если пусто).
 * typeOptions — опции фильтра «Тип операции»: «Все типы» (пустое значение) +
 * уникальные пары {value: type_code, label: type_name} из строк ответа;
 * домен type_code в доках не зафиксирован, поэтому лейблы берутся из type_name.
 */
function transform(source) {
  const payload = source.status === "ok" ? source.data : source;
  const items = payload.items || [];

  const value = items.map((item) => {
    const amount = Number(item.amount) || 0;
    return {
      ...item,
      amount_label: amount > 0 ? "+" + amount : String(amount),
      comment: item.comment || "—",
    };
  });

  const columns = [
    { field: "transaction_id", header: "ID транзакции", dataType: "uuid", width: "11rem" },
    { field: "created_at", header: "Дата", dataType: "date", width: "12rem" },
    { field: "type_name", header: "Тип", width: "14rem" },
    { field: "amount_label", header: "Изменение", width: "9rem" },
    { field: "comment", header: "Комментарий" },
  ];

  // Опции фильтра «Тип операции» из фактических данных ответа.
  const seen = {};
  const typeOptions = [{ label: "Все типы", value: "" }];
  items.forEach((item) => {
    const code = item.type_code;
    if (code === undefined || code === null || seen[code]) return;
    seen[code] = true;
    typeOptions.push({ label: item.type_name || String(code), value: code });
  });

  return {
    value,
    columns,
    typeOptions,
    totalRecords: payload.pagination?.total_items || value.length,
    first:
      ((payload.pagination?.page || 1) - 1) * (payload.pagination?.limit || 10),
    rows: payload.pagination?.limit || 10,
  };
}