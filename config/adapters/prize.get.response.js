/**
 * Преобразует ответ API /api/v1/crm/prizes/{id} в формат для отображения
 * на странице просмотра приза (user-prize).
 * В page dataFeed адаптер не указывается — его применяет API-роутер,
 * поэтому на вход может прийти как обёртка { status, data }, так и данные.
 * @param {Object} response - Ответ сервера (обёртка { status, data } или чистые данные)
 * @returns {Object} Преобразованные данные для State
 */
function transform(response) {
  const data = (response && response.data) || response || {};
  if (!data || typeof data !== "object") return {};

  // Словарь статусов приза (русские лейблы + severity для Tag).
  // В API статусы приходят в верхнем регистре (PENDING, APPROVED, ...) —
  // ключи словаря в нижнем регистре, нормализация ниже.
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
  const statusKey = String(data.status || "").toLowerCase();

  const missingData = Array.isArray(data.missing_data) ? data.missing_data : [];

  return {
    id: data.prize_id || "",
    prize_id: data.prize_id || "",
    user_id: data.user_id || "",
    user_id_label: data.user_id || "—",
    title: data.title || "",
    price: data.price !== undefined && data.price !== null ? data.price : "",
    status: data.status || "",
    status_label: statusLabels[statusKey] || data.status || "",
    status_severity: statusSeverities[statusKey] || "secondary",
    is_active: Boolean(data.is_active),
    is_active_label: data.is_active ? "Да" : "Нет",
    act_required: Boolean(data.act_required),
    act_required_label: data.act_required ? "Да" : "Нет",
    missing_data: missingData,
    missing_data_label: missingData.length ? missingData.join(", ") : "—",
  };
}
