/**
 * Стенд: страницы «Транзакции» кампании avito_to_the_top (список кампании +
 * транзакции участника) — новые файлы патча:
 *   config/camps/avito_to_the_top/menus/navbar.json (дельта navbar),
 *   config/camps/avito_to_the_top/menus/user.json (меню карточки + пункт),
 *   config/camps/avito_to_the_top/pages/transactions-list.json,
 *   config/camps/avito_to_the_top/pages/user-transactions.json,
 *   config/camps/avito_to_the_top/api-routes.json (+4 маршрута),
 *   config/camps/avito_to_the_top/adapters.json (+4 адаптера).
 *
 * 1) Эталон собирается через $RefParser (как initApp), реестр кампаний
 *    реплицирует buildCampConfigs; проверяется отсутствие литералов $ref;
 * 2) navbar: дельта по route — «Транзакции» аппендится в конец промо-группы
 *    (mergeArray не вставляет в середину), эталон не задет;
 * 3) меню карточки: дельта user-card.json (menuSection → props.model →
 *    camp-копия user.json) — пункт «Транзакции» в «Достижениях», активный
 *    пункт карточки остаётся profile; новая страница user-transactions
 *    получает полное меню кампании (achievements/transactions активны);
 * 4) структура обеих страниц (state/dataFeed/dataInit/shortcuts/секции;
 *    таблицы без клика по строке и иконок), 4 маршрута + матринг;
 * 5) исполнение 4 адаптеров через new Function с _shared.js (как
 *    DataAdapterEngine): request transactions (10 макросов), request
 *    user-transactions (4 макроса), execute-response (labels, конверты),
 *    report-response (passthrough метаданных);
 * 6) регресс: эталонный конфиг не задет.
 */
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

