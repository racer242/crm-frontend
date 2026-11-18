/**
 * Временный тест-стенд страницы «Призы» (эталонная кампания): перевод
 * списка /ops/prizes с классического REST (GET /api/v1/crm/prizes + 3
 * дропдауна) на execute запроса статистики prizes (.prompts/prizes.md)
 * по образцу страницы «Каталог призов».
 *
 * Проверяются: 1) JSON-валидность; 2) реестры (api-routes: ops/prizes GET
 * → stats/query/prizes + адаптер метаданных, НОВЫЙ ops/prizes/execute POST
 * query:true, карточка [prize_id] не задета, разрешение путей;
 * adapters.json: 3 НОВЫХ ключа stats.prizes.*, осиротевший prizes.response
 * удалён, prizes.get.request остался — маршрут призов участника);
 * 3) меню после dereference ($ref menus/prizes.json, activeItemId prizes);
 * 4) структура страницы (state, dataFeed GET/POST, dataInit, shortcut
 * requestPrizes, шапка с Сохранить/Загрузить, поиск+FiltersPanel+чипы,
 * ленивая таблица с selectionMode single и навигацией на карточку);
 * 5) исполнение 3 адаптеров как в DataAdapterEngine: metadata — фолбэк
 * 24 колонок §3 + 8 фильтров §5.1 + серверное перекрытие; request — 12
 * макросов, options-карты, raffle UUID_TO_BIN (+ серверный mapping),
 * checkbox, период wall-границы, поиск 11 полей, ORDER_BY whitelist;
 * execute-response — формы {rows,meta}/{items,pagination}/legacy →
 * {value,totalRecords,first,rows}, метки статусов §5.1, Да/Нет;
 * 6) кросс-проверка whitelist↔ORDER_MAP.
 *
 * Запуск: node tmp-test-prizes.js
 */
const fs = require("fs");
const path = require("path");
// Тот же пакет, что в src/core/config.ts (движок резолвит $ref им)
const RefParserMod = require("@apidevtools/json-schema-ref-parser");
const $RefParser = RefParserMod.default || RefParserMod;

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

// Упрощённая реплика matchRoutePattern из src/app/api/[...route]/route.ts
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

// Первый совпавший маршрут (роутер берёт первый) для метода+пути
function resolveRoute(routes, requestPath, method) {
  return routes.find((route) =>
    matches(route.path, requestPath, route.method || "GET", method),
  );
}

// _shared.js префиксуется к каждому адаптеру (как в DataAdapterEngine.applyJs)
const SHARED = fs.readFileSync("config/adapters/_shared.js", "utf-8");
function runAdapter(scriptPath, data) {
  const script = fs.readFileSync(scriptPath, "utf-8");
  const fn = new Function("data", `${SHARED}; ${script}; return transform(data);`);
  return fn(data);
}

