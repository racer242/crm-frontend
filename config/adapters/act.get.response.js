/**
 * Преобразует ответ API /api/v1/crm/acts/{id} в формат для отображения
 * на страницах просмотра/редактирования акта (user-act / user-act-edit)
 * В page dataFeed адаптер не указывается — его применяет API-роутер,
 * поэтому на вход может прийти как обёртка { status, data }, так и данные.
 * @param {Object} response - Ответ сервера (обёртка { status, data } или чистые данные)
 * @returns {Object} Преобразованные данные для State
 */
function transform(response) {
  const data = (response && response.data) || response || {};
  if (!data || typeof data !== "object") return {};

  // Словарь статусов акта
  const statusLabels = {
    pending: "Ожидает",
    approved: "Одобрен",
    delivered: "Доставлен",
    rejected: "Отклонен",
  };
  const statusSeverities = {
    pending: "warning",
    approved: "success",
    delivered: "info",
    rejected: "danger",
  };

  // Статусы приходят в верхнем регистре (PENDING, APPROVED, ...) —
  // ключи словаря в нижнем регистре, нормализация ниже.
  const statusKey = String(data.status || "").toLowerCase();

  return {
    id: data.act_id || "",
    user_id: data.user_id || "",
    prize_id: data.prize_id || "",
    status: data.status || "",
    status_label: statusLabels[statusKey] || data.status || "",
    status_severity: statusSeverities[statusKey] || "secondary",
    // Путь к файлу акта (без префикса версии; прокси файлов будет добавлен отдельно)
    file_url: data.file_url || "",
    created_at: data.created_at ? convertDateValue(data.created_at) : "",
    updated_at: data.updated_at ? convertDateValue(data.updated_at) : "",
  };
}
