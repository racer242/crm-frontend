/**
 * Преобразует ответ API /api/receipts/[id] в формат для отображения на странице просмотра чека
 * @param {Object} data - Исходный ответ сервера (данные чека)
 * @returns {Object} Преобразованные данные для State
 */
function transform(data) {
  if (!data || typeof data !== "object") return data;

  // Форматирование дат через _shared.js
  const registrationDateFormatted = data.registration_date
    ? convertDateValue(data.registration_date)
    : "";
  const purchaseDateFormatted = data.purchase_date
    ? convertDateValue(data.purchase_date)
    : "";

  // Розничная сеть из списка
  const retailChains = data.retail_chains || [];
  const retailChainName =
    retailChains.find((c) => c.id === data.retail_chain_id)?.name || "";

  // Статус модерации — используем label из массива statuses по id
  const statuses = data.moderation_statuses || data.statuses || [];
  const currentStatusId = data.moderation_status || data.status || "";
  const currentStatusObj = statuses.find((s) => s.id === currentStatusId);
  const moderationStatusLabel = currentStatusObj
    ? currentStatusObj.name
    : currentStatusId || "";

  // Severity для статуса модерации
  const severityMap = {
    CHECKING: "warn",
    REFUSED: "danger",
    ACCEPTED: "success",
  };
  const moderationStatusSeverity = severityMap[currentStatusId] || "secondary";

  // Составляем user_name из first_name и last_name если пользователь указан
  const user_name =
    data.user_name ||
    (data.first_name && data.last_name
      ? `${data.first_name} ${data.last_name}`
      : "");

  // user_email берём из email если нет прямого поля
  const user_email = data.user_email || data.email || "";

  return {
    ...data,
    user_name,
    user_email,
    registrationDateFormatted,
    purchaseDateFormatted,
    retail_chain_name: retailChainName,
    moderationStatusLabel,
    moderationStatusSeverity,
    retail_chains: retailChains,
  };
}
