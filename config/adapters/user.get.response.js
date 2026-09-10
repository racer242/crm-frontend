/**
 * Преобразует ответ API /api/v1/crm/users/{id} в формат для отображения на странице участника
 * @param {Object} response - Полный ответ сервера { status, data }
 * @returns {Object} Преобразованные данные для State
 */
function transform(response) {
  const data = response.data || response; // Поддержка как обертки, так и чистых данных
  if (!data || typeof data !== "object") return {};

  // Полное имя и инициалы
  const firstName = data.first_name || "";
  const lastName = data.last_name || "";
  const fullName = [firstName, lastName].filter(Boolean).join(" ") || "";
  const initials = [firstName.charAt(0), lastName.charAt(0)].filter(Boolean).join("").toUpperCase() || "";

  // Форматирование даты регистрации
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

  const regDateFormatted = formatDate(data.created_at || data.reg_date);

  return {
    id: data.id,
    email: data.email,
    phone: data.phone,
    status: data.status,
    created_at: data.created_at,
    first_name: firstName,
    last_name: lastName,
    third_name: data.third_name || "",
    fullName,
    initials,
    regDateFormatted,
    isBlocked: data.is_blocked === true,
    
    // Временные заглушки для статистики (пока подключен только профиль)
    receipts_count: 0,
    products_count: 0,
    prizes_count: 0
  };
}

