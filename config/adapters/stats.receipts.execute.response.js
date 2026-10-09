/**
 * Response adapter for executing the stats query for the "Receipts (v2)" page
 * (POST ops/receipts-v2/query/[query_id]/execute → /api/v1/crm/stats/query/{query_id}/execute,
 * format json; the page's query is addressed by the manual query_id "receipts",
 * spec .prompts/new_req_receipts.md — отчёт «Просмотр чеков»).
 *
 * Supports the response shapes of the spec (§8) and the current execute format:
 *  - {rows: [{id, values}], meta{total_count, first, limit}} — §8.4 "meta для фронта";
 *  - {rows: [{id, values}], pagination{page, limit, total_items}} — §8.1 raw shape;
 *  - {items, pagination} — §6.1 current format (same as the users page).
 *
 * Table columns come from state.report.columns (GET of the report), so they are
 * not returned here. Filters are not returned either: their definitions live in
 * state.report.filters — the response must not reset the values filled in by
 * the user (until the server echo is implemented).
 *
 * Display substitution — readable values instead of DB codes (display only:
 * sorting/search still reach the server as raw codes, the SQL works with them):
 *  - moderation_status / fns_status — the server-provided "<field>_label" wins
 *    (spec §8.2), then the front dictionary (same wording as the opts of the
 *    matching filters in stats.receipts.report.response.js; + HAND_LOAD —
 *    «Ручная загрузка»); an unknown code passes through unchanged;
 *  - retail_chain already arrives human-readable from the report SQL (CASE);
 *  - money (total_amount, promo_products_amount) arrives in rubles from the
 *    report SQL (ROUND(x / 100, 2)) — passed as is.
 */
function transform(source) {
  const payload = source && source.status === "ok" ? source.data : source;

  const empty = { value: [], totalRecords: 0, first: 0, rows: 10 };
  if (!payload || typeof payload !== "object") return empty;

  // Spec §8 formats: rows[] with values{} — counters from meta or pagination
  if (Array.isArray(payload.rows)) {
    const rows = payload.rows.map((r) => mapRow(r && r.values ? r.values : r));
    const meta = payload.meta || {};
    if (
      meta.total_count !== undefined ||
      meta.first !== undefined ||
      meta.limit !== undefined
    ) {
      const limit = Number(meta.limit) || 10;
      return {
        value: rows,
        totalRecords: Number(meta.total_count) || 0,
        first: Number(meta.first) || 0,
        rows: limit,
      };
    }
    const pagination = payload.pagination || {};
    const page = Number(pagination.page) || 1;
    const limit = Number(pagination.limit) || 10;
    return {
      value: rows,
      totalRecords: Number(pagination.total_items) || 0,
      first: (page - 1) * limit,
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
// filters (RECEIPTS_FILTERS in stats.receipts.report.response.js). Unknown
// codes stay as-is (safe fallback when the dictionary grows). Null-prototype
// maps — so that keys like "constructor" can never hit Object.prototype.
const MODERATION_STATUS_LABELS = Object.assign(Object.create(null), {
  CHECKING: "На проверке",
  ACCEPTED: "Принят",
  REFUSED: "Отклонён",
  SUSPENDED: "Отложен",
  NEED_PHOTO: "Требуется загрузка фото",
  HAND_LOAD: "Ручная загрузка",
});
const FNS_STATUS_LABELS = Object.assign(Object.create(null), {
  no_check: "Не проверен",
  wait: "Ожидает ФНС",
  wrong: "Не найден в ФНС",
  correct: "Чек корректный",
});

// display value: server-provided "<field>_label" (spec §8.2) wins, then the
// front dictionary, an unknown code stays as-is
function label(raw, serverLabel, dict) {
  if (typeof serverLabel === "string" && serverLabel !== "") return serverLabel;
  if (typeof raw === "string" && raw in dict) return dict[raw];
  return raw;
}

function mapRow(row) {
  if (!row || typeof row !== "object") return row;
  const out = { ...row };
  out.moderation_status = label(
    out.moderation_status,
    out.moderation_status_label,
    MODERATION_STATUS_LABELS,
  );
  out.fns_status = label(out.fns_status, out.fns_status_label, FNS_STATUS_LABELS);
  return out;
}