/**
 * Преобразует state.docsData в payload для PATCH /api/ops/users/[user_id]/extra
 * Формат по новому API: PATCH /api/v1/crm/users/[id]/extra — разд. 1.5 (поля extra.*)
 * @param {Object} data - state.docsData (из формы редактирования документов)
 * @returns {Object} Поля для отправки на сервер
 */
function transform(data) {
  if (!data || typeof data !== "object") return data;

  return {
    "extra.personal.first_name": data.passport_first_name || "",
    "extra.personal.last_name": data.passport_last_name || "",
    "extra.personal.third_name": data.passport_middle_name || "",
    "extra.extended.inn": data.inn || "",
    "extra.extended.passport_series_number": data.passport_series_number || "",
    "extra.extended.passport_issue_date": data.passport_issue_date || "",
    "extra.extended.passport_issued_by": data.passport_issued_by || "",
    "extra.extended.passport_address": data.passport_registration_address || "",
  };
}
