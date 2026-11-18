/**
 * Request adapter for executing the "prizes" stats query
 * (POST ops/prizes/execute → /api/v1/crm/stats/query/prizes/execute,
 * format json; the query is addressed by the manual query_id "prizes",
 * SQL: .prompts/prizes.md — prize_instances × prize_catalog × user ×
 * выигрышные шансы розыгрышей).
 *
 * Literal routes (ops/prizes*) instead of the generic
 * ops/users-v2/query/[query_id] pair — same reason as prize-catalog/
 * receipts/transactions (the generic route is bound to the shared users
 * adapter keys).
 *
 * The report SQL uses macros: the server substitutes the replacement
 * values into the SQL text and validates that every macro of the report
 * has a passed value — a macro without a key gives 422. All 12 keys are
 * always present in replacements; unused — an empty string (§7 of the
 * spec):
 *   - POOL_STATUS_FILTER / STATUS_FILTER / ACT_STATUS_FILTER /
 *     RAFFLE_STATUS_FILTER — string-code options filters (§5.2): boolean
 *     array aligned with opts → "AND <col> IN ('code', …)"; nothing or ALL
 *     options selected → "" (no restriction). The DB codes behind the opts
 *     positions live in PRIZES_FILTERS (same order as the fallback opts of
 *     stats.prizes.report.response.js); when the server metadata carries
 *     its own mapping dict ({"0": "active", …}), its values win — the
 *     server may reorder opts;
 *   - RAFFLE_FILTER — the same options shape, but the mapped values are
 *     raffle UUIDs → UUID_TO_BIN('<uuid>') (§5.2); values outside the UUID
 *     format are dropped (sqlString-style sanitization of the substituted
 *     text);
 *   - HAS_OWNER_FILTER / HAS_RAFFLE_FILTER — checkbox (§5.2): true →
 *     "AND pi.user_id IS NOT NULL" / "AND rc.raffle_id IS NOT NULL",
 *     false → the IS NULL counterpart, unset → "";
 *   - ISSUED_DATE_FROM_FILTER / ISSUED_DATE_TO_FILTER — period
 *     `issued_date` over pi.issued_at (MSK wall dates, no CONVERT_TZ):
 *     the boundaries are built with toWallPeriodBound (_shared.js) —
 *     date-only 'YYYY-MM-DD' → from 'D 00:00:00' / to 'D 23:59:59' so the
 *     whole last day is covered (wall-date period contract of commit
 *     0b217f0; the naive §5.2 sample '>=' '<=' is strengthened the same
 *     way the receipts/transactions adapters do), ISO/Date values convert
 *     as before;
 *   - SEARCH_FILTER — 11 searchable fields of §6.1 (BIN_TO_UUID(pi.id),
 *     pi.external_id, pc.code, pc.title, BIN_TO_UUID(pi.user_id),
 *     u.participant_code, u.email, u.first_name, u.last_name,
 *     pi.act_scan_original_name, r.name) with % _ ' escaping
 *     (likePattern — каноническая санитизация, локальная копия как в
 *     users/receipts/transactions/prize-catalog адаптерах: в _shared.js её
 *     нет; спека §6.2 экранирует %_' — удвоение backslash идёт первым,
 *     надмножество спеки);
 *   - ORDER_BY / ORDER_DIR — the sorting map of the spec §4 (price_rub
 *     sorts by pc.price — копейки; full_name/act_scan_original_name are
 *     null = not sortable — the shared PRIZES_SORTABLE_COLUMNS whitelist
 *     in _shared.js is the same list); a value outside the map (or null)
 *     falls back to the report default "pi.created_at" + DESC.
 *
 * The spec §7 also shows top-level sort/direction/search/filters fields —
 * they are NOT sent: the live executor contract (users/receipts reports,
 * already in production) expects only page/limit/replacements — the macros
 * are built on the frontend (§1, §7).
 *
 * The table is lazy (standard pagination + sorting), so first/rows/sort
 * come from the DataTable events (event) or the URL params (base), same
 * merge rule as stats.prize-catalog.execute.request.js; search and filters
 * always come from the page state (base).
 *
 * Output: { page, limit, replacements }, page = Math.floor(first / limit) + 1.
 * The route is marked query: true — the entire result goes into the query
 * (the server accepts nested replacements as a JSON object).
 */
