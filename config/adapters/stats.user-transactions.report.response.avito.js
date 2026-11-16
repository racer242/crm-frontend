/**
 * Response adapter for the metadata GET of the participant transactions stats
 * query of the avito_to_the_top campaign (GET ops/user-transactions →
 * /api/v1/crm/stats/query/user-transactions with the manual query_id
 * "user-transactions"; spec .prompts/transactions-user.md).
 *
 * Fallback-first contract (same pattern as the list adapter
 * stats.transactions.report.response.avito.js and the reference users/receipts
 * metadata adapters): while the backend does not return its own fields for the
 * query (or the GET fails until the query_id is registered), the adapter
 * builds the columns from the SPEC §3 — 11 columns of the participant
 * transactions table with the spec titles, sortable per the shared
 * USER_TRANSACTIONS_SORTABLE_COLUMNS whitelist in _shared.js (the same map
 * the request adapter applies). The query has NO filters (4 macros: USER_ID
 * from the route, search, sort) — the filters fallback is an empty array,
 * the page renders no FiltersPanel anyway.
 *
 * When the server metadata carries fields of its own — the server ones are
 * used (dataType ← type date/datetime — the DataTable formats them in the
 * viewer timezone).
 */
// Fallback columns of the spec §3 (titles of the task)
const USER_TRANSACTION_COLUMNS_FALLBACK = [
  { field: "transaction_id", header: "ID транзакции", type: "string" },
  { field: "processed_at_msk", header: "Дата обработки (МСК)", type: "datetime" },
  { field: "type_code", header: "Тип транзакции", type: "string" },
  { field: "status", header: "Статус обработки", type: "string" },
  { field: "points", header: "Баллы", type: "number" },
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
    // Error object / empty payload — build the page from the spec
    return {
      id: "",
      title: "",
      columns: USER_TRANSACTION_COLUMNS_FALLBACK.map(mapFallbackColumn),
      filters: [],
    };
  }

  const fields = Array.isArray(meta.fields) ? meta.fields : [];
  return {
    id: meta.id || "",
    title: meta.title || "",
    columns: fields.length
      ? fields.map(mapColumn)
      : USER_TRANSACTION_COLUMNS_FALLBACK.map(mapFallbackColumn),
    filters: Array.isArray(meta.filters) ? meta.filters : [],
  };
}

// Server field → display column (sortable per the shared whitelist, an
// explicit server-side sortable:false is respected)
function mapColumn(field) {
  if (!field || typeof field !== "object") return field;
  const column = {
    field: field.name,
    header: field.title || field.name,
    sortable: field.sortable !== false && isUserTransactionsSortable(field.name),
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
    sortable: isUserTransactionsSortable(entry.field),
  };
  if (entry.type === "date" || entry.type === "datetime") {
    column.dataType = "date";
  }
  return column;
}
