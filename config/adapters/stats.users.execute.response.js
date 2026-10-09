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
 *
 * Display substitution — readable values instead of DB codes (display only:
 * sorting/search still reach the server as raw codes, the SQL works with them):
 *  - status / participant_status → labels, the same wording as the opts of the
 *    matching filters (USERS_FILTERS in stats.users.report.response.js);
 *    an unknown code passes through unchanged;
 *  - mailing (DB 1/0) → icon cell fields mailing_icon/mailing_severity
 *    (Prime Icons + Button severity, is_promo pattern of the receipt pages):
 *    check-circle/success, times-circle/danger; null/undefined → empty — the
 *    customColumn's visibleRow hides the button when there is no data.
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
      value: payload.rows.map((r) => mapRow(r && r.values ? r.values : r)),
      totalRecords: Number(meta.total_count) || 0,
      first: Number(meta.first) || 0,
      rows: limit,
    };
  }

  // Current format: items[] + pagination
  const page = payload.pagination?.page || 1;
  const limit = payload.pagination?.limit || 10;
  return {
    value: (payload.items || []).map(mapRow),
    totalRecords: payload.pagination?.total_items || 0,
    first: (page - 1) * limit,
    rows: limit,
  };
}

// Readable labels for code values — same wording as the opts of the matching
// filters (USERS_FILTERS in stats.users.report.response.js). Unknown codes
// stay as-is (safe fallback when the dictionary grows). Null-prototype maps —
// so that keys like "constructor" can never hit Object.prototype.
const STATUS_LABELS = Object.assign(Object.create(null), {
  active: "Активен",
  blocked: "Заблокирован",
  deleted: "Удалён",
});
const PARTICIPANT_STATUS_LABELS = Object.assign(Object.create(null), {
  ANKET_REQUIRED: "Анкета не заполнена",
  PARTICIPANT: "Участник",
});

// mailing is a DB boolean (1/0) — displayed as an icon (see header comment)
function mailingIcon(value) {
  if (value === true || value === 1 || value === "1") {
    return { icon: "pi pi-check-circle", severity: "success" };
  }
  if (value === false || value === 0 || value === "0") {
    return { icon: "pi pi-times-circle", severity: "danger" };
  }
  return { icon: "", severity: "" };
}

function mapRow(row) {
  if (!row || typeof row !== "object") return row;
  const out = { ...row };
  if (typeof out.status === "string" && out.status in STATUS_LABELS) {
    out.status = STATUS_LABELS[out.status];
  }
  if (
    typeof out.participant_status === "string" &&
    out.participant_status in PARTICIPANT_STATUS_LABELS
  ) {
    out.participant_status = PARTICIPANT_STATUS_LABELS[out.participant_status];
  }
  if ("mailing" in out) {
    const icon = mailingIcon(out.mailing);
    out.mailing_icon = icon.icon;
    out.mailing_severity = icon.severity;
  }
  return out;
}
