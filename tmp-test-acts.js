/**
 * Временный тест-стенд списка актов /ops/acts (эталонная кампания): перевод
 * страницы с классического REST (GET /api/v1/crm/acts) на execute запроса
 * статистики acts (.prompts/acts.md — отчёт «Акты получения призов»:
 * prize_instances × prize_catalog × user × user_extended × user_documents,
 * область выборки act_required = 1 OR скан акта загружен) по образцу
 * страницы «Призы».
 *
 * Проверяются: 1) реестры (api-routes: GET ops/acts → метаданные
 * /api/v1/crm/stats/query/acts + литеральный POST ops/acts/execute с
 * query:true; классические маршруты акта не задеты — карточка
 * ops/acts/[act_id], добавление, удаление, акты участника; adapters.json:
 * 3 НОВЫХ ключа stats.acts.*, старые acts.* удалены вместе с файлами);
 * 2) структура страницы (state actsQuery/report/pageStateKey, dataFeed
 * metadata+execute, dataInit URL-параметров, шорткат requestActs execute +
 * mergeUrlParams, сохранение customColumns user/button с навигацией по
 * instance_id, поиск/фильтры/ActiveFiltersBar, сохранение состояния);
 * 3) исполнение request-адаптера как в DataAdapterEngine (все 23 макроса,
 * фрагменты SQL по §5.2/§6.2, дефолт сортировки §1.2, экранирование,
 * рубли→копейки, wall-границы периодов);
 * 4) response-адаптеры (метаданные: фолбэк спеки/серверные fields с
 * отсечением popup-only полей; execute: полный state-объект, лейблы
 * act_status/act_state, Да/Нет, legacy-формы).
 *
 * Запуск: node tmp-test-acts.js
 */
const fs = require("fs");

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

const page = JSON.parse(
  fs.readFileSync("config/pages/promo-instance/acts.json", "utf-8"),
);
const routes = JSON.parse(
  fs.readFileSync("config/system/api-routes.json", "utf-8"),
);
const registry = JSON.parse(
  fs.readFileSync("config/system/adapters.json", "utf-8"),
);
const UUID = "00000000-0000-0000-0000-000000000000";
// --- 1. api-routes: метаданные + execute, классические маршруты акта целы ---
const metaRoute = resolveRoute(routes, "ops/acts", "GET");
check(
  "routes: GET ops/acts → метаданные /api/v1/crm/stats/query/acts",
  !!metaRoute &&
    metaRoute.url === "/api/v1/crm/stats/query/acts" &&
    metaRoute.channel === "instance" &&
    metaRoute.adapter &&
    metaRoute.adapter.response === "stats.acts.report.response" &&
    !metaRoute.adapter.request,
);
const execRoute = resolveRoute(routes, "ops/acts/execute", "POST");
check(
  "routes: POST ops/acts/execute → /api/v1/crm/stats/query/acts/execute (query:true, оба адаптера)",
  !!execRoute &&
    execRoute.url === "/api/v1/crm/stats/query/acts/execute" &&
    execRoute.query === true &&
    execRoute.adapter &&
    execRoute.adapter.request === "stats.acts.execute.request" &&
    execRoute.adapter.response === "stats.acts.execute.response",
);
const cardRoute = resolveRoute(routes, "ops/acts/" + UUID, "GET");
check(
  "routes: GET ops/acts/[act_id] — карточка акта не задета (act.get.response)",
  !!cardRoute &&
    cardRoute.url === "/api/v1/crm/acts/{$location.routeParams.act_id}" &&
    cardRoute.adapter &&
    cardRoute.adapter.response === "act.get.response",
);
const addRoute = resolveRoute(routes, "ops/acts", "POST");
check(
  "routes: POST ops/acts — добавление акта не задето (без адаптеров)",
  !!addRoute && addRoute.url === "/api/v1/crm/acts" && !addRoute.adapter,
);
const delRoute = resolveRoute(routes, "ops/acts/" + UUID, "DELETE");
check(
  "routes: DELETE ops/acts/[act_id] — удаление акта не задето",
  !!delRoute && delRoute.url === "/api/v1/crm/acts/{$location.routeParams.act_id}",
);
const userActsRoute = resolveRoute(routes, "ops/users/" + UUID + "/acts", "GET");
check(
  "routes: GET ops/users/[user_id]/acts — акты участника не задеты (user-acts.response)",
  !!userActsRoute &&
    userActsRoute.url ===
      "/api/v1/crm/users/{$location.routeParams.user_id}/acts" &&
    userActsRoute.adapter &&
    userActsRoute.adapter.response === "user-acts.response",
);

