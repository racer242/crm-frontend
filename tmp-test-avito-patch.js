/**
 * Стенд: дельта кампании avito_to_the_top (config/camps/avito_to_the_top/patch.json).
 *
 * 1) Эталон собирается через $RefParser (как initApp), реестр кампаний
 *    реплицирует buildCampConfigs (ключ — code, патч из camps.json);
 * 2) структурные проверки наложенной дельты (адаптеры, фиды, шорткат,
 *    dropdown-ы, customColumns; другие кампании/страницы не задеты);
 * 3) исполнение авито-адаптеров через new Function с _shared.js (как
 *    DataAdapterEngine): 11 макросов, поиск по bu.*, IN-фрагменты, сортировка;
 * 4) регресс эталонного request-адаптера.
 */
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

// 1) Компиляция configMerge.ts (чистый модуль без импортов)
execSync(
  "npx tsc src/core/configMerge.ts --outDir tmp-merge-build-avito --module commonjs --target es2020 --lib es2020,dom --skipLibCheck",
  { stdio: "pipe" },
);
const { applyConfigDelta } = require("./tmp-merge-build-avito/configMerge.js");
fs.rmSync("tmp-merge-build-avito", { recursive: true, force: true });

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

// В собранном конфиге не должно остаться литералов $ref (напр. format из патча)
function hasRefKey(value) {
  if (Array.isArray(value)) return value.some(hasRefKey);
  if (value && typeof value === "object") {
    return Object.entries(value).some(([k, v]) => k === "$ref" || hasRefKey(v));
  }
  return false;
}

