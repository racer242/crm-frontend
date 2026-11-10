/**
 * Response adapter for GET ops/users-v2/tasks (→
 * /api/v1/crm/stats/query/user-avito-tasks) — metadata of the "participant
 * tasks" query of the avito_to_the_top campaign (the query is addressed by
 * the manual query_id "user-avito-tasks", SQL: .prompts/user-page-sql2_1.md).
 *
 * The table shows only 9 of the query's 16 fields (.prompts/avito_tasks.md):
 * the rest (task_id, description, league_code, segment, status, avito_id,
 * telegram_id) are visible in the row popup (taskDialogSection of the card
 * page) straight from the row data. Columns are built in the fixed order of
 * the task — not in the fields[] order of the server response — with the
 * titles of the task («Статус», not the metadata «Статус (отображение)»);
 * a field missing from the metadata (the backend hasn't been switched to the
 * new SQL yet) is just skipped — graceful degradation, the table shows fewer
 * columns.
 *
 * sortable — by the shared USERS_AVITO_TASKS_SORTABLE_COLUMNS whitelist in
 * _shared.js (per the sorting mapping of the doc; description — null, not
 * sortable; the same list the request adapter applies); an explicit
 * server-side sortable:false is respected too. The query has no UI filters —
 * the server filters are passed through, otherwise an empty array.
 */
const TABLE_COLUMNS = [
  { name: "task_code", title: "Код задания" },
  { name: "title", title: "Название" },
  { name: "display_status", title: "Статус" },
  { name: "start_date", title: "Дата старта" },
  { name: "finish_date", title: "Дата окончания" },
  { name: "is_continuous", title: "Длительное задание" },
  { name: "assigned_at", title: "Дата назначения" },
  { name: "accrued_at", title: "Дата начисления баллов" },
  { name: "updated_at", title: "Дата обновления" },
];

function transform(source) {
  const data = source && source.status === "ok" ? source.data : source;
  if (!data || typeof data !== "object") return data;

  // fields[] of the server → map by name (types are needed for dataType);
  // null-prototype map — so that keys like "constructor" can never hit
  // Object.prototype
  const fields = Array.isArray(data.fields) ? data.fields : [];
  const byName = Object.create(null);
  fields.forEach((f) => {
    if (f && f.name) byName[f.name] = f;
  });

  return {
    id: data.id,
    title: data.title,
    columns: TABLE_COLUMNS.filter((c) => byName[c.name]).map((c) => {
      const f = byName[c.name];
      return {
        field: c.name,
        header: c.title,
        sortable: f.sortable !== false && isUsersAvitoTasksSortable(c.name),
        dataType:
          f.type === "date" || f.type === "datetime" ? "date" : undefined,
      };
    }),
    filters: Array.isArray(data.filters) ? data.filters : [],
  };
}

return transform(data);