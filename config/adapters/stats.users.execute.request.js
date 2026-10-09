/**
 * Request adapter for executing the stats query for the "Participants (v2)" page
 * (POST ops/users-v2/query/[query_id]/execute → /api/v1/crm/stats/query/{query_id}/execute,
 * format json; the page's query is addressed by the manual query_id "users").
 *
 * The report SQL uses FRAGMENT macros: every {{…_FILTER}} stands for a whole SQL
 * condition ("AND u.status IN (…)"), {{ORDER_BY}}/{{ORDER_DIR}} — a column alias
 * and ASC/DESC. The server substitutes the replacement values into the SQL text
 * and validates that every macro of the report has a passed value — a macro
 * without a key in replacements gives 422 ("Не переданы значения макросов").
 * Therefore the fragments are built HERE, in this adapter (the server has no
 * filter-to-SQL mapping of its own — the "server configuration" of spec
 * .prompts/new_req_users.md does not exist), and every key of the report SQL is
 * always present in replacements; an unused filter is an empty string.
 *
 * Mappings (spec §1.2-1.4, implemented on the frontend):
 *   - status / participant_status — options boolean array aligned with opts →
 *     "AND u.status IN ('active', 'deleted')";
 *   - mailing — radio label («Принял»/«Не принял»/«Все», not chosen = «Все») →
 *     "AND u.mailing = 1" / "AND u.mailing = 0" / "";
 *   - registration_date — [from, to] instants → wall time of the API server
 *     timezone ("YYYY-MM-DD HH:mm:ss", toZonedDateTime/getApiTimezone) →
 *     "AND u.created_at >= '…'" / "<= '…'" — direct comparison in the data
 *     storage timezone, same as startDate/endDate of «Запросов» (no CONVERT_TZ,
 *     see CHANGELOG 07.10);
 *   - balance — [min, max] → "AND u.balance BETWEEN min AND max" (>= / <= when
 *     one bound is missing; bounds validated as numbers);
 *   - search — "AND (u.email LIKE '%иван%' OR …)" with % _ \ escaped and single
 *     quotes doubled (the fragment goes into the SQL as text — sanitize here);
 *   - sortField (whitelist of aliases) + sortOrder (1/-1) → {{ORDER_BY}}/{{ORDER_DIR}};
 *     no sort → the default "created_at" + "DESC".
 *
 * Output: { page, limit, replacements }, page = Math.floor(first / limit) + 1.
 * The route is marked query: true — the entire result goes into the query string;
 * the server accepts nested replacements from the query as a JSON object.
 */
const MACRO_KEYS = [
  "STATUS_FILTER",
  "PARTICIPANT_STATUS_FILTER",
  "MAILING_FILTER",
  "DATE_FROM_FILTER",
  "DATE_TO_FILTER",
  "BALANCE_FILTER",
  "SEARCH_FILTER",
  "ORDER_BY",
  "ORDER_DIR",
];

// Sortable column aliases live in _shared.js (USERS_V2_SORTABLE_COLUMNS /
// isUsersV2Sortable) — the same whitelist drives the sortable flags of the
// table columns in stats.users.report.response.js, so the UI never offers
// sorting the SQL cannot apply (full_name is a computed expression — not sortable).
const DEFAULT_ORDER_BY = "created_at";
const DEFAULT_ORDER_DIR = "DESC";

// Hardcoded filter values (spec §1.3/§2; labels live in USERS_FILTERS of the
// report response adapter):
// - options filters: opt position → DB value;
// - mailing: radio opt label → u.mailing (1 = consent given)
const STATUS_VALUES = ["active", "blocked", "deleted"];
const PARTICIPANT_STATUS_VALUES = ["ANKET_REQUIRED", "PARTICIPANT"];
const MAILING_VALUES = { "Принял": "1", "Не принял": "0" };

// Searchable columns of the users registry (spec §1.4)
const SEARCH_COLUMNS = [
  "u.email",
  "u.participant_code",
  "u.first_name",
  "u.last_name",
  "u.phone",
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
  replacements.MAILING_FILTER = mailingFragment(filterValue(merged.filters, "mailing"));
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

  // 4. Sorting: whitelisted alias + direction; no sort → default created_at DESC
  const sortColumn = isUsersV2Sortable(merged.sortField) ? merged.sortField : "";
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

// radio: value = opt label («Принял»/«Не принял»/«Все»); «Все», nothing or
// an unknown label → "" (no restriction)
function mailingFragment(value) {
  if (typeof value !== "string") return "";
  const db = MAILING_VALUES[value];
  return db ? "AND u.mailing = " + db : "";
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

// search: "AND (u.email LIKE '%иван%' OR …)" over the searchable columns;
// empty/whitespace-only input → "" (filter unused)
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