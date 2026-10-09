/**
 * Response adapter for GET ops/users-v2/report/[report_id] — metadata of the stats report
 * for the experimental "Participants (v2)" page.
 *
 * Returns ONLY safe data:
 *  - id, title of the report;
 *  - columns — display columns from fields[] ({field, header, sortable, dataType});
 *    sortable is true only for columns the report SQL can ORDER BY (the shared
 *    USERS_V2_SORTABLE_COLUMNS whitelist in _shared.js, the same list the request
 *    adapter applies) — non-sortable columns (e.g. the computed full_name) render
 *    without sort in the DataTable;
 *  - filters — filter definitions for FiltersPanel (hardcoded per §2 of the spec
 *    .prompts/new_req_users.md, while the server doesn't return them itself per §3.4;
 *    when `filters` appears in the response — the server ones are used). Filter
 *    VALUES are mapped into replacement macros in stats.users.execute.request.js.
 *
 * The report `sql` and service fields (category, for_dashboard, view_type…) do not
 * go into the page state: the frontend receives only column types and names.
 */
// Filter definitions with UI labels (name is rendered by FiltersPanel and
// ActiveFiltersBar). DB values behind the options are hardcoded in
// stats.users.execute.request.js (STATUS_VALUES / PARTICIPANT_STATUS_VALUES /
// MAILING_VALUES).
const USERS_FILTERS = [
  {
    id: "status",
    name: "Статус участника",
    type: "options",
    opts: ["Активен", "Заблокирован", "Удалён"],
    value: null,
  },
  {
    id: "participant_status",
    name: "Статус анкеты",
    type: "options",
    opts: ["Анкета не заполнена", "Участник"],
    value: null,
  },
  {
    // radio: single choice, value = opt label; «Все» or nothing selected →
    // no restriction (mapped in mailingFragment of the request adapter)
    id: "mailing",
    name: "Согласие на рассылку",
    type: "radio",
    opts: ["Принял", "Не принял", "Все"],
    value: null,
  },
  {
    id: "registration_date",
    name: "Дата регистрации",
    type: "period",
    opts: null,
    value: null,
  },
  {
    // range without opts: no slider, free «От»/«До» inputs (empty = bound
    // not set); both empty → no restriction
    id: "balance",
    name: "Баланс баллов",
    type: "range",
    opts: null,
    value: null,
  },
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
        // Sorting is offered only for columns the report SQL can ORDER BY
        // (shared USERS_V2_SORTABLE_COLUMNS whitelist in _shared.js — the
        // same list the request adapter applies); an explicit server-side
        // sortable:false is respected too
        sortable: f.sortable !== false && isUsersV2Sortable(f.name),
        dataType:
          f.type === "date" || f.type === "datetime" ? "date" : undefined,
      })),
    filters: Array.isArray(data.filters) ? data.filters : USERS_FILTERS,
  };
}