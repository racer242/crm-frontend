/**
 * Request adapter for executing the "chat-bot transactions" stats query of the
 * avito_to_the_top campaign (POST ops/transactions/execute →
 * /api/v1/crm/stats/query/transactions/execute, format json; the query is
 * addressed by the manual query_id "transactions",
 * SQL: .prompts/transactions.md).
 *
 * Dedicated campaign routes (ops/transactions*) instead of the generic
 * ops/users-v2/query/[query_id] pair: the generic route is bound to the
 * shared users adapter keys (users macros: bu.category_code, u.status…),
 * which do not fit the transactions SQL (tl.*, tc.segment) — same reason the
 * receipts page got its own ops/receipts/query/[query_id] pair.
 *
 * The report SQL uses macros: the server substitutes the replacement values
 * into the SQL text and validates that every macro of the report has a
 * passed value — a macro without a key gives 422. All 10 keys are always
 * present in replacements; unused — an empty string (§7 of the spec):
 *   - TYPE_FILTER / STATUS_FILTER / LEAGUE_FILTER / SEGMENT_FILTER —
 *     "AND <col> IN ('…')" over the FiltersPanel boolean selections aligned
 *     with the filter opts (server metadata §5.1). Per the spec an options
 *     filter with NOTHING or with ALL options selected is sent empty (no
 *     restriction); partial selection → IN over the mapped codes
 *     (TRANSACTION_FILTERS below);
 *   - DATE_FROM_FILTER / DATE_TO_FILTER — period "Период обработки" →
 *     "AND tl.processed_at >= CONVERT_TZ('<wall MSK>', '+03:00', '+00:00')"
 *     (bot_* stores UTC; the filter panel sends MSK wall time — §5.2/§9.1;
 *     getApiTimezone() is Europe/Moscow, the '+03:00' offset in CONVERT_TZ
 *     is hardcoded per the spec);
 *   - POINTS_FILTER — range → "AND tl.points >= min / <= max" (bounds
 *     validated as numbers);
 *   - SEARCH_FILTER — 11 searchable fields (transaction_id, avito_id,
 *     task_code, league_code, BIN_TO_UUID(bu.user_id), participant_code,
 *     CAST(telegram_id AS CHAR), email, first_name, last_name, tc.title)
 *     with % _ ' escaping (likePattern — каноническая санитизация, локальная
 *     копия как в users/receipts адаптерах: в _shared.js её нет; спека §6.2
 *     экранирует %_' — удвоение backslash идёт первым, надмножество спеки);
 *   - ORDER_BY / ORDER_DIR — the sorting map of the spec §4 (category_name/
 *     league_name by the SELECT alias; full_name/error_message are null =
 *     not sortable); a value outside the map (or null) falls back to the
 *     report default "processed_at_msk" + DESC.
 *
 * The transactions table is lazy (standard pagination + sorting), so
 * first/rows/sort come from the DataTable events (event) or the URL params
 * (base), same merge rule as stats.users.execute.request.avito.js; search
 * and filters always come from the page state (base).
 *
 * Output: { page, limit, replacements }, page = Math.floor(first / limit) + 1.
 * The route is marked query: true — the entire result goes into the query
 * (the server accepts nested replacements as a JSON object).
 */
const MACRO_KEYS = [
  "TYPE_FILTER",
  "STATUS_FILTER",
  "DATE_FROM_FILTER",
  "DATE_TO_FILTER",
  "POINTS_FILTER",
  "LEAGUE_FILTER",
  "SEGMENT_FILTER",
  "SEARCH_FILTER",
  "ORDER_BY",
  "ORDER_DIR",
];
const DEFAULT_ORDER_BY = "processed_at_msk";

// Sorting map of the spec §4 (alias → SQL expression; null = not sortable)
const ORDER_MAP = {
  transaction_id: "tl.transaction_id",
  processed_at_msk: "tl.processed_at",
  type_code: "tl.type_code",
  status: "tl.status",
  points: "tl.points",
  avito_id: "tl.avito_id",
  telegram_id: "bu.telegram_id",
  participant_code: "bu.participant_code",
  user_id: "bu.user_id",
  full_name: null,
  email: "u.email",
  category_name: "category_name",
  task_code: "tl.task_code",
  task_title: "tc.title",
  segment: "tc.segment",
  league_code: "tl.league_code",
  league_name: "league_name",
  error_message: null,
};

