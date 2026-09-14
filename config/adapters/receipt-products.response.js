/**
 * Адаптер для продукции в чеке (ops/receipts/[receipt_id]/products
 * → GET /api/v1/crm/receipts/{id}/products).
 * Эндпоинт не пагинированный — отдаёт data.items[] целиком.
 * В page dataFeed адаптер не указывается — его применяет API-роутер,
 * поэтому на вход может прийти как обёртка { status, data }, так и данные.
 * @param {Object} source - Ответ сервера (обёртка { status, data } или чистые данные)
 * @returns {Object} Данные для DataTable (value, columns, totalRecords)
 */
function transform(source) {
  const payload = source.status === "ok" ? source.data : source;
  const items = Array.isArray(payload && payload.items)
    ? payload.items
    : Array.isArray(payload)
      ? payload
      : [];

  // Статус продукта — справочника в API-доках нет: известные значения
  // переводим в русские лейблы, неизвестные показываем как есть.
  const productStatusLabels = {
    checking: "На проверке",
    accepted: "Принят",
    pending: "Ожидает",
    declined: "Отклонён",
    refused: "Отклонён",
  };

  const value = items.map((product, index) => {
    const statusKey = String(product.product_status || "").toLowerCase();
    return {
      ...product,
      _num: index + 1,
      product_status_label:
        productStatusLabels[statusKey] || product.product_status || "—",
    };
  });

  const columns = [
    { field: "_num", header: "№", width: "4rem" },
    { field: "product_name", header: "Название" },
    { field: "quantity", header: "Кол-во", width: "8rem" },
    { field: "amount", header: "Сумма", width: "10rem" },
    { field: "product_status_label", header: "Статус", width: "12rem" },
  ];

  return {
    value,
    columns,
    totalRecords: value.length,
  };
}
