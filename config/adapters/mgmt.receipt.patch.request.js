/**
 * Request-адаптер PATCH /api/receipts/[id] — модерация чека (канал management).
 *
 * Через один маршрут идут два сценария:
 * 1. «Применить» (шорткат saveReceipt) — тело без products: проходит без изменений;
 * 2. «Редактирование продукта» (шорткат saveProduct, попап в таблице продукции) —
 *    тело с products[]: каждый элемент нормализуется —
 *    - gtin: строка (сопоставление по gtin, §5.4);
 *    - is_promo: строго boolean (макросы из конфига могут прийти строкой "true"/"false");
 *    - product_status (PENDING/CONFIRMED/CANCELLED): включается только непустым.
 *
 * Контракт PATCH api/receipts/{id} §5.4: products — опциональный массив,
 * сопоставление по gtin; product_status добавлен по согласованию с бэкендом.
 * @param {Object} data - Тело запроса из конфига (после разрешения макросов)
 * @returns {Object} Нормализованное тело запроса
 */
function transform(data) {
  if (!data || typeof data !== "object" || Array.isArray(data)) return data;
  if (!Array.isArray(data.products)) return data;

  const products = data.products
    .filter(
      (p) =>
        p &&
        typeof p === "object" &&
        p.gtin !== undefined &&
        p.gtin !== null &&
        p.gtin !== "",
    )
    .map((p) => {
      const item = { gtin: String(p.gtin) };
      item.is_promo =
        p.is_promo === true ||
        String(p.is_promo ?? "").toLowerCase() === "true";
      if (
        p.product_status !== undefined &&
        p.product_status !== null &&
        p.product_status !== ""
      ) {
        item.product_status = String(p.product_status);
      }
      return item;
    });

  return { ...data, products };
}