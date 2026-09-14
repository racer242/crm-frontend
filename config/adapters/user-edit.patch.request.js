/**
 * Преобразует state.userData в payload для PATCH /api/ops/users/[user_id]
 * Формат по новому API: PATCH /api/v1/crm/users/[id] — разд. 1.4
 * @param {Object} data - state.userData (из формы редактирования)
 * @returns {Object} Поля для отправки на сервер
 */
function transform(data) {
  if (!data || typeof data !== "object") return data;

  return {
    first_name: data.first_name || "",
    last_name: data.last_name || "",
    third_name: data.third_name || "",
    phone: data.phone || "",
    email: data.email || "",
    status: data.status || "active",
    mailing: data.mailing_enabled === true,
  };
}
