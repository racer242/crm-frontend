/**
 * Response adapter for executing the stats report for the "Participants (v2)" page
 * (POST ops/users-v2/report/[report_id]/execute, format json).
 *
 * Supports two formats:
 *  - current (§6.1 "Supplement. Statistics system"): {items, pagination};
 *  - future (.prompts/new_req_users.md §3): {rows: [{id, values}], filters, search, meta} —
 *    value is built from rows[].values (contract "columns[].id = key in values"),
 *    counters — from meta (total_count/first/limit).
 *
 * Table columns come from state.report.columns (GET of the report), so they are not returned here.
 * Filters are not returned either: their definitions live in state.report.filters —
 * the response must not reset the values filled in by the user (until §3.4 echo is implemented).
 */
function transform(source) {
  const payload = source && source.status === "ok" ? source.data : source;

  const empty = { value: [], totalRecords: 0, first: 0, rows: 10 };
  if (!payload || typeof payload !== "object") return empty;

  // Future format: rows[] with values{} + meta
  if (Array.isArray(payload.rows)) {
    const meta = payload.meta || {};
    const limit = Number(meta.limit) || 10;
    return {
      value: payload.rows.map((r) => (r && r.values ? r.values : r)),
      totalRecords: Number(meta.total_count) || 0,
      first: Number(meta.first) || 0,
      rows: limit,
    };
  }

  // Current format: items[] + pagination
  const page = payload.pagination?.page || 1;
  const limit = payload.pagination?.limit || 10;
  return {
    value: payload.items || [],
    totalRecords: payload.pagination?.total_items || 0,
    first: (page - 1) * limit,
    rows: limit,
  };
}