// 1) Компиляция configMerge.ts (чистый модуль без импортов)
execSync(
  "npx tsc src/core/configMerge.ts --outDir tmp-merge-build-trx --module commonjs --target es2020 --lib es2020,dom --skipLibCheck",
  { stdio: "pipe" },
);
const { applyConfigDelta } = require("./tmp-merge-build-trx/configMerge.js");
fs.rmSync("tmp-merge-build-trx", { recursive: true, force: true });

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

  // 2) navbar: дельта-ключ navbar патча → «Транзакции» в конец списка
  //    (аппарат mergeArray аппендит в конец массива — секция «CRM-управление»
  //    поэтому стоит В НАЧАЛЕ эталонного navbar: в хвосте заголовок после
  //    фильтра фич приклеился бы к аппенденным пунктам);
  //    эталонный navbar: «Модерация чеков» вынесена в отдельную секцию
  //    «CRM-управление» первой, гейт — НОВЫЙ флаг moderation (camps.json;
  //    раньше пункт стоял сразу после «Участники» с гейтом receipts — на
  //    кампаниях с выключенными чеками терялась вся секция модерации)
  check("reference navbar untouched", !reference.navbar.items.some((i) => i.label === "Транзакции"));
  const crmHeaderIndex = reference.navbar.items.findIndex((i) => i.header === "CRM-управление");
  check("reference navbar: секция CRM-управление первая (append-безопасно)", crmHeaderIndex === 0);
  const refModerationIndex = reference.navbar.items.findIndex((i) => i.label === "Модерация чеков");
  check("reference navbar: Модерация чеков под CRM-управление, гейт moderation", refModerationIndex === 1 && reference.navbar.items[refModerationIndex].feature === "moderation" && reference.navbar.items[refModerationIndex].route === "/mgmt/receipts");
  check("navbar: Транзакции appended", avito.navbar.items.some((i) => i.label === "Транзакции"));
  const trxItem = avito.navbar.items.find((i) => i.label === "Транзакции");
  check("navbar: item props", trxItem !== undefined && trxItem.icon === "pi pi-money-bill" && trxItem.route === "/ops/transactions");
  check("navbar: appended at the end", avito.navbar.items[avito.navbar.items.length - 1].label === "Транзакции");
  check("navbar: base items intact (+1 appended)", avito.navbar.items.length === reference.navbar.items.length + 1);
  check("navbar: Промо-инстанс header preserved", avito.navbar.items.some((i) => i.header === "Промо-инстанс"));
  check("navbar: Статистика before Транзакции", avito.navbar.items.findIndex((i) => i.label === "Статистика") < avito.navbar.items.findIndex((i) => i.label === "Транзакции"));

  // Реплика filterNavItems (src/utils/campFeatures.ts): пункт скрывается по
  // фича-гейту, header схлопывается, если под ним не уцелело ни одного пункта
  function isFeatureOn(features, feature) {
    if (!features || typeof features !== "object") return true;
    if (!Object.prototype.hasOwnProperty.call(features, feature)) return true;
    return Boolean(features[feature]);
  }
  function gatePasses(features, gate) {
    if (gate === undefined || gate === null) return true;
    if (Array.isArray(gate)) {
      return gate.length === 0 || gate.some((f) => isFeatureOn(features, f));
    }
    return typeof gate === "string" ? isFeatureOn(features, gate) : true;
  }
  function filterNavReplica(items, features) {
    const result = [];
    let pendingHeader = null;
    for (const item of items) {
      if (typeof item.header === "string") {
        pendingHeader = item;
        continue;
      }
      if (!gatePasses(features, item.feature)) continue;
      if (pendingHeader) {
        result.push(pendingHeader);
        pendingHeader = null;
      }
      result.push(item);
    }
    return result;
  }
  const campsRegistry = JSON.parse(fs.readFileSync("config/system/camps.json", "utf8"));
  const avitoCamp = campsRegistry.find((c) => c.id === 31);
  const refCamp = campsRegistry.find((c) => c.id === 21);
  check("camps: флаг moderation — true у эталонных (1/21/22), false у avito", campsRegistry.filter((c) => c.features && c.features.moderation === true).length === 3 && avitoCamp.features.moderation === false);
  const avitoNav = filterNavReplica(avito.navbar.items, avitoCamp.features);
  check("navbar filter: на avito секция CRM-управление скрыта целиком, Транзакции последний", !avitoNav.some((i) => i.header === "CRM-управление") && !avitoNav.some((i) => i.label === "Модерация чеков") && avitoNav[avitoNav.length - 1].label === "Транзакции");
  const refNav = filterNavReplica(reference.navbar.items, refCamp.features);
  check("navbar filter: у эталонной кампании секция CRM-управление на месте (первая)", refNav[0].header === "CRM-управление" && refNav[1].label === "Модерация чеков" && refNav[2].header === "Промо-инстанс");
  check("navbar filter: заголовок без уцелевших пунктов отбрасывается", filterNavReplica([{ header: "X" }, { label: "A", feature: "off" }], { off: false }).length === 0);

  // 3) меню карточки: дельта user-card.json подменяет props.model на camp-копию
  const avitoCard = avito.pages.find((p) => p.id === "user");
  const refCard = reference.pages.find((p) => p.id === "user");
  const cardMenuProps = avitoCard.sections
    .find((s) => s.id === "menuSection")
    .blocks.find((b) => b.id === "menuBlock").components
    .find((c) => c.id === "menubar").props;
  check("card: activeItemId stays profile", cardMenuProps.activeItemId === "profile");
  const cardModel = cardMenuProps.model;
  check("card menu: model is array (sibling-$ref merge)", Array.isArray(cardModel));
  check("card menu: achievements contains Транзакции", cardModel.find((g) => g.id === "achievements").items.some((i) => i.id === "transactions"));
  const cardTrx = cardModel.find((g) => g.id === "achievements").items.find((i) => i.id === "transactions");
  check("card menu: item props", cardTrx !== undefined && cardTrx.label === "Транзакции" && cardTrx.icon === "pi pi-money-bill" && cardTrx.route === "/ops/users/{@state.userData.id}/transactions");
  check("card menu: no group duplication", cardModel.length === 6 && cardModel.filter((g) => g.id === "achievements").length === 1);
  check("card menu: sibling route intact", cardModel.find((g) => g.id === "achievements").items.find((i) => i.id === "points").route === "/ops/users/{@state.userData.id}/points/history");
  check("card menu: reference untouched", !refCard.sections.find((s) => s.id === "menuSection").blocks.find((b) => b.id === "menuBlock").components.find((c) => c.id === "menubar").props.model.some((g) => g.id === "achievements" && (g.items || []).some((i) => i.id === "transactions")));

  // 4) Страница «Транзакции» (список кампании)
  const trxPage = avito.pages.find((p) => p.id === "transactions");
  check("transactions page added", trxPage !== undefined && trxPage.route === "/ops/transactions");
  check("reference has no transactions page", reference.pages.find((p) => p.id === "transactions") === undefined);
  check("trx state defaults", trxPage.state.transactions.value.length === 0 && trxPage.state.transactions.totalRecords === 0 && trxPage.state.transactions.rows === 10 && trxPage.state.transactions.first === 0);
  check("trx query defaults (sortOrder -1 = отчётный DESC)", trxPage.state.transactionsQuery.sortField === "" && trxPage.state.transactionsQuery.sortOrder === -1 && trxPage.state.transactionsQuery.search === "");
  check("trx report container", Array.isArray(trxPage.state.report.columns) && trxPage.state.report.columns.length === 0 && Array.isArray(trxPage.state.report.filters) && trxPage.state.report.filters.length === 0);
  const trxMeta = trxPage.dataFeed.find((f) => f.url === "/api/ops/transactions");
  check("trx metadata feed GET → state.report", trxMeta !== undefined && trxMeta.method === "GET" && trxMeta.target === "state.report");
  const trxFeed = trxPage.dataFeed.find((f) => f.url === "/api/ops/transactions/execute");
  check("trx execute feed POST → state.transactions (URL params)", trxFeed !== undefined && trxFeed.method === "POST" && trxFeed.target === "state.transactions" && trxFeed.data.first === "{$location.params.first}" && trxFeed.data.filters === "{$location.params.filters}");
  const trxShort = trxPage.shortcuts.requestTransactions.params.commands;
  const trxSend = trxShort.find((c) => c.type === "sendRequest").params;
  check("trx shortcut sendRequest data", trxSend.data.first === "{$state.transactions.first}" && trxSend.data.search === "{$state.transactionsQuery.search}" && Array.isArray(trxSend.data.filters) === false);
  check("trx shortcut format resolved (no $ref)", !JSON.stringify(trxSend.format).includes("$ref"));
  const trxMerge = trxShort.find((c) => c.type === "mergeUrlParams").params.values;
  check("trx shortcut mergeUrlParams", trxMerge.first === "{$state.transactions.first}" && trxMerge.search === "{$state.transactionsQuery.search}" && trxMerge.filters === "{$state.report.filters}");
  check("trx dataInit: filters merged from URL", trxPage.dataInit.some((d) => d.target === "state.report.filters" && d.parse === "json" && d.priority === "feed" && d.method === "merge"));
  check("trx header: title + refresh + save/load state", trxPage.sections.find((s) => s.id === "transactionsHeader") !== undefined && trxPage.sections.some((s) => s.blocks.some((b) => b.components.some((c) => c.id === "transactionsSaveStateButton"))) && trxPage.sections.some((s) => s.blocks.some((b) => b.components.some((c) => c.id === "transactionsLoadStateButton"))));
  const trxFiltersSection = trxPage.sections.find((s) => s.id === "transactionsFilters");
  const trxSearchComp = trxFiltersSection.blocks.find((b) => b.id === "transactionsSearchBlock").components;
  check("trx filters: search + toggle + bar + panel", trxSearchComp.some((c) => c.componentType === "InputTextWithThrottle") && trxSearchComp.some((c) => c.id === "transactionsToggleFilters") && trxFiltersSection.blocks.some((b) => b.components.some((c) => c.componentType === "ActiveFiltersBar")) && trxFiltersSection.blocks.some((b) => b.components.some((c) => c.componentType === "FiltersPanel")));
  check("trx search wired to shortcut", trxSearchComp.find((c) => c.componentType === "InputTextWithThrottle").events[0].commands.some((cmd) => cmd === "requestTransactions"));
  const trxTable = trxPage.sections.find((s) => s.id === "transactionsTableSection").blocks[0].components[0];
  check("trx table: lazy paginator + metadata columns", trxTable.componentType === "DataTable" && trxTable.props.lazy === true && trxTable.props.paginator === true && trxTable.props.columns === "@state.report.columns" && trxTable.props.value === "@state.transactions.value");
  check("trx table: no row click / no selection / no custom columns", trxTable.props.selectionMode === undefined && trxTable.props.customColumns === undefined && !trxTable.events.some((e) => e.type === "onRowClick"));
  check("trx table: onPage/onSort wired", trxTable.events.some((e) => e.type === "onPage" && e.commands[0] === "requestTransactions") && trxTable.events.some((e) => e.type === "onSort" && e.commands[2] === "requestTransactions"));

  // 5) Страница «Транзакции участника»
  const utrPage = avito.pages.find((p) => p.id === "user-transactions");
  check("user-transactions page added", utrPage !== undefined && utrPage.route === "/ops/users/[user_id]/transactions");
  check("utr state defaults", utrPage.state.userTransactions.rows === 10 && utrPage.state.userTransactions.first === 0 && utrPage.state.userTransactionsQuery.sortOrder === -1);
  const utrUserData = utrPage.dataFeed.find((f) => f.target === "state.userData");
  check("utr: card data feed for breadcrumb", utrUserData !== undefined && utrUserData.url === "/api/ops/users/{$location.routeParams.user_id}");
  const utrMeta = utrPage.dataFeed.find((f) => f.url === "/api/ops/user-transactions");
  check("utr metadata feed GET → state.report", utrMeta !== undefined && utrMeta.method === "GET" && utrMeta.target === "state.report");
  const utrFeed = utrPage.dataFeed.find((f) => f.url === "/api/ops/user-transactions/execute");
  check("utr execute feed POST with route user_id", utrFeed !== undefined && utrFeed.method === "POST" && utrFeed.target === "state.userTransactions" && utrFeed.data.user_id === "{$location.routeParams.user_id}");
  const utrShort = utrPage.shortcuts.requestUserTransactions.params.commands;
  const utrSend = utrShort.find((c) => c.type === "sendRequest").params;
  check("utr shortcut sendRequest user_id from route", utrSend.data.user_id === "{$location.routeParams.user_id}" && utrSend.data.first === "{$state.userTransactions.first}");
  const utrMerge = utrShort.find((c) => c.type === "mergeUrlParams").params.values;
  check("utr shortcut: user_id NOT written to URL (он в роуте)", utrMerge.user_id === undefined && utrMerge.search === "{$state.userTransactionsQuery.search}");
  const utrMenu = utrPage.sections.find((s) => s.id === "menuSection").blocks[0].components[0].props;
  check("utr menu: camp model + achievements/transactions active", utrMenu.activeItemId === "achievements" && utrMenu.activeSubitemId === "transactions" && Array.isArray(utrMenu.model) && utrMenu.model.find((g) => g.id === "achievements").items.some((i) => i.id === "transactions"));
  const utrCrumb = utrPage.sections.find((s) => s.id === "breadcrumbSection").blocks[0].components[0].props.model;
  check("utr breadcrumb: Участники → имя → Транзакции", utrCrumb.length === 3 && utrCrumb[0].label === "Участники" && utrCrumb[1].label === "@state.userData.full_name" && utrCrumb[2].label === "Транзакции");
  const utrSearchComp = utrPage.sections.find((s) => s.id === "transactionsSearchSection").blocks[0].components;
  check("utr: search without FiltersPanel (у запроса нет фильтров)", utrSearchComp.some((c) => c.componentType === "InputTextWithThrottle") && !utrPage.sections.some((s) => s.blocks.some((b) => b.components.some((c) => c.componentType === "FiltersPanel"))));
  const utrTable = utrPage.sections.find((s) => s.id === "transactionsTableSection").blocks[0].components[0];
  check("utr table: lazy + no click/selection/icons", utrTable.props.lazy === true && utrTable.props.columns === "@state.report.columns" && utrTable.props.value === "@state.userTransactions.value" && utrTable.props.selectionMode === undefined && utrTable.props.customColumns === undefined && !utrTable.events.some((e) => e.type === "onRowClick"));

  // 6) Маршруты и матринг
  const routeGetTrx = avito.apiRoutes.find((r) => r.path === "ops/transactions");
  const routePostTrx = avito.apiRoutes.find((r) => r.path === "ops/transactions/execute");
  const routeGetUtr = avito.apiRoutes.find((r) => r.path === "ops/user-transactions");
  const routePostUtr = avito.apiRoutes.find((r) => r.path === "ops/user-transactions/execute");
  check("routes: 4 new routes present", routeGetTrx !== undefined && routePostTrx !== undefined && routeGetUtr !== undefined && routePostUtr !== undefined);
  check("route GET transactions: url + metadata adapter", routeGetTrx.url === "/api/v1/crm/stats/query/transactions" && routeGetTrx.adapter.response === "stats.transactions.report.response" && routeGetTrx.query === undefined);
  check("route POST transactions/execute: query:true + adapters", routePostTrx.url === "/api/v1/crm/stats/query/transactions/execute" && routePostTrx.query === true && routePostTrx.adapter.request === "stats.transactions.execute.request" && routePostTrx.adapter.response === "stats.transactions.execute.response");
  check("route GET user-transactions: own metadata adapter", routeGetUtr.url === "/api/v1/crm/stats/query/user-transactions" && routeGetUtr.adapter.response === "stats.user-transactions.report.response");
  check("route POST user-transactions/execute: adapters", routePostUtr.url === "/api/v1/crm/stats/query/user-transactions/execute" && routePostUtr.query === true && routePostUtr.adapter.request === "stats.user-transactions.execute.request" && routePostUtr.adapter.response === "stats.transactions.execute.response");
  check("reference routes untouched", reference.apiRoutes.find((r) => /transactions/.test(r.path)) === undefined);
  // Матринг: первый совпавший маршрут для каждого пути — наш
  const firstMatch = (requestPath, method) =>
    avito.apiRoutes.find((r) => matches(r.path, requestPath, r.method, method));
  check("matching: ops/transactions GET → metadata route", firstMatch("ops/transactions", "GET") === routeGetTrx);
  check("matching: ops/transactions/execute POST → execute route", firstMatch("ops/transactions/execute", "POST") === routePostTrx);
  check("matching: ops/user-transactions GET", firstMatch("ops/user-transactions", "GET") === routeGetUtr);
  check("matching: ops/user-transactions/execute POST", firstMatch("ops/user-transactions/execute", "POST") === routePostUtr);
  check("matching: generic users query route intact", firstMatch("ops/users-v2/query/users", "GET").path === "ops/users-v2/query/[query_id]");
  check("matching: ops/transactions not shadowed by users pattern", firstMatch("ops/transactions", "GET").path !== "ops/users-v2/query/[query_id]");
  check("matching: ops/tasks (эталонный маршрут) не перекрыт", firstMatch("ops/tasks", "GET").path === "ops/tasks");

  // 7) Реестр адаптеров
  const TRX_ADAPTERS = ["stats.transactions.execute.request", "stats.transactions.execute.response", "stats.transactions.report.response", "stats.user-transactions.execute.request", "stats.user-transactions.report.response"];
  check("adapters: 5 new keys with .avito.js scripts", TRX_ADAPTERS.every((k) => avito.adapters[k] && avito.adapters[k].script.endsWith(".avito.js")));
  check("adapters: reference registry untouched", !TRX_ADAPTERS.some((k) => reference.adapters[k]));
  check("adapters: previous avito keys intact", avito.adapters["stats.users.tasks.execute.request"] !== undefined && avito.adapters["stats.users.rating.execute.request"] !== undefined && avito.adapters["dictionaries.response.avito"] !== undefined);

  // 8) Исполнение адаптеров (как DataAdapterEngine: _shared.js + скрипт)
  const trxReqPath = "config/adapters/stats.transactions.execute.request.avito.js";
  const utrReqPath = "config/adapters/stats.user-transactions.execute.request.avito.js";
  const trxResPath = "config/adapters/stats.transactions.execute.response.avito.js";
  const trxMetaPath = "config/adapters/stats.transactions.report.response.avito.js";

  // request transactions: пустой запрос — все 10 макросов присутствуют (422 без них)
  const trxEmpty = runAdapter(trxReqPath, {});
  const MACROS = ["TYPE_FILTER", "STATUS_FILTER", "DATE_FROM_FILTER", "DATE_TO_FILTER", "POINTS_FILTER", "LEAGUE_FILTER", "SEGMENT_FILTER", "SEARCH_FILTER", "ORDER_BY", "ORDER_DIR"];
  check("trx request: page/limit defaults", trxEmpty.page === 1 && trxEmpty.limit === 10);
  check("trx request: all 10 macro keys always present", MACROS.every((k) => k in trxEmpty.replacements) && Object.keys(trxEmpty.replacements).length === 10);
  check("trx request: defaults ORDER_BY processed_at DESC", trxEmpty.replacements.ORDER_BY === "tl.processed_at" && trxEmpty.replacements.ORDER_DIR === "DESC");
  check("trx request: unused macros are empty strings", MACROS.slice(0, 8).every((k) => trxEmpty.replacements[k] === ""));

  // request transactions: event overrides + cap
  const trxEvent = runAdapter(trxReqPath, { event: { first: 50, rows: 50, sortField: "points", sortOrder: 1 } });
  check("trx request: event pagination + sort", trxEvent.page === 2 && trxEvent.limit === 50 && trxEvent.replacements.ORDER_BY === "tl.points" && trxEvent.replacements.ORDER_DIR === "ASC");
  const trxCap = runAdapter(trxReqPath, { rows: 500, first: 0 });
  check("trx request: limit capped at 100", trxCap.limit === 100);

  // request transactions: options «ничего или всё → пусто», частичный выбор → IN
  const optPartial = runAdapter(trxReqPath, { filters: [{ id: "type_code", value: [true, false] }] });
  check("trx request: type_code partial → IN", optPartial.replacements.TYPE_FILTER === "AND tl.type_code IN ('TASK')");
  check("trx request: type_code none → empty", runAdapter(trxReqPath, { filters: [{ id: "type_code", value: [false, false] }] }).replacements.TYPE_FILTER === "");
  check("trx request: type_code all → empty (правило спеки)", runAdapter(trxReqPath, { filters: [{ id: "type_code", value: [true, true] }] }).replacements.TYPE_FILTER === "");
  const leaguePartial = runAdapter(trxReqPath, { filters: [{ id: "league_code", value: [false, false, true, false, false, false, false, false, false] }] });
  check("trx request: league partial → IN ('Cargo_ML_big')", leaguePartial.replacements.LEAGUE_FILTER === "AND tl.league_code IN ('Cargo_ML_big')");
  check("trx request: segment all → empty", runAdapter(trxReqPath, { filters: [{ id: "segment", value: [true, true, true] }] }).replacements.SEGMENT_FILTER === "");
  check("trx request: unknown filter id ignored", runAdapter(trxReqPath, { filters: [{ id: "hacker", value: ["'"] }] }).replacements.SEARCH_FILTER === "");

  // request transactions: период МСК→UTC через CONVERT_TZ; range баллов.
  // Основной контракт FiltersPanel — date-only строки 'YYYY-MM-DD' (wall-дата
  // вне поясов): from → начало дня, to → конец дня (все сутки конечного дня)
  const periodDays = runAdapter(trxReqPath, { filters: [{ id: "processed_date", value: ["2026-11-16", "2026-11-16"] }] });
  check("trx request: DATE_FROM date-only → начало дня МСК", periodDays.replacements.DATE_FROM_FILTER === "AND tl.processed_at >= CONVERT_TZ('2026-11-16 00:00:00', '+03:00', '+00:00')");
  check("trx request: DATE_TO date-only → конец дня МСК", periodDays.replacements.DATE_TO_FILTER === "AND tl.processed_at <= CONVERT_TZ('2026-11-16 23:59:59', '+03:00', '+00:00')");
  // ISO-полночь пояса (старые сохранённые URL, серверный предвыбор) — to снапится на конец дня
  const periodIso = runAdapter(trxReqPath, { filters: [{ id: "processed_date", value: ["2026-11-15T21:00:00Z", "2026-11-15T21:00:00Z"] }] });
  check("trx request: DATE_FROM ISO-полночь МСК → начало дня", periodIso.replacements.DATE_FROM_FILTER === "AND tl.processed_at >= CONVERT_TZ('2026-11-16 00:00:00', '+03:00', '+00:00')");
  check("trx request: DATE_TO ISO-полночь МСК → конец дня", periodIso.replacements.DATE_TO_FILTER === "AND tl.processed_at <= CONVERT_TZ('2026-11-16 23:59:59', '+03:00', '+00:00')");
  // Явное время (showTime / сервер) — границы как есть
  const period = runAdapter(trxReqPath, { filters: [{ id: "processed_date", value: ["2026-11-01T00:00:00Z", "2026-11-10T23:59:59Z"] }] });
  check("trx request: DATE_FROM CONVERT_TZ MSK wall", period.replacements.DATE_FROM_FILTER === "AND tl.processed_at >= CONVERT_TZ('2026-11-01 03:00:00', '+03:00', '+00:00')");
  check("trx request: DATE_TO CONVERT_TZ MSK wall", period.replacements.DATE_TO_FILTER === "AND tl.processed_at <= CONVERT_TZ('2026-11-11 02:59:59', '+03:00', '+00:00')");
  // Одна граница: date-only from, to не задан
  const periodFromOnly = runAdapter(trxReqPath, { filters: [{ id: "processed_date", value: ["2026-11-01", null] }] });
  check("trx request: DATE_FROM только from (date-only), DATE_TO пуст", periodFromOnly.replacements.DATE_FROM_FILTER === "AND tl.processed_at >= CONVERT_TZ('2026-11-01 00:00:00', '+03:00', '+00:00')" && periodFromOnly.replacements.DATE_TO_FILTER === "");
  const range = runAdapter(trxReqPath, { filters: [{ id: "points", value: [10, null] }] });
  check("trx request: points range lower bound", range.replacements.POINTS_FILTER === "AND tl.points >= 10");
  const rangeBoth = runAdapter(trxReqPath, { filters: [{ id: "points", value: [10, 500] }] });
  check("trx request: points range both bounds", rangeBoth.replacements.POINTS_FILTER === "AND tl.points >= 10 AND tl.points <= 500");
  check("trx request: points range empty → empty", runAdapter(trxReqPath, { filters: [{ id: "points", value: [] }] }).replacements.POINTS_FILTER === "");

  // request transactions: поиск — 11 полей, экранирование % _ '
  const trxSearch = runAdapter(trxReqPath, { search: "O'Brien%_x" });
  check("trx request: search quote doubling", trxSearch.replacements.SEARCH_FILTER.includes("O''Brien"));
  check("trx request: search % and _ escaped", trxSearch.replacements.SEARCH_FILTER.includes("Brien\\%\\_x"));
  check("trx request: search 11 OR-подобий", (trxSearch.replacements.SEARCH_FILTER.match(/LIKE/g) || []).length === 11);
  check("trx request: search wrapped in OR-group", trxSearch.replacements.SEARCH_FILTER.startsWith("AND (") && trxSearch.replacements.SEARCH_FILTER.endsWith(")"));
  check("trx request: search UUID partial match allowed", trxSearch.replacements.SEARCH_FILTER.includes("BIN_TO_UUID(bu.user_id) LIKE"));

  // request transactions: карта сортировки — алиасы и не-сортируемые
  check("trx request: category_name alias", runAdapter(trxReqPath, { sortField: "category_name", sortOrder: 1 }).replacements.ORDER_BY === "category_name");
  check("trx request: league_name alias DESC", runAdapter(trxReqPath, { sortField: "league_name", sortOrder: -1 }).replacements.ORDER_BY === "league_name");
  check("trx request: full_name not sortable → default", runAdapter(trxReqPath, { sortField: "full_name", sortOrder: 1 }).replacements.ORDER_BY === "tl.processed_at" && runAdapter(trxReqPath, { sortField: "full_name", sortOrder: 1 }).replacements.ORDER_DIR === "DESC");
  check("trx request: unknown alias → default", runAdapter(trxReqPath, { sortField: "DROP TABLE", sortOrder: 1 }).replacements.ORDER_BY === "tl.processed_at");

  // request user-transactions: 4 макроса, USER_ID из роута, свой поиск
  const utrEmpty = runAdapter(utrReqPath, {});
  const UMACROS = ["USER_ID", "SEARCH_FILTER", "ORDER_BY", "ORDER_DIR"];
  check("utr request: page/limit defaults", utrEmpty.page === 1 && utrEmpty.limit === 10);
  check("utr request: all 4 macro keys always present", UMACROS.every((k) => k in utrEmpty.replacements) && Object.keys(utrEmpty.replacements).length === 4);
  check("utr request: defaults ORDER_BY processed_at DESC", utrEmpty.replacements.ORDER_BY === "tl.processed_at" && utrEmpty.replacements.ORDER_DIR === "DESC");
  const utrUser = runAdapter(utrReqPath, { user_id: "abc'def" });
  check("utr request: USER_ID quoted + apostrophes doubled", utrUser.replacements.USER_ID === "'abc''def'");
  check("utr request: missing user_id → empty key", utrEmpty.replacements.USER_ID === "");
  const utrSearch = runAdapter(utrReqPath, { user_id: "u1", search: "50%" });
  check("utr request: search % escaped", utrSearch.replacements.SEARCH_FILTER.includes("50\\%"));
  check("utr request: search 7 полей транзакции", (utrSearch.replacements.SEARCH_FILTER.match(/LIKE/g) || []).length === 7);
  check("utr request: search не ищет поля участника", !utrSearch.replacements.SEARCH_FILTER.includes("bu.telegram_id") && !utrSearch.replacements.SEARCH_FILTER.includes("u.email"));
  check("utr request: task_title alias ASC", runAdapter(utrReqPath, { sortField: "task_title", sortOrder: 1 }).replacements.ORDER_BY === "tc.title" && runAdapter(utrReqPath, { sortField: "task_title", sortOrder: 1 }).replacements.ORDER_DIR === "ASC");
  check("utr request: error_message not sortable → default", runAdapter(utrReqPath, { sortField: "error_message", sortOrder: 1 }).replacements.ORDER_BY === "tl.processed_at");
  const utrEvent = runAdapter(utrReqPath, { event: { first: 30, rows: 30 } });
  check("utr request: event pagination", utrEvent.page === 2 && utrEvent.limit === 30);

  // execute response: контракт фида — setStateField заменяет state-цель
  // целиком, адаптер обязан вернуть {value, totalRecords, first, rows}
  const legacyRow = runAdapter(trxResPath, [
    { transaction_id: "t-1", type_code: "TASK", status: "success", type_code_label: "Начисление баллов", status_label: "Успешно", points: 100, processed_at_msk: "2026-11-01 12:00:00" },
  ]);
  check("response: legacy array → full state object", legacyRow.value.length === 1 && legacyRow.totalRecords === 1 && legacyRow.first === 0 && legacyRow.rows === 10);
  check("response: legacy labels applied", legacyRow.value[0].type_code === "Начисление баллов" && legacyRow.value[0].status === "Успешно" && legacyRow.value[0].points === 100);
  const envelopeRow = runAdapter(trxResPath, {
    status: "ok",
    data: {
      rows: [{ id: "row-1", values: { transaction_id: "t-2", type_code: "LEAGUE", status: "error", type_code_label: "Назначение лиги", status_label: "Ошибка", points: 5 } }],
      meta: { total_count: 37, first: 10, limit: 10 },
    },
  });
  check("response: future envelope → value/totalRecords/first/rows из meta", envelopeRow.value.length === 1 && envelopeRow.totalRecords === 37 && envelopeRow.first === 10 && envelopeRow.rows === 10);
  check("response: future envelope unwrapped (id + values merged)", envelopeRow.value[0].id === "row-1" && envelopeRow.value[0].transaction_id === "t-2" && envelopeRow.value[0].values === undefined);
  check("response: envelope labels applied", envelopeRow.value[0].type_code === "Назначение лиги" && envelopeRow.value[0].status === "Ошибка");
  const currentFmt = runAdapter(trxResPath, {
    items: [{ transaction_id: "t-4", type_code: "TASK", status: "success" }],
    pagination: { page: 3, limit: 25, total_items: 120 },
  });
  check("response: current {items, pagination} → value/totalRecords/first/rows", currentFmt.value.length === 1 && currentFmt.totalRecords === 120 && currentFmt.first === 50 && currentFmt.rows === 25);
  const rawRow = runAdapter(trxResPath, [{ transaction_id: "t-3", type_code: "TASK", status: "success" }]);
  check("response: no labels yet → raw values kept (деградация)", rawRow.value[0].type_code === "TASK" && rawRow.value[0].status === "success");
  const emptyResp = runAdapter(trxResPath, { foo: "bar" });
  check("response: garbage → empty state object (таблица чистая, не сломана)", Array.isArray(emptyResp.value) && emptyResp.value.length === 0 && emptyResp.totalRecords === 0 && emptyResp.rows === 10);
  check("response: null → empty state object", runAdapter(trxResPath, null).totalRecords === 0);
  check("response: non-object row passthrough", runAdapter(trxResPath, ["x"]).value[0] === "x");


  // metadata response: fallback-first — колонки/фильтры из спеки, пока сервер
  // не отдаёт свои fields/filters
  const meta = runAdapter(trxMetaPath, {
    status: "ok",
    data: {
      id: "transactions",
      title: "Транзакции чат-бота",
      fields: [
        { name: "transaction_id", title: "ID транзакции", type: "string", sortable: true },
        { name: "processed_at_msk", title: "Время (МСК)", type: "datetime", sortable: true },
        { name: "full_name", title: "ФИО", type: "string", sortable: true },
        { name: "error_message", title: "Ошибка", type: "string", sortable: false },
      ],
      filters: [{ id: "type_code", type: "options", name: "Тип", opts: ["Начисление баллов", "Назначение лиги"] }],
    },
  });
  check("metadata: id/title passthrough", meta.id === "transactions" && meta.title === "Транзакции чат-бота");
  check("metadata: server fields → columns", meta.columns.length === 4 && meta.columns[0].field === "transaction_id" && meta.columns[0].header === "ID транзакции");
  check("metadata: datetime → dataType date", meta.columns[1].dataType === "date");
  check("metadata: sortable по whitelist (full_name не сортируется, серверный sortable:true перекрыт)", meta.columns[2].sortable === false);
  check("metadata: серверный sortable:false уважается", meta.columns[3].sortable === false);
  check("metadata: серверные filters перекрывают фолбэк", meta.filters.length === 1 && meta.filters[0].id === "type_code");
  const metaFallback = runAdapter(trxMetaPath, null);
  check("metadata: ошибка GET → фолбэк колонок §3 (18, заголовки спеки)", metaFallback.columns.length === 18 && metaFallback.columns[0].header === "ID транзакции" && metaFallback.columns[1].header === "Дата обработки (МСК)" && metaFallback.columns[17].header === "Причина ошибки");
  check("metadata: фолбэк dataType date для datetime", metaFallback.columns[1].dataType === "date");
  check("metadata: фолбэк sortable по whitelist (16 из 18)", metaFallback.columns.filter((c) => c.sortable).length === 16 && metaFallback.columns.find((c) => c.field === "full_name").sortable === false && metaFallback.columns.find((c) => c.field === "error_message").sortable === false);
  check("metadata: фолбэк фильтров §5.1 (6 штук с лейблами)", metaFallback.filters.length === 6 && metaFallback.filters[0].id === "type_code" && metaFallback.filters[0].opts[0] === "Начисление баллов" && metaFallback.filters.find((f) => f.id === "points").type === "range" && metaFallback.filters.find((f) => f.id === "points").opts === null && metaFallback.filters.find((f) => f.id === "league_code").opts.length === 9);
  check("metadata: порядок фолбэк-opts лиг = порядок dbValues request-адаптера", JSON.stringify(metaFallback.filters.find((f) => f.id === "league_code").opts) === JSON.stringify(["Cargo_S", "Cargo_ML", "Cargo_ML_big", "Evacuation_S", "Evacuation_ML", "Evacuation_ML_big", "Passenger_S", "Passenger_ML", "Passenger_ML_big"]));
  check("metadata: error envelope → fallback (не объект ошибки в state)", runAdapter(trxMetaPath, { status: "error", message: "query not found" }).columns.length === 18);
  check("metadata: пустой объект → фолбэк (страница рабочая без метаданных)", runAdapter(trxMetaPath, {}).columns.length === 18 && runAdapter(trxMetaPath, {}).filters.length === 6);


  // metadata участника: свой адаптер с фолбэком §3 (11 колонок), без фильтров
  const utrMetaPath = "config/adapters/stats.user-transactions.report.response.avito.js";
  const utrMetaFallback = runAdapter(utrMetaPath, null);
  check("utr metadata: ошибка GET → фолбэк 11 колонок §3", utrMetaFallback.columns.length === 11 && utrMetaFallback.columns[0].header === "ID транзакции" && utrMetaFallback.columns[1].header === "Дата обработки (МСК)");
  check("utr metadata: фолбэк sortable по whitelist (10 из 11)", utrMetaFallback.columns.filter((c) => c.sortable).length === 10 && utrMetaFallback.columns.find((c) => c.field === "error_message").sortable === false);
  check("utr metadata: фильтров нет (у запроса 4 макроса)", Array.isArray(utrMetaFallback.filters) && utrMetaFallback.filters.length === 0);
  const utrMetaServer = runAdapter(utrMetaPath, { status: "ok", data: { id: "user-transactions", title: "Транзакции участника", fields: [{ name: "league_name", title: "Лига", type: "string", sortable: true }] } });
  check("utr metadata: серверные fields перекрывают фолбэк", utrMetaServer.columns.length === 1 && utrMetaServer.columns[0].field === "league_name" && utrMetaServer.title === "Транзакции участника");

  // кросс-проверка: каждый sortable-алиас whitelist обрабатывается ORDER_MAP
  // request-адаптера (не уходит в дефолт processed_at_msk), не-сортируемые —
  // уходят в дефолт
  const whitelistTrx = metaFallback.columns.filter((c) => c.sortable).map((c) => c.field);
  check("whitelist↔ORDER_MAP: все sortable-алиасы списка дают не-дефолт", whitelistTrx.every((alias) => alias === "processed_at_msk" || runAdapter(trxReqPath, { sortField: alias, sortOrder: 1 }).replacements.ORDER_BY !== "tl.processed_at"));
  check("whitelist↔ORDER_MAP: full_name/error_message → дефолт", runAdapter(trxReqPath, { sortField: "full_name" }).replacements.ORDER_BY === "tl.processed_at" && runAdapter(trxReqPath, { sortField: "error_message" }).replacements.ORDER_BY === "tl.processed_at");
  const whitelistUtr = utrMetaFallback.columns.filter((c) => c.sortable).map((c) => c.field);
  check("whitelist↔ORDER_MAP (участник): все sortable-алиасы не-дефолт", whitelistUtr.every((alias) => alias === "processed_at_msk" || runAdapter(utrReqPath, { sortField: alias, sortOrder: 1 }).replacements.ORDER_BY !== "tl.processed_at"));
  check("whitelist↔ORDER_MAP (участник): error_message → дефолт", runAdapter(utrReqPath, { sortField: "error_message" }).replacements.ORDER_BY === "tl.processed_at");

  // Итог
  console.log(`\n${pass} passed, ${fail} failed`);
  if (fail > 0) process.exitCode = 1;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
