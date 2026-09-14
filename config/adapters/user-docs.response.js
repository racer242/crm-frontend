/**
 * Преобразует ответ GET /api/ops/users/[user_id] (профиль с extra) в формат
 * для отображения на страницах документов участника (user-docs / user-docs-edit)
 * Конверт { status, data } уже снят response-адаптером API-роутера (user.get.response
 * применяется только к state.userData; сюда приходит сырой ответ эндпоинта).
 * @param {Object} response - Ответ сервера (обёртка { status, data } или чистые данные)
 * @returns {Object} docsData для state
 */
function transform(response) {
  const data = (response && response.data) || response || {};
  const extra = data.extra || {};
  const personal = extra.personal || {};
  const extended = extra.extended || {};

  // Форматирование даты: ISO -> DD.MM.YYYY
  function formatDate(iso) {
    if (!iso) return "";
    try {
      const d = new Date(iso);
      if (isNaN(d.getTime())) return "";
      const day = String(d.getDate()).padStart(2, "0");
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const year = d.getFullYear();
      return `${day}.${month}.${year}`;
    } catch (e) {
      return "";
    }
  }

  const firstName = data.first_name || "";
  const lastName = data.last_name || "";

  return {
    id: data.id || "",

    // ФИО из расширенной анкеты
    passport_first_name: personal.first_name || "",
    passport_last_name: personal.last_name || "",
    passport_middle_name: personal.third_name || "",

    // Паспорт
    passport_series_number: extended.passport_series_number || "",
    passport_issued_by: extended.passport_issued_by || "",
    passport_issue_date: extended.passport_issue_date || "",
    passport_issue_date_formatted: formatDate(extended.passport_issue_date),
    passport_registration_address: extended.passport_address || "",

    // ИНН
    inn: extended.inn || "",

    // Для breadcrumb.
    // Если не указаны ни имя, ни фамилия — «Без имени (participant_code)»
    fullName:
      [firstName, lastName].filter(Boolean).join(" ") ||
      (data.participant_code
        ? `Без имени (${data.participant_code})`
        : "Без имени"),
  };
}