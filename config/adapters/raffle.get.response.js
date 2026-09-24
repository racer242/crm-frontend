/**
 * Адаптер деталей розыгрыша (ops/raffles/[raffle_id] → GET /api/v1/crm/raffles/{id}, §8.3).
 * Преобразует ответ API в плоский объект для страниц просмотра/редактирования
 * (raffle.json / raffle-edit.json). В page dataFeed адаптер не указывается —
 * его применяет API-роутер, поэтому на вход может прийти как обёртка
 * {status, data}, так и чистые данные.
 *
 * Выводятся все поля карточки: id, name, type, status, collection_from/to,
 * source_types (массив), start_at/end_at, publish_at, drawn_at, is_published,
 * is_editable (активность кнопки «Редактировать»), is_stale, created_at,
 * updated_at, booked_chances, annul_reason. Для дат отдаются пары
 * `поле` (сырой ISO) + `поле_label` (ISO либо «—» для null); форматирование
 * выполняет Text с dataType:"date" на клиенте (зона зрителя).
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

  const statusKey = String(data.status || "").toLowerCase();
  // Сбор шансов: новая версия API — плоские collection_from/to,
  // прежняя — вложенный объект collection_period {from, to}.
  const period =
    data.collection_period && typeof data.collection_period === "object"
      ? data.collection_period
      : {};
  const from = data.collection_from || period.from || "";
  const to = data.collection_to || period.to || "";

  // Источники шансов: актуальная версия API — source_types (массив кодов),
  // прежняя — chance_source_type (строка).
  const sourceTypes = Array.isArray(data.source_types)
    ? data.source_types
    : data.chance_source_type
      ? [data.chance_source_type]
      : [];
  const sourceTypesLabel = sourceTypes.length
    ? sourceTypes.map((t) => sourceLabels[t] || t).join(", ")
    : "—";

  // Признак публикации: новая версия API — is_published, прежняя — published.
  const published = data.is_published ?? data.published;
  const drawnAt = data.drawn_at || data.conducted_at || "";
  // Дата/«—» для Text с dataType:"date": не-дата выводится как есть.
  const dateOrDash = (v) => v || "—";

  return {
    // Идентификатор: актуальная версия API отдаёт `id`, ранее — `raffle_id`.
    id: data.id || data.raffle_id || "",
    name: data.name || "",
    name_label: data.name || "—",
    type: data.type || "",
    type_label: data.type || "—",

    status: data.status || "",
    status_label: statusLabels[statusKey] || data.status || "",
    status_severity: statusSeverities[statusKey] || "secondary",

    // Сбор шансов (для формы — сырые значения, для просмотра — лейблы).
    collection_from: from,
    collection_to: to,
    collection_from_label: dateOrDash(from),
    collection_to_label: dateOrDash(to),
    collection_period_label: (from || to)
      ? (from || "…") + " – " + (to || "…")
      : "—",

    // Типы источников сбора шансов.
    source_types: sourceTypes,
    source_types_label: sourceTypesLabel,

    // Жизненный цикл: начало/конец проведения, публикация, проведение.
    start_at: data.start_at || "",
    start_at_label: dateOrDash(data.start_at),
    end_at: data.end_at || "",
    end_at_label: dateOrDash(data.end_at),
    publish_at: data.publish_at || "",
    publish_at_label: dateOrDash(data.publish_at),
    drawn_at: drawnAt,
    drawn_at_label: dateOrDash(drawnAt),

    is_published: !!published,
    published_label: published ? "Да" : "Нет",

    // Разрешено редактировать — активность кнопки «Редактировать».
    is_editable: !!data.is_editable,
    edit_disabled: !data.is_editable,

    // Служебные поля.
    is_stale: !!data.is_stale,
    is_stale_label: data.is_stale ? "Да" : "Нет",
    created_at: data.created_at || "",
    created_at_label: dateOrDash(data.created_at),
    updated_at: data.updated_at || "",
    updated_at_label: dateOrDash(data.updated_at),
    booked_chances:
      typeof data.booked_chances === "number" ? data.booked_chances : "",
    booked_chances_label:
      data.booked_chances === null || data.booked_chances === undefined
        ? "—"
        : String(data.booked_chances),
    annul_reason: data.annul_reason || "",
    annul_reason_label: data.annul_reason || "—",
  };
}