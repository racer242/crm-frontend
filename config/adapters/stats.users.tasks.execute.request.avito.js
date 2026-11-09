/**
 * Request adapter for executing the "participant tasks" stats query of the
 * avito_to_the_top campaign (POST ops/users-v2/tasks/execute →
 * /api/v1/crm/stats/query/user-avito-tasks/execute, format json; the query
 * is addressed by the manual query_id "user-avito-tasks",
 * SQL: .prompts/user-page-sql2.md).
 *
 * The report SQL uses macros: the server substitutes the replacement values
 * into the SQL text and validates that every macro of the report has a
 * passed value — a macro without a key gives 422. All 3 keys are always
 * present in replacements; unused — an empty string:
 *   - USER_ID — UUID of the card participant (bot_users.user_id) →
 *     UUID_TO_BIN({{USER_ID}}) in the query SQL; the page passes it as
 *     data.user_id ({$location.routeParams.user_id}), quoted via sqlString;
 *   - ORDER_BY — a value from the sorting mapping of the doc (bt.id,
 *     bt.task_code, …, display_status — by the SELECT alias: MySQL ORDER BY
 *     can reference aliases); an alias outside the whitelist (shared
 *     USERS_AVITO_TASKS_SORTABLE_COLUMNS in _shared.js) → the default
 *     "assigned_at" (new tasks on top);
 *   - ORDER_DIR — "ASC" at sortOrder 1, "DESC" at -1; no sort → "DESC".
 *
 * The tasks table is lazy (standard pagination + sorting), so first/rows
 * come from the DataTable events (event) or the URL params (base), same
 * merge rule as the reference stats.users.execute.request.js.
 *
 * Output: { page, limit, replacements }, page = Math.floor(first / limit) + 1.
 * The route is marked query: true — the entire result goes into the query
 * string.
 */
const MACRO_KEYS = ["USER_ID", "ORDER_BY", "ORDER_DIR"];
const DEFAULT_ORDER_BY = "assigned_at";
const DEFAULT_ORDER_DIR = "DESC";

// Sorting mapping of the doc (alias → SQL expression); the alias whitelist
// is shared — USERS_AVITO_TASKS_SORTABLE_COLUMNS in _shared.js (the same
// list drives the sortable flags of the metadata columns)
const ORDER_MAP = {
  task_id: "bt.id",
  task_code: "bt.task_code",
  status: "bt.status",
  display_status: "display_status",
  accrued_at: "bt.accrued_at",
  avito_id: "bt.avito_id",
  telegram_id: "bt.telegram_id",
  assigned_at: "bt.created_at",
  updated_at: "bt.updated_at",
};

function transform(params = {}) {
  const { event = {}, ...base } = params;

  // 1. Merge: event overrides base only if the value is passed explicitly
  const merged = {
    first: event.first !== undefined ? event.first : base.first,
    rows: event.rows !== undefined ? event.rows : base.rows,
    sortField: event.sortField !== undefined ? event.sortField : base.sortField,
    sortOrder: event.sortOrder !== undefined ? event.sortOrder : base.sortOrder,
    user_id: base.user_id,
  };

  // 2. Pagination: first (offset) → page (page number); server caps limit at 100
  const limit = Math.min(Number(merged.rows) || 10, 100);
  const first = Number(merged.first) || 0;
  const page = Math.floor(first / limit) + 1;

  // 3. Every report macro is always present — a missing key gives 422
  const replacements = {};
  MACRO_KEYS.forEach((key) => {
    replacements[key] = "";
  });
  const id = String(merged.user_id || "").trim();
  if (id) {
    replacements.USER_ID = sqlString(id);
  }
  const sortColumn = isUsersAvitoTasksSortable(merged.sortField)
    ? merged.sortField
    : "";
  replacements.ORDER_BY = sortColumn ? ORDER_MAP[sortColumn] : DEFAULT_ORDER_BY;
  replacements.ORDER_DIR = sortColumn
    ? Number(merged.sortOrder) === -1
      ? "DESC"
      : "ASC"
    : DEFAULT_ORDER_DIR;

  // 4. Contract payload — page/limit + replacement values, nothing else
  return { page, limit, replacements };
}