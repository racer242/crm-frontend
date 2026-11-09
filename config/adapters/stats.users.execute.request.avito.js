/**
 * Request adapter for executing the stats query for the "Participants" page
 * of the campaign avito_to_the_top (config/camps/avito_to_the_top/patch.json
 * swaps the script of stats.users.execute.request for this file).
 * POST ops/users-v2/query/[query_id]/execute → /api/v1/crm/stats/query/{query_id}/execute,
 * format json; the page's query is addressed by the manual query_id "users".
 *
 * Campaign specifics (SQL and sorting map of the avito instance —
 * .prompts/avito_req.md):
 *   - searchable columns: the standard registry set (ID участника u.id,
 *     код u.participant_code, имя/фамилия, email, телефон) PLUS the bot
 *     fields bu.avito_id / bu.telegram_id from the bot_users join
 *     (update 09.11.26 — per the customer request; originally bot fields only);
 *   - two extra report macros: {{CATEGORY_FILTER}} / {{LEAGUE_FILTER}} —
 *     "AND bu.category_code IN ('…')" / "AND bu.league_code IN ('…')" over the
 *     dictionary codes (values of the «Категория»/«Лига» dropdowns; IN is used
 *     per the server spec, so a single value is wrapped into a one-element
 *     list);
 *   - {{MAILING_FILTER}} stays in the campaign SQL, but the mailing column and
 *     filter are removed from the campaign UI — the macro is always sent as an
 *     empty string (no restriction);
 *   - sortable aliases: USERS_AVITO_SORTABLE_COLUMNS in _shared.js (avito_id,
 *     telegram_id, category_name, league_name added; the server maps the
 *     column name to SQL per its own sorting map).
 *
 * Everything else is identical to the reference stats.users.execute.request.js:
 * FRAGMENT macros are built HERE (the server substitutes the values into the
 * SQL text and validates that every macro of the report has a passed value —
 * a macro without a key gives 422), every key is always present in
 * replacements; an unused filter is an empty string.
 *
 * Mappings (reference spec §1.2-1.4 + .prompts/avito_req.md):
 *   - status / participant_status — options boolean array aligned with opts →
 *     "AND u.status IN ('active', 'deleted')";
 *   - mailing — always "" (the UI filter is removed for the campaign);
 *   - registration_date — [from, to] instants → wall time of the API server
 *     timezone → "AND u.created_at >= '…'" / "<= '…'" (no CONVERT_TZ);
 *   - balance — [min, max] → BETWEEN / >= / <=;
 *   - search — "AND (u.user_id LIKE '%…%' OR … OR bu.telegram_id LIKE '%…%')"
 *     over SEARCH_COLUMNS (standard registry fields + the bot fields) with
 *     % _ \ escaped and single quotes doubled;
 *   - category / league — request params of the «Категория»/«Лига» dropdowns
 *     (dictionary code, or an array of codes for a future MultiSelect) →
 *     IN fragments;
 *   - sortField (whitelist) + sortOrder (1/-1) → {{ORDER_BY}}/{{ORDER_DIR}};
 *     no sort → the default "created_at" + "DESC".
 *
 * Output: { page, limit, replacements }, page = Math.floor(first / limit) + 1.
 * The route is marked query: true — the entire result goes into the query
 * string; the server accepts nested replacements from the query as a JSON
 * object.
 */
const MACRO_KEYS = [
  "STATUS_FILTER",
  "PARTICIPANT_STATUS_FILTER",
  "MAILING_FILTER",
  "DATE_FROM_FILTER",
  "DATE_TO_FILTER",
  "BALANCE_FILTER",
  "SEARCH_FILTER",
  "CATEGORY_FILTER",
  "LEAGUE_FILTER",
  "ORDER_BY",
  "ORDER_DIR",
];

// Sortable column aliases live in _shared.js (USERS_AVITO_SORTABLE_COLUMNS /
// isUsersAvitoSortable) — the same whitelist drives the sortable flags of the
// table columns in stats.users.report.response.avito.js, so the UI never
// offers sorting the SQL cannot apply.
const DEFAULT_ORDER_BY = "created_at";
const DEFAULT_ORDER_DIR = "DESC";

// Hardcoded filter values (reference spec §1.3/§2):
// - options filters: opt position → DB value;
// (mailing values are not needed — the macro is always sent empty)
const STATUS_VALUES = ["active", "blocked", "deleted"];
const PARTICIPANT_STATUS_VALUES = ["ANKET_REQUIRED", "PARTICIPANT"];

// Searchable columns of the avito users registry (update 09.11.26, customer
// request): the standard registry fields — ID участника (u.id — the users PK;
// NOT u.user_id: the campaign SQL exposes it as u.id), код, имя, фамилия,
// email, телефон — PLUS the bot fields from the bot_users join
// (.prompts/avito_req.md). One fragment, OR-joined: a hit in any column
// matches the row.
const SEARCH_COLUMNS = [
  "u.id",
  "u.participant_code",
  "u.first_name",
  "u.last_name",
  "u.email",
  "u.phone",
  "bu.avito_id",
  "bu.telegram_id",
];

