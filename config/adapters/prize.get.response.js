/**
 * Преобразует ответ API /api/prizes/[id] в формат для отображения на странице просмотра приза
 * @param {Object} data - Исходный ответ сервера (данные приза)
 * @returns {Object} Преобразованные данные для State
 */
function transform(data) {
  if (!data || typeof data !== "object") return data;

  // Статус приза для отображения — извлекаем label из словаря statuses по id
  const statuses = data.statuses || [];
  const currentStatusId = data.status;
  const currentStatusObj = statuses.find((s) => s.id === currentStatusId);
  const statusLabel = currentStatusObj
    ? currentStatusObj.name
    : currentStatusId || "";

  // Severity для Tag компонента
  const severityMap = {
    SENDING: "info",
    SENT: "success",
    ERROR: "danger",
    RECEIVED: "success",
    DOWNLOAD: "info",
    DATA_NEEDED: "warn",
    PROCESSING: "warn",
    NEED_CODE: "warn",
    DELETED: "secondary",
  };
  const statusSeverity = severityMap[currentStatusId] || "secondary";

  // Форматирование даты выигрыша через _shared.js функцию
  const winDateFormatted = data.win_date ? convertDateValue(data.win_date) : "";

  // Статус акта для отображения
  const hasAct = Boolean(data.act_id);
  const actStatus = hasAct ? "Создан" : "Отсутствует";
  const actSeverity = hasAct ? "success" : "warn";

  // Получаем данные пользователя (если есть в ответе API)
  const user_name = data.user_name || "";
  const user_email = data.user_email || "";

  return {
    ...data,
    user_name,
    user_email,
    winDateFormatted,
    statusLabel,
    statusSeverity,
    actStatus,
    actSeverity,
    prize_name: data.prize_name || "",
    prize_types: data.prize_types || [],
    statuses: statuses,
    retail_chains: data.retail_chains || [],
  };
}
