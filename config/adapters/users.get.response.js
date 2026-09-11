/**
 * Адаптер для списка участников (ops/users)
 */
function transform(source) {
  const payload = source.status === "ok" ? source.data : source;

  const value = (payload.items || []).map((user) => {
    const parts = [user.first_name, user.third_name, user.last_name].filter(
      Boolean,
    );

    // Форматирование даты выигрыша через _shared.js функцию
    let created_at = user.created_at ? convertDateValue(user.created_at) : "";

    return {
      ...user,
      fullName: parts.length > 0 ? parts.join(" ") : "—",
      created_at,
    };
  });

  const columns = [
    { field: "id", header: "ID", width: "8rem" },
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
      ((payload.pagination?.page || 1) - 1) * (payload.pagination?.limit || 20),
    rows: payload.pagination?.limit || 20,
  };
}