function transform(params = {}) {
  const { event = {}, ...base } = params;

  // 1. Merge: event overrides base only if the value is passed explicitly.
  // Filters come from state ({id, value} after the list format) or back from
  // the URL (mergeUrlParams may hand them over as a JSON string)
  let filters = base.filters;
  if (!Array.isArray(filters) && typeof filters === "string" && filters.charAt(0) === "[") {
    try {
      const parsed = JSON.parse(filters);
      filters = Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      filters = [];
    }
  }
  if (!Array.isArray(filters)) filters = [];

  const merged = {
    first: event.first !== undefined ? event.first : base.first,
    rows: event.rows !== undefined ? event.rows : base.rows,
    sortField: event.sortField !== undefined ? event.sortField : base.sortField,
    sortOrder: event.sortOrder !== undefined ? event.sortOrder : base.sortOrder,
    search: event.search !== undefined ? event.search : base.search,
    filters: filters,
    // Campaign params: «Категория»/«Лига» dropdown values (dictionary codes);
    // the pagination/sort events never carry them — base is enough
    category: base.category,
    league: base.league,
  };

  // 2. Pagination: first (offset) → page (page number); server caps limit at 100
  const limit = Math.min(Number(merged.rows) || 10, 100);
  const first = Number(merged.first) || 0;
  const page = Math.floor(first / limit) + 1;

  // 3. Every report macro is always present — a missing key gives 422;
  // an unused filter is an empty string
  const replacements = {};
  MACRO_KEYS.forEach((key) => {
    replacements[key] = "";
  });

  replacements.STATUS_FILTER = optionsToIn(
    filterValue(merged.filters, "status"),
    STATUS_VALUES,
    "u.status",
  );
  replacements.PARTICIPANT_STATUS_FILTER = optionsToIn(
    filterValue(merged.filters, "participant_status"),
    PARTICIPANT_STATUS_VALUES,
    "u.participant_status",
  );
  // MAILING_FILTER: the mailing filter/column are removed from the campaign
  // UI, but the macro stays in the campaign SQL — always an empty fragment
  replacements.MAILING_FILTER = "";
  replacements.DATE_FROM_FILTER = dateFragment(
    filterValue(merged.filters, "registration_date"),
    0,
    ">=",
  );
  replacements.DATE_TO_FILTER = dateFragment(
    filterValue(merged.filters, "registration_date"),
    1,
    "<=",
  );
  replacements.BALANCE_FILTER = balanceFragment(filterValue(merged.filters, "balance"));
  replacements.SEARCH_FILTER = searchFragment(merged.search);
  replacements.CATEGORY_FILTER = codesFragment(merged.category, "bu.category_code");
  replacements.LEAGUE_FILTER = codesFragment(merged.league, "bu.league_code");

  // 4. Sorting: whitelisted alias + direction; no sort → default created_at DESC
  const sortColumn = isUsersAvitoSortable(merged.sortField) ? merged.sortField : "";
  replacements.ORDER_BY = sortColumn || DEFAULT_ORDER_BY;
  replacements.ORDER_DIR = sortColumn
    ? Number(merged.sortOrder) === -1
      ? "DESC"
      : "ASC"
    : DEFAULT_ORDER_DIR;

  // 5. Contract payload — page/limit + replacement fragments, nothing else
  return {
    page,
    limit,
    replacements,
  };
}

function filterValue(filters, id) {
  const found = filters.find((f) => f && f.id === id);
  return found ? found.value : null;
}

// options: boolean array aligned with opts → "AND u.x IN ('a', 'b')";
// nothing selected → "" (filter unused)
function optionsToIn(value, dbValues, column) {
  if (!Array.isArray(value)) return "";
  const picked = value
    .map((on, index) => (on ? dbValues[index] : null))
    .filter((v) => typeof v === "string" && v !== "")
    .map(sqlString);
  if (picked.length === 0) return "";
  return "AND " + column + " IN (" + picked.join(", ") + ")";
}

// codes: «Категория»/«Лига» dropdown value — a dictionary code (string) or an
// array of codes → "AND bu.category_code IN ('CAT1', 'CAT2')"; empty → ""
// (IN is used per the server spec .prompts/avito_req.md, so a single value is
// wrapped into a one-element list)
function codesFragment(value, column) {
  const raw = Array.isArray(value) ? value : [value];
  const codes = raw
    .map((code) =>
      typeof code === "string" || typeof code === "number"
        ? String(code).trim()
        : "",
    )
    .filter((code) => code !== "");
  if (codes.length === 0) return "";
  return "AND " + column + " IN (" + codes.map(sqlString).join(", ") + ")";
}

// period: [from, to] → "AND u.created_at >= '…'" / "<= '…'" in the API timezone
function dateFragment(value, index, operator) {
  if (!Array.isArray(value)) return "";
  const wall = toZonedDateTime(value[index], getApiTimezone());
  if (!wall) return "";
  return "AND u.created_at " + operator + " " + sqlString(wall);
}

// balance: [min, max] → BETWEEN / >= / <=; bounds validated as numbers
function balanceFragment(value) {
  if (!Array.isArray(value)) return "";
  const min = numberOrNull(value[0]);
  const max = numberOrNull(value[1]);
  if (min !== null && max !== null) {
    return "AND u.balance BETWEEN " + min + " AND " + max;
  }
  if (min !== null) return "AND u.balance >= " + min;
  if (max !== null) return "AND u.balance <= " + max;
  return "";
}

function numberOrNull(value) {
  if (value === undefined || value === null || value === "") return null;
  const num = Number(value);
  return isNaN(num) ? null : String(num);
}

// search: "AND (bu.avito_id LIKE '%…%' OR bu.telegram_id LIKE '%…%')" over
// the searchable columns; empty/whitespace-only input → "" (filter unused)
function searchFragment(value) {
  const pattern = likePattern(String(value || "").trim());
  if (!pattern) return "";
  return (
    "AND (" +
    SEARCH_COLUMNS.map((column) => column + " LIKE '%" + pattern + "%'").join(" OR ") +
    ")"
  );
}

// The fragment is substituted into the SQL as text — sanitize the user input:
// backslash doubled first, then % and _ escaped for LIKE, single quotes doubled
function likePattern(value) {
  return String(value)
    .replace(/\\/g, "\\\\")
    .replace(/%/g, "\\%")
    .replace(/_/g, "\\_")
    .replace(/'/g, "''");
}
