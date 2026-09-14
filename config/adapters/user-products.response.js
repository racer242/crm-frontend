/**
 * Адаптер для списка продуктов-покупок участника (ops/users/[user_id]/products)
 * Преобразует ответ API инстанса ({status:"ok", data:{items, pagination}})
 * в формат lazy-таблицы {value, columns, totalRecords, first, rows}
 */
function transform(source) {
  const payload = source.status === "ok" ? source.data : source;

  const value = (payload.items || []).map((product) => ({
    ...product,
    id: product.product_id || "",
  }));

  const columns = [
    { field: "id", header: "ID", width: "12rem" },
    { field: "product_name", header: "Название" },
    { field: "total_quantity", header: "Количество", width: "10rem" },
    { field: "total_amount", header: "Сумма", width: "10rem" },
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