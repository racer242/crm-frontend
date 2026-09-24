/**
 * Адаптер списка розыгрышей (ops/raffles → GET /api/v1/crm/raffles, §8.1).
 * Ответ API инстанса ({status:"ok", data:{items, pagination}}) →
 * формат lazy-таблицы {value, columns, totalRecords, first, rows}.
 * Колонки: ID розыгрыша (сокращённый UUID), Название, Тип,
 * Дата проведения (drawn_at), Дата публикации (publish_at), Статус,
 * Опубликован (is_published). Фолбэки на прежние имена полей:
 * raffle_id / conducted_at / published.
 */
function transform(source) {
  const payload = source.status === "ok" ? source.data : source;

  // Статусы розыгрыша (§3.5: draft → in_progress → completed → published, + annulled).
  // В API статус может прийти в любом регистре — ключи в нижнем, нормализация ниже.
  const statusLabels = {
    draft: "Черновик",
    in_progress: "Идёт розыгрыш",
    completed: "Завершён",
    published: "Опубликован",
    annulled: "Аннулирован",
  };
  const statusSeverities = {
    draft: "secondary",
    in_progress: "warning",
    completed: "info",
    published: "success",
    annulled: "danger",
  };

  const value = (payload.items || []).map((raffle) => {
    const statusKey = String(raffle.status || "").toLowerCase();
    const published = raffle.is_published ?? raffle.published;
    return {
      ...raffle,
      // Идентификатор: актуальная версия §8.1 отдаёт `id`, ранее — `raffle_id`.
      // Пустой id ломал переход на карточку: navigate уходил на /ops/raffles/
      // (список) и клик по строке выглядел «без действия».
      id: raffle.id || raffle.raffle_id || "",
      name_label: raffle.name || "—",
      type_label: raffle.type || "—",
      drawn_at: raffle.drawn_at || raffle.conducted_at || "",
      publish_at: raffle.publish_at || "",
      status_label: statusLabels[statusKey] || raffle.status || "",
      status_severity: statusSeverities[statusKey] || "secondary",
      published: !!published,
      published_label: published ? "Да" : "Нет",
    };
  });

  const columns = [
    { field: "id", header: "ID розыгрыша", width: "10rem", dataType: "uuid" },
    { field: "name_label", header: "Название" },
    { field: "type_label", header: "Тип", width: "10rem" },
    {
      field: "drawn_at",
      header: "Дата проведения",
      width: "12rem",
      dataType: "date",
    },
    {
      field: "publish_at",
      header: "Дата публикации",
      width: "12rem",
      dataType: "date",
    },
    { field: "status_label", header: "Статус", width: "11rem" },
    { field: "published_label", header: "Опубликован", width: "10rem" },
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