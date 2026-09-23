/**
 * Адаптер списка розыгрышей (ops/raffles → GET /api/v1/crm/raffles, §8.1).
 * Ответ API инстанса ({status:"ok", data:{items, pagination}}) →
 * формат lazy-таблицы {value, columns, totalRecords, first, rows}.
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

  // Типы источников шансов (настройка инстанса raffle_chance_source_types).
  const sourceLabels = {
    receipt: "Чек",
    promo_code: "Промокод",
    gtin_code: "Код GTIN",
    game_win: "Победа в игре",
    points_purchase: "Покупка за баллы",
    manual: "Вручную",
  };

  const pad = (n) => String(n).padStart(2, "0");
  const fmtDate = (v) => {
    if (!v) return "";
    const d = new Date(v);
    if (isNaN(d.getTime())) return String(v);
    return (
      pad(d.getDate()) + "." + pad(d.getMonth() + 1) + "." + d.getFullYear()
    );
  };
  const fmtDateTime = (v) => {
    if (!v) return "";
    const d = new Date(v);
    if (isNaN(d.getTime())) return String(v);
    return (
      pad(d.getDate()) +
      "." +
      pad(d.getMonth() + 1) +
      "." +
      d.getFullYear() +
      " " +
      pad(d.getHours()) +
      ":" +
      pad(d.getMinutes())
    );
  };

  // Срок сбора {from, to} → «01.10.2026 – 15.10.2026».
  const periodLabel = (period) => {
    if (!period || typeof period !== "object") return "—";
    const from = fmtDate(period.from);
    const to = fmtDate(period.to);
    if (!from && !to) return "—";
    return (from || "…") + " – " + (to || "…");
  };

  const value = (payload.items || []).map((raffle) => {
    const statusKey = String(raffle.status || "").toLowerCase();
    return {
      ...raffle,
      id: raffle.raffle_id || "",
      name_label: raffle.name || "—",
      status_label: statusLabels[statusKey] || raffle.status || "",
      status_severity: statusSeverities[statusKey] || "secondary",
      source_type_label:
        sourceLabels[raffle.chance_source_type] ||
        raffle.chance_source_type ||
        "—",
      period_label: periodLabel(raffle.collection_period),
      conducted_at_label: fmtDateTime(raffle.conducted_at) || "—",
      published_label: raffle.published ? "Да" : "Нет",
    };
  });

  const columns = [
    { field: "name_label", header: "Название" },
    { field: "id", header: "ID", width: "12rem", dataType: "uuid" },
    { field: "status_label", header: "Статус", width: "11rem" },
    { field: "source_type_label", header: "Источник шансов", width: "12rem" },
    { field: "period_label", header: "Срок сбора", width: "15rem" },
    {
      field: "conducted_at",
      header: "Дата проведения",
      width: "12rem",
      dataType: "date",
    },
    { field: "published_label", header: "Публикация", width: "8rem" },
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