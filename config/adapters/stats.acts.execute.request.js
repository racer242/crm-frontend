/**
 * Request adapter for executing the "acts" stats query
 * (POST ops/acts/execute → /api/v1/crm/stats/query/acts/execute,
 * format json; the query is addressed by the manual query_id "acts",
 * SQL: .prompts/acts.md — отчёт «Акты получения призов»: prize_instances ×
 * prize_catalog × user × user_extended × user_documents(×4), область
 * выборки act_required = 1 OR скан акта загружен).
 *
 * Literal routes (ops/acts*) instead of the generic
 * ops/users-v2/query/[query_id] pair — same reason as prizes/receipts/
 * transactions/prize-catalog (the generic route is bound to the shared
 * users adapter keys).
 *
 * The report SQL uses macros: the server substitutes the replacement
 * values into the SQL text and validates that every macro of the report
 * has a passed value — a macro without a key gives 422. All 23 keys are
 * always present in replacements; unused — an empty string (§7 of the
 * spec):
 *   - ACT_STATUS_FILTER — string-code options filter (§5.2): boolean array
 *     aligned with opts → "AND pi.act_status IN ('PENDING', …)"; nothing or
 *     ALL options selected → "" (no restriction). The DB codes behind the
 *     opts positions live in ACTS_FILTERS (same order as the fallback opts
 *     of stats.acts.report.response.js); when the server metadata carries
 *     its own mapping dict ({"0": "PENDING", …}), its values win — the
 *     server may reorder opts;
 *   - ACT_REQUIRED_FILTER — the same options shape, but the mapped values
 *     are numbers (1/0) → substituted WITHOUT quotes (§5.2 «числовые
 *     значения — без кавычек»);
 *   - PRIZE_FILTER — options over the catalog codes pc.code; the fallback
 *     opts are empty (§5.1 «opts заполняются динамически») until the server
 *     metadata carries the dynamic mapping;
 *   - HAS_FILE_FILTER + 11 document-flag checkboxes (HAS_PASSPORT_FILTER /
 *     HAS_PASSPORT_ISSUE_DATE_FILTER / HAS_PASSPORT_ISSUED_BY_FILTER /
 *     HAS_ADDRESS_FILTER / HAS_INN_FILTER / HAS_SNILS_FILTER /
 *     HAS_AGREEMENT_FILTER / HAS_PASSPORT_MAIN_SCAN_FILTER /
 *     HAS_PASSPORT_REG_SCAN_FILTER / HAS_INN_SCAN_FILTER /
 *     HAS_SNILS_SCAN_FILTER) — checkbox (§5.2): true → the IS NOT NULL (or
 *     <> '') fragment over the joined field, false → the IS NULL (or = '')
 *     counterpart, unset → ""; has_agreement builds COALESCE(ue.agreement,0)
 *     (the only flag where ue.agreement = 1 would give NULL);
 *   - PRICE_FILTER — range over pc.price (копейки): the boundaries come in
 *     rubles and are multiplied by 100 (Math.round) per §5.2;
 *   - ACT_UPLOADED_FROM/TO_FILTER, ISSUED_FROM/TO_FILTER — periods
 *     act_uploaded_date (pi.act_scan_uploaded_at) and issued_date
 *     (pi.issued_at) (MSK wall dates, no CONVERT_TZ): the boundaries are
 *     built with toWallPeriodBound (_shared.js) — date-only 'YYYY-MM-DD' →
 *     from 'D 00:00:00' / to 'D 23:59:59' so the whole last day is covered
 *     (wall-date period contract of commit 0b217f0; the naive §5.2 sample
 *     '>=' '<=' is strengthened the same way the prizes/receipts/
 *     transactions adapters do), ISO/Date values convert as before;
 *   - SEARCH_FILTER — 10 searchable fields of §6.1 (BIN_TO_UUID(pi.id),
 *     pi.external_id, pc.code, pc.title, pi.act_scan_original_name,
 *     BIN_TO_UUID(pi.user_id), u.participant_code, u.email, u.first_name,
 *     u.last_name) with % _ ' escaping (likePattern — каноническая
 *     санитизация, локальная копия как в prizes/users/receipts адаптерах:
 *     в _shared.js её нет; спека §6.2 экранирует %_' — удвоение backslash
 *     идёт первым, надмножество спеки). Документы в поиск НЕ включаются
 *     (§6.1: ни значения, ни флаги — подстрока позволила бы восстановить
 *     значение по факту попадания строки);
 *   - ORDER_BY / ORDER_DIR — the sorting map of the spec §4 (price_rub
 *     sorts by pc.price — копейки; act_state/days_on_review/act_file_
 *     present/has_* sort by SELECT aliases — значения всегда 0/1;
 *     act_scan_original_name/act_scan_mime/act_scan_stored_name/full_name
 *     are null = not sortable — the shared ACTS_SORTABLE_COLUMNS whitelist
 *     in _shared.js is the same list); a value outside the map (or null)
 *     falls back to the report default "pi.act_scan_uploaded_at" + DESC
 *     (DEFAULT_ORDER_BY = act_scan_uploaded_at — §1.2/§16 of the spec; the
 *     same as the state default actsQuery.sortField, so the table sort
 *     indicator and the first SSR request — which comes from the URL-less
 *     dataFeed, not the shortcut — agree).
 *
 * The spec §7 also shows top-level sort/direction/search/filters fields —
 * they are NOT sent: the live executor contract (users/receipts/prizes
 * reports, already in production) expects only page/limit/replacements —
 * the macros are built on the frontend (§1, §7).
 *
 * The table is lazy (standard pagination + sorting), so first/rows/sort
 * come from the DataTable events (event) or the URL params (base), same
 * merge rule as stats.prizes.execute.request.js; search and filters
 * always come from the page state (base).
 *
 * Output: { page, limit, replacements }, page = Math.floor(first / limit) + 1.
 * The route is marked query: true — the entire result goes into the query
 * (the server accepts nested replacements as a JSON object).
 */
