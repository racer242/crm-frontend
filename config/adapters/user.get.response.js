/**
 * Преобразует ответ API /api/v1/crm/users/{id} в формат для отображения на странице участника
 * @param {Object} response - Полный ответ сервера { status, data }
 * @returns {Object} Преобразованные данные для State
 */
function transform(response) {
  const data = response.data || response; // Поддержка как обертки, так и чистых данных
  if (!data || typeof data !== "object") return {};

  // Полное имя и инициалы.
  // Если не указаны ни имя, ни фамилия — «Без имени (participant_code)»
  const firstName = data.first_name || "";
  const lastName = data.last_name || "";
  const thirdName = data.third_name || "";
  const full_name =
    [firstName, lastName].filter(Boolean).join(" ") ||
    (data.participant_code
      ? `Без имени (${data.participant_code})`
      : "Без имени");
  const complete_name =
    [firstName, thirdName, lastName].filter(Boolean).join(" ") || "";
  const initials =
    [firstName.charAt(0), lastName.charAt(0)]
      .filter(Boolean)
      .join("")
      .toUpperCase() || "";

  let created_at = data.created_at ? convertDateValue(data.created_at) : "";
  let city =
    (data.city || "") + (data.city_id ? " (" + data.city_id + ")" : "");

  const statusLabels = {
    active: "Активен",
    blocked: "Заблокирован",
    deleted: "Удален",
  };
  const statusSeverities = {
    active: "success",
    blocked: "warning",
    deleted: "danger",
  };

  let status_label = statusLabels[data.status] || data.status || "";
  let status_severity = statusSeverities[data.status] || "";

  return {
    id: data.id,
    participant_code: data.participant_code,
    email: data.email,
    phone: data.phone,
    status: data.status,
    created_at,
    first_name: firstName,
    last_name: lastName,
    third_name: data.third_name || "",
    full_name,
    complete_name,
    initials,
    points: data.points,
    mailing: Boolean(Number(data.mailing || "0")) ? "Есть" : "Нет",
    city: city != "" ? city : "Не указан",
    status_label,
    status_severity,
  };
}
