/**
 * Response adapter for GET ops/users-v2/query/[query_id] (→ /api/v1/crm/stats/query/{query_id})
 * — metadata of the users query for the "Participants" page of the campaign
 * avito_to_the_top (config/camps/avito_to_the_top/patch.json swaps the script
 * of stats.users.report.response for this file; the page's query_id is "users").
 *
 * Campaign specifics (.prompts/avito_req.md):
 *  - the `mailing` column is removed from the campaign UI («Рассылка»; the
 *    customColumn icon is removed by the page patch) — the field is filtered
 *    out of the metadata columns here;
 *  - sortable flags follow USERS_AVITO_SORTABLE_COLUMNS in _shared.js —
 *    avito_id / telegram_id / category_name / league_name are sortable (the
 *    server maps the column name to SQL per its own sorting map), while
 *    full_name (computed CONCAT_WS) and phone are not;
 *  - filters: the reference set WITHOUT the mailing radio (the mailing column
 *    is removed from the campaign UI) — used as the fallback when the server
 *    metadata carries no filters of its own; filter VALUES are mapped into
 *    replacement macros in stats.users.execute.request.avito.js;
 *  - the «Категория»/«Лига» dropdown filters are static page components fed
 *    by the dictionary SSR feeds (dict_categories / dict_leagues), not filter
 *    models.
 *
 * Returns ONLY safe data (no report sql / service fields), same as the
 * reference adapter.
 */
const AVITO_USERS_FILTERS = [
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
      // «Рассылка» removed from the campaign UI (column + customColumn icon)
      .filter((f) => f && f.name && f.name !== "mailing")
      .map((f) => ({
        field: f.name,
        header: f.title || f.name,
        // Sorting is offered only for columns the report SQL can ORDER BY
        // (shared USERS_AVITO_SORTABLE_COLUMNS whitelist in _shared.js — the
        // same list the request adapter applies); an explicit server-side
        // sortable:false is respected too
        sortable: f.sortable !== false && isUsersAvitoSortable(f.name),
        dataType:
          f.type === "date" || f.type === "datetime" ? "date" : undefined,
      })),
    filters: Array.isArray(data.filters) ? data.filters : AVITO_USERS_FILTERS,
  };
}
