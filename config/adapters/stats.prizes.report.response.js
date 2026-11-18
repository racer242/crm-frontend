/**
 * Response adapter for the metadata GET of the "prizes" stats query
 * (GET ops/prizes → /api/v1/crm/stats/query/prizes with the manual
 * query_id "prizes"; spec .prompts/prizes.md — экземпляры призов
 * участников: prize_instances + prize_catalog + user + выигрышные шансы
 * розыгрышей).
 *
 * Fallback-first contract (same pattern as the reference users/receipts
 * metadata adapters, the transactions ones and the prize-catalog one):
 * while the backend does not return its own fields/filters for the query
 * (or the GET fails until the query_id is registered), the adapter builds
 * the page from the SPEC — table columns §3 (24 columns with the spec
 * titles; sortable per the shared PRIZES_SORTABLE_COLUMNS whitelist in
 * _shared.js — the same list the request adapter applies; full_name and
 * act_scan_original_name are not sortable) and the eight filter
 * definitions §5.1: pool_status/status/act_status/raffle_status options
 * (the DB values behind the opts positions live in PRIZES_FILTERS of the
 * request adapter, same order), has_owner/has_raffle checkboxes, raffle
 * options with EMPTY opts until the server metadata carries the dynamic
 * raffle list (spec §5.1: «opts заполняются динамически» — список
 * розыгрышей не хардкодится) and the issued_date period over
 * pi.issued_at. When the server metadata carries fields/filters of its
 * own — the server ones are used.
 *
 * Passthrough mapping: columns come from fields[] (field ← name, header ←
 * title, dataType ← type date/datetime/uuid); SQL never leaves the
 * backend; an invalid payload (error object) falls back to the spec set —
 * the page stays functional instead of rendering without columns/filters.
 */
// Filter definitions of the spec §5.1 with UI labels (name is rendered by
// FiltersPanel and ActiveFiltersBar)
const PRIZES_FILTERS_FALLBACK = [
  {
    id: "pool_status",
    name: "Статус в пуле",
    type: "options",
    opts: ["В пуле", "К изъятию", "Изъят"],
    value: null,
  },
  {
    id: "status",
    name: "Статус приза",
    type: "options",
    opts: [
      "Свободен",
      "Нужны данные",
      "Получен",
      "Отправляется",
      "Отправлен",
      "Ошибка",
      "Скачивается",
      "В обработке",
      "Готов к выдаче",
      "Нужен код",
      "Удалён",
      "Ожидает (legacy)",
      "Акт загружен (legacy)",
      "Отклонён (legacy)",
    ],
    value: null,
  },
  {
    id: "act_status",
    name: "Статус акта",
    type: "options",
    opts: ["Ожидает", "Акт загружен", "Подтверждён", "Отклонён"],
    value: null,
  },
  { id: "has_owner", name: "Выдан участнику", type: "checkbox", value: null },
  {
    id: "has_raffle",
    name: "Выигран в розыгрыше",
    type: "checkbox",
    value: null,
  },
  { id: "raffle", name: "Розыгрыш", type: "options", opts: [], value: null },
  {
    id: "raffle_status",
    name: "Статус розыгрыша",
    type: "options",
    opts: ["Черновик", "В процессе", "Завершён", "Опубликован", "Аннулирован"],
    value: null,
  },
  {
    id: "issued_date",
    name: "Период выдачи",
    type: "period",
    column: "pi.issued_at",
    value: null,
  },
];

// Fallback columns of the spec §3 (full list; sortable flags come from the
// shared whitelist)
const PRIZES_COLUMNS_FALLBACK = [
  { field: "instance_id", header: "ID экземпляра", type: "uuid" },
  { field: "prize_code", header: "Код приза в CRM", type: "string" },
  { field: "prize_title", header: "Название приза", type: "string" },
  { field: "type_code", header: "Группа (тип)", type: "string" },
  { field: "price_rub", header: "Стоимость, ₽ (для акта)", type: "number" },
  { field: "points_cost", header: "Цена в баллах", type: "number" },
  { field: "act_required", header: "Нужен акт получения", type: "boolean" },
  { field: "user_id", header: "ID владельца", type: "uuid" },
  { field: "participant_code", header: "Код участника", type: "string" },
  { field: "full_name", header: "ФИО владельца", type: "string" },
  { field: "email", header: "Email владельца", type: "string" },
  { field: "issued_at", header: "Дата выдачи", type: "datetime" },
  { field: "pool_status", header: "Статус в пуле", type: "string" },
  { field: "status", header: "Статус приза", type: "string" },
  { field: "act_status", header: "Статус акта", type: "string" },
  {
    field: "act_scan_uploaded_at",
    header: "Дата загрузки акта",
    type: "datetime",
  },
  { field: "act_scan_original_name", header: "Файл акта", type: "string" },
  { field: "raffle_name", header: "Розыгрыш", type: "string" },
  { field: "raffle_type", header: "Тип розыгрыша", type: "string" },
  { field: "raffle_status", header: "Статус розыгрыша", type: "string" },
  { field: "drawn_at", header: "Дата розыгрыша", type: "datetime" },
  { field: "place", header: "Место в розыгрыше", type: "number" },
  { field: "external_id", header: "ID во внешней системе", type: "string" },
  { field: "created_at", header: "Дата создания", type: "datetime" },
];

function transform(data) {
  const meta = data && data.status === "ok" ? data.data : data;
  if (!meta || typeof meta !== "object") {
    // Error object / empty payload — build the page from the spec (the
    // query_id may not be registered on the backend yet)
    return buildMeta(
      "",
      "",
      PRIZES_COLUMNS_FALLBACK.map(mapFallbackColumn),
      PRIZES_FILTERS_FALLBACK,
    );
  }

  const fields = Array.isArray(meta.fields) ? meta.fields : [];
  const serverFilters = Array.isArray(meta.filters) ? meta.filters : null;
  return buildMeta(
    meta.id || "",
    meta.title || "",
    fields.length
      ? fields.map(mapColumn)
      : PRIZES_COLUMNS_FALLBACK.map(mapFallbackColumn),
    serverFilters || PRIZES_FILTERS_FALLBACK,
  );
}

function buildMeta(id, title, columns, filters) {
  return { id, title, columns, filters };
}

// Server field → display column (sortable per the shared whitelist, an
// explicit server-side sortable:false is respected)
function mapColumn(field) {
  if (!field || typeof field !== "object") return field;
  const column = {
    field: field.name,
    header: field.title || field.name,
    sortable: field.sortable !== false && isPrizesSortable(field.name),
  };
  if (field.type === "date" || field.type === "datetime") {
    column.dataType = "date";
  }
  if (field.type === "uuid") {
    column.dataType = "uuid";
  }
  return column;
}

// Spec §3 fallback entry → display column (same rules, entry already holds
// field/header/type)
function mapFallbackColumn(entry) {
  const column = {
    field: entry.field,
    header: entry.header,
    sortable: isPrizesSortable(entry.field),
  };
  if (entry.type === "date" || entry.type === "datetime") {
    column.dataType = "date";
  }
  if (entry.type === "uuid") {
    column.dataType = "uuid";
  }
  return column;
}