/**
 * Response adapter for executing the transactions stats queries of the
 * avito_to_the_top campaign (response of POST ops/transactions/execute and
 * ops/user-transactions/execute — the adapter key is shared by both pages,
 * the payloads differ only in row fields).
 *
 * Contract (specs §8): the server may return the legacy raw array, the
 * current statistics format {items, pagination} or the future shape
 * {status: "ok", data: { rows: [{ id, values: {…}, … }], meta: {total_count,
 * first, limit} } } — all are converted to the full table-state object
 * {value, totalRecords, first, rows}: the feed target (setStateField)
 * REPLACES the whole state field, so the adapter must return it entirely
 * (same contract as the reference stats.users.execute.response.js — a bare
 * array leaves state.value/totalRecords undefined and the table empty).
 * values is merged with the row id wrapper fields.
 *
 * Row mapping: VARCHAR (enum) columns arrive together with their
 * human-readable counterparts — type_code_label (Начисление баллов /
 * Назначение лиги) and status_label (Успешно / Ошибка) — §8.2. The table
 * has no separate label columns (the metadata fields[] lists only
 * type_code/status), so the display value is the label: type_code ←
 * type_code_label, status ← status_label when the label is present
 * (otherwise the raw machine value stays — graceful degradation until the
 * backend fills the labels). The *_label fields are kept in the row
 * (harmless extra data).
 *
 * No other mapping is applied — numeric points, dates (ISO strings,
 * formatted by DataTable dataType:date in the viewer timezone) and ids go
 * through as is.
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

  // Future shape: rows[] with values{} + meta (counters from meta —
  // total_count/first/limit, same as the users adapter)
  if (Array.isArray(payload.rows)) {
    const meta = payload.meta || {};
    return {
      value: payload.rows.map(mapRow),
      totalRecords: Number(meta.total_count) || 0,
      first: Number(meta.first) || 0,
      rows: Number(meta.limit) || 10,
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
  // Merge the future shape wrapper (id + …) with the values payload
  const out = Object.assign({}, row, row.values || {});
  delete out.values;
  // Enum columns: display the human-readable label when the server sent it
  if (out.type_code_label !== undefined && out.type_code_label !== null && out.type_code_label !== "") {
    out.type_code = out.type_code_label;
  }
  if (out.status_label !== undefined && out.status_label !== null && out.status_label !== "") {
    out.status = out.status_label;
  }
  return out;
}
