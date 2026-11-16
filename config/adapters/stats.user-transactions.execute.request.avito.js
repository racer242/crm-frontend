/**
 * Request adapter for executing the "transactions of one participant" stats
 * query of the avito_to_the_top campaign (POST ops/user-transactions/execute
 * → /api/v1/crm/stats/query/user-transactions/execute, format json; the
 * query is addressed by the manual query_id "user-transactions",
 * SQL: .prompts/transactions-user.md).
 *
 * Dedicated campaign routes (ops/user-transactions*) instead of the generic
 * ops/users-v2/query/[query_id] pair — same reason as the transactions page
 * (see stats.transactions.execute.request.avito.js): the generic route is
 * bound to the shared users adapter keys with users macros.
 *
 * The report SQL uses 4 macros; the server validates that every macro has a
 * passed value — a missing key gives 422, so all 4 keys are always present:
 *   - USER_ID — UUID of the participant from the page route
 *     (/ops/users/[user_id]/transactions), taken from data.user_id
 *     (base params), wrapped into quotes (sqlString) — the server
 *     substitutes it into the SQL text as is;
 *   - SEARCH_FILTER — 7 searchable fields of the spec (transaction_id,
 *     type_code, status, task_code, league_code, error_message, tc.title)
 *     with % _ ' escaping (likePattern — каноническая санитизация, локальная
 *     копия как в users/receipts адаптерах: в _shared.js её нет; спека
 *     экранирует %_' — удвоение backslash идёт первым, надмножество спеки);
 *     the participant fields (avito_id, telegram_id, participant_code) are
 *     not searched — they are constant within the page;
 *   - ORDER_BY / ORDER_DIR — the sorting map of the spec (task_title →
 *     tc.title, segment → tc.segment, league_name by the SELECT alias,
 *     error_message is null = not sortable); a value outside the map (or
 *     null) falls back to the report default "processed_at_msk" + DESC.
 *
 * The table is lazy (standard pagination + sorting), so first/rows/sort come
 * from the DataTable events (event) or the URL params (base); user_id,
 * search come from the page state (base).
 *
 * Output: { page, limit, replacements }, page = Math.floor(first / limit) + 1.
 * The route is marked query: true — the entire result goes into the query.
 */
const MACRO_KEYS = ["USER_ID", "SEARCH_FILTER", "ORDER_BY", "ORDER_DIR"];
const DEFAULT_ORDER_BY = "processed_at_msk";

// Sorting map of the spec (alias → SQL expression; null = not sortable)
const ORDER_MAP = {
  transaction_id: "tl.transaction_id",
  processed_at_msk: "tl.processed_at",
  type_code: "tl.type_code",
  status: "tl.status",
  points: "tl.points",
  task_code: "tl.task_code",
  task_title: "tc.title",
  segment: "tc.segment",
  league_code: "tl.league_code",
  league_name: "league_name",
  error_message: null,
};

// The fragment is substituted into the SQL as text — sanitize the user input:
// backslash doubled first, then % and _ escaped for LIKE, single quotes doubled
// (каноническая санитизация — локальная копия, в _shared.js её нет)
function likePattern(value) {
  return String(value)
    .replace(/\\/g, "\\\\")
    .replace(/%/g, "\\%")
    .replace(/_/g, "\\_")
    .replace(/'/g, "''");
}

function transform(params = {}) {
  const { event = {}, ...base } = params;

  // 1. Merge: event overrides base only if the value is passed explicitly;
  //    user_id/search always come from the page state
  const merged = {
    first: event.first !== undefined ? event.first : base.first,
    rows: event.rows !== undefined ? event.rows : base.rows,
    sortField: event.sortField !== undefined ? event.sortField : base.sortField,
    sortOrder: event.sortOrder !== undefined ? event.sortOrder : base.sortOrder,
    user_id: base.user_id,
    search: base.search,
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

  // 4. USER_ID — the participant UUID from the page route
  const userId = String(merged.user_id || "").trim();
  if (userId) {
    replacements.USER_ID = sqlString(userId);
  }

  // 5. Search over the 7 transaction fields (participant fields are constant
  //    within the page and are not searched)
  const search = String(merged.search || "").trim();
  if (search) {
    const e = likePattern(search);
    const columns = [
      "tl.transaction_id",
      "tl.type_code",
      "tl.status",
      "tl.task_code",
      "tl.league_code",
      "tl.error_message",
      "tc.title",
    ];
    replacements.SEARCH_FILTER =
      "AND (" +
      columns.map((column) => column + " LIKE '%" + e + "%'").join(" OR ") +
      ")";
  }

  // 6. Sorting: alias out of the map (or null mapping) → the report default
  const expr =
    merged.sortField && ORDER_MAP[merged.sortField]
      ? ORDER_MAP[merged.sortField]
      : ORDER_MAP[DEFAULT_ORDER_BY];
  replacements.ORDER_BY = expr;
  replacements.ORDER_DIR =
    merged.sortField &&
    ORDER_MAP[merged.sortField] &&
    Number(merged.sortOrder) === 1
      ? "ASC"
      : "DESC";

  // 7. Contract payload — page/limit + replacement values, nothing else
  return { page, limit, replacements };
}