async function main() {
  // 2) Эталон + реестр кампаний (репликация buildCampConfigs)
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
    // $refs внутри патча резолвятся относительно файла патча (паритет с движком:
    // resolveConfigDelta → $RefParser.dereference), иначе "$ref"-литералы
    // остались бы в дельте и заменили разрешённые значения эталона (format!)
    const patchParser = new $RefParser();
    const delta = await patchParser.dereference(patchPath);
    const campConfig = structuredClone(reference);
    applyConfigDelta(campConfig, delta);
    registry.set(key, campConfig);
  }

  const avito = registry.get("avito_to_the_top");
  const dev = registry.get("1");
  check("registry has 4 campaigns", registry.size === 4);
  check("camp 1 (no patch) shares the reference object", dev === reference);
  check("avito config is a patched clone", avito !== undefined && avito !== reference);
  check("avito camp code present in composed config", (avito.camps || []).some((c) => c.code === "avito_to_the_top"));

  // 3) Адаптеры переключены патчем
  check("execute.request script swapped", avito.adapters["stats.users.execute.request"].script === "./config/adapters/stats.users.execute.request.avito.js");
  check("execute.request type kept", avito.adapters["stats.users.execute.request"].type === "js");
  check("report.response script swapped", avito.adapters["stats.users.report.response"].script === "./config/adapters/stats.users.report.response.avito.js");
  check("reference adapters untouched", reference.adapters["stats.users.execute.request"].script.indexOf("avito") === -1);

  // 4) Страница users: структура патча
  const avitoUsers = avito.pages.find((p) => p.id === "users");
  const refUsers = reference.pages.find((p) => p.id === "users");
  const avitoTable = avitoUsers.sections
    .find((s) => s.id === "usersTableSection")
    .blocks.find((b) => b.id === "usersTableBlock")
    .components.find((c) => c.id === "usersTable");
  const refTable = refUsers.sections
    .find((s) => s.id === "usersTableSection")
    .blocks.find((b) => b.id === "usersTableBlock")
    .components.find((c) => c.id === "usersTable");
  check("mailing customColumn removed", avitoTable.props.customColumns.length === 1 && avitoTable.props.customColumns[0].field === "user");
  check("reference customColumns untouched (mailing + user)", refTable.props.customColumns.length === 2 && refTable.props.customColumns.some((cc) => cc.field === "mailing"));

  check("dataFeed: 2 dictionary feeds appended", avitoUsers.dataFeed.length === 4);
  check("dataFeed: dict_categories target", avitoUsers.dataFeed.some((f) => f.url === "/api/ops/dictionaries/dict_categories" && f.target === "state.avitoCategories"));
  check("dataFeed: dict_leagues target", avitoUsers.dataFeed.some((f) => f.url === "/api/ops/dictionaries/dict_leagues" && f.target === "state.avitoLeagues"));
  const avitoExecute = avitoUsers.dataFeed.find((f) => f.url.indexOf("/execute") !== -1);
  check("dataFeed: execute category/league added", avitoExecute.data.category === "{$location.params.category}" && avitoExecute.data.league === "{$location.params.league}");
  check("dataFeed: execute base params kept", avitoExecute.data.first === "{$location.params.first}" && avitoExecute.data.search === "{$location.params.search}");
  check("dataFeed: metadata feed untouched", avitoUsers.dataFeed[0].url === "/api/ops/users-v2/query/users" && avitoUsers.dataFeed[0].target === "state.report");

  check("dataInit: 6 entries (reference replaced + category/league)", avitoUsers.dataInit.length === 6);
  check("dataInit: category/league present", avitoUsers.dataInit.some((d) => d.target === "state.usersQuery.category") && avitoUsers.dataInit.some((d) => d.target === "state.usersQuery.league"));
  check("dataInit: reference rules kept", avitoUsers.dataInit.some((d) => d.target === "state.usersQuery.sortOrder" && d.parse === "json") && avitoUsers.dataInit.some((d) => d.target === "state.report.filters" && d.priority === "feed" && d.method === "merge"));

  const avitoShortcut = avitoUsers.shortcuts.requestUsers.params.commands;
  check("shortcuts: commands replaced (not appended)", avitoShortcut.length === 2);
  const avitoSend = avitoShortcut[0].params;
  check("shortcuts: sendRequest has category/league", avitoSend.data.category === "{$state.usersQuery.category}" && avitoSend.data.league === "{$state.usersQuery.league}");
  check("shortcuts: sendRequest base kept", avitoSend.data.search === "{$state.usersQuery.search}" && avitoSend.data.filters === "{$state.report.filters}" && avitoSend.method === "POST");
  const avitoMerge = avitoShortcut[1].params;
  check("shortcuts: mergeUrlParams has category/league", avitoMerge.values.category === "{$state.usersQuery.category}" && avitoMerge.values.league === "{$state.usersQuery.league}");
  check("shortcuts: mergeUrlParams format rules kept", Array.isArray(avitoMerge.format) && avitoMerge.format.length === 2);

  // format из патча ($ref) должен быть разрешён в массив правил, как в эталоне
  const refShortcut = refUsers.shortcuts.requestUsers.params.commands;
  check("shortcuts: sendRequest format $ref resolved (array of rules)", Array.isArray(avitoSend.format) && avitoSend.format.length === 5 && avitoSend.format.every((r) => typeof r.prop === "string"));
  check("shortcuts: sendRequest format equals reference-resolved rules", JSON.stringify(avitoSend.format) === JSON.stringify(refShortcut[0].params.format));
  check("no $ref leftovers in composed avito config", !hasRefKey(avito));

  const searchBlock = avitoUsers.sections
    .find((s) => s.id === "usersFilters")
    .blocks.find((b) => b.id === "usersSearchBlock");
  const compIds = searchBlock.components.map((c) => c.id);
  check("search block: dropdowns appended, base intact", compIds.indexOf("usersCategoryFilter") !== -1 && compIds.indexOf("usersLeagueFilter") !== -1 && compIds.indexOf("usersSearchInput") !== -1 && compIds.indexOf("usersToggleFilters") !== -1);
  const catDropdown = searchBlock.components.find((c) => c.id === "usersCategoryFilter");
  check("category dropdown bindings", catDropdown.props.options === "@state.avitoCategories.options" && catDropdown.props.value === "@state.usersQuery.category" && catDropdown.props.showClear === true);
  const leagueDropdown = searchBlock.components.find((c) => c.id === "usersLeagueFilter");
  check("league dropdown bindings", leagueDropdown.props.options === "@state.avitoLeagues.options" && leagueDropdown.props.value === "@state.usersQuery.league");

  // Патченый конфиг — глубокий клон эталона, поэтому сравниваем СОДЕРЖИМОЕ
  // страницы receipts (патч не должен был её задеть)
  const avitoReceipts = avito.pages.find((p) => p.id === "receipts");
  const refReceipts = reference.pages.find((p) => p.id === "receipts");
  check("other pages untouched (receipts content equal)", JSON.stringify(avitoReceipts) === JSON.stringify(refReceipts));

  // 5) Исполнение авито request-адаптера
  const avitoReq = runAdapter("config/adapters/stats.users.execute.request.avito.js", {});
  check("request: 11 macro keys always present", Object.keys(avitoReq.replacements).length === 11);
  check("request: MAILING_FILTER always empty", avitoReq.replacements.MAILING_FILTER === "");
  check("request: unused filters are empty strings", avitoReq.replacements.STATUS_FILTER === "" && avitoReq.replacements.SEARCH_FILTER === "" && avitoReq.replacements.CATEGORY_FILTER === "" && avitoReq.replacements.LEAGUE_FILTER === "");
  check("request: default sort created_at DESC", avitoReq.replacements.ORDER_BY === "created_at" && avitoReq.replacements.ORDER_DIR === "DESC");
  check("request: default pagination", avitoReq.page === 1 && avitoReq.limit === 10);

  const search = runAdapter("config/adapters/stats.users.execute.request.avito.js", { search: "иван'100%" }).replacements.SEARCH_FILTER;
  check("request: search over bu.avito_id / bu.telegram_id", search.indexOf("bu.avito_id LIKE") !== -1 && search.indexOf("bu.telegram_id LIKE") !== -1);
  check("request: search input sanitized (quote doubled, % escaped)", search.indexOf("иван'100") === -1 && search.indexOf("\\%") !== -1 && search.indexOf("''") !== -1);

  const codes = runAdapter("config/adapters/stats.users.execute.request.avito.js", { category: "sport", league: ["gold", "silver"] }).replacements;
  check("request: single category wrapped into IN", codes.CATEGORY_FILTER === "AND bu.category_code IN ('sport')");
  check("request: league array → IN list", codes.LEAGUE_FILTER === "AND bu.league_code IN ('gold', 'silver')");
  const quoted = runAdapter("config/adapters/stats.users.execute.request.avito.js", { category: "o'brien" }).replacements.CATEGORY_FILTER;
  check("request: category quote escaped in IN", quoted === "AND bu.category_code IN ('o''brien')");

  const filtered = runAdapter("config/adapters/stats.users.execute.request.avito.js", {
    filters: [
      { id: "status", value: [true, false, false] },
      { id: "balance", value: [10, 50] },
    ],
  }).replacements;
  check("request: status options → IN", filtered.STATUS_FILTER === "AND u.status IN ('active')");
  check("request: balance BETWEEN", filtered.BALANCE_FILTER === "AND u.balance BETWEEN 10 AND 50");

  const paged = runAdapter("config/adapters/stats.users.execute.request.avito.js", { first: 20, rows: 10 });
  check("request: first/rows → page", paged.page === 3 && paged.limit === 10);
  const capped = runAdapter("config/adapters/stats.users.execute.request.avito.js", { rows: 200 });
  check("request: limit capped at 100", capped.limit === 100);

  function sortCase(sortField, sortOrder) {
    const r = runAdapter("config/adapters/stats.users.execute.request.avito.js", { sortField, sortOrder }).replacements;
    return [r.ORDER_BY, r.ORDER_DIR];
  }
  check("request: sort avito_id ASC", JSON.stringify(sortCase("avito_id", 1)) === JSON.stringify(["avito_id", "ASC"]));
  check("request: sort telegram_id DESC", JSON.stringify(sortCase("telegram_id", -1)) === JSON.stringify(["telegram_id", "DESC"]));
  check("request: sort category_name accepted", JSON.stringify(sortCase("category_name", 1)) === JSON.stringify(["category_name", "ASC"]));
  check("request: sort full_name not whitelisted → default", JSON.stringify(sortCase("full_name", 1)) === JSON.stringify(["created_at", "DESC"]));
  check("request: sort injection → default", JSON.stringify(sortCase("u.email; DROP", 1)) === JSON.stringify(["created_at", "DESC"]));

  // 6) Исполнение авито response-адаптера
  const meta = {
    status: "ok",
    data: {
      id: "q1",
      title: "Users",
      fields: [
        { name: "user_id", title: "ID", sortable: true },
        { name: "full_name", title: "Имя", sortable: false },
        { name: "phone", title: "Тел", sortable: false },
        { name: "mailing", title: "Рассылка", sortable: true },
        { name: "avito_id", title: "Avito ID", sortable: true },
        { name: "telegram_id", title: "Telegram ID", sortable: true },
        { name: "category_name", title: "Категория", sortable: true },
        { name: "league_name", title: "Лига", sortable: true },
        { name: "created_at", title: "Дата", type: "date", sortable: true },
      ],
    },
  };
  const report = runAdapter("config/adapters/stats.users.report.response.avito.js", meta);
  check("response: mailing column filtered out", report.columns.length === 8 && !report.columns.some((c) => c.field === "mailing"));
  const sortableMap = {};
  report.columns.forEach((c) => (sortableMap[c.field] = c.sortable));
  check("response: avito aliases sortable", sortableMap.avito_id === true && sortableMap.telegram_id === true && sortableMap.category_name === true && sortableMap.league_name === true);
  check("response: full_name/phone not sortable (server flags)", sortableMap.full_name === false && sortableMap.phone === false);
  check("response: dynamic column mapped", sortableMap.user_id === true && report.columns.some((c) => c.field === "created_at" && c.dataType === "date"));
  check("response: fallback filters without mailing", report.filters.length === 4 && !report.filters.some((f) => f.id === "mailing"));
  const withServerFilters = runAdapter("config/adapters/stats.users.report.response.avito.js", { status: "ok", data: { fields: [], filters: [{ id: "custom" }] } });
  check("response: server filters preferred", withServerFilters.filters.length === 1 && withServerFilters.filters[0].id === "custom");

  // 7) Регресс эталонного адаптера
  const refReq = runAdapter("config/adapters/stats.users.execute.request.js", {});
  check("reference request: 9 macros, empty search", Object.keys(refReq.replacements).length === 9 && refReq.replacements.SEARCH_FILTER === "");
  const refSearch = runAdapter("config/adapters/stats.users.execute.request.js", { search: "иван" }).replacements.SEARCH_FILTER;
  check("reference request: search over u.* columns", refSearch.indexOf("u.email LIKE") !== -1 && refSearch.indexOf("bu.avito_id") === -1);
  const refMailing = runAdapter("config/adapters/stats.users.execute.request.js", { filters: [{ id: "mailing", value: "Принял" }] }).replacements.MAILING_FILTER;
  check("reference request: mailing filter still works", refMailing === "AND u.mailing = 1");

  // 8) Интеграция: реальный initApp + getConfigForCamp (cookie приходит строкой!)
  fs.writeFileSync(
    "tmp-config-tsconfig.json",
    JSON.stringify({
      extends: "./tsconfig.json",
      compilerOptions: {
        noEmit: false,
        outDir: "tmp-config-build",
        module: "commonjs",
        moduleResolution: "node",
        target: "es2020",
      },
      include: ["src/core/config.ts", "src/core/configMerge.ts"],
    }),
  );
  execSync("npx tsc -p tmp-config-tsconfig.json", { stdio: "pipe" });
  fs.rmSync("tmp-config-tsconfig.json", { force: true });
  const builtConfig = fs.existsSync("tmp-config-build/config.js")
    ? "./tmp-config-build/config.js"
    : "./tmp-config-build/core/config.js";
  const configModule = require(builtConfig);
  await configModule.initApp();
  const cfg31 = configModule.getConfigForCamp("31");
  const cfgDefault = configModule.getConfigForCamp(null);
  check("initApp: cookie string '31' → avito config", cfg31.adapters["stats.users.execute.request"].script.indexOf("avito") !== -1);
  check("initApp: number 31 → same avito config", configModule.getConfigForCamp(31) === cfg31);
  check("initApp: code slug 'avito_to_the_top' → same config", configModule.getConfigForCamp("avito_to_the_top") === cfg31);
  check("initApp: unpatched '21' shares the reference with default", configModule.getConfigForCamp("21") === cfgDefault && configModule.getConfigForCamp(21) === cfgDefault);
  check("initApp: unknown camp → default", configModule.getConfigForCamp("999") === cfgDefault);
  check("initApp: avito sendRequest format resolved (array, no $ref)", Array.isArray(cfg31.pages.find((p) => p.id === "users").shortcuts.requestUsers.params.commands[0].params.format) && !hasRefKey(cfg31));
  fs.rmSync("tmp-config-build", { recursive: true, force: true });

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