// --- 2. adapters.json: 3 новых ключа, старые удалены ---
check(
  "registry: stats.acts.execute.request / report.response / execute.response",
  registry["stats.acts.execute.request"] &&
    registry["stats.acts.execute.request"].script ===
      "./config/adapters/stats.acts.execute.request.js" &&
    registry["stats.acts.report.response"] &&
    registry["stats.acts.report.response"].script ===
      "./config/adapters/stats.acts.report.response.js" &&
    registry["stats.acts.execute.response"] &&
    registry["stats.acts.execute.response"].script ===
      "./config/adapters/stats.acts.execute.response.js",
);
check(
  "registry: старые ключи acts.* удалены вместе с файлами",
  !registry["acts.get.request"] &&
    !registry["acts.get.response"] &&
    !registry["acts.response"] &&
    !fs.existsSync("config/adapters/acts.get.request.js") &&
    !fs.existsSync("config/adapters/acts.get.response.js") &&
    !fs.existsSync("config/adapters/acts.response.js"),
);
// --- 3. Структура страницы acts.json ---
const s = page.sections || [];
const sectionIds = s.map((x) => x.id);
check(
  "page: sections actsHeader → actsFilters → actsTableSection",
  sectionIds.join(",") === "actsHeader,actsFilters,actsTableSection",
);
check(
  "page: state — actsQuery по умолчанию act_scan_uploaded_at DESC, report, pageStateKey/savedQuery",
  page.state.actsQuery &&
    page.state.actsQuery.sortField === "act_scan_uploaded_at" &&
    page.state.actsQuery.sortOrder === -1 &&
    page.state.actsQuery.search === "" &&
    page.state.report &&
    JSON.stringify(page.state.report.columns) === "[]" &&
    JSON.stringify(page.state.report.filters) === "[]" &&
    page.state.pageStateKey === "" &&
    page.state.savedQuery === "" &&
    page.state.filtersVisible === false &&
    !page.state.acts.columns,
);
check(
  "page: onLoad собирает pageStateKey с camp_id и читает сохранение",
  page.events &&
    page.events[0].type === "onLoad" &&
    JSON.stringify(page.events).includes(
      "pageState_{$location.pathname}_{$cookie.camp_id}_{$cookie.user_data.id}",
    ) &&
    JSON.stringify(page.events).includes("getFromLocalStorage"),
);
check(
  "page: dataFeed — GET метаданных → state.report + POST execute → state.acts (6 URL-параметров)",
  page.dataFeed.length === 2 &&
    page.dataFeed[0].method === "GET" &&
    page.dataFeed[0].url === "/api/ops/acts" &&
    page.dataFeed[0].target === "state.report" &&
    page.dataFeed[1].method === "POST" &&
    page.dataFeed[1].url === "/api/ops/acts/execute" &&
    page.dataFeed[1].target === "state.acts" &&
    page.dataFeed[1].data.first === "{$location.params.first}" &&
    page.dataFeed[1].data.rows === "{$location.params.rows}" &&
    page.dataFeed[1].data.sortField === "{$location.params.sortField}" &&
    page.dataFeed[1].data.sortOrder === "{$location.params.sortOrder}" &&
    page.dataFeed[1].data.search === "{$location.params.search}" &&
    page.dataFeed[1].data.filters === "{$location.params.filters}",
);
check(
  "page: dataInit — search/sortField/sortOrder → actsQuery, filters (json, feed, merge) → report.filters",
  page.dataInit.length === 4 &&
    page.dataInit[0].target === "state.actsQuery.search" &&
    page.dataInit[1].target === "state.actsQuery.sortField" &&
    page.dataInit[2].target === "state.actsQuery.sortOrder" &&
    page.dataInit[2].parse === "json" &&
    page.dataInit[3].source === "{$location.params.filters}" &&
    page.dataInit[3].target === "state.report.filters" &&
    page.dataInit[3].parse === "json" &&
    page.dataInit[3].priority === "feed" &&
    page.dataInit[3].method === "merge",
);
const shortcut = page.shortcuts.requestActs;
check(
  "page: shortcut requestActs — execute + mergeUrlParams (list-request-format, 7 параметров)",
  !!shortcut &&
    shortcut.params.commands[0].type === "sendRequest" &&
    shortcut.params.commands[0].params.url === "/api/ops/acts/execute" &&
    shortcut.params.commands[0].params.method === "POST" &&
    shortcut.params.commands[0].params.target === "state.acts" &&
    shortcut.params.commands[0].params.data.event === "{$event}" &&
    shortcut.params.commands[0].params.data.filters ===
      "{$state.report.filters}" &&
    shortcut.params.commands[0].params.format.$ref ===
      "../../system/list-request-format.json" &&
    shortcut.params.commands[1].type === "mergeUrlParams" &&
    Object.keys(shortcut.params.commands[1].params.values).length === 6 &&
    shortcut.params.commands[1].params.values.filters ===
      "{$state.report.filters}",
);
check(
  "page: header — Обновить → requestActs, Сохранить/Загрузить состояние (visible savedQuery)",
  (() => {
    const header = s[0].blocks[0].components;
    const byId = (id) => header.find((c) => c.id === id);
    const refresh = byId("actsRefreshButton");
    const save = byId("actsSaveStateButton");
    const load = byId("actsLoadStateButton");
    return (
      refresh &&
      refresh.events[0].commands[0] === "requestActs" &&
      save &&
      save.props.icon === "pi pi-save" &&
      JSON.stringify(save.events).includes("setToLocalStorage") &&
      load &&
      load.visible === "@state.savedQuery" &&
      load.props.icon === "pi pi-history"
    );
  })(),
);
check(
  "page: поиск (InputTextWithThrottle 500ms → actsQuery.search) и кнопка «Фильтры»",
  (() => {
    const block = s[1].blocks[0].components;
    const input = block.find((c) => c.id === "actsSearchInput");
    const toggle = block.find((c) => c.id === "actsToggleFilters");
    return (
      input &&
      input.componentType === "InputTextWithThrottle" &&
      input.props.throttleDelay === 500 &&
      input.props.value === "@state.actsQuery.search" &&
      input.events[0].commands[0].params.target === "state.actsQuery.search" &&
      input.events[0].commands[1] === "requestActs" &&
      toggle &&
      toggle.props.label === "Фильтры" &&
      toggle.events[0].commands[0].params.target === "state.filtersVisible"
    );
  })(),
);
check(
  "page: ActiveFiltersBar + FiltersPanel (drawer справа, onChange → report.filters + requestActs)",
  (() => {
    const block = s[1].blocks[1].components;
    const bar = block.find((c) => c.id === "actsActiveFilterChips");
    const drawer = block.find((c) => c.id === "actsFilterDrawer");
    return (
      bar &&
      bar.componentType === "ActiveFiltersBar" &&
      bar.props.value === "@state.report.filters" &&
      bar.events[0].commands[1] === "requestActs" &&
      drawer &&
      drawer.componentType === "FiltersPanel" &&
      drawer.props.visible === "@state.filtersVisible" &&
      drawer.props.position === "right" &&
      drawer.props.header === "Фильтры" &&
      drawer.events[0].commands[1].params.target === "state.filtersVisible" &&
      drawer.events[0].commands[2] === "requestActs" &&
      drawer.events[1].type === "onHide"
    );
  })(),
);
check(
  "page: таблица — value/columns/sort биндинги, customColumns user+button сохранены (instance_id)",
  (() => {
    const table = s[2].blocks[0].components.find((c) => c.id === "actsTable");
    const props = table.props;
    const cc = props.customColumns;
    const raw = JSON.stringify(page);
    return (
      props.value === "@state.acts.value" &&
      props.columns === "@state.report.columns" &&
      props.totalRecords === "@state.acts.totalRecords" &&
      props.sortField === "@state.actsQuery.sortField" &&
      props.sortOrder === "@state.actsQuery.sortOrder" &&
      props.paginator === true &&
      props.lazy === true &&
      props.selectionMode === "single" &&
      JSON.stringify(props.rowsPerPageOptions) === "[5,10,25,50]" &&
      cc.length === 2 &&
      cc[0].field === "user" &&
      cc[0].order === -1 &&
      cc[0].body[0].props.icon === "pi pi-user" &&
      cc[0].body[0].events[0].commands[0].params.url ===
        "/ops/users/{#row.user_id}" &&
      cc[1].field === "button" &&
      cc[1].order === -1 &&
      cc[1].body[0].props.icon === "pi pi-arrow-right" &&
      cc[1].body[0].events[0].commands[0].params.url ===
        "/ops/acts/{#row.instance_id}" &&
      !raw.includes("/ops/acts/{#row.id}") &&
      !raw.includes("@state.acts.columns")
    );
  })(),
);
check(
  "page: события таблицы — onPage/onSort (setProperty×2 → requestActs)/onRowClick по instance_id",
  (() => {
    const table = s[2].blocks[0].components.find((c) => c.id === "actsTable");
    const events = table.events;
    const onPage = events.find((e) => e.type === "onPage");
    const onSort = events.find((e) => e.type === "onSort");
    const onRowClick = events.find((e) => e.type === "onRowClick");
    return (
      onPage &&
      onPage.commands[0] === "requestActs" &&
      onSort &&
      onSort.commands[0].params.source === "event.sortField" &&
      onSort.commands[0].params.target === "state.actsQuery.sortField" &&
      onSort.commands[1].params.source === "event.sortOrder" &&
      onSort.commands[1].params.target === "state.actsQuery.sortOrder" &&
      onSort.commands[2] === "requestActs" &&
      onRowClick &&
      onRowClick.commands[0].params.url === "/ops/acts/{$event.data.instance_id}"
    );
  })(),
);
// --- 4. Request-адаптер: 23 макроса, §5.2/§6.2/§7, дефолт сортировки ---
const REQ = "config/adapters/stats.acts.execute.request.js";
const t = (params) => runAdapter(REQ, params);

