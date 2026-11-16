/**
 * Response adapter for executing the transactions stats queries of the
 * avito_to_the_top campaign (response of POST ops/transactions/execute and
 * ops/user-transactions/execute — the adapter key is shared by both pages,
 * the payloads differ only in row fields).
 *
 * Contract (specs §8): the server may return either the legacy raw array
 * (rows as plain objects) or the future shape { status: "ok", data: { rows:
 * [{ id, values: {…}, … }], meta: {…} } } — both are converted to a plain
 * array of row objects assigned to the state by the page ("@result" handler
 * supports arrays only). values is merged with the row id wrapper fields.
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
  let rows = null;
  if (Array.isArray(data)) {
    // Legacy shape: raw array of rows
    rows = data;
  } else if (data && typeof data === "object" && Array.isArray(data.rows)) {
    // Future shape: envelope with rows[{id, values}]
    rows = data.rows;
  } else if (
    data &&
    typeof data === "object" &&
    data.status === "ok" &&
    data.data &&
    Array.isArray(data.data.rows)
  ) {
    // Future shape wrapped into the API status envelope
    rows = data.data.rows;
  }
  if (!rows) return [];
  return rows.map(mapRow);
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