// Filter defs of the spec §5.1: id → column + codes aligned with opts
// (the FiltersPanel value for "options" filters is a boolean array aligned
// with the server's opts order)
const TRANSACTION_FILTERS = {
  type_code: {
    column: "tl.type_code",
    dbValues: ["TASK", "LEAGUE"],
  },
  status: {
    column: "tl.status",
    dbValues: ["success", "error"],
  },
  league_code: {
    column: "tl.league_code",
    dbValues: [
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
  },
  segment: {
    column: "tc.segment",
    dbValues: ["S", "ML", "ML_big"],
  },
};

function transform(params = {}) {
  const { event = {}, ...base } = params;

  // 1. Merge: event overrides base only if the value is passed explicitly;
  //    search/filters always come from the page state
  const merged = {
    first: event.first !== undefined ? event.first : base.first,
    rows: event.rows !== undefined ? event.rows : base.rows,
    sortField: event.sortField !== undefined ? event.sortField : base.sortField,
    sortOrder: event.sortOrder !== undefined ? event.sortOrder : base.sortOrder,
    search: base.search,
    filters: base.filters,
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
  (Array.isArray(merged.filters) ? merged.filters : []).forEach((filter) => {
    if (!filter || !filter.id) return;
    const def = TRANSACTION_FILTERS[filter.id];
    if (def) {
      replacements[optionsMacroKey(filter.id)] = optionsFragment(
        filter.value,
        def,
      );
      return;
    }
    if (filter.id === "processed_date") {
      const period = periodFragment(filter.value);
      replacements.DATE_FROM_FILTER = period.from;
      replacements.DATE_TO_FILTER = period.to;
      return;
    }
    if (filter.id === "points") {
      replacements.POINTS_FILTER = rangeFragment(filter.value);
    }
  });

  // 4. Search — same escaping rules as the users adapter (likePattern)
  const search = String(merged.search || "").trim();
  if (search) {
    replacements.SEARCH_FILTER = searchFragment(search);
  }

  // 5. Sorting: alias out of the map (or null mapping) → the report default
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

  // 6. Contract payload — page/limit + replacement values, nothing else
  return { page, limit, replacements };
}

// Filter id → the replacements macro key (TYPE_FILTER, STATUS_FILTER,
// LEAGUE_FILTER, SEGMENT_FILTER)
function optionsMacroKey(id) {
  return (
    {
      type_code: "TYPE_FILTER",
      status: "STATUS_FILTER",
      league_code: "LEAGUE_FILTER",
      segment: "SEGMENT_FILTER",
    }[id] || ""
  );
}

// options: boolean array aligned with opts → "AND <col> IN ('…')";
// nothing or ALL options selected → "" (no restriction) — §5.2 of the spec
function optionsFragment(value, def) {
  if (!Array.isArray(value)) return "";
  const picked = value
    .map((on, index) => (on ? def.dbValues[index] : null))
    .filter((v) => typeof v === "string" && v !== "")
    .map(sqlString);
  if (picked.length === 0 || picked.length === def.dbValues.length) return "";
  return "AND " + def.column + " IN (" + picked.join(", ") + ")";
}

// period: [from, to] → wall MSK time wrapped into CONVERT_TZ — bot_* stores
// UTC while the filter panel works with MSK wall time (§5.2/§9.1)
function periodFragment(value) {
  if (!Array.isArray(value) || value.length !== 2) return { from: "", to: "" };
  const from = toZonedDateTime(value[0], getApiTimezone());
  const to = toZonedDateTime(value[1], getApiTimezone());
  return {
    from: from
      ? "AND tl.processed_at >= CONVERT_TZ(" + sqlString(from) + ", '+03:00', '+00:00')"
      : "",
    to: to
      ? "AND tl.processed_at <= CONVERT_TZ(" + sqlString(to) + ", '+03:00', '+00:00')"
      : "",
  };
}

// range: [min, max] → "AND tl.points >= min AND tl.points <= max";
// bounds validated as numbers, missing bounds are skipped
function rangeFragment(value) {
  if (!Array.isArray(value)) return "";
  const min = numberOrNull(value[0]);
  const max = numberOrNull(value[1]);
  const parts = [];
  if (min !== null) parts.push("tl.points >= " + min);
  if (max !== null) parts.push("tl.points <= " + max);
  return parts.length ? "AND " + parts.join(" AND ") : "";
}

function numberOrNull(value) {
  if (value === undefined || value === null || value === "") return null;
  const num = Number(value);
  return isNaN(num) ? null : String(num);
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

// search: 11 fields of the spec §6.2; UUID is searched as a plain string
// (partial match allowed, no format validation — §6.1)
function searchFragment(pattern) {
  const e = likePattern(pattern);
  const columns = [
    "tl.transaction_id",
    "tl.avito_id",
    "tl.task_code",
    "tl.league_code",
    "BIN_TO_UUID(bu.user_id)",
    "bu.participant_code",
    "CAST(bu.telegram_id AS CHAR)",
    "u.email",
    "u.first_name",
    "u.last_name",
    "tc.title",
  ];
  return (
    "AND (" +
    columns.map((column) => column + " LIKE '%" + e + "%'").join(" OR ") +
    ")"
  );
}