const empty = t({});
check(
  "request: пустые параметры — page 1, limit 10, 23 ключа, ORDER_BY act_scan_uploaded_at DESC",
  empty.page === 1 &&
    empty.limit === 10 &&
    Object.keys(empty.replacements).length === 23 &&
    empty.replacements.ORDER_BY === "pi.act_scan_uploaded_at" &&
    empty.replacements.ORDER_DIR === "DESC" &&
    empty.replacements.ACT_STATUS_FILTER === "" &&
    empty.replacements.PRICE_FILTER === "" &&
    empty.replacements.SEARCH_FILTER === "" &&
    empty.replacements.ISSUED_FROM_FILTER === "",
);
check(
  "request: пагинация first/rows → page = floor(first/limit)+1, limit cap 100",
  t({ first: 20, rows: 10 }).page === 3 &&
    t({ first: 45, rows: 25 }).page === 2 &&
    t({ first: 0, rows: 150 }).limit === 100 &&
    t({ first: 0, rows: 150 }).page === 1,
);
const one = t({ filters: [{ id: "act_status", value: [true, false, false, false] }] });
check(
  "request: act_status — частичный выбор → IN ('PENDING'); всё/ничего → пусто; mapping сервера побеждает",
  one.replacements.ACT_STATUS_FILTER === "AND pi.act_status IN ('PENDING')" &&
    t({ filters: [{ id: "act_status", value: [true, true, true, true] }] })
      .replacements.ACT_STATUS_FILTER === "" &&
    t({ filters: [{ id: "act_status" }] }).replacements.ACT_STATUS_FILTER ===
      "" &&
    t({
      filters: [
        {
          id: "act_status",
          value: [true, false],
          mapping: { 0: "APPROVED", 1: "PENDING", 2: "REJECTED", 3: "ACT_UPLOADED" },
        },
      ],
    }).replacements.ACT_STATUS_FILTER === "AND pi.act_status IN ('APPROVED')",
);
check(
  "request: act_required — числовые 1/0 БЕЗ кавычек (§5.2)",
  t({ filters: [{ id: "act_required", value: [true, false] }] })
    .replacements.ACT_REQUIRED_FILTER === "AND pc.act_required IN (1)" &&
    t({ filters: [{ id: "act_required", value: [false, true] }] })
      .replacements.ACT_REQUIRED_FILTER === "AND pc.act_required IN (0)" &&
    t({ filters: [{ id: "act_required", value: [true, true] }] })
      .replacements.ACT_REQUIRED_FILTER === "",
);
check(
  "request: has_file — true/false/unset → IS NOT NULL / IS NULL / пусто",
  t({ filters: [{ id: "has_file", value: true }] }).replacements.HAS_FILE_FILTER ===
    "AND pi.act_scan_stored_name IS NOT NULL" &&
    t({ filters: [{ id: "has_file", value: false }] }).replacements
      .HAS_FILE_FILTER === "AND pi.act_scan_stored_name IS NULL" &&
    t({ filters: [{ id: "has_file" }] }).replacements.HAS_FILE_FILTER === "",
);
check(
  "request: checkbox анкеты — текстовые поля с <> '', has_agreement с COALESCE, сканы по ud_* алиасам",
  t({ filters: [{ id: "has_passport", value: true }] }).replacements
    .HAS_PASSPORT_FILTER ===
    "AND (ue.passport_series_number IS NOT NULL AND ue.passport_series_number <> '')" &&
    t({ filters: [{ id: "has_passport", value: false }] }).replacements
      .HAS_PASSPORT_FILTER ===
      "AND (ue.passport_series_number IS NULL OR ue.passport_series_number = '')" &&
    t({ filters: [{ id: "has_passport_issue_date", value: true }] }).replacements
      .HAS_PASSPORT_ISSUE_DATE_FILTER ===
      "AND ue.passport_issue_date IS NOT NULL" &&
    t({ filters: [{ id: "has_agreement", value: true }] }).replacements
      .HAS_AGREEMENT_FILTER === "AND COALESCE(ue.agreement, 0) = 1" &&
    t({ filters: [{ id: "has_agreement", value: false }] }).replacements
      .HAS_AGREEMENT_FILTER === "AND COALESCE(ue.agreement, 0) = 0" &&
    t({ filters: [{ id: "has_passport_main_scan", value: true }] }).replacements
      .HAS_PASSPORT_MAIN_SCAN_FILTER === "AND ud_pm.id IS NOT NULL" &&
    t({ filters: [{ id: "has_snils_scan", value: false }] }).replacements
      .HAS_SNILS_SCAN_FILTER === "AND ud_snils.id IS NULL",
);
check(
  "request: prize — fallback пуст (динамический список), серверный mapping → IN ('GIFT')",
  t({ filters: [{ id: "prize", value: [true] }] }).replacements.PRIZE_FILTER ===
    "" &&
    t({
      filters: [
        { id: "prize", value: [true, false], mapping: { 0: "GIFT", 1: "CERT" } },
      ],
    }).replacements.PRIZE_FILTER === "AND pc.code IN ('GIFT')",
);
check(
  "request: price — рубли → копейки Math.round(*100), недостающая граница опускается",
  t({ filters: [{ id: "price", value: [100.5, 500] }] }).replacements
    .PRICE_FILTER === "AND pc.price >= 10050 AND pc.price <= 50000" &&
    t({ filters: [{ id: "price", value: [null, 500] }] }).replacements
      .PRICE_FILTER === "AND pc.price <= 50000" &&
    t({ filters: [{ id: "price", value: [] }] }).replacements.PRICE_FILTER ===
      "" &&
    t({ filters: [{ id: "price" }] }).replacements.PRICE_FILTER === "",
);
const period = t({
  filters: [
    { id: "act_uploaded_date", value: ["2026-01-05", "2026-01-06"] },
    { id: "issued_date", value: ["2026-02-01", "2026-02-03"] },
  ],
});
check(
  "request: периоды — wall-границы 00:00:00/23:59:59 в СВОИ макросы (ACT_UPLOADED_FROM/TO, ISSUED_FROM/TO)",
  period.replacements.ACT_UPLOADED_FROM_FILTER ===
    "AND pi.act_scan_uploaded_at >= '2026-01-05 00:00:00'" &&
    period.replacements.ACT_UPLOADED_TO_FILTER ===
      "AND pi.act_scan_uploaded_at <= '2026-01-06 23:59:59'" &&
    period.replacements.ISSUED_FROM_FILTER ===
      "AND pi.issued_at >= '2026-02-01 00:00:00'" &&
    period.replacements.ISSUED_TO_FILTER ===
      "AND pi.issued_at <= '2026-02-03 23:59:59'",
);
const search = t({ search: "o'brien_100%" });
check(
  "request: поиск — 10 полей §6.1, экранирование \\ % _ ' (likePattern), пустой поиск → пусто",
  search.replacements.SEARCH_FILTER ===
    "AND (BIN_TO_UUID(pi.id) LIKE '%o''brien\\_100\\%%' OR " +
      "pi.external_id LIKE '%o''brien\\_100\\%%' OR " +
      "pc.code LIKE '%o''brien\\_100\\%%' OR " +
      "pc.title LIKE '%o''brien\\_100\\%%' OR " +
      "pi.act_scan_original_name LIKE '%o''brien\\_100\\%%' OR " +
      "BIN_TO_UUID(pi.user_id) LIKE '%o''brien\\_100\\%%' OR " +
      "u.participant_code LIKE '%o''brien\\_100\\%%' OR " +
      "u.email LIKE '%o''brien\\_100\\%%' OR " +
      "u.first_name LIKE '%o''brien\\_100\\%%' OR " +
      "u.last_name LIKE '%o''brien\\_100\\%%')" &&
    t({ search: "   " }).replacements.SEARCH_FILTER === "",
);
check(
  "request: сортировка — карта §4 (price_rub → pc.price), чужое/null-поле → дефолт DESC, sortOrder 1 → ASC",
  t({ sortField: "prize_title", sortOrder: 1 }).replacements.ORDER_BY ===
    "pc.title" &&
    t({ sortField: "prize_title", sortOrder: 1 }).replacements.ORDER_DIR ===
      "ASC" &&
    t({ sortField: "prize_title", sortOrder: -1 }).replacements.ORDER_DIR ===
      "DESC" &&
    t({ sortField: "act_state", sortOrder: 1 }).replacements.ORDER_BY ===
      "act_state" &&
    t({ sortField: "price_rub" }).replacements.ORDER_BY === "pc.price" &&
    t({ sortField: "hack; DROP TABLE" }).replacements.ORDER_BY ===
      "pi.act_scan_uploaded_at" &&
    t({ sortField: "hack; DROP TABLE" }).replacements.ORDER_DIR === "DESC" &&
    t({ sortField: "full_name" }).replacements.ORDER_BY ===
      "pi.act_scan_uploaded_at" &&
    t({ sortField: "act_scan_original_name" }).replacements.ORDER_BY ===
      "pi.act_scan_uploaded_at",
);
check(
  "request: несколько фильтров одновременно — каждый ключ заполняется независимо",
  (() => {
    const out = t({
      filters: [
        { id: "act_status", value: [false, true, false, false] },
        { id: "has_inn", value: true },
        { id: "has_file", value: false },
      ],
      search: "иван",
      sortField: "days_on_review",
      sortOrder: 1,
    });
    return (
      out.replacements.ACT_STATUS_FILTER ===
        "AND pi.act_status IN ('ACT_UPLOADED')" &&
      out.replacements.HAS_INN_FILTER ===
        "AND (ue.inn IS NOT NULL AND ue.inn <> '')" &&
      out.replacements.HAS_FILE_FILTER ===
        "AND pi.act_scan_stored_name IS NULL" &&
      out.replacements.SEARCH_FILTER.includes("иван") &&
      out.replacements.ORDER_BY === "days_on_review" &&
      out.replacements.ORDER_DIR === "ASC" &&
      out.replacements.ACT_REQUIRED_FILTER === ""
    );
  })(),
);
// --- 5. Report response: фолбэк спеки / серверные метаданные ---
const REPORT = "config/adapters/stats.acts.report.response.js";
const r = (data) => runAdapter(REPORT, data);

