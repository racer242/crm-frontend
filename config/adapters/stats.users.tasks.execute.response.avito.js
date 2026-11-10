/**
 * Response adapter for executing the "participant tasks" stats query of the
 * avito_to_the_top campaign (POST ops/users-v2/tasks/execute →
 * /api/v1/crm/stats/query/user-avito-tasks/execute; the query is addressed
 * by the manual query_id "user-avito-tasks", SQL: .prompts/user-page-sql2_1.md).
 *
 * A camp copy of the shared stats.users.execute.response.js (both envelope
 * formats supported: current {items, pagination} and future
 * rows[]/values{} + meta) with ONE display mapping added per row:
 *   - is_continuous (TINYINT 0/1 from dict_task_calendar, metadata type
 *     boolean; NULL for a task missing from the calendar — LEFT JOIN, note 2
 *     of the doc) → «Да»/«Нет»/"" — the same wording as
 *     raffle.chances.response.js. Display-only: sorting still reaches the
 *     server as the raw alias (ORDER BY tc.is_continuous).
 *
 * The users status label mapping of the shared adapter does NOT apply here —
 * bot_tasks.status ('execution'/'complete'/'accrued') is a different
 * dictionary; the human-readable status is already provided by the query as
 * display_status.
 *
 * The rest of the fields (task_id, description, league_code, segment,
 * status, avito_id, telegram_id, datetimes) pass through unchanged: the
 * table shows 9 columns (stats.users.tasks.report.response.avito.js), the
 * row popup of the card page binds the raw fields directly — datetime
 * texts are formatted by Text dataType:date (DateCell).
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

// dict_task_calendar.is_continuous — TINYINT 1/0 (metadata type boolean);
// NULL — the task is missing from the calendar (LEFT JOIN)
function isContinuousLabel(value) {
  if (value === true || value === 1 || value === "1") return "Да";
  if (value === false || value === 0 || value === "0") return "Нет";
  return "";
}

function mapRow(row) {
  if (!row || typeof row !== "object") return row;
  const out = { ...row };
  if ("is_continuous" in out) {
    out.is_continuous = isContinuousLabel(out.is_continuous);
  }
  return out;
}