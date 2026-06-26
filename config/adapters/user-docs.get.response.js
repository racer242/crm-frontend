/**
 * Преобразует ответ API /users/[id]/docs в формат для отображения на странице документов
 * @param {Object} data - Исходный ответ сервера (документы участника)
 * @returns {Object} Преобразованные данные для State
 */
function transform(data) {
  if (!data || typeof data !== "object") return data;

  // Форматирование дат: ISO → DD.MM.YYYY
  const formatDate = (iso) => {
    if (!iso) return "";
    try {
      const d = new Date(iso);
      if (isNaN(d.getTime())) return "";
      const day = String(d.getDate()).padStart(2, "0");
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const year = d.getFullYear();
      return `${day}.${month}.${year}`;
    } catch {
      return "";
    }
  };

  // Статус модерации - единое поле true/false
  const moderationLabel =
    data.moderation_status === true ? "Принят" : "Не принят";
  const moderationSeverity =
    data.moderation_status === true ? "success" : "danger";

  // Полное имя для breadcrumb
  const firstName = data.passport_first_name || "";
  const lastName = data.passport_last_name || "";
  const fullName = [firstName, lastName].filter(Boolean).join(" ") || "";

  return {
    ...data,
    fullName,
    passport_issue_date_formatted: formatDate(data.passport_issue_date),
    passport_date_of_birth_formatted: formatDate(data.passport_date_of_birth),
    moderation_label: moderationLabel,
    moderation_severity: moderationSeverity,
  };
}