// Спека §3 — полный список колонок фолбэка (35 минус 3 popup-only)
const ACTS_FALLBACK_EXPECTED_COLUMNS = [
  "act_status",
  "act_state",
  "act_scan_uploaded_at",
  "days_on_review",
  "act_file_present",
  "act_scan_original_name",
  "act_scan_size",
  "act_required",
  "prize_code",
  "prize_title",
  "type_code",
  "price_rub",
  "user_id",
  "participant_code",
  "full_name",
  "email",
  "has_passport",
  "has_passport_issue_date",
  "has_passport_issued_by",
  "has_address",
  "has_inn",
  "has_snils",
  "has_agreement",
  "has_passport_main_scan",
  "has_passport_reg_scan",
  "has_inn_scan",
  "has_snils_scan",
  "issued_at",
  "status",
  "pool_status",
  "external_id",
  "created_at",
];

const fallback = r({ error: "query_id not registered" });
const fallbackFields = fallback.columns.map((c) => c.field);
check(
  "report: битый payload → фолбэк спеки: 32 колонки без instance_id/act_scan_mime/act_scan_stored_name, 18 фильтров",
  fallback.id === "" &&
    fallback.columns.length === 32 &&
    fallbackFields.join(",") === ACTS_FALLBACK_EXPECTED_COLUMNS.join(",") &&
    fallback.filters.length === 18,
);
check(
  "report: сортируемость по белому списку _shared.js — act_state да, full_name/файл нет; dataType date/uuid",
  (() => {
    const by = (f) => fallback.columns.find((c) => c.field === f);
    return (
      by("act_state").sortable === true &&
      by("days_on_review").sortable === true &&
      by("full_name").sortable === false &&
      by("act_scan_original_name").sortable === false &&
      by("act_scan_uploaded_at").dataType === "date" &&
      by("issued_at").dataType === "date" &&
      by("user_id").dataType === "uuid" &&
      by("created_at").dataType === "date"
    );
  })(),
);
check(
  "report: фильтры §5.1 — options/checkbox/prize (opts пустые)/price/периоды в порядке спеки",
  (() => {
    const ids = fallback.filters.map((f) => f.id);
    return (
      ids[0] === "act_status" &&
      ids[1] === "act_required" &&
      ids[2] === "has_file" &&
      ids[13] === "has_snils_scan" &&
      ids[14] === "prize" &&
      ids[15] === "price" &&
      ids[16] === "act_uploaded_date" &&
      ids[17] === "issued_date" &&
      fallback.filters[0].opts.join("|") ===
        "Ожидает загрузки|Акт загружен|Подтверждён|Отклонён" &&
      fallback.filters[1].opts.join("|") === "Требуется|Не требуется" &&
      fallback.filters[14].opts.length === 0 &&
      fallback.filters[15].opts.join("|") === "0|500000" &&
      fallback.filters[16].column === "pi.act_scan_uploaded_at" &&
      fallback.filters[17].column === "pi.issued_at"
    );
  })(),
);
const serverMeta = r({
  status: "ok",
  data: {
    id: "acts",
    title: "Акты получения призов",
    fields: [
      { name: "instance_id", type: "string", title: "ID экземпляра", sortable: true },
      { name: "act_scan_mime", type: "string", title: "Тип файла акта" },
      { name: "act_state", type: "string", title: "Состояние" },
      { name: "act_scan_uploaded_at", type: "datetime", title: "Дата загрузки" },
      { name: "user_id", type: "uuid", title: "Владелец" },
      { name: "full_name", type: "string", title: "ФИО", sortable: false },
      { name: "unknown_field", type: "string", title: "Новое" },
    ],
    filters: [{ id: "act_status", name: "S", type: "options", opts: ["A"], value: null }],
  },
});
check(
  "report: серверные fields[] побеждают, popup-only отсекаются и из них, dataType/сортируемость мапятся",
  serverMeta.id === "acts" &&
    serverMeta.title === "Акты получения призов" &&
    serverMeta.columns.length === 5 &&
    serverMeta.columns.map((c) => c.field).join(",") ===
      "act_state,act_scan_uploaded_at,user_id,full_name,unknown_field" &&
    serverMeta.columns[0].sortable === true &&
    serverMeta.columns[3].sortable === false &&
    serverMeta.columns[1].dataType === "date" &&
    serverMeta.columns[2].dataType === "uuid" &&
    serverMeta.columns[3].header === "ФИО" &&
    serverMeta.filters.length === 1 &&
    serverMeta.filters[0].id === "act_status",
);
// --- 6. Execute response: полный state-объект, лейблы, legacy-формы ---
const EXEC = "config/adapters/stats.acts.execute.response.js";
const e = (data) => runAdapter(EXEC, data);

