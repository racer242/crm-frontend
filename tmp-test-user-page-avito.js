/**
 * Стенд: дельта карточки участника кампании avito_to_the_top
 * (config/camps/avito_to_the_top/pages/user-card.json — второй файл патча,
 * подключённый через $ref-шим patch.json → pages.json).
 *
 * 1) Эталон собирается через $RefParser (как initApp), реестр кампаний
 *    реплицирует buildCampConfigs — заодно проверяется, что $ref-шим
 *    разворачивается и итоговый конфиг не содержит литералов $ref;
 * 2) структурные проверки страницы user (state/dataFeed/dataInit/shortcuts/
 *    detailsTable/секция «Задания»), apiRoutes рейтинг+задания и матринг
 *    путей (новые статические маршруты не перекрываются более ранними);
 * 3) исполнение адаптеров карточки через new Function с _shared.js (как
 *    DataAdapterEngine): rating request/response, tasks report/execute;
 * 4) регресс: эталон страницы user не задет, список участников работает
 *    (глубокий регресс — tmp-test-avito-patch.js).
 */
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

// 1) Компиляция configMerge.ts (чистый модуль без импортов)
execSync(
  "npx tsc src/core/configMerge.ts --outDir tmp-merge-build-card --module commonjs --target es2020 --lib es2020,dom --skipLibCheck",
  { stdio: "pipe" },
);
const { applyConfigDelta } = require("./tmp-merge-build-card/configMerge.js");
fs.rmSync("tmp-merge-build-card", { recursive: true, force: true });

let pass = 0;
let fail = 0;
function check(name, cond) {
  if (cond) {
    pass++;
    console.log("PASS " + name);
  } else {
    fail++;
    console.log("FAIL " + name);
  }
}

// _shared.js префиксуется к каждому адаптеру (как в DataAdapterEngine.applyJs)
const SHARED = fs.readFileSync("config/adapters/_shared.js", "utf-8");
function runAdapter(scriptPath, data) {
  const script = fs.readFileSync(scriptPath, "utf-8");
  const fn = new Function("data", `${SHARED}; ${script}; return transform(data);`);
  return fn(data);
}

// В собранном конфиге не должно остаться литералов $ref
function hasRefKey(value) {
  if (Array.isArray(value)) return value.some(hasRefKey);
  if (value && typeof value === "object") {
    return Object.entries(value).some(([k, v]) => k === "$ref" || hasRefKey(v));
  }
  return false;
}

// Упрощённая реплика matchRoutePattern из src/app/api/[...route]/route.ts
// (без ** — для новых путей не нужен): сегменты равны, [x] — динамический
function matches(patternPath, requestPath, routeMethod, requestMethod) {
  if (routeMethod !== requestMethod) return false;
  const p = patternPath.split("/").filter(Boolean);
  const r = requestPath.split("/").filter(Boolean);
  if (p.length !== r.length) return false;
  for (let i = 0; i < p.length; i++) {
    if (/^\[.+\]$/.test(p[i])) continue;
    if (p[i] !== r[i]) return false;
  }
  return true;
}

