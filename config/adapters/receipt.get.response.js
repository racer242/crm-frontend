/**
 * Преобразует ответ API /api/receipts/[id] в формат для отображения на странице просмотра чека
 * @param {Object} data - Исходный ответ сервера (данные чека)
 * @returns {Object} Преобразованные данные для State
 */
function transform(data) {
  if (!data || typeof data !== "object") return data;

  // Форматирование дат
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

  const registrationDateFormatted = formatDate(data.registration_date);
  const purchaseDateFormatted = formatDate(data.purchase_date);

  // Статус чека для отображения
  const receiptStatusMap = {
    pending: "Ожидает валидации",
    validating: "Валидация в ФНС",
    validated: "Валидирован",
    validation_failed: "Ошибка валидации",
  };
  const receiptStatusLabel =
    receiptStatusMap[data.receipt_status] || data.receipt_status || "";

  const receiptSeverityMap = {
    pending: "warn",
    validating: "info",
    validated: "success",
    validation_failed: "danger",
  };
  const receiptStatusSeverity =
    receiptSeverityMap[data.receipt_status] || "secondary";

  // Статус модерации для отображения
  const moderationStatusMap = {
    pending: "Ожидает модерации",
    automoderation: "Автомодерация",
    approved: "Одобрен",
    rejected: "Отклонен",
    modified: "Изменен модератором",
  };
  const moderationStatusLabel =
    moderationStatusMap[data.moderation_status] || data.moderation_status || "";

  const moderationSeverityMap = {
    pending: "warn",
    automoderation: "info",
    approved: "success",
    rejected: "danger",
    modified: "info",
  };
  const moderationStatusSeverity =
    moderationSeverityMap[data.moderation_status] || "secondary";

  return {
    ...data,
    registrationDateFormatted,
    purchaseDateFormatted,
    receiptStatusLabel,
    receiptStatusSeverity,
    moderationStatusLabel,
    moderationStatusSeverity,
  };
}
