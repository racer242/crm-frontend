/**
 * Преобразует ответ API /api/acts/[id] в формат для отображения на странице просмотра акта
 * @param {Object} data - Исходный ответ сервера (данные акта)
 * @returns {Object} Преобразованные данные для State
 */
function transform(data) {
  if (!data || typeof data !== "object") return data;

  // Статус акта для отображения — извлекаем label из словаря statuses по id
  const statuses = data.statuses || [];
  const currentStatusId = data.status;
  const currentStatusObj = statuses.find((s) => s.id === currentStatusId);
  const statusLabel = currentStatusObj
    ? currentStatusObj.name
    : currentStatusId || "";

  // Severity для Tag компонента
  const severityMap = {
    pending: "warn",
    approved: "success",
    delivered: "info",
    rejected: "danger",
  };
  const statusSeverity = severityMap[currentStatusId] || "secondary";

  // Форматирование даты выдачи акта через _shared.js функцию
  const issueDateFormatted = data.act_issue_date
    ? convertDateValue(data.act_issue_date)
    : "";

  return {
    ...data,
    issue_date: data.act_issue_date || "",
    issueDateFormatted,
    statusLabel,
    statusSeverity,
    prize_name: data.prize || "",
    prize_variants: data.prize_variants || [],
    statuses: statuses,
  };
}
