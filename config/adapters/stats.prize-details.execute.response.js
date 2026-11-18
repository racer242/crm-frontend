/**
 * Response adapter for the prize-details card query (POST
 * ops/prizes-card/details/execute; SQL: query 1 of .prompts/prize.md —
 * prize_instances × prize_catalog × user).
 *
 * The card is NOT a table: the feed target (setStateField) REPLACES the
 * whole state.prizeData object, so the adapter returns the FULL card state
 * — the main panel fields AND the owner fields (query 1 carries the owner,
 * the classic GET /api/ops/users/{id} second feed of the old card is
 * gone). One row: rows[0] (id wrapper + values merged) — empty rows means
 * the prize is not found (spec: 404) → the empty card state (panels show
 * «—», nothing crashes). The envelope forms are handled like in the list
 * adapters: {status:"ok", data}, spec {rows, meta}, current
 * {items, pagination}, legacy raw array.
 *
 * Labels: enum fields get the same code → label pairs as the «Призы»
 * report filters (spec §548) — the dictionaries of
 * stats.prizes.execute.response.js (status 14 / pool_status 3), the owner
 * statuses — the users dictionaries (stats.users.execute.response.js); an
 * explicit <field>_label from the backend wins, an unknown code stays
 * raw. Severities of the status Tag — the map of the classic card adapter
 * (prize.get.response.js).
 *
 * Null handling: text/number fields → «—», booleans → Да/Нет/«—», DATETIME
 * stay raw (null or ISO +03:00) — the page renders them through Text
 * dataType: "date" (DateCell in the viewer timezone, empty on null).
 */
// The 14 statuses of the CRM enum — the same code → label pairs as the
// list («Призы»); the dropdown options live in the page state
// (state.statusOptions) and are NOT built here (the details feed failing
// must not wipe them)
const STATUS_LABELS = Object.assign(Object.create(null), {
  FREE: "Свободен",
  DATA_NEEDED: "Нужны данные",
  RECEIVED: "Получен",
  SENDING: "Отправляется",
  SENT: "Отправлен",
  ERROR: "Ошибка",
  DOWNLOAD: "Скачивается",
  PROCESSING: "В обработке",
  READY_FOR_DELIVERY: "Готов к выдаче",
  NEED_CODE: "Нужен код",
  DELETED: "Удалён",
  PENDING: "Ожидает (legacy)",
  ACT_UPLOADED: "Акт загружен (legacy)",
  REJECTED: "Отклонён (legacy)",
});

// Severity of the status Tag — the map of the classic card adapter
const STATUS_SEVERITIES = Object.assign(Object.create(null), {
  free: "secondary",
  data_needed: "warning",
  received: "success",
  sending: "info",
  sent: "info",
  error: "danger",
  download: "info",
  processing: "info",
  ready_for_delivery: "info",
  need_code: "warning",
  deleted: "danger",
  pending: "warning",
  act_uploaded: "info",
  rejected: "danger",
});

const POOL_STATUS_LABELS = Object.assign(Object.create(null), {
  active: "В пуле",
  removing: "К изъятию",
  removed: "Изъят",
});

// Owner statuses — the users dictionaries (stats.users.execute.response.js)
const OWNER_STATUS_LABELS = Object.assign(Object.create(null), {
  active: "Активен",
  blocked: "Заблокирован",
  deleted: "Удалён",
});
const PARTICIPANT_STATUS_LABELS = Object.assign(Object.create(null), {
  ANKET_REQUIRED: "Анкета не заполнена",
  PARTICIPANT: "Участник",
});

// text/number: null/"" → «—» (0 stays 0)
function text(value) {
  if (value === null || value === undefined || value === "") return "—";
  return value;
}

// boolean: true → Да, false → Нет, null/undefined → «—»
function boolLabel(value) {
  if (value === true) return "Да";
  if (value === false) return "Нет";
  return "—";
}

// enum: <field>_label from the backend wins, then the dictionary, an
// unknown code stays raw; null → «—»
function label(value, labels, explicit) {
  if (typeof explicit === "string" && explicit !== "") return explicit;
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "string" && labels[value]) return labels[value];
  return value;
}

// Empty card state — panels show «—», the «Перейти к владельцу» button is
// disabled (the prize was not found: the spec 404 case)
function emptyState() {
  return {
    id: "",
    prize_id: "",
    prize_code: "—",
    type_code: "—",
    title: "",
    description: "",
    price_rub: "—",
    points_cost: "—",
    status: "",
    status_label: "",
    status_severity: "secondary",
    pool_status_label: "—",
    act_required_label: "—",
    catalog_active_label: "—",
    catalog_is_removed_label: "—",
    catalog_target_count: "—",
    external_id_label: "—",
    issued_at: null,
    created_at: null,
    image_url: "",
    user_id: "",
    user_id_label: "—",
    participant_code: "—",
    full_name: "—",
    email: "—",
    owner_phone: "—",
    owner_status_label: "—",
    owner_participant_status_label: "—",
    owner_balance: "—",
    owner_total_earned: "—",
    owner_registered_at: null,
    user_go_disabled: true,
  };
}

function transform(data) {
  const payload = data && data.status === "ok" ? data.data : data;
  const empty = emptyState();
  if (!payload || typeof payload !== "object") return empty;
  const row = firstRow(payload);
  if (!row || typeof row !== "object") return empty;
  return mapRow(row);
}

// One row out of any envelope form: legacy array / spec {rows:[{id, values}]}
// (wrapper merged) / current {items, pagination}
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
  return {
    id: out.instance_id || "",
    prize_id: out.prize_id || "",
    prize_code: text(out.prize_code),
    type_code: text(out.type_code),
    // The breadcrumb binds state.prizeData.title
    title: out.prize_title || "",
    description: out.catalog_description || "",
    price_rub: text(out.price_rub),
    points_cost: text(out.points_cost),
    status: out.status || "",
    status_label: label(out.status, STATUS_LABELS, out.status_label),
    status_severity:
      STATUS_SEVERITIES[String(out.status || "").toLowerCase()] || "secondary",
    pool_status_label: label(out.pool_status, POOL_STATUS_LABELS, out.pool_status_label),
    act_required_label: boolLabel(out.act_required),
    catalog_active_label: boolLabel(out.catalog_active),
    catalog_is_removed_label: boolLabel(out.catalog_is_removed),
    catalog_target_count: text(out.catalog_target_count),
    external_id_label: text(out.external_id),
    issued_at: out.issued_at !== undefined ? out.issued_at : null,
    created_at: out.created_at !== undefined ? out.created_at : null,
    image_url: out.catalog_image_source_url || "",
    user_id: out.user_id || "",
    user_id_label: out.user_id || "—",
    participant_code: text(out.participant_code),
    full_name: text(out.full_name),
    email: text(out.email),
    owner_phone: text(out.owner_phone),
    owner_status_label: label(out.owner_status, OWNER_STATUS_LABELS, out.owner_status_label),
    owner_participant_status_label: label(
      out.owner_participant_status,
      PARTICIPANT_STATUS_LABELS,
      out.owner_participant_status_label,
    ),
    owner_balance: text(out.owner_balance),
    owner_total_earned: text(out.owner_total_earned),
    owner_registered_at: out.owner_registered_at !== undefined ? out.owner_registered_at : null,
    // «Перейти к владельцу» неактивна, если приз свободен
    user_go_disabled: !out.user_id,
  };
}