/**
 * Преобразует ответ API /users/[id] в формат для отображения на странице пользователя
 * @param {Object} data - Исходный ответ сервера (данные участника)
 * @returns {Object} Преобразованные данные для State
 */
function transform(data) {
  if (!data || typeof data !== "object") return data;

  // 1. Составляем полное имя
  const firstName = data.first_name || "";
  const lastName = data.last_name || "";
  const fullName = [firstName, lastName].filter(Boolean).join(" ") || "—";

  // 2. Инициалы для аватара
  const initials =
    [firstName.charAt(0), lastName.charAt(0)]
      .filter(Boolean)
      .join("")
      .toUpperCase() || "?";

  // 3. Форматируем даты: ISO → DD.MM.YYYY HH:mm
  const formatDate = (iso) => {
    if (!iso) return "—";
    try {
      const d = new Date(iso);
      if (isNaN(d.getTime())) return iso;
      const day = String(d.getDate()).padStart(2, "0");
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const year = d.getFullYear();
      const hours = String(d.getHours()).padStart(2, "0");
      const minutes = String(d.getMinutes()).padStart(2, "0");
      return `${day}.${month}.${year} ${hours}:${minutes}`;
    } catch {
      return iso;
    }
  };

  const regDateFormatted = formatDate(data.reg_date);
  const authDateFormatted = formatDate(data.auth_date);

  // 4. Группы — собираем названия групп, в которых состоит участник
  let groupsText = "—";
  let groupsBadges = [];
  if (Array.isArray(data.groups) && data.groups.length > 0) {
    const memberGroups = data.groups.filter((g) => g.is_member);
    if (memberGroups.length > 0) {
      groupsText = memberGroups.map((g) => g.title).join(", ");
      groupsBadges = memberGroups.map((g) => ({
        label: g.title,
        type: g.type,
      }));
    }
  }

  // 5. Статус блокировки
  const isBlocked = data.is_blocked === true;
  const statusLabel = isBlocked ? "Заблокирован" : "Активен";
  const statusSeverity = isBlocked ? "danger" : "success";
  const statusIcon = isBlocked ? "pi pi-lock" : "pi pi-check-circle";

  // 6. Статистика — массив для визуализации
  const stats = [
    { label: "Баллы", value: data.points ?? 0, icon: "pi pi-star" },
    { label: "Призы", value: data.prizes ?? 0, icon: "pi pi-gift" },
    { label: "Чеки", value: data.receipts ?? 0, icon: "pi pi-receipt" },
    { label: "Коды", value: data.codes ?? 0, icon: "pi pi-qrcode" },
    { label: "Коды ЧЗ", value: data.gtins ?? 0, icon: "pi pi-qrcode" },
    { label: "Продукты", value: data.products ?? 0, icon: "pi pi-box" },
    { label: "Сообщения", value: data.messages ?? 0, icon: "pi pi-comments" },
  ];

  // 8. Строки для отображения с префиксами (для линковки)
  const emailDisplay = data.email ? `✉ ${data.email}` : "✉ —";
  const phoneDisplay = data.phone ? `📞 ${data.phone}` : "📞 —";
  const cityDisplay = data.city ? `📍 ${data.city}` : "📍 —";
  const idDisplay = `ID: ${data.id ?? "—"}`;
  const botIdDisplay = `Telegram ID: ${data.bot_id ?? "—"}`;
  const referralDisplay = `Реферал: ${data.referral ?? "—"}`;
  const ipDisplay = `IP: ${data.ip ?? "—"}`;
  const regDateDisplay = `Регистрация: ${regDateFormatted}`;
  const authDateDisplay = `Авторизация: ${authDateFormatted}`;
  const blockReasonDisplay = `Причина: ${data.block_reason || "—"}`;

  // 9. Chip labels для статистики
  const statPointsLabel = `Баллы: ${data.points ?? 0}`;
  const statPrizesLabel = `Призы: ${data.prizes ?? 0}`;
  const statReceiptsLabel = `Чеки: ${data.receipts ?? 0}`;
  const statCodesLabel = `Коды: ${data.codes ?? 0}`;
  const statGtinsLabel = `Коды ЧЗ: ${data.gtins ?? 0}`;
  const statProductsLabel = `Продукты: ${data.products ?? 0}`;
  const statMessagesLabel = `Сообщения: ${data.messages ?? 0}`;

  // Сводка статистики одной строкой
  const statsSummary = `Баллы: ${data.points ?? 0} | Призы: ${data.prizes ?? 0} | Чеки: ${data.receipts ?? 0} | Коды: ${data.codes ?? 0} | Коды ЧЗ: ${data.gtins ?? 0} | Продукты: ${data.products ?? 0} | Сообщения: ${data.messages ?? 0}`;

  // 10. Возвращаем плоский объект со всеми исходными полями + вычисляемыми
  return {
    ...data,
    full_name: fullName,
    initials: initials,
    reg_date_formatted: regDateFormatted,
    auth_date_formatted: authDateFormatted,
    groups_text: groupsText,
    groups_badges: groupsBadges,
    is_blocked: isBlocked,
    status_label: statusLabel,
    status_severity: statusSeverity,
    status_icon: statusIcon,
    block_reason: data.block_reason || "",
    stats: stats,
    email_display: emailDisplay,
    phone_display: phoneDisplay,
    city_display: cityDisplay,
    id_display: idDisplay,
    bot_id_display: botIdDisplay,
    referral_display: referralDisplay,
    ip_display: ipDisplay,
    reg_date_display: regDateDisplay,
    auth_date_display: authDateDisplay,
    block_reason_display: blockReasonDisplay,
    stat_points_label: statPointsLabel,
    stat_prizes_label: statPrizesLabel,
    stat_receipts_label: statReceiptsLabel,
    stat_codes_label: statCodesLabel,
    stat_gtins_label: statGtinsLabel,
    stat_products_label: statProductsLabel,
    stat_messages_label: statMessagesLabel,
    stats_summary: statsSummary,
  };
}
