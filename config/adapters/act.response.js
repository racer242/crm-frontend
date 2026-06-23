/**
 * Преобразует ответ API /api/acts/[id] в формат для отображения на странице просмотра акта
 * @param {Object} data - Исходный ответ сервера (данные акта)
 * @returns {Object} Преобразованные данные для State
 */
function transform(data) {
  if (!data || typeof data !== "object") return data;

  // Форматирование даты выдачи акта
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

  const issueDateFormatted = formatDate(data.issue_date);

  // Статус акта для отображения
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

  // Ссылки для скачивания
  const documentBlankUrl = data.document_blank_url || "";
  const signedScanUrl = data.signed_scan_url || "";

  return {
    ...data,
    issueDateFormatted,
    statusLabel,
    statusSeverity,
    documentBlankUrl,
    signedScanUrl,
  };
}
