/**
 * Адаптер для списка участников (ops/users)
 */
function transform(source) {
  const payload = source.status === "ok" ? source.data : source;

  const value = (payload.items || []).map((user) => {
    // Если не указаны ни имя, ни фамилия — «Без имени (participant_code)»
    const hasName = Boolean(user.first_name || user.last_name);
    const fullName = hasName
      ? [user.first_name, user.third_name, user.last_name]
          .filter(Boolean)
          .join(" ")
      : "—";

    // Форматирование даты выигрыша через _shared.js функцию
    let created_at = user.created_at ? convertDateValue(user.created_at) : "";

    return {
      ...user,
      fullName,
      created_at,
    };
  });

  const columns = [
    { field: "participant_code", header: "Код", width: "8rem" },
    { field: "fullName", header: "Имя" },
    { field: "email", header: "E-mail" },
    { field: "status", header: "Статус", width: "6rem" },
    { field: "created_at", header: "Создан", width: "10rem" },
  ];

  return {
    value,
    columns,
    totalRecords: payload.pagination?.total_items || 0,
    first:
      ((payload.pagination?.page || 1) - 1) * (payload.pagination?.limit || 25),
    rows: payload.pagination?.limit || 25,
  };
}
