/**
 * Преобразует ответ API /users/[id] в формат для отображения на странице участника
 * @param {Object} data - Исходный ответ сервера (данные участника)
 * @returns {Object} Преобразованные данные для State (только данные, camelCase)
 */
function transform(data) {
  if (!data || typeof data !== "object") return data;

  // Полное имя
  const firstName = data.first_name || "";
  const lastName = data.last_name || "";
  const fullName = [firstName, lastName].filter(Boolean).join(" ") || "";

  // Инициалы для аватара
  const initials =
    [firstName.charAt(0), lastName.charAt(0)]
      .filter(Boolean)
      .join("")
      .toUpperCase() || "";

  // Форматирование дат: ISO → DD.MM.YYYY
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

  const regDateFormatted = formatDate(data.reg_date);
  const authDateFormatted = formatDate(data.auth_date);

  // Группы — список названий и текст с переносами
  const groupList = [];
  if (Array.isArray(data.groups) && data.groups.length > 0) {
    data.groups.forEach((g) => {
      if (g.is_member) {
        groupList.push(g.title);
      }
    });
  }
  const groupsText = groupList.length > 0 ? groupList.join("\n") : "";

  // Статус блокировки
  const isBlocked = data.is_blocked === true;
  const statusLabel = isBlocked ? "Заблокирован" : "Активен";
  const statusSeverity = isBlocked ? "danger" : "success";

  return {
    ...data,
    fullName,
    initials,
    regDateFormatted,
    authDateFormatted,
    groupList,
    groupsText,
    isBlocked,
    statusLabel,
    statusSeverity,
  };
}
