/**
 * Response adapter for the metadata GET of the transactions stats queries of
 * the avito_to_the_top campaign (GET ops/transactions and
 * ops/user-transactions → /api/v1/crm/stats/query/{query_id} with the
 * manual query_id "transactions" / "user-transactions"; the adapter key is
 * shared by both pages).
 *
 * Contract (specs §5.1): the answer is the query metadata — id/title +
 * fields[] (the table columns; internal tl.id/bu.user_id are not returned
 * by the server, whatever the server sends is displayed) + filters[] (the
 * filter defs with id/name/type/opts; SQL never leaves the backend).
 *
 * Passthrough mapping: columns come from fields[] (field ← name, header ←
 * title, dataType ← type date/datetime — the DataTable formats them in the
 * viewer timezone), sortable and the rest of the filter defs go as the
 * server sent them — the server owns the sortable flags (error_message /
 * full_name are not sortable) and the option lists (including the rule
 * "nothing or all selected → no restriction", implemented by the request
 * adapter). Everything unknown is ignored; an empty or missing metadata
 * (the query is not registered on the backend yet) gives empty
 * columns/filters — the page renders the header and empty controls, the
 * graceful degradation state.
 */
function transform(data) {
  const meta = data && data.status === "ok" ? data.data : data;
  if (!meta || typeof meta !== "object") return meta;
  const fields = Array.isArray(meta.fields) ? meta.fields : [];
  return {
    id: meta.id,
    title: meta.title,
    columns: fields.map(mapColumn),
    filters: Array.isArray(meta.filters) ? meta.filters : [],
  };
}

function mapColumn(field) {
  if (!field || typeof field !== "object") return field;
  const column = {
    field: field.name,
    header: field.title || field.name,
    sortable: field.sortable !== false,
  };
  if (field.type === "date" || field.type === "datetime") {
    column.dataType = "date";
  }
  return column;
}