const MACRO_KEYS = [
  "ACT_STATUS_FILTER",
  "ACT_REQUIRED_FILTER",
  "HAS_FILE_FILTER",
  "HAS_PASSPORT_FILTER",
  "HAS_PASSPORT_ISSUE_DATE_FILTER",
  "HAS_PASSPORT_ISSUED_BY_FILTER",
  "HAS_ADDRESS_FILTER",
  "HAS_INN_FILTER",
  "HAS_SNILS_FILTER",
  "HAS_AGREEMENT_FILTER",
  "HAS_PASSPORT_MAIN_SCAN_FILTER",
  "HAS_PASSPORT_REG_SCAN_FILTER",
  "HAS_INN_SCAN_FILTER",
  "HAS_SNILS_SCAN_FILTER",
  "PRIZE_FILTER",
  "PRICE_FILTER",
  "ACT_UPLOADED_FROM_FILTER",
  "ACT_UPLOADED_TO_FILTER",
  "ISSUED_FROM_FILTER",
  "ISSUED_TO_FILTER",
  "SEARCH_FILTER",
  "ORDER_BY",
  "ORDER_DIR",
];
const DEFAULT_ORDER_BY = "act_scan_uploaded_at";

// Sorting map of the spec §4 (alias → SQL expression; null = not sortable);
// the shared ACTS_SORTABLE_COLUMNS whitelist in _shared.js is the same list
const ORDER_MAP = {
  instance_id: "pi.id",
  act_status: "pi.act_status",
  act_state: "act_state",
  act_scan_uploaded_at: "pi.act_scan_uploaded_at",
  days_on_review: "days_on_review",
  act_file_present: "act_file_present",
  act_scan_original_name: null,
  act_scan_mime: null,
  act_scan_size: "pi.act_scan_size",
  act_scan_stored_name: null,
  act_required: "pc.act_required",
  prize_code: "pc.code",
  prize_title: "pc.title",
  type_code: "pc.type_code",
  price_rub: "pc.price",
  user_id: "pi.user_id",
  participant_code: "u.participant_code",
  full_name: null,
  email: "u.email",
  has_passport: "has_passport",
  has_passport_issue_date: "has_passport_issue_date",
  has_passport_issued_by: "has_passport_issued_by",
  has_address: "has_address",
  has_inn: "has_inn",
  has_snils: "has_snils",
  has_agreement: "has_agreement",
  has_passport_main_scan: "has_passport_main_scan",
  has_passport_reg_scan: "has_passport_reg_scan",
  has_inn_scan: "has_inn_scan",
  has_snils_scan: "has_snils_scan",
  issued_at: "pi.issued_at",
  status: "pi.status",
  pool_status: "pi.pool_status",
  external_id: "pi.external_id",
  created_at: "pi.created_at",
};
// Filter defs of the spec §5.1: id → macro key + SQL column + DB values
// aligned with the fallback opts order (the FiltersPanel value for
// "options" filters is a boolean array aligned with opts). String codes are
// substituted quoted (sqlString), numeric (act_required 1/0) — raw (§5.2
// «без кавычек»); checkboxes carry the ready SQL fragments; periods carry
// their own from/to macro keys (§5.2: ACT_UPLOADED_FROM/TO_FILTER,
// ISSUED_FROM/TO_FILTER); price is a range over pc.price in копейки. When
// the server metadata carries its own mapping dict ({"0": "PENDING", …}),
// its values win
const ACTS_FILTERS = {
  act_status: {
    macro: "ACT_STATUS_FILTER",
    column: "pi.act_status",
    dbValues: ["PENDING", "ACT_UPLOADED", "APPROVED", "REJECTED"],
  },
  act_required: {
    macro: "ACT_REQUIRED_FILTER",
    column: "pc.act_required",
    dbValues: [1, 0],
    numeric: true,
  },
  has_file: {
    macro: "HAS_FILE_FILTER",
    trueSql: "AND pi.act_scan_stored_name IS NOT NULL",
    falseSql: "AND pi.act_scan_stored_name IS NULL",
  },
  has_passport: {
    macro: "HAS_PASSPORT_FILTER",
    trueSql:
      "AND (ue.passport_series_number IS NOT NULL AND ue.passport_series_number <> '')",
    falseSql:
      "AND (ue.passport_series_number IS NULL OR ue.passport_series_number = '')",
  },
  has_passport_issue_date: {
    macro: "HAS_PASSPORT_ISSUE_DATE_FILTER",
    trueSql: "AND ue.passport_issue_date IS NOT NULL",
    falseSql: "AND ue.passport_issue_date IS NULL",
  },
  has_passport_issued_by: {
    macro: "HAS_PASSPORT_ISSUED_BY_FILTER",
    trueSql:
      "AND (ue.passport_issued_by IS NOT NULL AND ue.passport_issued_by <> '')",
    falseSql:
      "AND (ue.passport_issued_by IS NULL OR ue.passport_issued_by = '')",
  },
  has_address: {
    macro: "HAS_ADDRESS_FILTER",
    trueSql:
      "AND (ue.passport_address IS NOT NULL AND ue.passport_address <> '')",
    falseSql: "AND (ue.passport_address IS NULL OR ue.passport_address = '')",
  },
  has_inn: {
    macro: "HAS_INN_FILTER",
    trueSql: "AND (ue.inn IS NOT NULL AND ue.inn <> '')",
    falseSql: "AND (ue.inn IS NULL OR ue.inn = '')",
  },
  has_snils: {
    macro: "HAS_SNILS_FILTER",
    trueSql: "AND (ue.snils IS NOT NULL AND ue.snils <> '')",
    falseSql: "AND (ue.snils IS NULL OR ue.snils = '')",
  },
  has_agreement: {
    macro: "HAS_AGREEMENT_FILTER",
    trueSql: "AND COALESCE(ue.agreement, 0) = 1",
    falseSql: "AND COALESCE(ue.agreement, 0) = 0",
  },
  has_passport_main_scan: {
    macro: "HAS_PASSPORT_MAIN_SCAN_FILTER",
    trueSql: "AND ud_pm.id IS NOT NULL",
    falseSql: "AND ud_pm.id IS NULL",
  },
  has_passport_reg_scan: {
    macro: "HAS_PASSPORT_REG_SCAN_FILTER",
    trueSql: "AND ud_pr.id IS NOT NULL",
    falseSql: "AND ud_pr.id IS NULL",
  },
  has_inn_scan: {
    macro: "HAS_INN_SCAN_FILTER",
    trueSql: "AND ud_inn.id IS NOT NULL",
    falseSql: "AND ud_inn.id IS NULL",
  },
  has_snils_scan: {
    macro: "HAS_SNILS_SCAN_FILTER",
    trueSql: "AND ud_snils.id IS NOT NULL",
    falseSql: "AND ud_snils.id IS NULL",
  },
  prize: {
    macro: "PRIZE_FILTER",
    column: "pc.code",
    // §5.1 «opts заполняются динамически» — до серверных метаданных списка
    // призов, требующих акт, нет; fallback — пустые opts без ограничения
    dbValues: [],
  },
  price: {
    rangeColumn: "pc.price",
  },
  act_uploaded_date: {
    periodColumn: "pi.act_scan_uploaded_at",
    fromMacro: "ACT_UPLOADED_FROM_FILTER",
    toMacro: "ACT_UPLOADED_TO_FILTER",
  },
  issued_date: {
    periodColumn: "pi.issued_at",
    fromMacro: "ISSUED_FROM_FILTER",
    toMacro: "ISSUED_TO_FILTER",
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
    const def = ACTS_FILTERS[filter.id];
    if (!def) return;
    if (def.trueSql) {
      replacements[def.macro] = checkboxFragment(filter.value, def);
    } else if (def.periodColumn) {
      const bounds = periodBounds(filter.value, def.periodColumn);
      replacements[def.fromMacro] = bounds.from;
      replacements[def.toMacro] = bounds.to;
    } else if (def.rangeColumn) {
      replacements.PRICE_FILTER = priceFragment(filter.value, def.rangeColumn);
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
// DB values behind the boolean array: the server mapping dict wins
// ({"0": "PENDING", …} → values by the numeric key order), otherwise the
// fallback dbValues aligned with the fallback opts order. String values are
// quoted (sqlString), numeric (act_required 1/0) — raw, §5.2
function optionsFragment(filter, def) {
  const dbValues = dbValuesFor(filter, def);
  if (!dbValues.length || !Array.isArray(filter.value)) return "";
  const picked = filter.value
    .map((on, index) => (on ? dbValues[index] : null))
    .filter((v) => v !== null && v !== undefined && v !== "");
  if (picked.length === 0 || picked.length === dbValues.length) return "";
  const literals = picked
    .map(def.numeric ? numericLiteral : sqlString)
    .filter((v) => v !== "");
  if (literals.length === 0) return "";
  return "AND " + def.column + " IN (" + literals.join(", ") + ")";
}

// DB values behind the boolean array: the server mapping dict wins
// ({"0": "PENDING", …} → values by the numeric key order), otherwise the
// fallback dbValues aligned with the fallback opts order
function dbValuesFor(filter, def) {
  const mapping = filter && filter.mapping;
  if (mapping && typeof mapping === "object" && !Array.isArray(mapping)) {
    return Object.keys(mapping)
      .sort((a, b) => Number(a) - Number(b))
      .map((key) => mapping[key])
      .filter((v) => v !== null && v !== undefined && v !== "");
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

// range price: the boundaries come in rubles, the column is in копейки —
// multiply by 100 (Math.round, §5.2); a missing boundary → no condition
function priceFragment(value, column) {
  if (!Array.isArray(value) || value.length !== 2) return "";
  const conditions = [];
  const min = value[0];
  const max = value[1];
  if (min !== null && min !== undefined && min !== "") {
    conditions.push("AND " + column + " >= " + Math.round(Number(min) * 100));
  }
  if (max !== null && max !== undefined && max !== "") {
    conditions.push("AND " + column + " <= " + Math.round(Number(max) * 100));
  }
  return conditions.length ? conditions.join(" ") : "";
}

// periods act_uploaded_date / issued_date over pi.* (MSK wall dates):
// boundaries via toWallPeriodBound (_shared.js) — date-only 'YYYY-MM-DD' →
// from 'D 00:00:00' / to 'D 23:59:59' (the whole last day is covered —
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

// Numeric value for an unquoted SQL literal (act_required 1/0 — §5.2);
// non-numeric garbage is dropped — the substituted text is never trusted
function numericLiteral(value) {
  const n = Number(value);
  if (!isFinite(n)) return "";
  return String(n);
}

// search: 10 fields of the spec §6.1 (документы в поиск не включаются —
// ни значения, ни флаги); UUIDs are searched as plain strings (partial match
// allowed, no format validation — §6.2)
function searchFragment(pattern) {
  const e = likePattern(pattern);
  const columns = [
    "BIN_TO_UUID(pi.id)",
    "pi.external_id",
    "pc.code",
    "pc.title",
    "pi.act_scan_original_name",
    "BIN_TO_UUID(pi.user_id)",
    "u.participant_code",
    "u.email",
    "u.first_name",
    "u.last_name",
  ];
  return (
    "AND (" +
    columns.map((column) => column + " LIKE '%" + e + "%'").join(" OR ") +
    ")"
  );
}