const rowsShape = e({
  rows: [
    {
      id: "r1",
      values: {
        instance_id: "uuid-1",
        act_status: "PENDING",
        act_state: "WAITING_UPLOAD",
        act_required: true,
        has_passport: false,
        price_rub: 590.3,
        participant_code: "PART-1",
      },
    },
  ],
  meta: { total_count: 42, first: 10, limit: 10 },
});
check(
  "execute: rows+meta → полный {value,totalRecords,first,rows} (setStateField заменяет цель)",
  rowsShape.value.length === 1 &&
    rowsShape.totalRecords === 42 &&
    rowsShape.first === 10 &&
    rowsShape.rows === 10 &&
    rowsShape.value[0].instance_id === "uuid-1" &&
    rowsShape.value[0].participant_code === "PART-1" &&
    rowsShape.value[0].price_rub === 590.3,
);
check(
  "execute: лейблы act_status/act_state §5.1, act_required Да/Нет, has_* остаются boolean",
  rowsShape.value[0].act_status === "Ожидает" &&
    rowsShape.value[0].act_state === "Ожидает загрузки" &&
    rowsShape.value[0].act_required === "Да" &&
    rowsShape.value[0].has_passport === false,
);
check(
  "execute: явный *_label побеждает, неизвестный код остаётся сырым",
  e({
    rows: [{ values: { act_state: "WEIRD", act_state_label: "Своё состояние" } }],
    meta: { total_count: 1, limit: 10 },
  }).value[0].act_state === "Своё состояние" &&
    e({
      rows: [{ values: { act_state: "WEIRD" } }],
      meta: { total_count: 1, limit: 10 },
    }).value[0].act_state === "WEIRD",
);
check(
  "execute: обёртка {status:'ok',data:{rows…}}, items/pagination и сырой массив обрабатываются",
  (() => {
    const wrapped = e({
      status: "ok",
      data: {
        rows: [{ values: { act_status: "APPROVED" } }],
        meta: { total_count: 7, limit: 10 },
      },
    });
    const items = e({
      items: [{ act_status: "REJECTED" }, { act_status: "PENDING" }],
      pagination: { page: 3, limit: 10, total_items: 55 },
    });
    const raw = e([{ act_status: "PENDING" }]);
    return (
      wrapped.value.length === 1 &&
      wrapped.value[0].act_status === "Подтверждён" &&
      wrapped.totalRecords === 7 &&
      items.totalRecords === 55 &&
      items.first === 20 &&
      items.rows === 10 &&
      items.value[0].act_status === "Отклонён" &&
      raw.totalRecords === 1 &&
      raw.first === 0 &&
      raw.rows === 10
    );
  })(),
);
check(
  "execute: пустой/битый payload → пустой полный state (таблица пуста, но не сломана)",
  (() => {
    const out = e({});
    return (
      out.value.length === 0 &&
      out.totalRecords === 0 &&
      out.first === 0 &&
      out.rows === 10
    );
  })(),
);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);