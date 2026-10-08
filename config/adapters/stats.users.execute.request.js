/**
 * Request adapter for executing the stats report for the "Participants (v2)" page
 * (POST ops/users-v2/report/[report_id]/execute, format json).
 *
 * Spec .prompts/new_req_users.md §1:
 *  - first/rows → page/limit: page = Math.floor(first / limit) + 1 (SQL has no LIMIT/OFFSET);
 *  - sortField/sortOrder → sort + direction ("asc"/"desc"); the server maps sort
 *    into {{ORDER_BY}} via a whitelist, direction — into {{ORDER_DIR}};
 *  - search, filters — passed structured ({id, value}); the server builds macros from them
 *    {{SEARCH_FILTER}}, {{..._FILTER}} (§1.3-1.4, mappings in the server configuration).
 *
 * The SQL of the report contains only fragment macros, therefore `replacements` always
 * contains all their keys with empty-string values: the server substitutes emptiness
 * instead of an unsubstituted macro, and fills the fragments itself. Passing fragments
 * from the frontend is impossible — substitutions are made with bound parameters.
 *
 * The route is marked query: true — the entire result goes into the query string
 * (same as the existing stats execute route).
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

function transform(params = {}) {
  const { event = {}, ...base } = params;

  // 1. Merge: event overrides base only if the value is passed explicitly
  const merged = {
    first: event.first !== undefined ? event.first : base.first,
    rows: event.rows !== undefined ? event.rows : base.rows,
    sortField: event.sortField !== undefined ? event.sortField : base.sortField,
    sortOrder: event.sortOrder !== undefined ? event.sortOrder : base.sortOrder,
    search: event.search !== undefined ? event.search : base.search,
    filters: base.filters,
  };

  // 2. Pagination: first (offset) → page (page number)
  const limit = Number(merged.rows) || 10;
  const first = Number(merged.first) || 0;
  const page = Math.floor(first / limit) + 1;

  // 3. Sorting: 1/-1 → "asc"/"desc"; empty sortField → both empty (server default)
  const sort = merged.sortField || "";
  const direction = sort
    ? Number(merged.sortOrder) === -1
      ? "desc"
      : "asc"
    : "";

  // 4. Filters: only filled ones, {id, value} — the server does the mapping itself
  const filters = cleanFilters(merged.filters);

  // 5. All SQL macros — with empty-string values (see header comment)
  const replacements = {};
  MACRO_KEYS.forEach((key) => {
    replacements[key] = "";
  });

  return {
    page,
    limit,
    sort,
    direction,
    search: merged.search || "",
    filters,
    replacements,
  };
}

function cleanFilters(prFilters) {
  if (!Array.isArray(prFilters)) return [];
  return prFilters
    .filter((f) => {
      if (!f || !f.id) return false;
      const v = f.value;
      if (v === undefined || v === null || v === "") return false;
      if (Array.isArray(v) && v.length === 0) return false;
      return true;
    })
    .map(({ id, value }) => ({ id, value }));
}