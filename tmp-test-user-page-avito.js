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

  // Секция «Задания» — последняя секция страницы, ниже основной
  const sectionIds = avitoUser.sections.map((s) => s.id);
  check("tasks section appended last (below the main layout)", sectionIds[sectionIds.length - 1] === "userTasksSection" && sectionIds.indexOf("mainLayout") === sectionIds.length - 2);
  check("reference sections unchanged", refUser.sections.length === avitoUser.sections.length - 1 && refUser.sections.every((s) => sectionIds.indexOf(s.id) !== -1));
  const tasksSection = avitoUser.sections.find((s) => s.id === "userTasksSection");
  const table = tasksSection.blocks.find((b) => b.id === "userTasksBlock").components.find((c) => c.id === "userTasksTable");
  check("tasks table: Panel wrapper «Задания»", tasksSection.blocks[0].wrapper.component === "Panel" && tasksSection.blocks[0].wrapper.props.header === "Задания");
  check("tasks table: standard paginator + lazy", table.props.paginator === true && table.props.lazy === true && JSON.stringify(table.props.rowsPerPageOptions) === JSON.stringify([5, 10, 25, 50]) && table.props.rows === "@state.tasks.rows" && table.props.first === "@state.tasks.first");
  check("tasks table: columns/totalRecords bindings", table.props.columns === "@state.taskReport.columns" && table.props.totalRecords === "@state.tasks.totalRecords" && table.props.value === "@state.tasks.value");
  const onPage = table.events.find((e) => e.type === "onPage");
  const onSort = table.events.find((e) => e.type === "onSort");
  check("tasks table: onPage/onSort → requestTasks", onPage.commands[0] === "requestTasks" && onSort.commands.length === 3 && onSort.commands[0].params.target === "state.tasksQuery.sortField" && onSort.commands[1].params.target === "state.tasksQuery.sortOrder" && onSort.commands[2] === "requestTasks");

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
  check("tasks POST route: user-avito-tasks + request adapter + shared response", tasksPostRoute.url === "/api/v1/crm/stats/query/user-avito-tasks/execute" && tasksPostRoute.query === true && tasksPostRoute.adapter.request === "stats.users.tasks.execute.request" && tasksPostRoute.adapter.response === "stats.users.execute.response");
  check("reference apiRoutes untouched (no card routes)", reference.apiRoutes.every((r) => r.path.indexOf("users-v2/rating") === -1 && r.path.indexOf("users-v2/tasks") === -1 && String(r.url || "").indexOf("user-avito") === -1));

  // Реестр адаптеров: 4 новых ключа только у Авито
  check("adapters registered (4 card keys)", ["stats.users.rating.execute.request", "stats.users.rating.execute.response", "stats.users.tasks.report.response", "stats.users.tasks.execute.request"].every((k) => avito.adapters[k] !== undefined && avito.adapters[k].script.indexOf("avito.js") !== -1));
  check("reference adapters untouched (no card keys)", ["stats.users.rating.execute.request", "stats.users.rating.execute.response", "stats.users.tasks.report.response", "stats.users.tasks.execute.request"].every((k) => reference.adapters[k] === undefined));

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

  // tasks report response: columns из fields[]
  const tasksMeta = runAdapter("config/adapters/stats.users.tasks.report.response.avito.js", {
    status: "ok",
    data: {
      id: "user-avito-tasks",
      title: "Задания участника",
      fields: [
        { name: "task_id", type: "string", title: "ID задания" },
        { name: "accrued_at", type: "datetime", title: "Дата начисления баллов" },
        { name: "evil_column", type: "string", title: "Вне whitelist" },
      ],
    },
  });
  check("tasks metadata: columns mapped", tasksMeta.columns.length === 3 && tasksMeta.columns[0].field === "task_id" && tasksMeta.columns[0].header === "ID задания" && tasksMeta.id === "user-avito-tasks");
  check("tasks metadata: sortable by whitelist", tasksMeta.columns[0].sortable === true && tasksMeta.columns[2].sortable === false);
  check("tasks metadata: datetime → dataType date", tasksMeta.columns[1].dataType === "date");
  check("tasks metadata: no filters (empty fallback)", tasksMeta.filters.length === 0);
  const tasksMetaEmpty = runAdapter("config/adapters/stats.users.tasks.report.response.avito.js", { status: "ok", data: { fields: [] } });
  check("tasks metadata: empty fields → empty columns", tasksMetaEmpty.columns.length === 0);

  // tasks execute request: USER_ID + сортировка по маппингу §sql2
  const tasksReqEmpty = runAdapter("config/adapters/stats.users.tasks.execute.request.avito.js", {});
  check("tasks request: 3 macros, default assigned_at DESC", Object.keys(tasksReqEmpty.replacements).length === 3 && tasksReqEmpty.replacements.USER_ID === "" && tasksReqEmpty.replacements.ORDER_BY === "assigned_at" && tasksReqEmpty.replacements.ORDER_DIR === "DESC");
  const tasksReqSort = runAdapter("config/adapters/stats.users.tasks.execute.request.avito.js", { user_id: "uuid'x", sortField: "task_id", sortOrder: 1 });
  check("tasks request: mapping alias → SQL, USER_ID escaped", tasksReqSort.replacements.ORDER_BY === "bt.id" && tasksReqSort.replacements.ORDER_DIR === "ASC" && tasksReqSort.replacements.USER_ID === "'uuid''x'");
  const tasksReqAlias = runAdapter("config/adapters/stats.users.tasks.execute.request.avito.js", { sortField: "display_status", sortOrder: -1 });
  check("tasks request: display_status sorted by alias", tasksReqAlias.replacements.ORDER_BY === "display_status" && tasksReqAlias.replacements.ORDER_DIR === "DESC");
  const tasksReqUnknown = runAdapter("config/adapters/stats.users.tasks.execute.request.avito.js", { sortField: "evil; DROP", sortOrder: 1 });
  check("tasks request: non-whitelisted alias → default", tasksReqUnknown.replacements.ORDER_BY === "assigned_at" && tasksReqUnknown.replacements.ORDER_DIR === "DESC");
  const tasksReqPage = runAdapter("config/adapters/stats.users.tasks.execute.request.avito.js", { first: 20, rows: 10 });
  check("tasks request: first/rows → page", tasksReqPage.page === 3 && tasksReqPage.limit === 10);
  const tasksReqCap = runAdapter("config/adapters/stats.users.tasks.execute.request.avito.js", { rows: 200 });
  check("tasks request: limit capped at 100", tasksReqCap.limit === 100);
  const tasksReqEvent = runAdapter("config/adapters/stats.users.tasks.execute.request.avito.js", { first: 0, rows: 10, event: { sortField: "task_code", sortOrder: 1 } });
  check("tasks request: event overrides base sort", tasksReqEvent.replacements.ORDER_BY === "bt.task_code" && tasksReqEvent.replacements.ORDER_DIR === "ASC");

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});