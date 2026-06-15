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

  // 2. Форматируем даты: ISO → DD.MM.YYYY HH:mm
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

  // 3. Группы — собираем названия групп, в которых состоит участник
  let groupsText = "—";
  if (Array.isArray(data.groups) && data.groups.length > 0) {
    const memberGroups = data.groups.filter((g) => g.is_member);
    if (memberGroups.length > 0) {
      groupsText = memberGroups.map((g) => g.title).join(", ");
    }
  }

  // 4. Возвращаем плоский объект со всеми исходными полями + вычисляемыми
  return {
    ...data,
    full_name: fullName,
    reg_date_formatted: regDateFormatted,
    auth_date_formatted: authDateFormatted,
    groups_text: groupsText,
  };
}
