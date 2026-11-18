/**
 * Временный тест-стенд раздела «Призы» (эталонная кампания): верхнее меню
 * раздела (menuSection + Menubar с $ref menus/prizes.json на страницах
 * «Призы» и «Каталог призов») и новая страница «Каталог призов»
 * (/ops/prize-catalog) на execute запроса prize-catalog
 * (.prompts/prize-catalog.md).
 *
 * Проверяются:
 *  1) JSON-валидность затронутых конфигов;
 *  2) реестры: crm-config ($ref страницы), api-routes (2 литеральных
 *     маршрута + разрешение путей раньше паттерна ops/prizes/[prize_id]),
 *     adapters.json (3 ключа → файлы на диске);
 *  3) меню: модель (2 пункта, порядок, маршруты), menubar на обеих страницах
 *     (sibling-$ref в props → контент мержится в props, props.model —
 *     массив; проверяется dereference $RefParser, как в initApp);
 *     prizes.json не задет кроме menuSection первой секцией;
 *  4) структура страницы каталога (state/dataFeed/dataInit/shortcuts/
 *     секции; ленивая таблица без onRowClick/selectionMode/customColumns);
 *  5) исполнение 3 адаптеров через new Function с _shared.js (как
 *     DataAdapterEngine): request — 5 макросов, карта 0/1, «ничего или всё →
 *     пусто», поиск с экранированием, ORDER_MAP + price_rub → pc.price,
 *     дефолт created_at DESC, page/cap limit; report-response — фолбэк
 *     колонок §3/фильтров §5.1, серверное эхо перекрывает, ошибка → фолбэк;
 *     execute-response — формы ответа §8 → {value, totalRecords, first,
 *     rows}, метки булевых;
 *  6) кросс-проверка whitelist↔ORDER_MAP.
 *
 * Запуск: node tmp-test-prize-catalog.js
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
  const catalogPath = "config/pages/promo-instance/prize-catalog.json";
  const prizesPath = "config/pages/promo-instance/prizes.json";

  // 1) JSON-валидность
  const catalog = JSON.parse(fs.readFileSync(catalogPath, "utf-8"));
  const prizes = JSON.parse(fs.readFileSync(prizesPath, "utf-8"));
  const menu = JSON.parse(fs.readFileSync("config/menus/prizes.json", "utf-8"));
  const routes = JSON.parse(fs.readFileSync("config/system/api-routes.json", "utf-8"));
  const adapters = JSON.parse(fs.readFileSync("config/system/adapters.json", "utf-8"));
  const crmConfig = JSON.parse(fs.readFileSync("config/crm-config.json", "utf-8"));
  check("json: все затронутые конфиги валидны", true);

  // 2) Реестры
  check("crm-config: $ref страницы каталога", JSON.stringify(crmConfig).includes("./pages/promo-instance/prize-catalog.json"));
  const catRoutes = routes.filter((r) => String(r.path).startsWith("ops/prize-catalog"));
  check("api-routes: 2 маршрута каталога (GET + POST execute)", catRoutes.length === 2 && catRoutes[0].path === "ops/prize-catalog" && catRoutes[0].method === "GET" && catRoutes[1].path === "ops/prize-catalog/execute" && catRoutes[1].method === "POST");
  check("api-routes: GET → upstream stats/query/prize-catalog + адаптер метаданных", catRoutes[0].url === "/api/v1/crm/stats/query/prize-catalog" && catRoutes[0].adapter.response === "stats.prize-catalog.report.response");
  check("api-routes: POST execute query:true + оба адаптера", catRoutes[1].url === "/api/v1/crm/stats/query/prize-catalog/execute" && catRoutes[1].query === true && catRoutes[1].adapter.request === "stats.prize-catalog.execute.request" && catRoutes[1].adapter.response === "stats.prize-catalog.execute.response");
  // Разрешение путей: литеральные маршруты каталога не перехватываются
  // паттерном ops/prizes/[prize_id] (роутер берёт первый совпавший;
  // matchRoutePattern сравнивает путь без префикса /api)
  check("routing: /ops/prize-catalog → маршрут метаданных (не [prize_id])", resolveRoute(routes, "/ops/prize-catalog", "GET").path === "ops/prize-catalog");
  check("routing: /ops/prize-catalog/execute → маршрут execute", resolveRoute(routes, "/ops/prize-catalog/execute", "POST").path === "ops/prize-catalog/execute");
  check("routing: /ops/prizes/uuid по-прежнему карточка приза", resolveRoute(routes, "/ops/prizes/abc", "GET").path === "ops/prizes/[prize_id]");
  check("adapters: 3 ключа → файлы на диске", ["stats.prize-catalog.report.response", "stats.prize-catalog.execute.request", "stats.prize-catalog.execute.response"].every((key) => adapters[key] && fs.existsSync(adapters[key].script.replace("./", ""))));

  // 3) Меню раздела
  check("menu: 2 пункта в порядке Призы → Каталог", menu.model.length === 2 && menu.model[0].id === "prizes" && menu.model[0].label === "Призы" && menu.model[0].route === "/ops/prizes" && menu.model[1].id === "catalog" && menu.model[1].label === "Каталог призов" && menu.model[1].route === "/ops/prize-catalog");

  // Dereference страниц (как initApp): sibling-$ref в props мержит контент
  // меню-файла в сам props — props.model остаётся массивом групп/пунктов
  const catalogDeref = await new $RefParser().dereference(path.resolve(catalogPath));
  const prizesDeref = await new $RefParser().dereference(path.resolve(prizesPath));
  const catalogMenubar = catalogDeref.sections[0].blocks[0].components[0];
  const prizesMenubar = prizesDeref.sections[0].blocks[0].components[0];
  check("catalog: menuSection первая секция + menubar", catalogDeref.sections[0].id === "menuSection" && catalogMenubar.componentType === "Menubar");
  check("catalog: activeItemId catalog + props.model из меню (2 пункта)", catalogMenubar.props.activeItemId === "catalog" && Array.isArray(catalogMenubar.props.model) && catalogMenubar.props.model.length === 2 && catalogMenubar.props.model[1].id === "catalog");
  check("catalog: после dereference в menubar нет литералов $ref", !JSON.stringify(catalogMenubar).includes("$ref"));
  check("prizes: menuSection первая секция + activeItemId prizes", prizesDeref.sections[0].id === "menuSection" && prizesMenubar.props.activeItemId === "prizes" && Array.isArray(prizesMenubar.props.model) && prizesMenubar.props.model.length === 2 && prizesMenubar.props.model[0].id === "prizes");
  check("prizes: структура не задета (шапка/фиды/таблица на месте)", prizesDeref.sections[1].id === "prizesHeader" && prizesDeref.dataFeed[0].url === "/api/ops/prizes" && JSON.stringify(prizesDeref).includes("prizesTable"));

  // 4) Структура страницы каталога
  check("catalog: route/id/title", catalog.route === "/ops/prize-catalog" && catalog.id === "prize-catalog" && catalog.meta.title.indexOf("Каталог призов") === 0);
  check("catalog: state — таблица/запрос/метаданные/флаг панели", !!catalog.state.prizeCatalog && !!catalog.state.prizeCatalogQuery && !!catalog.state.report && catalog.state.filtersVisible === false);
  const feedGet = catalog.dataFeed.find((f) => f.method === "GET");
  const feedPost = catalog.dataFeed.find((f) => f.method === "POST");
  check("catalog: dataFeed GET метаданные + POST execute", feedGet.url === "/api/ops/prize-catalog" && feedGet.target === "state.report" && feedPost.url === "/api/ops/prize-catalog/execute" && feedPost.target === "state.prizeCatalog");
  check("catalog: dataInit — 4 параметра URL (filters merge/feed)", catalog.dataInit.length === 4 && catalog.dataInit.some((d) => d.target === "state.report.filters" && d.method === "merge" && d.priority === "feed") && catalog.dataInit.some((d) => d.target === "state.prizeCatalogQuery.sortOrder" && d.parse === "json"));
  const shortcut = catalog.shortcuts.requestPrizeCatalog;
  check("catalog: shortcut — execute + mergeUrlParams + list-request-format", !!shortcut && shortcut.params.commands[0].type === "sendRequest" && shortcut.params.commands[0].params.url === "/api/ops/prize-catalog/execute" && shortcut.params.commands[0].params.data.filters === "{$state.report.filters}" && shortcut.params.commands[1].type === "mergeUrlParams");
  check("catalog: поиск с throttle + кнопка Фильтры + ActiveFiltersBar/FiltersPanel", JSON.stringify(catalogDeref).includes("InputTextWithThrottle") && JSON.stringify(catalogDeref).includes("ActiveFiltersBar") && JSON.stringify(catalogDeref).includes("FiltersPanel"));
  const filtersSection = catalogDeref.sections.find((s) => s.id === "catalogFilters");
  check("catalog: FiltersPanel/чипы привязаны к report.filters + запрос после применения", JSON.stringify(filtersSection).includes("@state.report.filters") && JSON.stringify(filtersSection).includes("requestPrizeCatalog"));
  const table = catalogDeref.sections.find((s) => s.id === "catalogTableSection").blocks[0].components[0];
  check("catalog: ленивая таблица на report.columns + value/totalRecords", table.componentType === "DataTable" && table.props.lazy === true && table.props.columns === "@state.report.columns" && table.props.value === "@state.prizeCatalog.value" && table.props.totalRecords === "@state.prizeCatalog.totalRecords");
  check("catalog: таблица без клика/выделения/customColumns", table.props.onRowClick === undefined && table.props.selectionMode === undefined && table.props.customColumns === undefined);
  check("catalog: onPage/onSort → requestPrizeCatalog", JSON.stringify(table.events).includes("onPage") && JSON.stringify(table.events).includes("onSort") && JSON.stringify(table.events).includes("requestPrizeCatalog"));

  // 5) Исполнение адаптеров
  const reqPath = "config/adapters/stats.prize-catalog.execute.request.js";
  const metaPath = "config/adapters/stats.prize-catalog.report.response.js";
  const respPath = "config/adapters/stats.prize-catalog.execute.response.js";

  // request: options с числовой картой 0/1
  const reqBoth = runAdapter(reqPath, { filters: [{ id: "active", value: [true, false] }, { id: "is_removed", value: [true, true] }] });
  check("request: «Видимые» → AND pc.active IN (1)", reqBoth.replacements.ACTIVE_FILTER === "AND pc.active IN (1)");
  check("request: «В плане»+«Вне плана» (всё выбрано) → пусто", reqBoth.replacements.IS_REMOVED_FILTER === "");
  check("request: «Скрытые» → AND pc.active IN (0)", runAdapter(reqPath, { filters: [{ id: "active", value: [false, true] }] }).replacements.ACTIVE_FILTER === "AND pc.active IN (0)");
  check("request: «Вне плана» → AND pc.is_removed IN (1)", runAdapter(reqPath, { filters: [{ id: "is_removed", value: [false, true] }] }).replacements.IS_REMOVED_FILTER === "AND pc.is_removed IN (1)");
  check("request: «В плане» → AND pc.is_removed IN (0)", runAdapter(reqPath, { filters: [{ id: "is_removed", value: [true, false] }] }).replacements.IS_REMOVED_FILTER === "AND pc.is_removed IN (0)");
  check("request: ничего не выбрано → пусто", runAdapter(reqPath, { filters: [{ id: "active", value: [false, false] }] }).replacements.ACTIVE_FILTER === "");
  const reqPartial = runAdapter(reqPath, { filters: [{ id: "active", value: [true, false] }, { id: "is_removed", value: [false, true] }] });
  check("request: оба options частично → оба макроса", reqPartial.replacements.ACTIVE_FILTER === "AND pc.active IN (1)" && reqPartial.replacements.IS_REMOVED_FILTER === "AND pc.is_removed IN (1)");
  const reqKeys = runAdapter(reqPath, {});
  check("request: все 5 макросов всегда (пустые без выбора)", Object.keys(reqKeys.replacements).length === 5 && reqKeys.replacements.ACTIVE_FILTER === "" && reqKeys.replacements.IS_REMOVED_FILTER === "" && reqKeys.replacements.SEARCH_FILTER === "");
  check("request: payload — только page/limit/replacements (§1.1 top-level не шлём)", JSON.stringify(Object.keys(reqKeys)) === JSON.stringify(["page", "limit", "replacements"]));
  // поиск: 5 полей + экранирование
  const reqSearch = runAdapter(reqPath, { search: "O'Brien%_x" });
  check("request: поиск кавычка удваивается", reqSearch.replacements.SEARCH_FILTER.includes("O''Brien"));
  check("request: поиск % и _ экранируются", reqSearch.replacements.SEARCH_FILTER.includes("Brien\\%\\_x"));
  check("request: поиск 5 OR-подобий в группе", (reqSearch.replacements.SEARCH_FILTER.match(/LIKE/g) || []).length === 5 && reqSearch.replacements.SEARCH_FILTER.startsWith("AND (") && reqSearch.replacements.SEARCH_FILTER.endsWith(")"));
  check("request: поиск UUID-поля BIN_TO_UUID(pc.id)", reqSearch.replacements.SEARCH_FILTER.includes("BIN_TO_UUID(pc.id) LIKE"));
  // сортировка: карта §4 + дефолт
  check("request: price_rub → pc.price ASC", runAdapter(reqPath, { sortField: "price_rub", sortOrder: 1 }).replacements.ORDER_BY === "pc.price" && runAdapter(reqPath, { sortField: "price_rub", sortOrder: 1 }).replacements.ORDER_DIR === "ASC");
  check("request: prize_id → pc.id DESC", runAdapter(reqPath, { sortField: "prize_id", sortOrder: -1 }).replacements.ORDER_BY === "pc.id" && runAdapter(reqPath, { sortField: "prize_id", sortOrder: -1 }).replacements.ORDER_DIR === "DESC");
  check("request: description (null в карте) → дефолт", runAdapter(reqPath, { sortField: "description", sortOrder: 1 }).replacements.ORDER_BY === "pc.created_at" && runAdapter(reqPath, { sortField: "description", sortOrder: 1 }).replacements.ORDER_DIR === "DESC");
  check("request: мусор в sortField → дефолт created_at DESC", runAdapter(reqPath, { sortField: "pc.code; DROP", sortOrder: 1 }).replacements.ORDER_BY === "pc.created_at" && runAdapter(reqPath, { sortField: "pc.code; DROP", sortOrder: 1 }).replacements.ORDER_DIR === "DESC");
  check("request: без сортировки → дефолт created_at DESC", reqKeys.replacements.ORDER_BY === "pc.created_at" && reqKeys.replacements.ORDER_DIR === "DESC");
  // пагинация
  check("request: first/rows → page", runAdapter(reqPath, { first: 40, rows: 20 }).page === 3 && runAdapter(reqPath, { first: 40, rows: 20 }).limit === 20);
  check("request: rows 200 → cap 100", runAdapter(reqPath, { rows: 200 }).limit === 100);

  // report-response: фолбэк-first метаданные
  const metaFallback = runAdapter(metaPath, null);
  check("metadata: ошибка/пусто → фолбэк из спеки (15 колонок, 2 фильтра)", metaFallback.columns.length === 15 && metaFallback.filters.length === 2 && metaFallback.id === "" && metaFallback.title === "");
  check("metadata: фолбэк-фильтры §5.1 (id/type/opts)", JSON.stringify(metaFallback.filters.map((f) => [f.id, f.type, f.opts])) === JSON.stringify([["active", "options", ["Видимые", "Скрытые"]], ["is_removed", "options", ["В плане", "Вне плана"]]]));
  const metaCols = {};
  metaFallback.columns.forEach((c) => { metaCols[c.field] = c; });
  check("metadata: заголовки §3", metaCols.title.header === "Название" && metaCols.price_rub.header === "Стоимость, ₽ (для акта)" && metaCols.is_removed.header === "Нет в плане CRM" && metaCols.prize_id.header === "ID приза");
  check("metadata: sortable по whitelist (title да; description/image/image_source_url нет)", metaCols.title.sortable === true && metaCols.description.sortable === false && metaCols.image.sortable === false && metaCols.image_source_url.sortable === false && metaCols.created_at.sortable === true);
  check("metadata: datetime → dataType date", metaCols.created_at.dataType === "date" && metaCols.updated_at.dataType === "date");
  const metaServer = runAdapter(metaPath, { status: "ok", data: { id: "q9", title: "Каталог", fields: [{ name: "league_name", title: "Лига", sortable: true }], filters: [{ id: "x", name: "X", type: "text" }] } });
  check("metadata: серверные fields/filters перекрывают фолбэк", metaServer.columns.length === 1 && metaServer.columns[0].field === "league_name" && metaServer.id === "q9" && metaServer.filters.length === 1 && metaServer.filters[0].id === "x");
  check("metadata: серверная колонка вне whitelist → sortable false", metaServer.columns[0].sortable === false);

  // execute-response: формы ответа → полный state-объект
  const legacy = runAdapter(respPath, [{ code: "P1" }]);
  check("response: legacy-массив → полный state-объект", Array.isArray(legacy.value) && legacy.value[0].code === "P1" && legacy.totalRecords === 1 && legacy.first === 0);
  const specForm = runAdapter(respPath, { status: "ok", data: { rows: [{ id: 1, values: { code: "A", active: true, act_required: false } }], pagination: { page: 2, limit: 20, total_items: 42, total_pages: 3 } } });
  check("response: спека §8 → value/totalRecords/first/rows", specForm.value[0].code === "A" && specForm.totalRecords === 42 && specForm.first === 20 && specForm.rows === 20);
  check("response: булевы → метки Да/Нет", specForm.value[0].active === "Да" && specForm.value[0].act_required === "Нет");
  const futureForm = runAdapter(respPath, { rows: [{ id: 1, values: { code: "B", is_removed: true } }], meta: { total_count: 37, first: 10, limit: 10 } });
  check("response: future meta → счётчики из meta", futureForm.totalRecords === 37 && futureForm.first === 10 && futureForm.rows === 10 && futureForm.value[0].is_removed === "Да");
  const currentForm = runAdapter(respPath, { items: [{ code: "C" }], pagination: { page: 3, limit: 25, total_items: 120 } });
  check("response: {items, pagination} → first (page-1)*limit", currentForm.totalRecords === 120 && currentForm.first === 50 && currentForm.rows === 25);
  check("response: *_label от бэкенда приоритетнее меток", runAdapter(respPath, { rows: [{ id: 1, values: { active: true, active_label: "Видимый" } }] }).value[0].active === "Видимый");
  const emptyResp = runAdapter(respPath, null);
  check("response: мусор → пустой state-объект", Array.isArray(emptyResp.value) && emptyResp.value.length === 0 && emptyResp.totalRecords === 0);

  // 6) Кросс-проверка: каждый sortable-алиас whitelist обрабатывается
  // ORDER_MAP (не уходит в дефолт pc.created_at), не-сортируемые — дефолт
  const whitelist = metaFallback.columns.filter((c) => c.sortable).map((c) => c.field);
  check("whitelist↔ORDER_MAP: sortable-алиасы дают не-дефолт (кроме created_at)", whitelist.every((alias) => alias === "created_at" || runAdapter(reqPath, { sortField: alias, sortOrder: 1 }).replacements.ORDER_BY !== "pc.created_at"));
  check("whitelist↔ORDER_MAP: не-сортируемые → дефолт", ["description", "image", "image_source_url"].every((alias) => runAdapter(reqPath, { sortField: alias, sortOrder: 1 }).replacements.ORDER_BY === "pc.created_at"));

  // Итог
  console.log(`\n${pass} passed, ${fail} failed`);
  if (fail > 0) process.exitCode = 1;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});