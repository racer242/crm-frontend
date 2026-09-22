// Response adapter: GET /api/v1/crm/users/[id]/log/events (§5.3)
// Envelope {status:"ok", data:{items:[...], pagination:{...}}} → list-request format.
// Date formatting is client-side (dataType markers in columns), adapters keep raw ISO.

function transform(source) {
  // Конверт {status:"ok", data:{items, pagination}} → внутренний data
  const data = source && source.status === "ok" ? source.data : source;
  const items = Array.isArray(data && data.items) ? data.items : [];

  const value = items.map(function (item, index) {
    const payload = item.payload && typeof item.payload === "object" ? item.payload : {};
    // Pretty JSON for the details dialog
    const payloadPretty =
      Object.keys(payload).length > 0 ? JSON.stringify(payload, null, 2) : "{}";

    return Object.assign({}, item, {
      row_id: item.event_id || "row-" + index,
      _rowId: item.event_id || "row-" + index,
      payload_pretty: payloadPretty,
      ip_address_label: item.ip_address || "—",
      user_agent_label: item.user_agent || "—",
    });
  });

  return {
    value: value,
    columns: [
      { field: "event_id", header: "ID события", dataType: "uuid" },
      { field: "event_type", header: "Тип события" },
      { field: "ip_address_label", header: "IP-адрес" },
      { field: "created_at", header: "Дата", dataType: "date" }
    ],
    totalRecords: (data && data.pagination && data.pagination.total_items) || value.length,
    first: (data && data.pagination && ((data.pagination.page - 1) * data.pagination.limit)) || 0,
    rows: (data && data.pagination && data.pagination.limit) || 25
  };
}

return transform(data);