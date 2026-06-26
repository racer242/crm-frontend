/**
 * Преобразует state.docsData в payload для PATCH /api/users/[id]/docs
 * @param {Object} data - state.docsData (из формы редактирования документов)
 * @returns {Object} Поля для отправки на сервер
 */
function transform(data) {
  if (!data || typeof data !== "object") return data;

  return {
    passport_photo_first_page: data.passport_photo_first_page || "",
    passport_photo_registration_page:
      data.passport_photo_registration_page || "",
    passport_first_name: data.passport_first_name || "",
    passport_last_name: data.passport_last_name || "",
    passport_middle_name: data.passport_middle_name || "",
    passport_date_of_birth: data.passport_date_of_birth || "",
    passport_series_number: data.passport_series_number || "",
    passport_issued_by: data.passport_issued_by || "",
    passport_issue_date: data.passport_issue_date || "",
    passport_registration_address: data.passport_registration_address || "",
    inn: data.inn || "",
    inn_photo: data.inn_photo || "",
    moderation_status: data.moderation_status,
  };
}