async function main() {
  const refParserModule = await import("@apidevtools/json-schema-ref-parser");
  const $RefParser = refParserModule.default || refParserModule;
  const parser = new $RefParser();
  const reference = await parser.dereference(path.resolve("config/crm-config.json"));

  const registry = new Map();
  for (const camp of reference.camps || []) {
    const key = camp.code || String(camp.id);
    if (camp.config_patch === undefined || camp.config_patch === null) {
      registry.set(key, reference);
      continue;
    }
    const patchPath = path.resolve("config", camp.config_patch);
    const patchParser = new $RefParser();
    const delta = await patchParser.dereference(patchPath);
    const campConfig = structuredClone(reference);
    applyConfigDelta(campConfig, delta);
    registry.set(key, campConfig);
  }

  const avito = registry.get("avito_to_the_top");
  check("avito config is a patched clone", avito !== undefined && avito !== reference);
  check("shim resolved: no $ref literals in the avito config", !hasRefKey(avito));

  // 2) Страница user: структура патча
  const avitoUser = avito.pages.find((p) => p.id === "user");
  const refUser = reference.pages.find((p) => p.id === "user");
  check("user page patched (new state added)", avitoUser !== undefined && avitoUser.state.userRating !== undefined);
  check("reference user page untouched (no userRating)", refUser.state.userRating === undefined);
  check("base state kept (userData, stats counters)", avitoUser.state.userData !== undefined && avitoUser.state.receiptsStats !== undefined && avitoUser.state.prizesStats !== undefined);
  check("rating state defaults", avitoUser.state.userRating.avito_id === "" && avitoUser.state.userRating.better_than_percent_label === "");
  check("tasks state defaults", JSON.stringify(avitoUser.state.tasks) === JSON.stringify({ value: [], totalRecords: 0, first: 0, rows: 10 }));
  check("tasksQuery defaults", avitoUser.state.tasksQuery.sortField === "" && avitoUser.state.tasksQuery.sortOrder === -1);
  check("taskReport container", Array.isArray(avitoUser.state.taskReport.columns) && avitoUser.state.taskReport.columns.length === 0);

  check("dataFeed: 6 base + 3 new", avitoUser.dataFeed.length === 9);
  check("base feeds intact (6 urls)", refUser.dataFeed.every((f) => avitoUser.dataFeed.some((d) => d.url === f.url && d.target === f.target)));
  const ratingFeed = avitoUser.dataFeed.find((f) => f.url === "/api/ops/users-v2/rating/execute");
  check("rating feed: POST → state.userRating with route param", ratingFeed !== undefined && ratingFeed.method === "POST" && ratingFeed.target === "state.userRating" && ratingFeed.data.user_id === "{$location.routeParams.user_id}");
  const tasksMetaFeed = avitoUser.dataFeed.find((f) => f.url === "/api/ops/users-v2/tasks");
  check("tasks metadata feed: GET → state.taskReport", tasksMetaFeed !== undefined && tasksMetaFeed.method === "GET" && tasksMetaFeed.target === "state.taskReport");
  const tasksExecFeed = avitoUser.dataFeed.find((f) => f.url === "/api/ops/users-v2/tasks/execute");
  check("tasks execute feed: POST with user_id + URL params", tasksExecFeed !== undefined && tasksExecFeed.method === "POST" && tasksExecFeed.target === "state.tasks" && tasksExecFeed.data.user_id === "{$location.routeParams.user_id}" && tasksExecFeed.data.first === "{$location.params.first}" && tasksExecFeed.data.sortField === "{$location.params.sortField}");

  check("dataInit: 2 sort entries", Array.isArray(avitoUser.dataInit) && avitoUser.dataInit.length === 2 && avitoUser.dataInit.some((d) => d.target === "state.tasksQuery.sortField") && avitoUser.dataInit.some((d) => d.target === "state.tasksQuery.sortOrder" && d.parse === "json"));
  check("base page has no dataInit", refUser.dataInit === undefined);

  const shortcut = avitoUser.shortcuts.requestTasks.params.commands;
  check("shortcut requestTasks: 2 commands", shortcut.length === 2 && shortcut[0].type === "sendRequest" && shortcut[1].type === "mergeUrlParams");
  const send = shortcut[0].params;
  check("sendRequest: url/target/event/user_id/sort", send.url === "/api/ops/users-v2/tasks/execute" && send.target === "state.tasks" && send.data.event === "{$event}" && send.data.user_id === "{$location.routeParams.user_id}" && send.data.sortField === "{$state.tasksQuery.sortField}");
  const merge = shortcut[1].params;
  check("mergeUrlParams: first/rows/sortField/sortOrder", merge.values.first === "{$state.tasks.first}" && merge.values.sortOrder === "{$state.tasksQuery.sortOrder}" && Object.keys(merge.values).length === 4);
  check("base page has no shortcuts", refUser.shortcuts === undefined);

  // detailsTable: 5 базовых строк + 6 новых (props.value — неиндексируемый
  // массив, заменяется целиком)
  const avitoDetails = avitoUser.sections
    .find((s) => s.id === "mainLayout")
    .blocks.find((b) => b.id === "rightColumnBlock")
    .components.find((c) => c.id === "detailsTable");
  const refDetails = refUser.sections
    .find((s) => s.id === "mainLayout")
    .blocks.find((b) => b.id === "rightColumnBlock")
    .components.find((c) => c.id === "detailsTable");
  const rows = avitoDetails.props.value;
  check("detailsTable: 11 rows (5 base + 6 new)", rows.length === 11);
  check("detailsTable: base rows preserved verbatim", refDetails.props.value.every((r, i) => JSON.stringify(rows[i]) === JSON.stringify(r)));
  check("detailsTable: mailing row kept", rows.some((r) => r.label === "Согласие на рассылку" && r.value === "@state.userData.mailing"));
  check("detailsTable: new rows bound to userRating", rows[5].label === "Avito ID" && rows[5].value === "@state.userRating.avito_id" && rows[6].label === "Telegram ID" && rows[7].label === "Категория" && rows[7].value === "@state.userRating.category_name" && rows[8].label === "Лига" && rows[9].label === "Место в рейтинге" && rows[9].value === "@state.userRating.place" && rows[10].label === "Результат лучше, чем у" && rows[10].value === "@state.userRating.better_than_percent_label");

  // Секция «Задания» — ниже основной раскладки, попап деталей — последней
  const sectionIds = avitoUser.sections.map((s) => s.id);
  check("tasks section below the main layout", sectionIds[sectionIds.length - 2] === "userTasksSection" && sectionIds.indexOf("mainLayout") === sectionIds.length - 3);
  check("reference sections unchanged", refUser.sections.length === avitoUser.sections.length - 2 && refUser.sections.every((s) => sectionIds.indexOf(s.id) !== -1));
  const tasksSection = avitoUser.sections.find((s) => s.id === "userTasksSection");
  const table = tasksSection.blocks.find((b) => b.id === "userTasksBlock").components.find((c) => c.id === "userTasksTable");
  check("tasks table: Panel wrapper «Задания»", tasksSection.blocks[0].wrapper.component === "Panel" && tasksSection.blocks[0].wrapper.props.header === "Задания");
  check("tasks table: standard paginator + lazy + row select", table.props.paginator === true && table.props.lazy === true && table.props.selectionMode === "single" && JSON.stringify(table.props.rowsPerPageOptions) === JSON.stringify([5, 10, 25, 50]) && table.props.rows === "@state.tasks.rows" && table.props.first === "@state.tasks.first");
  check("tasks table: columns/totalRecords bindings", table.props.columns === "@state.taskReport.columns" && table.props.totalRecords === "@state.tasks.totalRecords" && table.props.value === "@state.tasks.value");
  const onPage = table.events.find((e) => e.type === "onPage");
  const onSort = table.events.find((e) => e.type === "onSort");
  const onRowClick = table.events.find((e) => e.type === "onRowClick");
  check("tasks table: onPage/onSort → requestTasks", onPage.commands[0] === "requestTasks" && onSort.commands.length === 3 && onSort.commands[0].params.target === "state.tasksQuery.sortField" && onSort.commands[1].params.target === "state.tasksQuery.sortOrder" && onSort.commands[2] === "requestTasks");
  check("tasks table: onRowClick fills the dialog and opens it", onRowClick.commands.length === 2 && onRowClick.commands[0].params.source === "event.data" && onRowClick.commands[0].params.target === "state.tasksDialog" && onRowClick.commands[1].params.target === "state.tasksDialogVisible" && onRowClick.commands[1].params.value === true);
  const detailsCol = (table.props.customColumns || []).find((c) => c.field === "taskDetails");
  const detailsBtn = detailsCol && detailsCol.body[0];
  check("tasks table: details icon column (appended last, no header)", detailsCol !== undefined && detailsCol.header === "" && detailsBtn !== undefined && detailsBtn.componentType === "Button" && detailsBtn.props.icon === "pi pi-external-link" && detailsBtn.events[0].type === "onClick" && detailsBtn.events[0].commands[0].params.target === "state.tasksDialogVisible" && detailsBtn.events[0].commands[0].params.value === true);

  // Попап деталей задания (по образцу eventDialogSection страницы журнала)
  const dialogSection = avitoUser.sections.find((s) => s.id === "taskDialogSection");
  const dialog = dialogSection.blocks[0].components.find((c) => c.id === "taskDialog");
  check("task dialog state defaults", JSON.stringify(avitoUser.state.tasksDialog) === "{}" && avitoUser.state.tasksDialogVisible === false);
  check("task dialog: visible/modal/closable + onHide closes", dialog.props.visible === "@state.tasksDialogVisible" && dialog.props.modal === true && dialog.props.closable === true && dialog.events[0].type === "onHide" && dialog.events[0].commands[0].params.target === "state.tasksDialogVisible" && dialog.events[0].commands[0].params.value === false);
  const dialogComponents = dialog.props.components;
  const blockTitles = dialogComponents.filter((c) => c.componentType === "Text" && c.className === "m-0 text-sm font-semibold").map((c) => c.props.value);
  check("task dialog: 3 blocks (identification/reference/status)", JSON.stringify(blockTitles) === JSON.stringify(["Идентификация", "Справочная информация", "Состояние"]));
  const dialogBindings = dialogComponents.filter((c) => c.componentType === "LabelledGroup").map((g) => g.props.components[0].props);
  const dialogTexts = dialogComponents.filter((c) => c.componentType === "LabelledGroup").map((g) => g.props.components[0]);
  check("task dialog: 14 fields bound to tasksDialog (2+7+5)", dialogBindings.length === 14 && dialogBindings.every((p) => p.value.indexOf("@state.tasksDialog.") === 0));
  check("task dialog: 5 datetimes formatted via dataType date", dialogBindings.filter((p) => p.dataType === "date").length === 5 && ["start_date", "finish_date", "assigned_at", "accrued_at", "updated_at"].every((f) => dialogBindings.find((p) => p.value === "@state.tasksDialog." + f).dataType === "date"));
  check("task dialog: is_continuous bound, description multiline (className on the component)", dialogTexts.find((t) => t.props.value === "@state.tasksDialog.is_continuous") !== undefined && dialogTexts.find((t) => t.props.value === "@state.tasksDialog.description").className === "m-0 white-space-pre-wrap");
  check("task dialog: close button + header = task_code", dialogComponents.some((c) => c.componentType === "LayoutGroup" && c.props.components[0].props.label === "Закрыть") && dialog.props.header === "@state.tasksDialog.task_code");

  // apiRoutes: 3 новых маршрута + матринг (новые пути не перекрыты более
  // ранними маршрутами, сами себя матчат)
  const avitoRoutes = avito.apiRoutes;
  const newRoutes = [
    { path: "ops/users-v2/rating/execute", method: "POST" },
    { path: "ops/users-v2/tasks", method: "GET" },
    { path: "ops/users-v2/tasks/execute", method: "POST" },
  ];
  for (const nr of newRoutes) {
    const idx = avitoRoutes.findIndex((r) => r.path === nr.path && r.method === nr.method);
    check("route present: " + nr.method + " " + nr.path, idx !== -1);
    const shadowed = avitoRoutes.slice(0, idx).some((r) => matches(r.path, nr.path, r.method, nr.method));
    check("route not shadowed by earlier routes: " + nr.path, idx !== -1 && !shadowed && matches(avitoRoutes[idx].path, nr.path, avitoRoutes[idx].method, nr.method));
  }
  const ratingRoute = avitoRoutes.find((r) => r.path === "ops/users-v2/rating/execute");
  check("rating route: user-avito + both adapters", ratingRoute.url === "/api/v1/crm/stats/query/user-avito/execute" && ratingRoute.query === true && ratingRoute.adapter.request === "stats.users.rating.execute.request" && ratingRoute.adapter.response === "stats.users.rating.execute.response");
  const tasksGetRoute = avitoRoutes.find((r) => r.path === "ops/users-v2/tasks");
  check("tasks GET route: user-avito-tasks + report adapter", tasksGetRoute.url === "/api/v1/crm/stats/query/user-avito-tasks" && tasksGetRoute.adapter.response === "stats.users.tasks.report.response");
  const tasksPostRoute = avitoRoutes.find((r) => r.path === "ops/users-v2/tasks/execute");
  check("tasks POST route: user-avito-tasks + avito request/response adapters", tasksPostRoute.url === "/api/v1/crm/stats/query/user-avito-tasks/execute" && tasksPostRoute.query === true && tasksPostRoute.adapter.request === "stats.users.tasks.execute.request" && tasksPostRoute.adapter.response === "stats.users.tasks.execute.response");
  check("reference apiRoutes untouched (no card routes)", reference.apiRoutes.every((r) => r.path.indexOf("users-v2/rating") === -1 && r.path.indexOf("users-v2/tasks") === -1 && String(r.url || "").indexOf("user-avito") === -1));

  // Реестр адаптеров: 5 новых ключей только у Авито
  check("adapters registered (5 card keys)", ["stats.users.rating.execute.request", "stats.users.rating.execute.response", "stats.users.tasks.report.response", "stats.users.tasks.execute.request", "stats.users.tasks.execute.response"].every((k) => avito.adapters[k] !== undefined && avito.adapters[k].script.indexOf("avito.js") !== -1));
  check("reference adapters untouched (no card keys)", ["stats.users.rating.execute.request", "stats.users.rating.execute.response", "stats.users.tasks.report.response", "stats.users.tasks.execute.request", "stats.users.tasks.execute.response"].every((k) => reference.adapters[k] === undefined));

  // 3) Исполнение адаптеров карточки

  // rating request: USER_ID из route-параметра страницы
  const ratingReqEmpty = runAdapter("config/adapters/stats.users.rating.execute.request.avito.js", {});
  check("rating request: empty user_id → empty macro", ratingReqEmpty.replacements.USER_ID === "" && Object.keys(ratingReqEmpty.replacements).length === 1 && ratingReqEmpty.page === 1 && ratingReqEmpty.limit === 10);
  const ratingReq = runAdapter("config/adapters/stats.users.rating.execute.request.avito.js", { user_id: "01a1c048-835a-7be0-99ca-7439c620be03" });
  check("rating request: USER_ID quoted", ratingReq.replacements.USER_ID === "'01a1c048-835a-7be0-99ca-7439c620be03'");

  // rating response: одна строка → плоский объект + фраза; пустой ответ
  const ratingRow = runAdapter("config/adapters/stats.users.rating.execute.response.avito.js", {
    status: "ok",
    data: {
      items: [
        {
          avito_id: "145626859",
          telegram_id: null,
          category_name: "Пассажиры",
          league_name: null,
          place: 3,
          better_than_percent: 73,
        },
      ],
    },
  });
  check("rating response: row mapped, nulls → empty strings", ratingRow.avito_id === "145626859" && ratingRow.telegram_id === "" && ratingRow.category_name === "Пассажиры" && ratingRow.league_name === "" && ratingRow.place === "3");
  check("rating response: label composed", ratingRow.better_than_percent === "73" && ratingRow.better_than_percent_label === "73% участников");
  const ratingZero = runAdapter("config/adapters/stats.users.rating.execute.response.avito.js", { status: "ok", data: { items: [{ better_than_percent: 0, place: 1 }] } });
  check("rating response: zero percent is a valid value", ratingZero.better_than_percent === "0" && ratingZero.better_than_percent_label === "0% участников");
  const ratingEmpty = runAdapter("config/adapters/stats.users.rating.execute.response.avito.js", { status: "ok", data: { items: [] } });
  check("rating response: zero rows → empty strings (normal per the doc)", ratingEmpty.avito_id === "" && ratingEmpty.better_than_percent_label === "" && Object.keys(ratingEmpty).length === 7);
  const ratingRowsContract = runAdapter("config/adapters/stats.users.rating.execute.response.avito.js", { status: "ok", data: { rows: [{ values: { place: 2, better_than_percent: 50 } }] } });
  check("rating response: future rows/values contract", ratingRowsContract.place === "2" && ratingRowsContract.better_than_percent_label === "50% участников");

  // tasks report response: из 16 полей sql2_1 — 9 табличных колонок в
  // фиксированном порядке задачи (.prompts/avito_tasks.md), остальные — в
  // попапе из данных строки
  const sql21Fields = [
    { name: "task_id", type: "string", title: "ID задания", sortable: true },
    { name: "task_code", type: "string", title: "Код задания", sortable: true },
    { name: "title", type: "string", title: "Название", sortable: true },
    { name: "description", type: "string", title: "Описание", sortable: false },
    { name: "start_date", type: "datetime", title: "Дата старта", sortable: true },
    { name: "finish_date", type: "datetime", title: "Дата окончания", sortable: true },
    { name: "is_continuous", type: "boolean", title: "Длительное задание", sortable: true },
    { name: "league_code", type: "string", title: "Код лиги", sortable: true },
    { name: "segment", type: "string", title: "Сегмент", sortable: true },
    { name: "status", type: "string", title: "Статус (системный)", sortable: true },
    { name: "display_status", type: "string", title: "Статус (отображение)", sortable: true },
    { name: "accrued_at", type: "datetime", title: "Дата начисления баллов", sortable: true },
    { name: "avito_id", type: "string", title: "Avito ID", sortable: true },
    { name: "telegram_id", type: "number", title: "Telegram ID", sortable: true },
    { name: "assigned_at", type: "datetime", title: "Дата назначения", sortable: true },
    { name: "updated_at", type: "datetime", title: "Дата обновления", sortable: true },
  ];
  const tasksMeta = runAdapter("config/adapters/stats.users.tasks.report.response.avito.js", { status: "ok", data: { id: "user-avito-tasks", title: "Задания участника", fields: sql21Fields } });
  const metaFields = tasksMeta.columns.map((c) => c.field);
  check("tasks metadata: 9 table columns in the fixed task order", JSON.stringify(metaFields) === JSON.stringify(["task_code", "title", "display_status", "start_date", "finish_date", "is_continuous", "assigned_at", "accrued_at", "updated_at"]));
  check("tasks metadata: titles from the task (not server ones)", tasksMeta.columns.find((c) => c.field === "display_status").header === "Статус" && tasksMeta.columns.find((c) => c.field === "task_code").header === "Код задания" && tasksMeta.id === "user-avito-tasks");
  check("tasks metadata: popup-only fields filtered out", metaFields.indexOf("description") === -1 && metaFields.indexOf("task_id") === -1 && metaFields.indexOf("league_code") === -1 && metaFields.indexOf("segment") === -1 && metaFields.indexOf("status") === -1 && metaFields.indexOf("avito_id") === -1);
  check("tasks metadata: sortable per whitelist", tasksMeta.columns.every((c) => c.sortable === true));
  check("tasks metadata: datetimes → dataType date", tasksMeta.columns.filter((c) => c.dataType === "date").length === 5);
  check("tasks metadata: no filters (empty fallback)", tasksMeta.filters.length === 0);
  // Деградация: бэкенд ещё на старом SQL (без полей календаря) — 5 колонок
  const tasksMetaOld = runAdapter("config/adapters/stats.users.tasks.report.response.avito.js", { status: "ok", data: { fields: [sql21Fields[0], { name: "task_code", type: "string" }, { name: "display_status", type: "string" }, { name: "accrued_at", type: "datetime" }, { name: "assigned_at", type: "datetime" }, { name: "updated_at", type: "datetime" }] } });
  check("tasks metadata: old backend → 5 columns (graceful degradation)", tasksMetaOld.columns.length === 5 && tasksMetaOld.columns.every((c) => c.field !== "title" && c.field !== "start_date"));
  const tasksMetaEmpty = runAdapter("config/adapters/stats.users.tasks.report.response.avito.js", { status: "ok", data: { fields: [] } });
  check("tasks metadata: empty fields → empty columns", tasksMetaEmpty.columns.length === 0);

  // tasks execute request: USER_ID + сортировка по маппингу §sql2
  const tasksReqEmpty = runAdapter("config/adapters/stats.users.tasks.execute.request.avito.js", {});
  check("tasks request: 3 macros, default assigned_at DESC", Object.keys(tasksReqEmpty.replacements).length === 3 && tasksReqEmpty.replacements.USER_ID === "" && tasksReqEmpty.replacements.ORDER_BY === "assigned_at" && tasksReqEmpty.replacements.ORDER_DIR === "DESC");
  const tasksReqSort = runAdapter("config/adapters/stats.users.tasks.execute.request.avito.js", { user_id: "uuid'x", sortField: "task_id", sortOrder: 1 });
  check("tasks request: mapping alias → SQL, USER_ID escaped", tasksReqSort.replacements.ORDER_BY === "bt.id" && tasksReqSort.replacements.ORDER_DIR === "ASC" && tasksReqSort.replacements.USER_ID === "'uuid''x'");
  const tasksReqTitle = runAdapter("config/adapters/stats.users.tasks.execute.request.avito.js", { sortField: "title", sortOrder: 1 });
  check("tasks request: calendar fields mapped (tc.title/tc.is_continuous)", tasksReqTitle.replacements.ORDER_BY === "tc.title" && runAdapter("config/adapters/stats.users.tasks.execute.request.avito.js", { sortField: "is_continuous", sortOrder: 1 }).replacements.ORDER_BY === "tc.is_continuous");
  const tasksReqAlias = runAdapter("config/adapters/stats.users.tasks.execute.request.avito.js", { sortField: "display_status", sortOrder: -1 });
  check("tasks request: display_status sorted by alias", tasksReqAlias.replacements.ORDER_BY === "display_status" && tasksReqAlias.replacements.ORDER_DIR === "DESC");
  const tasksReqUnknown = runAdapter("config/adapters/stats.users.tasks.execute.request.avito.js", { sortField: "evil; DROP", sortOrder: 1 });
  check("tasks request: non-whitelisted alias → default", tasksReqUnknown.replacements.ORDER_BY === "assigned_at" && tasksReqUnknown.replacements.ORDER_DIR === "DESC");
  const tasksReqDesc = runAdapter("config/adapters/stats.users.tasks.execute.request.avito.js", { sortField: "description", sortOrder: 1 });
  check("tasks request: description not sortable → default", tasksReqDesc.replacements.ORDER_BY === "assigned_at" && tasksReqDesc.replacements.ORDER_DIR === "DESC");
  const tasksReqPage = runAdapter("config/adapters/stats.users.tasks.execute.request.avito.js", { first: 20, rows: 10 });
  check("tasks request: first/rows → page", tasksReqPage.page === 3 && tasksReqPage.limit === 10);
  const tasksReqCap = runAdapter("config/adapters/stats.users.tasks.execute.request.avito.js", { rows: 200 });
  check("tasks request: limit capped at 100", tasksReqCap.limit === 100);
  const tasksReqEvent = runAdapter("config/adapters/stats.users.tasks.execute.request.avito.js", { first: 0, rows: 10, event: { sortField: "task_code", sortOrder: 1 } });
  check("tasks request: event overrides base sort", tasksReqEvent.replacements.ORDER_BY === "bt.task_code" && tasksReqEvent.replacements.ORDER_DIR === "ASC");

  // tasks execute response: конверт + is_continuous → «Да»/«Нет» (строки
  // задач идут и в таблицу, и в попап деталей)
  const tasksResp = runAdapter("config/adapters/stats.users.tasks.execute.response.avito.js", {
    status: "ok",
    data: {
      items: [
        { task_code: "Cargo_S_5_W1", is_continuous: 1, assigned_at: "2026-11-02T00:00:00" },
        { task_code: "Cargo_ML_big_5_W3", is_continuous: 0 },
        { task_code: "ORPHAN", is_continuous: null },
      ],
      pagination: { page: 2, limit: 10, total_items: 37 },
    },
  });
  check("tasks response: envelope → value/totalRecords/first", tasksResp.value.length === 3 && tasksResp.totalRecords === 37 && tasksResp.first === 10 && tasksResp.rows === 10);
  check("tasks response: is_continuous → Да/Нет/empty (NULL — вне календаря)", tasksResp.value[0].is_continuous === "Да" && tasksResp.value[1].is_continuous === "Нет" && tasksResp.value[2].is_continuous === "");
  const tasksRespBool = runAdapter("config/adapters/stats.users.tasks.execute.response.avito.js", { status: "ok", data: { rows: [{ values: { is_continuous: true } }], meta: { total_count: 1, first: 0, limit: 10 } } });
  check("tasks response: future contract + boolean → Да", tasksRespBool.value[0].is_continuous === "Да" && tasksRespBool.totalRecords === 1);
  check("tasks response: rest of the row untouched (popup binds raw fields)", tasksResp.value[0].task_code === "Cargo_S_5_W1" && tasksResp.value[0].assigned_at === "2026-11-02T00:00:00" && tasksResp.value[2].task_code === "ORPHAN");

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});