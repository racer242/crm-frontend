/**
 * Преобразует ответ API /api/v1/crm/prizes/{id} в формат для отображения
 * на страницах просмотра приза (prize, user-prize).
 * В page dataFeed адаптер не указывается — его применяет API-роутер,
 * поэтому на вход может прийти как обёртка { status, data }, так и данные.
 * @param {Object} response - Ответ сервера (обёртка { status, data } или чистые данные)
 * @returns {Object} Преобразованные данные для State
 */
function transform(response) {
  const data = (response && response.data) || response || {};
  if (!data || typeof data !== "object") return {};

  // Единый словарь статусов выдачи приза (обновление 29.09.26): PENDING,
  // ACT_UPLOADED, APPROVED, REJECTED. API отдаёт готовый status_label —
  // словарь остаётся фолбэком для старых ответов.
  const statusLabels = {
    pending: "Ожидает",
    act_uploaded: "Акт загружен",
    approved: "Одобрен",
    rejected: "Отклонен",
  };
  const statusSeverities = {
    pending: "warning",
    act_uploaded: "info",
    approved: "success",
    rejected: "danger",
  };
  const statusKey = String(data.status || "").toLowerCase();

  // Розыгрыш, в котором приз выигран (§2.1); null — выдан не розыгрышем
  const raffle =
    data.raffle && typeof data.raffle === "object" ? data.raffle : null;

  return {
    id: data.prize_id || "",
    prize_id: data.prize_id || "",
    user_id: data.user_id || "",
    user_id_label: data.user_id || "—",
    // Идентификатор для цепочки SSR-фидов (GET /ops/users/[user_id]):
    // у приза из пула владельца нет — "-" даёт заведомо несуществующий
    // маршрут, фид вернёт ошибку и будет пропущен движком без записи в state
    user_feed_id: data.user_id || "-",
    title: data.title || "",
    price: data.price !== undefined && data.price !== null ? data.price : "",
    status: data.status || "",
    status_label:
      data.status_label || statusLabels[statusKey] || data.status || "",
    status_severity: statusSeverities[statusKey] || "secondary",
    is_active: Boolean(data.is_active),
    is_active_label: data.is_active ? "Да" : "Нет",
    act_required: Boolean(data.act_required),
    act_required_label: data.act_required ? "Да" : "Нет",
    missing_data: Array.isArray(data.missing_data) ? data.missing_data : [],
    // Готовый человекочитаемый текст недостающих данных (§2.2); null — «—»
    missing_data_text: data.missing_data_text || "—",
    raffle_id: raffle ? raffle.id || "" : "",
    raffle_name: raffle ? raffle.name || "" : "",
    raffle_name_label: raffle && raffle.name ? raffle.name : "—",
    raffle_status_label:
      raffle && (raffle.status_label || raffle.status)
        ? raffle.status_label || raffle.status
        : "—",
    // Кнопка «Перейти к розыгрышу» неактивна, если приз выдан не розыгрышем
    raffle_go_disabled: !raffle,
    // Кнопка «Перейти к владельцу» неактивна, если приз свободен
    user_go_disabled: !data.user_id,
  };
}
