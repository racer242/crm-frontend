/**
 * Response adapter for GET ops/users-v2/tasks (→
 * /api/v1/crm/stats/query/user-avito-tasks) — metadata of the "participant
 * tasks" query of the avito_to_the_top campaign (the query is addressed by
 * the manual query_id "user-avito-tasks", SQL: .prompts/user-page-sql2.md).
 *
 * Mirrors stats.users.report.response.js (columns from fields[]), differences:
 *  - sortable — by the shared USERS_AVITO_TASKS_SORTABLE_COLUMNS whitelist in
 *    _shared.js (per the sorting mapping of the doc ALL 9 columns are
 *    sortable; the same list the request adapter applies); an explicit
 *    server-side sortable:false is respected too;
 *  - the query has no UI filters — the server filters are passed through,
 *    otherwise an empty array (the tasks table does not use FiltersPanel).
 *
 * The report sql and service fields (category, for_dashboard, view_type…)
 * do not go into the page state.
 */
function transform(source) {
  const data = source && source.status === "ok" ? source.data : source;
  if (!data || typeof data !== "object") return data;

  const fields = Array.isArray(data.fields) ? data.fields : [];

  return {
    id: data.id,
    title: data.title,
    columns: fields
      .filter((f) => f && f.name)
      .map((f) => ({
        field: f.name,
        header: f.title || f.name,
        sortable: f.sortable !== false && isUsersAvitoTasksSortable(f.name),
        dataType:
          f.type === "date" || f.type === "datetime" ? "date" : undefined,
      })),
    filters: Array.isArray(data.filters) ? data.filters : [],
  };
}

return transform(data);