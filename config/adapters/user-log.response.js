// Response adapter: GET /api/v1/crm/users/[id]/log/events (§5.3)
// Envelope {status:"ok", data:{items:[...], pagination:{...}}} → list-request format.
// Date formatting is client-side (dataType markers in columns), adapters keep raw ISO.

function transform(data) {
  const items = Array.isArray(data && data.items) ? data.items : [];

  const value = items.map(function (item, index) {
    const payload = item.payload && typeof item.payload === "object" ? item.payload : {};
    // Human-readable payload summary for the table column
    let payloadSummary = "";
    const keys = Object.keys(payload);
    if (keys.length > 0) {
      payloadSummary = keys
        .map(function (k) {
          const v = payload[k];
          const s = v === null || v === undefined ? "" : String(v);
          return k + ": " + (s.length > 40 ? s.slice(0, 40) + "…" : s);
        })
        .join("; ");
    } else {
      payloadSummary = "—";
    }
    // Pretty JSON for the details dialog
    const payloadPretty =
      keys.length > 0 ? JSON.stringify(payload, null, 2) : "{}";

    return Object.assign({}, item, {
      row_id: item.event_id || "row-" + index,
      _rowId: item.event_id || "row-" + index,
      payload_summary: payloadSummary,
      payload_pretty: payloadPretty
    });
  });

  return {
    value: value,
    columns: [
      { field: "event_id", header: "ID события", dataType: "uuid" },
      { field: "event_type", header: "Тип события" },
      { field: "payload_summary", header: "Данные события" },
      { field: "created_at", header: "Дата", dataType: "date" }
    ],
    totalRecords: (data && data.pagination && data.pagination.total_items) || value.length,
    first: (data && data.pagination && ((data.pagination.page - 1) * data.pagination.limit)) || 0,
    rows: (data && data.pagination && data.pagination.limit) || 25
  };
}

return transform(data);