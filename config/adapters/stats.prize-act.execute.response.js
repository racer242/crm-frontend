/**
 * Response adapter for the prize-act card query (POST
 * ops/prizes-card/act/execute; SQL: query 3 of .prompts/prize.md —
 * prize_instances × act).
 *
 * The card is NOT a table: the feed target (setStateField) REPLACES the
 * whole state.prizeAct object, so the adapter returns the FULL panel
 * state. The panel is ALWAYS visible (it answers «нужен ли акт вообще»);
 * an empty rows → act_state absent → the empty panel state (all «—»).
 * The envelope forms are handled like in the list adapters:
 * {status:"ok", data}, spec {rows, meta}, current {items, pagination},
 * legacy raw array.
 *
 * Labels: act_state — the 5 statuses of the spec (§12) in the wording of
 * the classic page (act.json: NOT_REQUIRED «Акт не требуется»,
 * WAITING_UPLOAD «Ожидает загрузки», ON_REVIEW «На проверке», APPROVED
 * «Подтверждён», REJECTED «Отклонён»); act_status — the legacy
 * implementation dictionary of the «Призы» list
 (ACT_STATUS_LABELS of
 * stats.prizes.execute.response.js, 4 codes); an explicit *_label from
 * the backend wins, an unknown code stays raw.
 *
 * Null handling: text → «—»; act_scan_size — a human-readable size
 * (Б/КБ/МБ); act_file_present — Да/Нет by the file's presence; DATETIME
 * stays raw (null or ISO) — the page renders it through Text
 * dataType: "date".
 */
const ACT_STATE_LABELS = Object.assign(Object.create(null), {
  NOT_REQUIRED: "Акт не требуется",
  WAITING_UPLOAD: "Ожидает загрузки",
  ON_REVIEW: "На проверке",
  APPROVED: "Подтверждён",
  REJECTED: "Отклонён",
});

const ACT_STATUS_LABELS = Object.assign(Object.create(null), {
  PENDING: "Ожидает",
  ACT_UPLOADED: "Акт загружен",
  APPROVED: "Подтверждён",
  REJECTED: "Отклонён",
});

function text(value) {
  if (value === null || value === undefined || value === "") return "—";
  return value;
}

function boolLabel(value) {
  if (value === true) return "Да";
  if (value === false) return "Нет";
  return "—";
}

function label(value, labels, explicit) {
  if (typeof explicit === "string" && explicit !== "") return explicit;
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "string" && labels[value]) return labels[value];
  return value;
}

// Human-readable file size: Б / КБ / МБ (one decimal for the big units)
function sizeText(bytes) {
  const n = Number(bytes);
  if (!Number.isFinite(n)) return "—";
  if (n < 1024) return n + " Б";
  if (n < 1024 * 1024) return (n / 1024).toFixed(1) + " КБ";
  return (n / (1024 * 1024)).toFixed(1) + " МБ";
}

function transform(data) {
  const payload = data && data.status === "ok" ? data.data : data;
  if (!payload || typeof payload !== "object") return emptyState();
  const row = firstRow(payload);
  if (!row || typeof row !== "object") return emptyState();
  return mapRow(row);
}

function emptyState() {
  return {
    act_state_label: "—",
    act_status_label: "—",
    act_required_label: "—",
    act_scan_original_name: "—",
    act_scan_mime: "—",
    act_scan_size_text: "—",
    act_scan_uploaded_at: null,
    act_file_present_label: "—",
  };
}

// One row out of any envelope form (same as prize-details)
function firstRow(payload) {
  if (Array.isArray(payload)) return payload[0] || null;
  if (Array.isArray(payload.rows)) {
    const first = payload.rows[0];
    if (!first || typeof first !== "object") return null;
    return Object.assign({}, first, first.values || {});
  }
  if (Array.isArray(payload.items)) return payload.items[0] || null;
  return null;
}

function mapRow(row) {
  const values = row && row.values && typeof row.values === "object" ? row.values : row;
  const out = Object.assign({}, values);
  const hasFile =
    out.act_scan_original_name !== null &&
    out.act_scan_original_name !== undefined &&
    out.act_scan_original_name !== "";
  return {
    act_state_label: label(out.act_state, ACT_STATE_LABELS, out.act_state_label),
    act_status_label: label(out.act_status, ACT_STATUS_LABELS, out.act_status_label),
    act_required_label: boolLabel(out.act_required),
    act_scan_original_name: text(out.act_scan_original_name),
    act_scan_mime: text(out.act_scan_mime),
    act_scan_size_text: sizeText(out.act_scan_size),
    act_scan_uploaded_at:
      out.act_scan_uploaded_at !== undefined ? out.act_scan_uploaded_at : null,
    act_file_present_label: boolLabel(hasFile),
  };
}