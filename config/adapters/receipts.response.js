/**
 * Адаптер для общего списка чеков (ops/receipts)
 * Преобразует ответ API инстанса ({status:"ok", data:{items, pagination}})
 * в формат lazy-таблицы {value, columns, totalRecords, first, rows}
 */
function transform(source) {
  const payload = source.status === "ok" ? source.data : source;

  // Словарь статусов чека (русские лейблы + severity для Tag).
  // В API статусы приходят в верхнем регистре (CHECKING, ACCEPTED, ...) —
  // ключи словаря в нижнем регистре, нормализация ниже.
  const statusLabels = {
    checking: "На проверке",
    accepted: "Принят",
    refused: "Отклонён",
    suspended: "Приостановлен",
    need_photo: "Требуется фото",
  };
  const statusSeverities = {
    checking: "info",
    accepted: "success",
    refused: "danger",
    suspended: "warning",
    need_photo: "warning",
  };

  const value = (payload.items || []).map((receipt) => {
    const statusKey = String(receipt.status || "").toLowerCase();
    return {
      ...receipt,
      id: receipt.receipt_id || "",
      status_label: statusLabels[statusKey] || receipt.status || "",
      status_severity: statusSeverities[statusKey] || "secondary",
      total_products_label:
        receipt.total_products !== undefined && receipt.total_products !== null
          ? String(receipt.total_products)
          : "—",
      promo_products_label:
        receipt.promo_products !== undefined && receipt.promo_products !== null
          ? String(receipt.promo_products)
          : "—",
      fns_status_label: receipt.fns_status || "—",
    };
  });

  const columns = [
    { field: "id", header: "ID", width: "12rem", dataType: "uuid" },
    { field: "user_id", header: "Участник", dataType: "uuid" },
    { field: "status_label", header: "Статус", width: "10rem" },
    { field: "fns_status_label", header: "Статус ФНС", width: "10rem" },
    { field: "total_products_label", header: "Продуктов", width: "8rem" },
    { field: "promo_products_label", header: "Акционных", width: "8rem" },
    {
      field: "registered_at",
      header: "Зарегистрирован",
      width: "12rem",
      dataType: "date",
    },
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