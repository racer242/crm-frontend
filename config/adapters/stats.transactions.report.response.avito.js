/**
 * Response adapter for the metadata GET of the transactions stats query of the
 * avito_to_the_top campaign (GET ops/transactions →
 * /api/v1/crm/stats/query/transactions with the manual query_id
 * "transactions"; spec .prompts/transactions.md).
 *
 * Fallback-first contract (same pattern as the reference users/receipts
 * metadata adapters): while the backend does not return its own fields/filters
 * for the query (or the GET fails until the query_id is registered), the
 * adapter builds the page from the SPEC — columns §3 (18 columns with the
 * spec titles, sortable per the shared TRANSACTIONS_SORTABLE_COLUMNS
 * whitelist in _shared.js — the same map the request adapter applies) and
 * filter definitions §5.1 (opts aligned with the DB values mapped by
 * stats.transactions.execute.request.avito.js; «Баллы» range without opts —
 * free «От»/«До» inputs per the codebase pattern, the spec's slider bounds
 * [0, 100] dropped same as receipts [0, 10000]). When the server metadata
 * carries fields/filters of its own — the server ones are used.
 *
 * Passthrough mapping: columns come from fields[] (field ← name, header ←
 * title, dataType ← type date/datetime — the DataTable formats them in the
 * viewer timezone); SQL never leaves the backend; an invalid payload (error
 * object) falls back to the spec set — the page stays functional instead of
 * rendering without columns/filters.
 */
// Filter definitions of the spec §5.1 with UI labels (name is rendered by
// FiltersPanel and ActiveFiltersBar). The FiltersPanel value for "options"
// filters is a boolean array aligned with opts — the DB values behind the
// positions live in TRANSACTION_FILTERS of the request adapter (same order).
const TRANSACTION_FILTERS_FALLBACK = [
  {
    id: "type_code",
    name: "Тип транзакции",
    type: "options",
    opts: ["Начисление баллов", "Назначение лиги"],
    value: null,
  },
  {
    id: "status",
    name: "Статус обработки",
    type: "options",
    opts: ["Успешно", "Ошибка"],
    value: null,
  },
  {
    id: "processed_date",
    name: "Период обработки",
    type: "period",
    opts: null,
    value: null,
  },
  {
    // range без opts: no slider, free «От»/«До» inputs (empty = bound not
    // set) — the users balance / receipts amount pattern; the spec's slider
    // bounds [0, 100] dropped
    id: "points",
    name: "Баллы",
    type: "range",
    opts: null,
    value: null,
  },
  {
    id: "league_code",
    name: "Лига",
    type: "options",
    opts: [
      "Cargo_S",
      "Cargo_ML",
      "Cargo_ML_big",
      "Evacuation_S",
      "Evacuation_ML",
      "Evacuation_ML_big",
      "Passenger_S",
      "Passenger_ML",
      "Passenger_ML_big",
    ],
    value: null,
  },
  {
    id: "segment",
    name: "Сегмент",
    type: "options",
    opts: ["S", "ML", "ML_big"],
    value: null,
  },
];

// Fallback columns of the spec §3 (titles of the task; internal service
// fields are not hidden — whatever the spec lists is displayed)
const TRANSACTION_COLUMNS_FALLBACK = [
  { field: "transaction_id", header: "ID транзакции", type: "string" },
  { field: "processed_at_msk", header: "Дата обработки (МСК)", type: "datetime" },
  { field: "type_code", header: "Тип транзакции", type: "string" },
  { field: "status", header: "Статус обработки", type: "string" },
  { field: "points", header: "Баллы", type: "number" },
  { field: "avito_id", header: "Avito ID", type: "string" },
  { field: "telegram_id", header: "Telegram ID", type: "number" },
  { field: "participant_code", header: "Код участника", type: "string" },
  { field: "user_id", header: "ID участника (пром.)", type: "string" },
  { field: "full_name", header: "ФИО", type: "string" },
  { field: "email", header: "Email", type: "string" },
  { field: "category_name", header: "Категория", type: "string" },
  { field: "task_code", header: "Код задания", type: "string" },
  { field: "task_title", header: "Название задания", type: "string" },
  { field: "segment", header: "Сегмент", type: "string" },
  { field: "league_code", header: "Код лиги", type: "string" },
  { field: "league_name", header: "Лига", type: "string" },
  { field: "error_message", header: "Причина ошибки", type: "string" },
];

function transform(data) {
  const meta = data && data.status === "ok" ? data.data : data;
  if (!meta || typeof meta !== "object") {
    // Error object / empty payload — build the page from the spec (the
    // query_id may not be registered on the backend yet)
    return buildMeta(
      "",
      "",
      TRANSACTION_COLUMNS_FALLBACK.map(mapFallbackColumn),
      TRANSACTION_FILTERS_FALLBACK,
    );
  }

  const fields = Array.isArray(meta.fields) ? meta.fields : [];
  const serverFilters = Array.isArray(meta.filters) ? meta.filters : null;
  return buildMeta(
    meta.id || "",
    meta.title || "",
    fields.length
      ? fields.map(mapColumn)
      : TRANSACTION_COLUMNS_FALLBACK.map(mapFallbackColumn),
    serverFilters || TRANSACTION_FILTERS_FALLBACK,
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
    sortable: field.sortable !== false && isTransactionsSortable(field.name),
  };
  if (field.type === "date" || field.type === "datetime") {
    column.dataType = "date";
  }
  return column;
}

// Spec §3 fallback entry → display column (same rules, entry already holds
// field/header/type)
function mapFallbackColumn(entry) {
  const column = {
    field: entry.field,
    header: entry.header,
    sortable: isTransactionsSortable(entry.field),
  };
  if (entry.type === "date" || entry.type === "datetime") {
    column.dataType = "date";
  }
  return column;
}
