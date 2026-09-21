/**
 * Преобразует ответ mgmt API GET /receipts/{id} в формат карточки чека
 * (ТЗ ред. 6: CRM хранит только user_id участника; деньги — рубли §2).
 * В page dataFeed адаптер не указывается — его применяет API-роутер,
 * поэтому на вход может прийти как обёртка, так и чистые данные.
 * @param {Object} data - Ответ сервера (данные чека + справочники)
 * @returns {Object} Преобразованные данные для State
 */
function transform(data) {
  if (!data || typeof data !== "object") return data;

  // Розничная сеть из справочника
  const retailChains = data.retail_chains || [];
  const retailChainName =
    retailChains.find((c) => c.id === data.retail_chain_id)?.name || "";

  // Статус модерации: label из справочника moderation_statuses (§4.1, 5 значений)
  const moderationStatuses = data.moderation_statuses || [];
  const moderationStatusId = data.moderation_status || "";
  const moderationStatusObj = moderationStatuses.find(
    (s) => s.id === moderationStatusId,
  );
  const moderationStatusLabel = moderationStatusObj
    ? moderationStatusObj.name
    : moderationStatusId;
  const moderationSeverityMap = {
    pending: "warn",
    approved: "success",
    rejected: "danger",
    suspended: "warning",
    need_photo: "info",
  };
  const moderationStatusSeverity =
    moderationSeverityMap[moderationStatusId] || "secondary";

  // Статус ФНС: label из справочника fns_statuses (§4.2)
  const fnsStatuses = data.fns_statuses || [];
  const fnsStatusId = data.fns_status || "";
  const fnsStatusObj = fnsStatuses.find((s) => s.id === fnsStatusId);
  const fns_status_label = fnsStatusObj ? fnsStatusObj.name : fnsStatusId;
  const fnsSeverityMap = {
    no_check: "secondary",
    wait: "warning",
    wrong: "danger",
    correct: "success",
  };
  const fns_status_severity = fnsSeverityMap[fnsStatusId] || "secondary";

  // Причина отклонения: label из справочника decline_reasons (§4.3);
  // показывается только при статусе rejected (§5.4 — обязателен при rejected)
  const declineReasons = data.decline_reasons || [];
  const declineReasonId = data.decline_reason || "";
  const declineReasonObj = declineReasons.find((r) => r.id === declineReasonId);
  const decline_reason_label = declineReasonObj
    ? declineReasonObj.name
    : declineReasonId;
  const show_decline_reason = moderationStatusId === "rejected";

  return {
    ...data,
    // Суммы mgmt API приходят в рублях (§2) — без деления на 100
    total_amount_label: formatRubles(data.total_amount),
    promo_products_amount_label: formatRubles(data.promo_products_amount),
    retail_chain_name: retailChainName,
    moderationStatusLabel,
    moderationStatusSeverity,
    fns_status_label,
    fns_status_severity,
    decline_reason_label,
    show_decline_reason,
    // Магазин: фолбэки для пустых значений
    store_inn_label: data.store_inn || "—",
    store_address_label: data.store_address || "—",
    retail_chains: retailChains,
  };
}