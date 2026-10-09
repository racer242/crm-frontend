/**
 * Request adapter for executing the stats query for the "Receipts (v2)" page
 * (POST ops/receipts-v2/query/[query_id]/execute → /api/v1/crm/stats/query/{query_id}/execute,
 * format json; the page's query is addressed by the manual query_id "receipts",
 * spec .prompts/new_req_receipts.md — отчёт «Просмотр чеков»).
 *
 * The report SQL uses FRAGMENT macros: every {{…_FILTER}} stands for a whole SQL
 * condition ("AND r.status IN (…)"), {{ORDER_BY}}/{{ORDER_DIR}} — a column alias
 * and ASC/DESC. The server substitutes the replacement values into the SQL text
 * and validates that every macro of the report has a passed value — a macro
 * without a key in replacements gives 422 ("Не переданы значения макросов").
 * Therefore the fragments are built HERE, and every key of the report SQL is
 * always present in replacements; an unused filter is an empty string.
 *
 * Deliberate deviations from the spec, fixed to the users-page principles
 * (see stats.users.execute.request.js / §10.1 «Дополнение. Система статистики»):
 *  - payload is ONLY {page, limit, replacements} — the spec §1.1 payload keys
 *    sort/direction/search/filters do not exist in the real contract;
 *  - period filters do NOT use CONVERT_TZ('+00:00', '+03:00') (spec §1.3/§6):
 *    the instants are converted to the wall time of the API server timezone
 *    (toZonedDateTime/getApiTimezone) and sent as quoted string literals —
 *    same as startDate/endDate of «Запросов»; the report SQL compares the
 *    DATETIME columns directly (no CONVERT_TZ around the macros);
 *  - the engine sends sortField/sortOrder (1/-1), not sort/direction;
 *    the alias must be in the shared whitelist (isReceiptsV2Sortable),
 *    otherwise — the default "registration_date" + "DESC" (spec §1.2).
 *
 * Mappings (spec §1.3/§5/§6, implemented on the frontend):
 *   - moderation_status / fns_status — options boolean array aligned with opts
 *     → "AND r.status IN ('ACCEPTED', 'REFUSED', …)"; nothing selected AND
 *     everything selected → "" (spec §1.3 — restricting to all is meaningless);
 *   - retail_chain — NO UI filter («Торговая сеть» removed from the page by
 *     decision 09.10.26): the key RETAIL_CHAIN_FILTER is still always sent
 *     (the macro exists in the report SQL — a missing key gives 422) and its
 *     value is always "";
 *   - registration_date / purchase_date — [from, to] instants → wall time of
 *     the API timezone → "AND r.created_at >= '…'" / "AND r.purchase_at <= '…'";
 *   - promo_products_amount — [min, max] → "AND promo_products_amount BETWEEN
 *     min AND max" (>= / <= when one bound is missing; bounds validated as
 *     numbers); the column lives in the outer subquery alias — unqualified;
 *   - has_promo_products — checkbox true/false/null →
 *     "AND promo_products_count > 0" / "= 0" / "";
 *   - search — "AND (r.fn LIKE '%иван%' OR …)" over fn/fp/fd, participant_code,
 *     first_name, last_name, email with % _ \ escaped and single quotes doubled.
 *
 * Output: { page, limit, replacements }, page = Math.floor(first / limit) + 1.
 * The route is marked query: true — the entire result goes into the query string.
 */
const MACRO_KEYS = [
  "MODERATION_STATUS_FILTER",
  "FNS_STATUS_FILTER",
  "RETAIL_CHAIN_FILTER",
  "REGISTRATION_DATE_FROM_FILTER",
  "REGISTRATION_DATE_TO_FILTER",
  "PURCHASE_DATE_FROM_FILTER",
  "PURCHASE_DATE_TO_FILTER",
  "SEARCH_FILTER",
  "PROMO_AMOUNT_FILTER",
  "HAS_PROMO_FILTER",
  "ORDER_BY",
  "ORDER_DIR",
];

// Sortable column aliases live in _shared.js (RECEIPTS_V2_SORTABLE_COLUMNS /
// isReceiptsV2Sortable) — the same whitelist drives the sortable flags of the
// table columns in stats.receipts.report.response.js (spec §4 sort map).
const DEFAULT_ORDER_BY = "registration_date";
const DEFAULT_ORDER_DIR = "DESC";

// options filters: opt position → DB value (spec §5 mappings)
const MODERATION_STATUS_VALUES = [
  "CHECKING",
  "ACCEPTED",
  "REFUSED",
  "SUSPENDED",
  "NEED_PHOTO",
];
const FNS_STATUS_VALUES = ["no_check", "wait", "wrong", "correct"];
// period filters: filter id → SQL column (spec §5)
const PERIOD_COLUMNS = {
  registration_date: "r.created_at",
  purchase_date: "r.purchase_at",
};

