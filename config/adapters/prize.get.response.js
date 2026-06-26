/**
 * Преобразует ответ API /api/prizes/[id] в формат для отображения на странице просмотра приза
 * @param {Object} data - Исходный ответ сервера (данные приза)
 * @returns {Object} Преобразованные данные для State
 */
function transform(data) {
  if (!data || typeof data !== "object") return data;

  // Форматирование даты выигрыша
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

  const winDateFormatted = formatDate(data.win_date);

  // Статус приза для отображения
  const statusMap = {
    pending: "Ожидает",
    approved: "Одобрен",
    delivered: "Доставлен",
    rejected: "Отклонен",
  };
  const statusLabel = statusMap[data.status] || data.status || "";

  // Severity для Tag компонента
  const severityMap = {
    pending: "warn",
    approved: "success",
    delivered: "info",
    rejected: "danger",
  };
  const statusSeverity = severityMap[data.status] || "secondary";

  return {
    ...data,
    winDateFormatted,
    statusLabel,
    statusSeverity,
  };
}
