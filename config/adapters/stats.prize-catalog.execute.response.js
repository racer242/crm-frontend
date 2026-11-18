/**
 * Response adapter for executing the "prize catalog" stats query
 * (POST ops/prize-catalog/execute; SQL: .prompts/prize-catalog.md).
 *
 * Contract (spec §8): the server returns the shape
 * {columns, rows: [{id, values}], filters, search,
 * pagination: {page, limit, total_items, total_pages}} — rows already carry
 * the transformed values (§8.2: BIN_TO_UUID strings, price/100, booleans,
 * ISO datetimes +03:00). The legacy raw array, the {status: "ok", data}
 * wrapper and the future {rows, meta: {total_count, first, limit}} /
 * {items, pagination} shapes are handled the same way as the reference
 * stats.users.execute.response.js: the feed target (setStateField) REPLACES
 * the whole state field, so the adapter must return the full table-state
 * object {value, totalRecords, first, rows} — a bare array leaves
 * state.value/totalRecords undefined and the table empty. values is merged
 * with the row id wrapper fields; counters come from meta or pagination
 * (total_items/page/limit).
 *
 * Row mapping: the boolean flag columns (act_required, active, is_removed)
 * are displayed with labels «Да»/«Нет» — the DataTable would render raw
 * true/false otherwise; if the backend ever sends *_label counterparts, the
 * labels win. Everything else (numbers, ISO dates — formatted by DataTable
 * dataType:date in the viewer timezone, strings, nulls) goes through as is.
 */
function transform(data) {
  // Legacy shape: raw array of rows (counters unknown — everything fits on
  // one page). The array check goes FIRST: typeof [] === "object"
  if (Array.isArray(data)) {
    return { value: data.map(mapRow), totalRecords: data.length, first: 0, rows: 10 };
  }

  const payload = data && data.status === "ok" ? data.data : data;

  // Feed target contract: setStateField REPLACES the whole state field, so
  // the adapter must return the full table-state object (same as the
  // reference stats.users.execute.response.js) — a bare array would leave
  // state.value/totalRecords undefined and the table empty
  const empty = { value: [], totalRecords: 0, first: 0, rows: 10 };
  if (!payload || typeof payload !== "object") return empty;

  // Spec shape (§8.1/8.3): rows[] with values{} + pagination
  // {page, limit, total_items}; the future meta {total_count, first, limit}
  // is accepted the same way
  if (Array.isArray(payload.rows)) {
    const meta = payload.meta || {};
    const pagination = payload.pagination || {};
    const hasMetaCount = meta.total_count !== undefined && meta.total_count !== null;
    const total = Number(hasMetaCount ? meta.total_count : pagination.total_items) || 0;
    const limit = Number(meta.limit || pagination.limit) || 10;
    const page = Number(pagination.page) || 1;
    const first =
      meta.first !== undefined && meta.first !== null
        ? Number(meta.first) || 0
        : (page - 1) * limit;
    return {
      value: payload.rows.map(mapRow),
      totalRecords: total,
      first,
      rows: limit,
    };
  }

  // Current format of the statistics API (§6.1): {items, pagination}
  if (Array.isArray(payload.items)) {
    const page = payload.pagination?.page || 1;
    const limit = payload.pagination?.limit || 10;
    return {
      value: payload.items.map(mapRow),
      totalRecords: payload.pagination?.total_items || 0,
      first: (page - 1) * limit,
      rows: limit,
    };
  }

  return empty;
}

function mapRow(row) {
  if (!row || typeof row !== "object") return row;
  // Merge the row wrapper (id + …) with the values payload
  const out = Object.assign({}, row, row.values || {});
  delete out.values;
  // Boolean flag columns: display labels — an explicit *_label from the
  // backend wins, otherwise true/false → «Да»/«Нет»
  ["act_required", "active", "is_removed"].forEach((key) => {
    const label = out[key + "_label"];
    if (typeof label === "string" && label !== "") {
      out[key] = label;
    } else if (out[key] === true || out[key] === false) {
      out[key] = out[key] ? "Да" : "Нет";
    }
  });
  return out;
}