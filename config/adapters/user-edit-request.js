/**
 * Преобразует state.userData в payload для PATCH /api/users/[id]
 * @param {Object} data - state.userData (из формы редактирования)
 * @returns {Object} Поля для отправки на сервер
 */
function transform(data) {
  if (!data || typeof data !== "object") return data;

  return {
    first_name: data.first_name || "",
    last_name: data.last_name || "",
    email: data.email || "",
    phone: data.phone || "",
    delivery_address: data.delivery_address || "",
    delivery_comment: data.delivery_comment || "",
    is_blocked: data.is_blocked === true,
    block_reason: data.block_reason || "",
  };
}