async function main() {
  const prizesPath = "config/pages/promo-instance/prizes.json";

  // 1) JSON-валидность
  const prizes = JSON.parse(fs.readFileSync(prizesPath, "utf-8"));
  const menu = JSON.parse(fs.readFileSync("config/menus/prizes.json", "utf-8"));
  const routes = JSON.parse(fs.readFileSync("config/system/api-routes.json", "utf-8"));
  const adapters = JSON.parse(fs.readFileSync("config/system/adapters.json", "utf-8"));
  check("json: все затронутые конфиги валидны", true);

  // 2) Реестры
  const prizesRoutes = routes.filter((r) => r.path === "ops/prizes" || r.path === "ops/prizes/execute");
  check("api-routes: 2 маршрута (GET метаданных + POST execute)", prizesRoutes.length === 2 && prizesRoutes[0].path === "ops/prizes" && prizesRoutes[0].method === "GET" && prizesRoutes[1].path === "ops/prizes/execute" && prizesRoutes[1].method === "POST");
  check("api-routes: GET → upstream stats/query/prizes + адаптер метаданных", prizesRoutes[0].url === "/api/v1/crm/stats/query/prizes" && prizesRoutes[0].adapter.response === "stats.prizes.report.response");
  check("api-routes: POST execute query:true + оба адаптера", prizesRoutes[1].url === "/api/v1/crm/stats/query/prizes/execute" && prizesRoutes[1].query === true && prizesRoutes[1].adapter.request === "stats.prizes.execute.request" && prizesRoutes[1].adapter.response === "stats.prizes.execute.response");
  check("routing: /ops/prizes → маршрут метаданных", resolveRoute(routes, "/ops/prizes", "GET").path === "ops/prizes");
  check("routing: /ops/prizes/execute → маршрут execute", resolveRoute(routes, "/ops/prizes/execute", "POST").path === "ops/prizes/execute");
  check("routing: /ops/prizes/uuid — по-прежнему карточка приза", resolveRoute(routes, "/ops/prizes/abc", "GET").path === "ops/prizes/[prize_id]");
  check("routing: /ops/prizes/uuid/status — смена статуса не задета", resolveRoute(routes, "/ops/prizes/abc/status", "POST").path === "ops/prizes/[prize_id]/status");
  check("adapters: 3 ключа stats.prizes.* → файлы на диске", ["stats.prizes.report.response", "stats.prizes.execute.request", "stats.prizes.execute.response"].every((key) => adapters[key] && fs.existsSync(adapters[key].script.replace("./", ""))));
  check("adapters: осиротевший prizes.response удалён (ключ + файл)", adapters["prizes.response"] === undefined && !fs.existsSync("config/adapters/prizes.response.js"));
  check("adapters: prizes.get.request остался (маршрут призов участника)", !!adapters["prizes.get.request"] && fs.existsSync(adapters["prizes.get.request"].script.replace("./", "")));

  // 3) Меню раздела (dereference как в initApp)
  const prizesDeref = await new $RefParser().dereference(path.resolve(prizesPath));
  const prizesMenubar = prizesDeref.sections[0].blocks[0].components[0];
  check("prizes: menuSection первая секция + menubar", prizesDeref.sections[0].id === "menuSection" && prizesMenubar.componentType === "Menubar");
  check("prizes: activeItemId prizes + props.model из меню (2 пункта)", prizesMenubar.props.activeItemId === "prizes" && Array.isArray(prizesMenubar.props.model) && prizesMenubar.props.model.length === 2 && prizesMenubar.props.model[0].id === "prizes" && prizesMenubar.props.model[0].route === "/ops/prizes");
  check("prizes: после dereference в menubar нет литералов $ref", !JSON.stringify(prizesMenubar).includes("$ref"));

  // 4) Структура страницы
  check("prizes: route/id + старые плоские фильтры ушли", prizes.route === "/ops/prizes" && prizes.id === "prizes" && prizes.state.statuses === undefined && prizes.state.actRequiredOptions === undefined && prizes.state.ownerOptions === undefined);
  check("prizes: state — таблица/запрос/метаданные/флаг панели/сохранение", !!prizes.state.prizes && !!prizes.state.prizesQuery && !!prizes.state.report && prizes.state.filtersVisible === false && prizes.state.pageStateKey === "" && prizes.state.savedQuery === "");
  check("prizes: дефолт запроса — created_at DESC (sortOrder -1)", prizes.state.prizesQuery.sortField === "" && prizes.state.prizesQuery.sortOrder === -1);
  const feedGet = prizes.dataFeed.find((f) => f.method === "GET");
  const feedPost = prizes.dataFeed.find((f) => f.method === "POST");
  check("prizes: dataFeed GET метаданные + POST execute", prizes.dataFeed.length === 2 && feedGet.url === "/api/ops/prizes" && feedGet.target === "state.report" && feedPost.url === "/api/ops/prizes/execute" && feedPost.target === "state.prizes");
  check("prizes: dataInit — 4 параметра URL (filters merge/feed)", prizes.dataInit.length === 4 && prizes.dataInit.some((d) => d.target === "state.report.filters" && d.method === "merge" && d.priority === "feed") && prizes.dataInit.some((d) => d.target === "state.prizesQuery.sortOrder" && d.parse === "json"));
  const shortcut = prizes.shortcuts.requestPrizes;
  check("prizes: shortcut — execute + mergeUrlParams + list-request-format", !!shortcut && shortcut.params.commands[0].type === "sendRequest" && shortcut.params.commands[0].params.url === "/api/ops/prizes/execute" && shortcut.params.commands[0].params.data.filters === "{$state.report.filters}" && shortcut.params.commands[0].params.format.$ref === "../../system/list-request-format.json" && shortcut.params.commands[1].type === "mergeUrlParams");
  check("prizes: onLoad собирает pageStateKey и читает сохранение", prizes.events[0].type === "onLoad" && JSON.stringify(prizes.events).includes("pageState_{$location.pathname}_{$cookie.camp_id}_{$cookie.user_data.id}") && JSON.stringify(prizes.events).includes("getFromLocalStorage"));

  const headerJson = JSON.stringify(prizesDeref.sections.find((s) => s.id === "prizesHeader"));
  check("prizes: шапка — Обновить → requestPrizes + Сохранить/Загрузить", headerJson.includes("prizesRefreshButton") && headerJson.includes('"requestPrizes"') && headerJson.includes("prizesSaveStateButton") && headerJson.includes("setToLocalStorage") && headerJson.includes("prizesLoadStateButton") && headerJson.includes('"visible":"@state.savedQuery"'));
  check("prizes: поиск с throttle + кнопка Фильтры + ActiveFiltersBar/FiltersPanel", JSON.stringify(prizesDeref).includes("InputTextWithThrottle") && JSON.stringify(prizesDeref).includes("ActiveFiltersBar") && JSON.stringify(prizesDeref).includes("FiltersPanel"));
  const filtersSection = prizesDeref.sections.find((s) => s.id === "prizesFilters");
  check("prizes: FiltersPanel/чипы привязаны к report.filters + запрос после применения", JSON.stringify(filtersSection).includes("@state.report.filters") && JSON.stringify(filtersSection).includes("requestPrizes"));
  const table = prizesDeref.sections.find((s) => s.id === "prizesTableSection").blocks[0].components[0];
  check("prizes: ленивая таблица на report.columns + value/totalRecords", table.componentType === "DataTable" && table.props.lazy === true && table.props.columns === "@state.report.columns" && table.props.value === "@state.prizes.value" && table.props.totalRecords === "@state.prizes.totalRecords" && table.props.sortField === "@state.prizesQuery.sortField");
  const userCol = (table.props.customColumns || []).find((c) => c.field === "user_id");
  const userBtn = userCol && userCol.body && userCol.body[0];
  check("prizes: колонка-кнопка участника (visibleRow, переход на /ops/users)", userCol !== undefined && userCol.header === "" && !!userBtn && userBtn.componentType === "Button" && userBtn.visibleRow === "{#row.user_id}" && userBtn.props.icon === "pi pi-user" && userBtn.events[0].commands[0].params.url === "/ops/users/{#row.user_id}");
  const navCol = (table.props.customColumns || []).find((c) => c.field === "nav");
  const navBtn = navCol && navCol.body && navCol.body[0];
  check("prizes: стрелка на карточку приза instance_id (последняя колонка)", navCol !== undefined && navCol.order === -1 && !!navBtn && navBtn.props.icon === "pi pi-arrow-right" && navBtn.events[0].commands[0].params.url === "/ops/prizes/{#row.instance_id}");
  const onRowClick = table.events.find((e) => e.type === "onRowClick");
  const onSort = table.events.find((e) => e.type === "onSort");
  check("prizes: selectionMode single (курсор строк) + onRowClick → карточка", table.props.selectionMode === "single" && onRowClick !== undefined && onRowClick.commands.length === 1 && onRowClick.commands[0].params.url === "/ops/prizes/{$event.data.instance_id}");
  check("prizes: onSort пишет sortField/sortOrder → requestPrizes", onSort !== undefined && onSort.commands.length === 3 && onSort.commands[0].params.target === "state.prizesQuery.sortField" && onSort.commands[1].params.target === "state.prizesQuery.sortOrder" && onSort.commands[2] === "requestPrizes");
  check("prizes: onPage → requestPrizes", table.events.some((e) => e.type === "onPage" && e.commands[0] === "requestPrizes"));

  // 5) Исполнение адаптеров
  const reqPath = "config/adapters/stats.prizes.execute.request.js";
  const metaPath = "config/adapters/stats.prizes.report.response.js";
  const respPath = "config/adapters/stats.prizes.execute.response.js";

  // metadata: ошибка/пусто → фолбэк из спеки (24 колонки §3, 8 фильтров §5.1)
  const metaFallback = runAdapter(metaPath, { status: "error", message: "query not found" });
  check("metadata: ошибка/пусто → фолбэк из спеки (24 колонки, 8 фильтров)", metaFallback.columns.length === 24 && metaFallback.filters.length === 8);
  check("metadata: sortable по whitelist (22, full_name/act_scan_original_name вне)", metaFallback.columns.filter((c) => c.sortable).length === 22 && metaFallback.columns.find((c) => c.field === "full_name").sortable === false && metaFallback.columns.find((c) => c.field === "act_scan_original_name").sortable === false);
  check("metadata: uuid-колонки + даты (instance_id/user_id uuid, 4 даты date)", metaFallback.columns.find((c) => c.field === "instance_id").dataType === "uuid" && metaFallback.columns.find((c) => c.field === "user_id").dataType === "uuid" && ["issued_at", "act_scan_uploaded_at", "drawn_at", "created_at"].every((f) => metaFallback.columns.find((c) => c.field === f).dataType === "date"));
  check("metadata: фолбэк-фильтры §5.1 (id/type/opts)", metaFallback.filters[0].id === "pool_status" && metaFallback.filters[0].opts.length === 3 && metaFallback.filters[1].id === "status" && metaFallback.filters[1].opts.length === 14 && metaFallback.filters[2].id === "act_status" && metaFallback.filters[2].opts.length === 4 && metaFallback.filters[3].id === "has_owner" && metaFallback.filters[3].type === "checkbox" && metaFallback.filters[4].id === "has_raffle" && metaFallback.filters[4].type === "checkbox" && metaFallback.filters[5].id === "raffle" && metaFallback.filters[5].opts.length === 0 && metaFallback.filters[6].id === "raffle_status" && metaFallback.filters[6].opts.length === 5 && metaFallback.filters[7].id === "issued_date" && metaFallback.filters[7].type === "period" && metaFallback.filters[7].column === "pi.issued_at");
  check("metadata: пустой объект → фолбэк (страница рабочая без метаданных)", runAdapter(metaPath, {}).columns.length === 24 && runAdapter(metaPath, {}).filters.length === 8);
  const metaServer = runAdapter(metaPath, { status: "ok", data: { id: "r1", title: "Призы", fields: [{ name: "instance_id", title: "ID", type: "uuid" }, { name: "full_name", title: "ФИО", type: "string" }, { name: "garbage_col", title: "Чужая", type: "string" }], filters: [{ id: "status", name: "Статус", type: "options", opts: ["a", "b"], mapping: { "0": "FREE", "1": "SENT" } }] } });
  check("metadata: серверные fields/filters перекрывают фолбэк", metaServer.id === "r1" && metaServer.title === "Призы" && metaServer.columns.length === 3 && metaServer.filters.length === 1 && metaServer.filters[0].id === "status");
  check("metadata: серверная колонка вне whitelist → sortable false", metaServer.columns[0].sortable === true && metaServer.columns[0].dataType === "uuid" && metaServer.columns[1].sortable === false && metaServer.columns[2].sortable === false);

  // request: 12 макросов всегда, фильтры §5.2, период wall-границы, поиск §6.2
  const baseReq = { first: 0, rows: 10, sortField: "", sortOrder: -1, search: "", filters: [] };
  const reqEmpty = runAdapter(reqPath, baseReq);
  const MACRO_KEYS = ["POOL_STATUS_FILTER", "STATUS_FILTER", "ACT_STATUS_FILTER", "HAS_OWNER_FILTER", "HAS_RAFFLE_FILTER", "RAFFLE_FILTER", "RAFFLE_STATUS_FILTER", "ISSUED_DATE_FROM_FILTER", "ISSUED_DATE_TO_FILTER", "SEARCH_FILTER", "ORDER_BY", "ORDER_DIR"];
  check("request: payload — только page/limit/replacements (12 ключей; фильтровые пусты)", reqEmpty.page === 1 && reqEmpty.limit === 10 && Object.keys(reqEmpty).length === 3 && Object.keys(reqEmpty.replacements).length === 12 && MACRO_KEYS.filter((k) => k.indexOf("_FILTER") > 0).every((k) => reqEmpty.replacements[k] === ""));
  check("request: без сортировки → дефолт created_at DESC", reqEmpty.replacements.ORDER_BY === "pi.created_at" && reqEmpty.replacements.ORDER_DIR === "DESC");
  check("request: rows 200 → cap 100; first 30 → page 4", runAdapter(reqPath, Object.assign({}, baseReq, { rows: 200 })).limit === 100 && runAdapter(reqPath, Object.assign({}, baseReq, { first: 30 })).page === 4);
  const f = (id, value, extra) => Object.assign({ id, value }, extra || {});
  const reqWith = (filters, sortField, sortOrder) => runAdapter(reqPath, Object.assign({}, baseReq, { filters, sortField: sortField || "", sortOrder: sortOrder === undefined ? -1 : sortOrder }));
  check("request: pool_status частично → IN ('active'); всё/ничего → пусто", reqWith([f("pool_status", [true, false, false])]).replacements.POOL_STATUS_FILTER === "AND pi.pool_status IN ('active')" && reqWith([f("pool_status", [true, true, true])]).replacements.POOL_STATUS_FILTER === "" && reqWith([f("pool_status", [false, false, false])]).replacements.POOL_STATUS_FILTER === "");
  check("request: status 14 позиций → IN ('FREE'); всё выбрано → пусто", reqWith([f("status", [true].concat(new Array(13).fill(false)))]).replacements.STATUS_FILTER === "AND pi.status IN ('FREE')" && reqWith([f("status", new Array(14).fill(true))]).replacements.STATUS_FILTER === "");
  check("request: act_status/raffle_status частичные карты", reqWith([f("act_status", [false, false, true, false])]).replacements.ACT_STATUS_FILTER === "AND pi.act_status IN ('APPROVED')" && reqWith([f("raffle_status", [false, false, false, false, true])]).replacements.RAFFLE_STATUS_FILTER === "AND r.status IN ('ANNULLED')");
  check("request: checkbox true/false/unset", reqWith([f("has_owner", true)]).replacements.HAS_OWNER_FILTER === "AND pi.user_id IS NOT NULL" && reqWith([f("has_owner", false)]).replacements.HAS_OWNER_FILTER === "AND pi.user_id IS NULL" && reqWith([f("has_owner", null)]).replacements.HAS_OWNER_FILTER === "" && reqWith([f("has_raffle", true)]).replacements.HAS_RAFFLE_FILTER === "AND rc.raffle_id IS NOT NULL" && reqWith([f("has_raffle", false)]).replacements.HAS_RAFFLE_FILTER === "AND rc.raffle_id IS NULL");
  const uuid1 = "0a0a0a0a-1111-2222-3333-444444444444";
  const uuid2 = "0b0b0b0b-1111-2222-3333-444444444444";
  check("request: raffle по серверному mapping → UUID_TO_BIN", reqWith([f("raffle", [true, false], { mapping: { "0": uuid1, "1": uuid2 } })]).replacements.RAFFLE_FILTER === "AND r.id IN (UUID_TO_BIN('" + uuid1 + "'))" && reqWith([f("raffle", [true, true], { mapping: { "0": uuid1, "1": uuid2 } })]).replacements.RAFFLE_FILTER === "");
  check("request: raffle не-UUID отбрасывается; без mapping (фолбэк) → пусто", reqWith([f("raffle", [false, true], { mapping: { "0": "DROP'; --", "1": uuid1 } })]).replacements.RAFFLE_FILTER === "AND r.id IN (UUID_TO_BIN('" + uuid1 + "'))" && reqWith([f("raffle", [true])]).replacements.RAFFLE_FILTER === "");
  check("request: серверный mapping перекрывает dbValues (порядок опций)", reqWith([f("pool_status", [true, false, false], { mapping: { "0": "removed", "1": "active", "2": "removing" } })]).replacements.POOL_STATUS_FILTER === "AND pi.pool_status IN ('removed')");
  check("request: период date-only → весь конечный день (wall МСК)", (() => { const r = reqWith([f("issued_date", ["2026-11-16", "2026-11-16"], { type: "period" })]).replacements; return r.ISSUED_DATE_FROM_FILTER === "AND pi.issued_at >= '2026-11-16 00:00:00'" && r.ISSUED_DATE_TO_FILTER === "AND pi.issued_at <= '2026-11-16 23:59:59'"; })());
  check("request: период ISO-полночь; пусто → ''", (() => { const r = reqWith([f("issued_date", ["2026-11-15T21:00:00Z", "2026-11-15T21:00:00Z"], { type: "period" })]).replacements; const e = reqWith([f("issued_date", null, { type: "period" })]).replacements; return r.ISSUED_DATE_FROM_FILTER === "AND pi.issued_at >= '2026-11-16 00:00:00'" && r.ISSUED_DATE_TO_FILTER === "AND pi.issued_at <= '2026-11-16 23:59:59'" && e.ISSUED_DATE_FROM_FILTER === "" && e.ISSUED_DATE_TO_FILTER === ""; })());
  const searchReq = runAdapter(reqPath, Object.assign({}, baseReq, { search: "o'%_" }));
  check("request: поиск кавычка/%/_ экранируются; 11 LIKE-полей", searchReq.replacements.SEARCH_FILTER.startsWith("AND (") && searchReq.replacements.SEARCH_FILTER.endsWith(")") && (searchReq.replacements.SEARCH_FILTER.match(/ LIKE '/g) || []).length === 11 && searchReq.replacements.SEARCH_FILTER.includes("BIN_TO_UUID(pi.id) LIKE '%o''\\%\\_%'") && searchReq.replacements.SEARCH_FILTER.includes("pi.external_id LIKE") && searchReq.replacements.SEARCH_FILTER.includes("u.first_name LIKE") && searchReq.replacements.SEARCH_FILTER.includes("r.name LIKE"));
  check("request: поиск O'Connor → удвоение апострофа", runAdapter(reqPath, Object.assign({}, baseReq, { search: "O'Connor" })).replacements.SEARCH_FILTER.includes("%O''Connor%"));
  check("request: сортировка whitelist → pc.price ASC; мусор/null-маппинг → дефолт", reqWith([], "price_rub", 1).replacements.ORDER_BY === "pc.price" && reqWith([], "price_rub", 1).replacements.ORDER_DIR === "ASC" && reqWith([], "full_name", 1).replacements.ORDER_BY === "pi.created_at" && reqWith([], "garbage", 1).replacements.ORDER_BY === "pi.created_at" && reqWith([], "created_at", -1).replacements.ORDER_DIR === "DESC");

  // response: формы ответа → {value, totalRecords, first, rows}, метки §5.1
  const futureResp = runAdapter(respPath, { rows: [{ id: 1, values: { instance_id: "i1", status: "FREE", pool_status: "active", act_status: "PENDING", raffle_status: "IN_PROGRESS", act_required: true, place: null, full_name: "Иванов И" } }], meta: { total_count: 42, first: 20, limit: 10, sort: "created_at", direction: "desc" } });
  check("response: спека §8 → value/totalRecords/first/rows из meta", futureResp.totalRecords === 42 && futureResp.first === 20 && futureResp.rows === 10 && futureResp.value.length === 1 && futureResp.value[0].instance_id === "i1" && futureResp.value[0].place === null);
  check("response: статусы → метки §5.1 (FREE/active/PENDING/IN_PROGRESS)", futureResp.value[0].status === "Свободен" && futureResp.value[0].pool_status === "В пуле" && futureResp.value[0].act_status === "Ожидает" && futureResp.value[0].raffle_status === "В процессе");
  check("response: act_required boolean → Да; legacy-статус словарь", futureResp.value[0].act_required === "Да");
  check("response: серверный *_label приоритетнее словаря; неизвестный код остаётся", runAdapter(respPath, { rows: [{ id: 1, values: { status: "FREE", status_label: "Мой статус", pool_status: "WEIRD" } }], meta: { total_count: 1, limit: 10 } }).value[0].status === "Мой статус" && runAdapter(respPath, { rows: [{ id: 1, values: { status: "WEIRD" } }], meta: { total_count: 1, limit: 10 } }).value[0].status === "WEIRD");
  check("response: act_required_label от бэкенда приоритетнее", runAdapter(respPath, { rows: [{ id: 1, values: { act_required: true, act_required_label: "нужен" } }], meta: { total_count: 1, limit: 10 } }).value[0].act_required === "нужен");
  check("response: false → Нет", runAdapter(respPath, { rows: [{ id: 1, values: { act_required: false } }], meta: { total_count: 1, limit: 10 } }).value[0].act_required === "Нет");
  check("response: {rows, pagination} без meta → first (page-1)*limit", (() => { const r = runAdapter(respPath, { rows: [{ id: 1, values: { a: 1 } }], pagination: { page: 3, limit: 25, total_items: 77 } }); return r.totalRecords === 77 && r.first === 50 && r.rows === 25; })());
  check("response: текущий {items, pagination} → value/totalRecords/first/rows", (() => { const r = runAdapter(respPath, { items: [{ id: 1 }], pagination: { page: 2, limit: 50, total_items: 101 } }); return r.value.length === 1 && r.totalRecords === 101 && r.first === 50 && r.rows === 50; })());
  check("response: legacy-массив → полный state-объект", (() => { const r = runAdapter(respPath, [{ id: 1 }, { id: 2 }]); return r.value.length === 2 && r.totalRecords === 2 && r.first === 0 && r.rows === 10; })());
  check("response: обёртка {status:ok, data} разворачивается", runAdapter(respPath, { status: "ok", data: { rows: [{ id: 1, values: { status: "FREE" } }], meta: { total_count: 5, limit: 10 } } }).totalRecords === 5);
  check("response: мусор/null → пустой state-объект (таблица чистая)", (() => { const g = runAdapter(respPath, "мусор"); const n = runAdapter(respPath, null); return g.value.length === 0 && g.totalRecords === 0 && n.value.length === 0; })());

  // 6) Кросс-проверка whitelist ↔ ORDER_MAP (как в каталоге/транзакциях)
  const internals = new Function(`${SHARED}; ${fs.readFileSync(reqPath, "utf-8")}; return { ORDER_MAP, PRIZES_FILTERS };`)();
  const whitelist = new Function(`${SHARED}; return PRIZES_SORTABLE_COLUMNS;`)();
  const orderAliases = Object.keys(internals.ORDER_MAP);
  check("whitelist↔ORDER_MAP: 22 sortable-алиаса дают не-дефолт (кроме created_at)", whitelist.length === 22 && whitelist.every((alias) => alias === "created_at" ? internals.ORDER_MAP[alias] === "pi.created_at" : typeof internals.ORDER_MAP[alias] === "string" && internals.ORDER_MAP[alias] !== ""));
  check("whitelist↔ORDER_MAP: null-маппинги (full_name/act_scan_original_name) → дефолт; вне whitelist не сортируются", internals.ORDER_MAP.full_name === null && internals.ORDER_MAP.act_scan_original_name === null && !whitelist.includes("full_name") && !whitelist.includes("act_scan_original_name") && orderAliases.length === 24);
  check("request: PRIZES_FILTERS покрывает 7 фильтров-макросов (options/checkbox/raffle)", ["pool_status", "status", "act_status", "has_owner", "has_raffle", "raffle", "raffle_status"].every((id) => !!internals.PRIZES_FILTERS[id]) && internals.PRIZES_FILTERS.status.dbValues.length === 14 && internals.PRIZES_FILTERS.raffle.dbValues.length === 0);

  console.log(`\n${pass} passed, ${fail} failed`);
  if (fail > 0) process.exit(1);
}
main();