const MACRO_KEYS = [
  "POOL_STATUS_FILTER",
  "STATUS_FILTER",
  "ACT_STATUS_FILTER",
  "HAS_OWNER_FILTER",
  "HAS_RAFFLE_FILTER",
  "RAFFLE_FILTER",
  "RAFFLE_STATUS_FILTER",
  "ISSUED_DATE_FROM_FILTER",
  "ISSUED_DATE_TO_FILTER",
  "SEARCH_FILTER",
  "ORDER_BY",
  "ORDER_DIR",
];
const DEFAULT_ORDER_BY = "created_at";

// Sorting map of the spec §4 (alias → SQL expression; null = not sortable)
const ORDER_MAP = {
  instance_id: "pi.id",
  prize_code: "pc.code",
  prize_title: "pc.title",
  type_code: "pc.type_code",
  price_rub: "pc.price",
  points_cost: "pc.points_cost",
  act_required: "pc.act_required",
  user_id: "pi.user_id",
  participant_code: "u.participant_code",
  full_name: null,
  email: "u.email",
  issued_at: "pi.issued_at",
  pool_status: "pi.pool_status",
  status: "pi.status",
  act_status: "pi.act_status",
  act_scan_uploaded_at: "pi.act_scan_uploaded_at",
  act_scan_original_name: null,
  raffle_name: "r.name",
  raffle_type: "r.type",
  raffle_status: "r.status",
  drawn_at: "r.drawn_at",
  place: "rc.place",
  external_id: "pi.external_id",
  created_at: "pi.created_at",
};

// Filter defs of the spec §5.1: id → macro key + SQL column + DB values
// aligned with the fallback opts order (the FiltersPanel value for
// "options" filters is a boolean array aligned with opts). String codes are
// substituted quoted; the raffle values are UUIDs → UUID_TO_BIN('…').
// Checkboxes carry the ready SQL fragments; issued_date is a period filter
// (periodColumn) — the from/to boundaries go into two macros; when the
// server metadata carries its own mapping dict ({"0": "active", …}), its
// values win
const PRIZES_FILTERS = {
  pool_status: {
    macro: "POOL_STATUS_FILTER",
    column: "pi.pool_status",
    dbValues: ["active", "removing", "removed"],
  },
  status: {
    macro: "STATUS_FILTER",
    column: "pi.status",
    dbValues: [
      "FREE",
      "DATA_NEEDED",
      "RECEIVED",
      "SENDING",
      "SENT",
      "ERROR",
      "DOWNLOAD",
      "PROCESSING",
      "READY_FOR_DELIVERY",
      "NEED_CODE",
      "DELETED",
      "PENDING",
      "ACT_UPLOADED",
      "REJECTED",
    ],
  },
  act_status: {
    macro: "ACT_STATUS_FILTER",
    column: "pi.act_status",
    dbValues: ["PENDING", "ACT_UPLOADED", "APPROVED", "REJECTED"],
  },
  has_owner: {
    macro: "HAS_OWNER_FILTER",
    trueSql: "AND pi.user_id IS NOT NULL",
    falseSql: "AND pi.user_id IS NULL",
  },
  has_raffle: {
    macro: "HAS_RAFFLE_FILTER",
    trueSql: "AND rc.raffle_id IS NOT NULL",
    falseSql: "AND rc.raffle_id IS NULL",
  },
  raffle: {
    macro: "RAFFLE_FILTER",
    column: "r.id",
    dbValues: [],
    uuid: true,
  },
  raffle_status: {
    macro: "RAFFLE_STATUS_FILTER",
    column: "r.status",
    dbValues: ["DRAFT", "IN_PROGRESS", "COMPLETED", "PUBLISHED", "ANNULLED"],
  },
  issued_date: {
    periodColumn: "pi.issued_at",
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
    const def = PRIZES_FILTERS[filter.id];
    if (!def) return;
    if (def.trueSql) {
      replacements[def.macro] = checkboxFragment(filter.value, def);
    } else if (def.periodColumn) {
      const bounds = periodBounds(filter.value, def.periodColumn);
      replacements.ISSUED_DATE_FROM_FILTER = bounds.from;
      replacements.ISSUED_DATE_TO_FILTER = bounds.to;
    } else {
      replacements[def.macro] = optionsFragment(filter, def);
    }
  });

  // 4. Search — same escaping rules as the other stats adapters (likePattern)
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

