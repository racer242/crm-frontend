/**
 * Адаптер деталей розыгрыша (ops/raffles/[raffle_id] → GET /api/v1/crm/raffles/{id}, §8.3).
 * Преобразует ответ API в плоский объект для страниц просмотра/редактирования
 * (raffle.json / raffle-edit.json). В page dataFeed адаптер не указывается —
 * его применяет API-роутер, поэтому на вход может прийти как обёртка
 * {status, data}, так и чистые данные.
 */
function transform(response) {
  const data = (response && response.data) || response || {};
  if (!data || typeof data !== "object") return {};

  // Статусы розыгрыша (§3.5) — ключи в нижнем регистре, нормализация ниже.
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

  const statusKey = String(data.status || "").toLowerCase();
  const period =
    data.collection_period && typeof data.collection_period === "object"
      ? data.collection_period
      : {};
  const from = fmtDate(period.from);
  const to = fmtDate(period.to);
  // Признак публикации: новая версия API — is_published, прежняя — published.
  const published = data.is_published ?? data.published;

  return {
    // Идентификатор: актуальная версия API отдаёт `id`, ранее — `raffle_id`.
    id: data.id || data.raffle_id || "",
    // Сырые поля — для формы редактирования.
    name: data.name || "",
    chance_source_type: data.chance_source_type || "",
    collection_from: period.from || "",
    collection_to: period.to || "",
    // Лейблы — для просмотра.
    name_label: data.name || "—",
    status: data.status || "",
    status_label: statusLabels[statusKey] || data.status || "",
    status_severity: statusSeverities[statusKey] || "secondary",
    chance_source_type_label:
      sourceLabels[data.chance_source_type] ||
      data.chance_source_type ||
      "—",
    collection_period_label: (from || to)
      ? (from || "…") + " – " + (to || "…")
      : "—",
    // Дата проведения: новая версия — drawn_at, прежняя — conducted_at.
    type: data.type || "",
    type_label: data.type || "—",
    drawn_at: data.drawn_at || data.conducted_at || "",
    published: !!published,
    published_label: published ? "Да" : "Нет",
  };
}