/**
 * Request adapter for executing the "prize catalog" stats query
 * (POST ops/prize-catalog/execute →
 * /api/v1/crm/stats/query/prize-catalog/execute, format json; the query is
 * addressed by the manual query_id "prize-catalog",
 * SQL: .prompts/prize-catalog.md).
 *
 * Literal routes (ops/prize-catalog*) instead of the generic
 * ops/users-v2/query/[query_id] pair: the generic route is bound to the
 * shared users adapter keys — same reason the receipts page got its own
 * ops/receipts/query/[query_id] pair and the transactions pages got
 * ops/transactions*.
 *
 * The report SQL uses macros: the server substitutes the replacement values
 * into the SQL text and validates that every macro of the report has a
 * passed value — a macro without a key gives 422. All 5 keys are always
 * present in replacements; unused — an empty string (§7 of the spec):
 *   - ACTIVE_FILTER / IS_REMOVED_FILTER — options filters «Видимость
 *     участнику» / «Наличие в плане CRM» (server metadata §5.1). The mapped
 *     values are NUMBERS 0/1 (§5.2 — substituted without quotes): active
 *     opts ["Видимые", "Скрытые"] → mapping {0: 1, 1: 0}; is_removed opts
 *     ["В плане", "Вне плана"] → mapping {0: 0, 1: 1}. Per the spec an
 *     options filter with NOTHING or with ALL options selected is sent
 *     empty (no restriction); partial selection → "AND pc.active IN (1)";
 *   - SEARCH_FILTER — 5 searchable fields (BIN_TO_UUID(pc.id), pc.code,
 *     pc.type_code, pc.title, pc.description) with % _ ' escaping
 *     (likePattern — каноническая санитизация, локальная копия как в
 *     users/receipts/transactions адаптерах: в _shared.js её нет; спека §6.2
 *     экранирует %_' — удвоение backslash идёт первым, надмножество спеки);
 *   - ORDER_BY / ORDER_DIR — the sorting map of the spec §4 (price_rub
 *     sorts by pc.price — копейки; description/image/image_source_url are
 *     null = not sortable — the shared PRIZE_CATALOG_SORTABLE_COLUMNS
 *     whitelist in _shared.js is the same list); a value outside the map
 *     (or null) falls back to the report default "created_at" + DESC.
 *
 * The spec §1.1 also shows top-level sort/direction/search/filters fields —
 * they are NOT sent: the live executor contract (users/receipts reports,
 * already in production) expects only page/limit/replacements — the macros
 * are built on the frontend (§2, §7).
 *
 * The catalog table is lazy (standard pagination + sorting), so first/rows/
 * sort come from the DataTable events (event) or the URL params (base),
 * same merge rule as stats.transactions.execute.request.avito.js; search
 * and filters always come from the page state (base).
 *
 * Output: { page, limit, replacements }, page = Math.floor(first / limit) + 1.
 * The route is marked query: true — the entire result goes into the query
 * (the server accepts nested replacements as a JSON object).
 */
const MACRO_KEYS = [
  "ACTIVE_FILTER",
  "IS_REMOVED_FILTER",
  "SEARCH_FILTER",
  "ORDER_BY",
  "ORDER_DIR",
];
const DEFAULT_ORDER_BY = "created_at";

// Sorting map of the spec §4 (alias → SQL expression; null = not sortable)
const ORDER_MAP = {
  prize_id: "pc.id",
  code: "pc.code",
  type_code: "pc.type_code",
  title: "pc.title",
  description: null,
  price_rub: "pc.price",
  points_cost: "pc.points_cost",
  act_required: "pc.act_required",
  active: "pc.active",
  is_removed: "pc.is_removed",
  target_count: "pc.target_count",
  image: null,
  image_source_url: null,
  created_at: "pc.created_at",
  updated_at: "pc.updated_at",
};

// Filter defs of the spec §5.1: id → column + numeric 0/1 values aligned
// with opts (the FiltersPanel value for "options" filters is a boolean
// array aligned with the opts order: «Видимые» → active=1, «Скрытые» → 0;
// «В плане» → is_removed=0, «Вне плана» → 1)
const PRIZE_CATALOG_FILTERS = {
  active: {
    column: "pc.active",
    dbValues: [1, 0],
  },
  is_removed: {
    column: "pc.is_removed",
    dbValues: [0, 1],
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
    const def = PRIZE_CATALOG_FILTERS[filter.id];
    if (def) {
      replacements[optionsMacroKey(filter.id)] = optionsFragment(
        filter.value,
        def,
      );
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

// Filter id → the replacements macro key (ACTIVE_FILTER, IS_REMOVED_FILTER)
function optionsMacroKey(id) {
  return (
    {
      active: "ACTIVE_FILTER",
      is_removed: "IS_REMOVED_FILTER",
    }[id] || ""
  );
}

// options: boolean array aligned with opts → "AND <col> IN (0/1)";
// mapped values are numbers — substituted WITHOUT quotes (§5.2); nothing
// or ALL options selected → "" (no restriction) — §5.2 of the spec
function optionsFragment(value, def) {
  if (!Array.isArray(value)) return "";
  const picked = value
    .map((on, index) => (on ? def.dbValues[index] : null))
    .filter((v) => v === 0 || v === 1);
  if (picked.length === 0 || picked.length === def.dbValues.length) return "";
  return "AND " + def.column + " IN (" + picked.join(", ") + ")";
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

// search: 5 fields of the spec §6.2; UUID is searched as a plain string
// (partial match allowed, no format validation — §6.1)
function searchFragment(pattern) {
  const e = likePattern(pattern);
  const columns = [
    "BIN_TO_UUID(pc.id)",
    "pc.code",
    "pc.type_code",
    "pc.title",
    "pc.description",
  ];
  return (
    "AND (" +
    columns.map((column) => column + " LIKE '%" + e + "%'").join(" OR ") +
    ")"
  );
}