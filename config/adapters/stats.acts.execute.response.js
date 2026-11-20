/**
 * Response adapter for executing the "acts" stats query
 * (POST ops/acts/execute; SQL: .prompts/acts.md — отчёт «Акты получения
 * призов»).
 *
 * Contract (spec §6.1): the server returns the shape
 * {rows: [{id, values}], meta: {total_count, first, limit, sort, direction}}
 * — rows already carry the transformed values (BIN_TO_UUID strings,
 * price/100 ROUND(...,2), booleans, DATETIME → ISO-8601 +03:00 МСК,
 * NULL → null). The legacy raw array, the {status: "ok", data} wrapper and
 * the current {items, pagination} shape are handled the same way as the
 * reference stats.prizes.execute.response.js: the feed target
 * (setStateField) REPLACES the whole state field, so the adapter must
 * return the full table-state object {value, totalRecords, first, rows} —
 * a bare array leaves state.value/totalRecords undefined and the table
 * empty. values is merged with the row id wrapper fields; counters come
 * from meta (total_count/first/limit) or pagination (total_items/page/limit).
 *
 * Row mapping: the act enum columns are displayed with the spec §5.1
 * labels — the DataTable would render raw codes (PENDING/WAITING_UPLOAD/…)
 * otherwise; an explicit <field>_label from the backend wins, an unknown
 * code stays raw:
 *   - act_status (pi.act_status): PENDING/ACT_UPLOADED/APPROVED/REJECTED;
 *   - act_state (сводное состояние §2): WAITING_UPLOAD/ON_REVIEW/APPROVED/
 *     REJECTED/NOT_REQUIRED — производная колонка, отдельная от act_status
 *     (NOT_REQUIRED = акт не требуется, но файл загружен — аномалия §9.10).
 * All 13 boolean columns of §3 (act_required, act_file_present and the 11
 * has_* document flags) are displayed «Да»/«Нет»: the SQL yields 0/1 from
 * the IS NOT NULL/COALESCE expressions (the spec §8 allows true/false as
 * well), null/absent («нет записи» — §9.2) displays «Нет», the backend
 * <field>_label wins when present. Only the rendered row changes — the
 * server-side ORDER BY sorts the raw columns. Everything else (numbers,
 * ISO dates — formatted by DataTable dataType:date in the viewer timezone,
 * uuid strings, nulls) goes through as is.
 */
// Spec §5.1: filter opts ↔ mapping — the same pairs as the labels of the
// response (the backend *_label wins when it arrives)
const ACT_STATUS_LABELS = {
  PENDING: "Ожидает",
  ACT_UPLOADED: "Акт загружен",
  APPROVED: "Подтверждён",
  REJECTED: "Отклонён",
};
const ACT_STATUS_SEVERITIES = {
  PENDING: "warning",
  ACT_UPLOADED: "info",
  APPROVED: "success",
  REJECTED: "danger",
};
// Derived state of §2 (CASE over pc.act_required/pi.act_status)
const ACT_STATE_LABELS = {
  WAITING_UPLOAD: "Ожидает загрузки",
  ON_REVIEW: "Акт загружен (на проверке)",
  APPROVED: "Подтверждён",
  REJECTED: "Отклонён",
  NOT_REQUIRED: "Не требуется",
};
const ACT_STATE_SEVERITIES = {
  WAITING_UPLOAD: "warning",
  ON_REVIEW: "info",
  APPROVED: "success",
  REJECTED: "danger",
  NOT_REQUIRED: "secondary",
};

function transform(data) {
  // Legacy shape: raw array of rows (counters unknown — everything fits on
  // one page). The array check goes FIRST: typeof [] === "object"
  if (Array.isArray(data)) {
    return { value: data.map(mapRow), totalRecords: data.length, first: 0, rows: 10 };
  }

  const payload = data && data.status === "ok" ? data.data : data;

  // Feed target contract: setStateField REPLACES the whole state field, so
  // the adapter must return the full table-state object (same as the
  // reference stats.prizes.execute.response.js) — a bare array would leave
  // state.value/totalRecords undefined and the table empty
  const empty = { value: [], totalRecords: 0, first: 0, rows: 10 };
  if (!payload || typeof payload !== "object") return empty;

  // Spec shape (§6.1): rows[] with values{} + meta
  // {total_count, first, limit}; the current {items, pagination} is
  // accepted the same way
  if (Array.isArray(payload.rows)) {
    const meta = payload.meta || {};
    const pagination = payload.pagination || {};
    const hasMetaCount =
      meta.total_count !== undefined && meta.total_count !== null;
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

// All 13 boolean columns of the spec §3 (act_required, act_file_present and
// the 11 has_* document flags): the SQL yields 0/1 from the IS NOT NULL /
// COALESCE expressions (the spec §8 allows true/false as well)
const BOOLEAN_LABEL_KEYS = [
  "act_required",
  "act_file_present",
  "has_passport",
  "has_passport_issue_date",
  "has_passport_issued_by",
  "has_address",
  "has_inn",
  "has_snils",
  "has_agreement",
  "has_passport_main_scan",
  "has_passport_reg_scan",
  "has_inn_scan",
  "has_snils_scan",
];

// Boolean/0-1 raw value → «Да»/«Нет»; null/undefined («нет записи» —
// spec §9.2: флаг false) and 0/false display «Нет»
function booleanLabel(value) {
  if (value === true || value === "true" || Number(value) === 1) return "Да";
  return "Нет";
}

function mapRow(row) {
  if (!row || typeof row !== "object") return row;
  // Merge the row wrapper (id + …) with the values payload
  const out = Object.assign({}, row, row.values || {});
  delete out.values;
  // Act enum columns: an explicit *_label from the backend wins, otherwise
  // the DB code is mapped to the spec §5.1 label; an unknown code stays raw
  const enums = { act_status: ACT_STATUS_LABELS, act_state: ACT_STATE_LABELS };
  Object.keys(enums).forEach((key) => {
    const label = out[key + "_label"];
    if (typeof label === "string" && label !== "") {
      out[key] = label;
    } else if (typeof out[key] === "string" && enums[key][out[key]]) {
      out[key] = enums[key][out[key]];
    }
  });
  // Boolean flag columns of §3 (13 keys): display label — an explicit
  // <field>_label from the backend wins, otherwise the raw value maps to
  // «Да»/«Нет»; null/absent («нет записи» — §9.2) displays «Нет». Only the
  // rendered row changes — the server-side ORDER BY sorts the raw columns
  BOOLEAN_LABEL_KEYS.forEach((key) => {
    const label = out[key + "_label"];
    out[key] =
      typeof label === "string" && label !== ""
        ? label
        : booleanLabel(out[key]);
  });
  return out;
}