// options: boolean array aligned with opts → "AND <col> IN ('code', …)";
// nothing or ALL options selected → "" (no restriction) — §5.2 of the spec.
// The DB codes come from the server mapping dict when the metadata carries
// one (the server may reorder opts), otherwise from the fallback dbValues
function optionsFragment(filter, def) {
  const dbValues = dbValuesFor(filter, def);
  if (!dbValues.length || !Array.isArray(filter.value)) return "";
  const picked = filter.value
    .map((on, index) => (on ? dbValues[index] : null))
    .filter((v) => typeof v === "string" && v !== "");
  if (picked.length === 0 || picked.length === dbValues.length) return "";
  const literals = picked
    .map(def.uuid ? uuidLiteral : sqlString)
    .filter((v) => v !== "");
  if (literals.length === 0) return "";
  return "AND " + def.column + " IN (" + literals.join(", ") + ")";
}

// DB values behind the boolean array: the server mapping dict wins
// ({"0": "active", …} → values by the numeric key order), otherwise the
// fallback dbValues aligned with the fallback opts order
function dbValuesFor(filter, def) {
  const mapping = filter && filter.mapping;
  if (mapping && typeof mapping === "object" && !Array.isArray(mapping)) {
    return Object.keys(mapping)
      .sort((a, b) => Number(a) - Number(b))
      .map((key) => mapping[key])
      .filter((v) => typeof v === "string" && v !== "");
  }
  return def.dbValues;
}

// checkbox: true → IS NOT NULL fragment, false → IS NULL fragment,
// unset (null/undefined) → "" — §5.2 of the spec
function checkboxFragment(value, def) {
  if (value === true) return def.trueSql;
  if (value === false) return def.falseSql;
  return "";
}

// period issued_date over pi.issued_at (MSK wall dates): boundaries via
// toWallPeriodBound (_shared.js) — date-only 'YYYY-MM-DD' → from
// 'D 00:00:00' / to 'D 23:59:59' (the whole last day is covered —
// wall-date contract 0b217f0); ISO/Date convert as before; a missing
// boundary → empty fragment
function periodBounds(value, column) {
  if (!Array.isArray(value) || value.length !== 2) return { from: "", to: "" };
  const from = toWallPeriodBound(value[0], "from");
  const to = toWallPeriodBound(value[1], "to");
  return {
    from: from ? "AND " + column + " >= '" + from + "'" : "",
    to: to ? "AND " + column + " <= '" + to + "'" : "",
  };
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

// String value for a quoted SQL literal (single quotes doubled)
function sqlString(value) {
  return "'" + String(value).replace(/'/g, "''") + "'";
}

// raffle options carry raffle UUIDs → UUID_TO_BIN('<uuid>'); values outside
// the UUID format are dropped — the substituted text is never trusted
const UUID_RE =
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
function uuidLiteral(value) {
  const s = String(value);
  if (!UUID_RE.test(s)) return "";
  return "UUID_TO_BIN('" + s.toLowerCase() + "')";
}

// search: 11 fields of the spec §6.1; UUIDs are searched as plain strings
// (partial match allowed, no format validation — §6.2)
function searchFragment(pattern) {
  const e = likePattern(pattern);
  const columns = [
    "BIN_TO_UUID(pi.id)",
    "pi.external_id",
    "pc.code",
    "pc.title",
    "BIN_TO_UUID(pi.user_id)",
    "u.participant_code",
    "u.email",
    "u.first_name",
    "u.last_name",
    "pi.act_scan_original_name",
    "r.name",
  ];
  return (
    "AND (" +
    columns.map((column) => column + " LIKE '%" + e + "%'").join(" OR ") +
    ")"
  );
}