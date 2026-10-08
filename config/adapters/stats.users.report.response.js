/**
 * Response adapter for GET ops/users-v2/report/[report_id] — metadata of the stats report
 * for the experimental "Participants (v2)" page.
 *
 * Returns ONLY safe data:
 *  - id, title of the report;
 *  - columns — display columns from fields[] ({field, header, sortable, dataType});
 *  - filters — filter definitions for FiltersPanel (hardcoded per §2 of the spec
 *    .prompts/new_req_users.md, while the server doesn't return them itself per §3.4;
 *    when `filters` appears in the response — the server ones are used).
 *
 * The report `sql` and service fields (category, for_dashboard, view_type…) do not
 * go into the page state: the frontend receives only column types and names.
 */
const USERS_FILTERS = [
  {
    id: "status",
    type: "options",
    opts: ["Активен", "Заблокирован", "Удалён"],
    value: null,
  },
  {
    id: "participant_status",
    type: "options",
    opts: ["Анкета не заполнена", "Участник"],
    value: null,
  },
  { id: "mailing", type: "checkbox", opts: null, value: null },
  { id: "registration_date", type: "period", opts: null, value: null },
  { id: "balance", type: "range", opts: null, value: null },
];

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
        sortable: f.sortable !== false,
        dataType:
          f.type === "date" || f.type === "datetime" ? "date" : undefined,
      })),
    filters: Array.isArray(data.filters) ? data.filters : USERS_FILTERS,
  };
}