// Searchable columns of the receipts registry (spec §1.4)
const SEARCH_COLUMNS = [
  "r.fn",
  "r.fp",
  "r.fd",
  "u.participant_code",
  "u.first_name",
  "u.last_name",
  "u.email",
];

function transform(params = {}) {
  const { event = {}, ...base } = params || {};

  // 1. Merge: event overrides base only if the value is passed explicitly
  const merged = { ...base };
  Object.keys(event).forEach((key) => {
    if (event[key] !== undefined) merged[key] = event[key];
  });

  // 2. Pagination: first/rows → page/limit (spec §1.1)
  const limit = Math.max(1, Number(merged.rows) || 10);
  const first = Math.max(0, Number(merged.first) || 0);
  const page = Math.floor(first / limit) + 1;

  // 3. Filters → fragment macros (every key always present; "" = unused)
  const filters = Array.isArray(merged.filters) ? merged.filters : [];
  const replacements = {};
  MACRO_KEYS.forEach((key) => {
    replacements[key] = "";
  });
  replacements.MODERATION_STATUS_FILTER = optionsToIn(
    filterValue(filters, "moderation_status"),
    MODERATION_STATUS_VALUES,
    "r.status",
  );
  replacements.FNS_STATUS_FILTER = optionsToIn(
    filterValue(filters, "fns_status"),
    FNS_STATUS_VALUES,
    "r.fns_status",
  );
  replacements.REGISTRATION_DATE_FROM_FILTER = periodFragment(
    filters,
    "registration_date",
    0,
    ">=",
  );
  replacements.REGISTRATION_DATE_TO_FILTER = periodFragment(
    filters,
    "registration_date",
    1,
    "<=",
  );
  replacements.PURCHASE_DATE_FROM_FILTER = periodFragment(
    filters,
    "purchase_date",
    0,
    ">=",
  );
  replacements.PURCHASE_DATE_TO_FILTER = periodFragment(
    filters,
    "purchase_date",
    1,
    "<=",
  );
  replacements.PROMO_AMOUNT_FILTER = rangeFragment(
    filterValue(filters, "promo_products_amount"),
    "promo_products_amount",
  );
  replacements.HAS_PROMO_FILTER = hasPromoFragment(
    filterValue(filters, "has_promo_products"),
  );
  replacements.SEARCH_FILTER = searchFragment(merged.search);

  // 4. Sorting: whitelisted alias + direction; no sort → default registration_date DESC
  const sortColumn = isReceiptsV2Sortable(merged.sortField) ? merged.sortField : "";
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

// options: boolean array aligned with opts → "AND r.x IN ('a', 'b')";
// nothing selected → "" AND everything selected → "" (spec §1.3: restricting
// to all options is meaningless)
function optionsToIn(value, dbValues, column) {
  if (!Array.isArray(value)) return "";
  const picked = value
    .map((on, index) => (on ? dbValues[index] : null))
    .filter((v) => typeof v === "string" && v !== "");
  if (picked.length === 0 || picked.length === dbValues.length) return "";
  return "AND " + column + " IN (" + picked.map(sqlString).join(", ") + ")";
}

// period: filter id → [from, to] → "AND {column} >= '…'" / "<= '…'" — the wall
// time of the API timezone (no CONVERT_TZ, see the header)
function periodFragment(filters, id, index, operator) {
  const value = filterValue(filters, id);
  if (!Array.isArray(value)) return "";
  const wall = toZonedDateTime(value[index], getApiTimezone());
  if (!wall) return "";
  return "AND " + PERIOD_COLUMNS[id] + " " + operator + " " + sqlString(wall);
}

// range: [min, max] → BETWEEN / >= / <=; bounds validated as numbers; the
// column lives in the outer subquery alias — referenced unqualified
function rangeFragment(value, column) {
  if (!Array.isArray(value)) return "";
  const min = numberOrNull(value[0]);
  const max = numberOrNull(value[1]);
  if (min !== null && max !== null) {
    return "AND " + column + " BETWEEN " + min + " AND " + max;
  }
  if (min !== null) return "AND " + column + " >= " + min;
  if (max !== null) return "AND " + column + " <= " + max;
  return "";
}

// checkbox: true → "AND promo_products_count > 0", false → "= 0", null → ""
function hasPromoFragment(value) {
  if (value === true) return "AND promo_products_count > 0";
  if (value === false) return "AND promo_products_count = 0";
  return "";
}

function numberOrNull(value) {
  if (value === undefined || value === null || value === "") return null;
  const num = Number(value);
  return isNaN(num) ? null : String(num);
}

// search: "AND (r.fn LIKE '%иван%' OR …)" over the searchable columns;
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