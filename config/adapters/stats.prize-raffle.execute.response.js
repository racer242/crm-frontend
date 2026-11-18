/**
 * Response adapter for the prize-raffle card query (POST
 * ops/prizes-card/raffle/execute; SQL: query 2 of .prompts/prize.md —
 * chances × raffle_context × raffle_action × act).
 *
 * The card is NOT a table: the feed target (setStateField) REPLACES the
 * whole state.prizeRaffle object, so the adapter returns the FULL panel
 * state. One row: rows[0] (id wrapper + values merged); empty rows →
 * raffle_id = "" — the panel's visible (@state.prizeRaffle.raffle_id)
 * hides it (a free prize or a prize issued outside a raffle has no
 * chance). The envelope forms are handled like in the list adapters:
 * {status:"ok", data}, spec {rows, meta}, current {items, pagination},
 * legacy raw array.
 *
 * Labels: raffle_status — the «Призы» dictionary
 * (RAFFLE_STATUS_LABELS of stats.prizes.execute.response.js, 5 codes);
 * chance_status — the DB enum is NOT fixed in the spec → an explicit
 * chance_status_label from the backend wins, otherwise the code stays raw.
 * Null handling: text/number → «—» (0 stays 0), DATETIME stay raw (null
 * or ISO +03:00) — the page renders them through Text dataType: "date".
 */
const RAFFLE_STATUS_LABELS = Object.assign(Object.create(null), {
  DRAFT: "Черновик",
  IN_PROGRESS: "Идёт",
  COMPLETED: "Завершён",
  PUBLISHED: "Опубликован",
  ANNULLED: "Аннулирован",
});

function text(value) {
  if (value === null || value === undefined || value === "") return "—";
  return value;
}

function label(value, labels, explicit) {
  if (typeof explicit === "string" && explicit !== "") return explicit;
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "string" && labels[value]) return labels[value];
  return value;
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
    raffle_id: "",
    raffle_name: "—",
    raffle_type: "—",
    raffle_status_label: "—",
    chance_source_label: "—",
    chance_status_label: "—",
    chance_occurred_at: null,
    place: "—",
    chance_payload_prize_code: "—",
    chances_linked_count: "—",
    raffle_collection_from: null,
    raffle_collection_to: null,
    raffle_start_at: null,
    raffle_end_at: null,
    raffle_publish_at: null,
    drawn_at: null,
    raffle_started_at: null,
    raffle_finished_at: null,
    raffle_initiated_by_name: "—",
    raffle_initiated_by_email: "—",
    raffle_annul_reason: "—",
    raffle_result_chunks_total: "—",
    raffle_chunks_received: "—",
    raffle_winners_declared: "—",
    raffle_last_chunk_at: null,
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
  return {
    // The panel's visible binds state.prizeRaffle.raffle_id
    raffle_id: out.raffle_id || "",
    raffle_name: text(out.raffle_name),
    raffle_type: text(out.raffle_type),
    raffle_status_label: label(out.raffle_status, RAFFLE_STATUS_LABELS, out.raffle_status_label),
    chance_source_label: text(out.chance_source),
    chance_status_label: text(out.chance_status),
    chance_occurred_at: out.chance_occurred_at !== undefined ? out.chance_occurred_at : null,
    place: text(out.place),
    chance_payload_prize_code: text(out.chance_payload_prize_code),
    chances_linked_count: text(out.chances_linked_count),
    raffle_collection_from:
      out.raffle_collection_from !== undefined ? out.raffle_collection_from : null,
    raffle_collection_to: out.raffle_collection_to !== undefined ? out.raffle_collection_to : null,
    raffle_start_at: out.raffle_start_at !== undefined ? out.raffle_start_at : null,
    raffle_end_at: out.raffle_end_at !== undefined ? out.raffle_end_at : null,
    raffle_publish_at: out.raffle_publish_at !== undefined ? out.raffle_publish_at : null,
    drawn_at: out.drawn_at !== undefined ? out.drawn_at : null,
    raffle_started_at: out.raffle_started_at !== undefined ? out.raffle_started_at : null,
    raffle_finished_at: out.raffle_finished_at !== undefined ? out.raffle_finished_at : null,
    raffle_initiated_by_name: text(out.raffle_initiated_by_name),
    raffle_initiated_by_email: text(out.raffle_initiated_by_email),
    raffle_annul_reason: text(out.raffle_annul_reason),
    raffle_result_chunks_total: text(out.raffle_result_chunks_total),
    raffle_chunks_received: text(out.raffle_chunks_received),
    raffle_winners_declared: text(out.raffle_winners_declared),
    raffle_last_chunk_at: out.raffle_last_chunk_at !== undefined ? out.raffle_last_chunk_at : null,
  };
}