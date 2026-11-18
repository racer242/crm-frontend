/**
 * Временный тест-стенд карточки приза /ops/prizes/[prize_id] (эталонная
 * кампания): перевод страницы с классического REST (GET /api/v1/crm/prizes/
 * [id] + GET /api/ops/users/[user_id]) на три execute запроса статистики
 * prize-details / prize-raffle / prize-act (.prompts/prize.md — «Карточка
 * приза: три запроса вместо одного») по образцу списков «Призы»/«Каталог».
 *
 * Проверяются: 1) JSON-валидность; 2) реестры (api-routes: 3 литеральных
 * POST ops/prizes-card/{...}/execute → /api/v1/crm/stats/query/…/execute с
 * query:true и общим request-адаптером; классический GET карточки и POST
 * статуса не задеты — GET ещё нужен странице приза участника; разрешение
 * путей; adapters.json: 4 НОВЫХ ключа stats.prize-*.*); 3) структура
 * страницы (state, dataFeed 3×POST, шорткат статуса, сетка, панели,
 * date-поля); 4) исполнение адаптеров как в DataAdapterEngine (макрос
 * UUID, формы конверта, словари меток, пустой ответ → пустая карточка).
 *
 * Запуск: node tmp-test-prize.js
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

function main() {
  const pagePath = "config/pages/promo-instance/prize.json";

  // 1) JSON-валидность
  const page = JSON.parse(fs.readFileSync(pagePath, "utf-8"));
  const routes = JSON.parse(fs.readFileSync("config/system/api-routes.json", "utf-8"));
  const adapters = JSON.parse(fs.readFileSync("config/system/adapters.json", "utf-8"));
  const crmConfig = JSON.parse(fs.readFileSync("config/crm-config.json", "utf-8"));
  check("json: все затронутые конфиги валидны", true);

  // 2) Реестры
  const cardRoutes = routes.filter((r) => r.path.startsWith("ops/prizes-card/"));
  const byPath = Object.fromEntries(cardRoutes.map((r) => [r.path, r]));
  check("routes: 3 литеральных маршрута карточки POST query:true", cardRoutes.length === 3 && cardRoutes.every((r) => r.method === "POST" && r.query === true) && ["ops/prizes-card/details/execute", "ops/prizes-card/raffle/execute", "ops/prizes-card/act/execute"].every((p) => !!byPath[p]));
  check("routes: details → stats/query/prize-details/execute", byPath["ops/prizes-card/details/execute"].url === "/api/v1/crm/stats/query/prize-details/execute");
  check("routes: raffle → stats/query/prize-raffle/execute", byPath["ops/prizes-card/raffle/execute"].url === "/api/v1/crm/stats/query/prize-raffle/execute");
  check("routes: act → stats/query/prize-act/execute", byPath["ops/prizes-card/act/execute"].url === "/api/v1/crm/stats/query/prize-act/execute");
  check("routes: общий request-адаптер + свой response на каждый маршрут", cardRoutes.every((r) => r.adapter.request === "stats.prize-card.execute.request") && byPath["ops/prizes-card/details/execute"].adapter.response === "stats.prize-details.execute.response" && byPath["ops/prizes-card/raffle/execute"].adapter.response === "stats.prize-raffle.execute.response" && byPath["ops/prizes-card/act/execute"].adapter.response === "stats.prize-act.execute.response");
  check("routes: classic GET карточки не задет (нужен странице приза участника)", resolveRoute(routes, "/ops/prizes/abc", "GET").path === "ops/prizes/[prize_id]" && resolveRoute(routes, "/ops/prizes/abc", "GET").adapter.response === "prize.get.response");
  check("routes: POST статуса и execute списка не задеты", resolveRoute(routes, "/ops/prizes/abc/status", "POST").path === "ops/prizes/[prize_id]/status" && resolveRoute(routes, "/ops/prizes/execute", "POST").path === "ops/prizes/execute");
  check("routes: /ops/prizes-card/*/execute резолвятся в свои маршруты", resolveRoute(routes, "/ops/prizes-card/details/execute", "POST").path === "ops/prizes-card/details/execute" && resolveRoute(routes, "/ops/prizes-card/raffle/execute", "POST").path === "ops/prizes-card/raffle/execute" && resolveRoute(routes, "/ops/prizes-card/act/execute", "POST").path === "ops/prizes-card/act/execute");
  const newKeys = ["stats.prize-card.execute.request", "stats.prize-details.execute.response", "stats.prize-raffle.execute.response", "stats.prize-act.execute.response"];
  check("adapters: 4 ключа stats.prize-* → файлы на диске", newKeys.every((key) => adapters[key] && fs.existsSync(adapters[key].script.replace("./", ""))));
  check("adapters: prize.get.response остался (classic GET)", !!adapters["prize.get.response"] && fs.existsSync(adapters["prize.get.response"].script.replace("./", "")));
  check("crm-config: страница prize.json по-прежнему зарегистрирована", JSON.stringify(crmConfig).includes("pages/promo-instance/prize.json"));

  // 3) Структура страницы
  check("page: route/id/meta", page.route === "/ops/prizes/[prize_id]" && page.id === "prize" && page.meta.title === "Приз — CRM Platform");
  const pd = page.state.prizeData;
  check("page: state.prizeData — дефолты карточки (пусто/«—»)", !!pd && pd.id === "" && pd.prize_code === "—" && pd.status === "" && pd.status_severity === "secondary" && pd.price_rub === "—" && pd.user_id === "" && pd.user_id_label === "—" && pd.full_name === "—" && pd.user_go_disabled === true && pd.issued_at === null);
  const so = page.state.statusOptions;
  const soValues = Array.isArray(so) ? so.map((o) => o.value) : [];
  check("page: state.statusOptions — 14 статусов без дублей", soValues.length === 14 && new Set(soValues).size === 14 && soValues[0] === "FREE" && soValues.includes("RECEIVED") && soValues.includes("READY_FOR_DELIVERY") && soValues.includes("DELETED"));
  check("page: state.prizeRaffle/prizeAct/saveResult", page.state.prizeRaffle.raffle_id === "" && page.state.prizeRaffle.raffle_name === "—" && page.state.prizeAct.act_state_label === "—" && page.state.prizeAct.act_file_present_label === "—" && page.state.saveResult === null);
  const feeds = page.dataFeed || [];
  const feedByTarget = Object.fromEntries(feeds.map((f) => [f.target, f]));
  check("page: dataFeed — 3 POST с instance_id из routeParams", feeds.length === 3 && feeds.every((f) => f.method === "POST" && f.data && f.data.instance_id === "{$location.routeParams.prize_id}") && feedByTarget["state.prizeData"].url === "/api/ops/prizes-card/details/execute" && feedByTarget["state.prizeRaffle"].url === "/api/ops/prizes-card/raffle/execute" && feedByTarget["state.prizeAct"].url === "/api/ops/prizes-card/act/execute");
  const sc = page.shortcuts.changePrizeStatus;
  const send = sc.params.commands[0].params.onConfirm[0].params;
  check("page: шорткат changePrizeStatus без изменений (classic POST статуса)", sc.type === "sequence" && sc.params.commands[0].type === "confirm" && send.url === "/api/ops/prizes/{$location.routeParams.prize_id}/status" && send.method === "POST" && send.target === "state.saveResult" && send.data.status === "{$state.prizeData.status}" && JSON.stringify(send.onSuccess).includes("showToast") && JSON.stringify(send.onError).includes("refresh"));
  const bcrumb = page.sections.find((s) => s.id === "breadcrumbSection");
  check("page: крошки — Призы → @state.prizeData.title", JSON.stringify(bcrumb).includes('{"label":"Призы","route":"/ops/prizes"}') && JSON.stringify(bcrumb).includes('"label":"@state.prizeData.title"'));
  const mainLayout = page.sections.find((s) => s.id === "mainLayout");
  check("page: сетка col-8 (слева) / col-4 (справа)", JSON.stringify(mainLayout).includes('"cols":["col-12 lg:col-8","col-12 lg:col-4"]'));
  const layoutJson = JSON.stringify(mainLayout);
  const leftLayout = mainLayout.blocks[0].components[0];
  const leftPanels = leftLayout.props.components.filter((c) => c.componentType === "Panel");
  check("page: слева 3 панели — Информация о призе / Розыгрыш / Акт", leftLayout.componentType === "LayoutGroup" && leftPanels.length === 3 && leftPanels.map((p) => p.id).join() === "prizePanel,rafflePanel,actPanel" && leftPanels[0].props.header === "Информация о призе" && leftPanels[1].props.header === "Розыгрыш" && leftPanels[2].props.header === "Акт");
  const prizePanelJson = JSON.stringify(leftPanels[0]);
  check("page: «Информация о призе» — Обновить в хедере + поля", prizePanelJson.includes("prizeRefreshButton") && prizePanelJson.includes('"refresh"') && prizePanelJson.includes("@state.prizeData.prize_code") && prizePanelJson.includes("@state.prizeData.type_code") && prizePanelJson.includes("@state.prizeData.description") && prizePanelJson.includes("@state.prizeData.price_rub") && prizePanelJson.includes("@state.prizeData.points_cost") && prizePanelJson.includes("@state.prizeData.pool_status_label") && prizePanelJson.includes("@state.prizeData.catalog_active_label") && prizePanelJson.includes("@state.prizeData.catalog_is_removed_label") && prizePanelJson.includes("@state.prizeData.catalog_target_count") && prizePanelJson.includes("@state.prizeData.external_id_label") && prizePanelJson.includes('"componentType":"Image"') && prizePanelJson.includes("@state.prizeData.image_url"));
  const rafflePanel = leftPanels[1];
  const raffleJson = JSON.stringify(rafflePanel);
  check("page: «Розыгрыш» скрыт без raffle_id + поля шанса/розыгрыша/доставки", rafflePanel.visible === "@state.prizeRaffle.raffle_id" && raffleJson.includes("@state.prizeRaffle.chance_source_label") && raffleJson.includes("@state.prizeRaffle.chance_occurred_at") && raffleJson.includes("@state.prizeRaffle.place") && raffleJson.includes("@state.prizeRaffle.chances_linked_count") && raffleJson.includes("@state.prizeRaffle.raffle_name") && raffleJson.includes("@state.prizeRaffle.raffle_status_label") && raffleJson.includes("@state.prizeRaffle.drawn_at") && raffleJson.includes("@state.prizeRaffle.raffle_annul_reason") && raffleJson.includes("@state.prizeRaffle.raffle_chunks_received") && raffleJson.includes("@state.prizeRaffle.raffle_winners_declared"));
  check("page: «Розыгрыш» — Перейти → /ops/raffles/{raffle_id}", raffleJson.includes('"url":"/ops/raffles/{$state.prizeRaffle.raffle_id}"') && raffleJson.includes("raffleGoButton"));
  const actJson = JSON.stringify(leftPanels[2]);
  check("page: «Акт» — состояние/статус/файл/размер/загрузка", actJson.includes("@state.prizeAct.act_state_label") && actJson.includes("@state.prizeAct.act_status_label") && actJson.includes("@state.prizeAct.act_required_label") && actJson.includes("@state.prizeAct.act_scan_original_name") && actJson.includes("@state.prizeAct.act_scan_mime") && actJson.includes("@state.prizeAct.act_scan_size_text") && actJson.includes("@state.prizeAct.act_scan_uploaded_at") && actJson.includes("@state.prizeAct.act_file_present_label"));
  const rightLayout = mainLayout.blocks[1].components[0];
  const rightPanels = rightLayout.props.components.filter((c) => c.componentType === "Panel");
  check("page: справа 2 панели — Владелец / Статус приза", rightPanels.length === 2 && rightPanels[0].id === "participantPanel" && rightPanels[0].props.header === "Владелец" && rightPanels[1].id === "controlPanel" && rightPanels[1].props.header === "Статус приза");
  const partJson = JSON.stringify(rightPanels[0]);
  check("page: «Владелец» — поля из запроса prize-details", partJson.includes("@state.prizeData.user_id_label") && partJson.includes("@state.prizeData.participant_code") && partJson.includes("@state.prizeData.full_name") && partJson.includes("@state.prizeData.email") && partJson.includes("@state.prizeData.owner_phone") && partJson.includes("@state.prizeData.owner_status_label") && partJson.includes("@state.prizeData.owner_participant_status_label") && partJson.includes("@state.prizeData.owner_balance") && partJson.includes("@state.prizeData.owner_total_earned") && partJson.includes("@state.prizeData.owner_registered_at"));
  check("page: «Владелец» — Перейти disabled у свободного приза", partJson.includes('"disabled":"@state.prizeData.user_go_disabled"') && partJson.includes('"url":"/ops/users/{$state.prizeData.user_id}"'));
  const controlJson = JSON.stringify(rightPanels[1]);
  check("page: «Статус приза» — дропдаун из state.statusOptions + Применить", controlJson.includes('"options":"@state.statusOptions"') && controlJson.includes('"value":"@state.prizeData.status"') && controlJson.includes('"optionLabel":"name"') && controlJson.includes('"optionValue":"value"') && controlJson.includes("changePrizeStatus") && controlJson.includes("applyStatusBtn"));
  const dateBinds = layoutJson.match(/"value":"@state\.prize(?:Data|Raffle|Act)\.[a-z_]+","dataType":"date"/g) || [];
  const expectedDates = ["issued_at", "created_at", "chance_occurred_at", "raffle_collection_from", "raffle_collection_to", "raffle_start_at", "raffle_end_at", "raffle_publish_at", "drawn_at", "raffle_started_at", "raffle_finished_at", "raffle_last_chunk_at", "act_scan_uploaded_at", "owner_registered_at"];
  check("page: 14 datetime-полей биндятся через dataType date", dateBinds.length === 14 && expectedDates.every((f) => dateBinds.some((b) => b.endsWith("." + f + '","dataType":"date"'))));
  // 4) Исполнение адаптеров (как в DataAdapterEngine)
  // request: UUID в кавычках, page/limit=1, ключ присутствует всегда
  const req = runAdapter("config/adapters/stats.prize-card.execute.request.js", { instance_id: "ABCDEF00-1234-5678-9ABC-DEF012345678" });
  check("adapter.request: UUID → page/limit=1 + кавычкованный макрос в нижнем регистре", req.page === 1 && req.limit === 1 && req.replacements.INSTANCE_ID_FILTER === "'abcdef00-1234-5678-9abc-def012345678'");
  const reqBad = runAdapter("config/adapters/stats.prize-card.execute.request.js", { instance_id: "not-a-uuid" });
  const reqNone = runAdapter("config/adapters/stats.prize-card.execute.request.js", {});
  check("adapter.request: не-UUID/пусто → пустой ключ (макрос всегда есть, сервер 422)", reqBad.replacements.INSTANCE_ID_FILTER === "" && reqNone.replacements.INSTANCE_ID_FILTER === "" && Object.keys(reqNone.replacements).length === 1);

  // details response: полный конверт спеки
  const detRow = { id: "inst-1", values: { instance_id: "inst-1", prize_id: "p-1", prize_code: "PC-1", type_code: "gift", prize_title: "Ноутбук", catalog_description: "Описание", price_rub: 1500, points_cost: null, status: "RECEIVED", pool_status: "active", act_required: true, catalog_active: false, catalog_is_removed: null, catalog_target_count: 10, external_id: "ext-9", issued_at: "2026-01-02T03:04:05+03:00", created_at: "2026-01-01T00:00:00+03:00", catalog_image_source_url: "http://x/y.png", user_id: "u-1", participant_code: "U-1", full_name: "Иван", email: "i@x.ru", owner_phone: "+7 900", owner_status: "blocked", owner_participant_status: "ANKET_REQUIRED", owner_balance: 100, owner_total_earned: 250, owner_registered_at: "2025-05-05T10:00:00+03:00", status_label: "Получен (API)" } };
  const det = runAdapter("config/adapters/stats.prize-details.execute.response.js", { rows: [detRow] });
  check("adapter.details: строка → полная карточка (title из prize_title)", det.id === "inst-1" && det.title === "Ноутбук" && det.prize_code === "PC-1" && det.description === "Описание" && det.price_rub === 1500 && det.points_cost === "—");
  check("adapter.details: явный status_label сильнее + severity из словаря", det.status_label === "Получен (API)" && det.status === "RECEIVED" && det.status_severity === "success");
  check("adapter.details: словари пула и булевых", det.pool_status_label === "В пуле" && det.act_required_label === "Да" && det.catalog_active_label === "Нет" && det.catalog_is_removed_label === "—" && det.catalog_target_count === 10 && det.external_id_label === "ext-9");
  check("adapter.details: владелец из запроса + словари users", det.user_id === "u-1" && det.user_id_label === "u-1" && det.user_go_disabled === false && det.owner_status_label === "Заблокирован" && det.owner_participant_status_label === "Анкета не заполнена" && det.owner_balance === 100 && det.owner_total_earned === 250);
  const detU = runAdapter("config/adapters/stats.prize-details.execute.response.js", { rows: [{ values: { instance_id: "i2", status: "WEIRD_CODE", user_id: null } }] });
  check("adapter.details: неизвестный код остаётся сырым, severity secondary, свободный приз", detU.status_label === "WEIRD_CODE" && detU.status_severity === "secondary" && detU.user_id_label === "—" && detU.user_go_disabled === true);
  const detItems = runAdapter("config/adapters/stats.prize-details.execute.response.js", { items: [detRow] });
  const detLegacy = runAdapter("config/adapters/stats.prize-details.execute.response.js", [detRow]);
  const detEmpty = runAdapter("config/adapters/stats.prize-details.execute.response.js", { rows: [] });
  const detGarbage = runAdapter("config/adapters/stats.prize-details.execute.response.js", "garbage");
  check("adapter.details: {items}/legacy → то же; пусто/мусор → пустая карточка", detItems.title === "Ноутбук" && detLegacy.title === "Ноутбук" && detEmpty.title === "" && detEmpty.prize_code === "—" && detEmpty.user_go_disabled === true && detGarbage.title === "");

  // raffle response
  const raf = runAdapter("config/adapters/stats.prize-raffle.execute.response.js", { rows: [{ values: { raffle_id: "r-1", raffle_name: "Розыгрыш 1", raffle_type: "game_win", raffle_status: "DRAFT", chance_source: "receipt", chance_status: "WAITING", chance_occurred_at: "2026-02-01T12:00:00+03:00", place: 1, chances_linked_count: 0, raffle_annul_reason: null, raffle_winners_declared: null } }] });
  check("adapter.raffle: строка → панель розыгрыша", raf.raffle_id === "r-1" && raf.raffle_name === "Розыгрыш 1" && raf.raffle_type === "game_win" && raf.raffle_status_label === "Черновик" && raf.chance_source_label === "receipt" && raf.chance_status_label === "WAITING" && raf.chance_occurred_at === "2026-02-01T12:00:00+03:00" && raf.place === 1 && raf.chances_linked_count === 0);
  check("adapter.raffle: null → «—» (0 остаётся 0), явный label сильнее словаря", raf.raffle_annul_reason === "—" && raf.raffle_winners_declared === "—" && runAdapter("config/adapters/stats.prize-raffle.execute.response.js", { rows: [{ values: { raffle_id: "r-2", raffle_status: "IN_PROGRESS", raffle_status_label: "Идёт (API)" } }] }).raffle_status_label === "Идёт (API)");
  const rafEmpty = runAdapter("config/adapters/stats.prize-raffle.execute.response.js", { rows: [] });
  check("adapter.raffle: пусто → raffle_id='' (панель скрыта)", rafEmpty.raffle_id === "" && rafEmpty.raffle_status_label === "—");

  // act response
  const act = runAdapter("config/adapters/stats.prize-act.execute.response.js", { rows: [{ values: { act_state: "APPROVED", act_status: "PENDING", act_required: false, act_scan_original_name: "act.pdf", act_scan_mime: "application/pdf", act_scan_size: 2048, act_scan_uploaded_at: "2026-03-01T09:00:00+03:00" } }] });
  check("adapter.act: словари состояния/статуса + Да/Нет", act.act_state_label === "Подтверждён" && act.act_status_label === "Ожидает" && act.act_required_label === "Нет" && act.act_file_present_label === "Да" && act.act_scan_mime === "application/pdf" && act.act_scan_uploaded_at === "2026-03-01T09:00:00+03:00");
  check("adapter.act: размер человекочитаемый (Б/КБ/МБ/—)", act.act_scan_size_text === "2.0 КБ" && runAdapter("config/adapters/stats.prize-act.execute.response.js", { rows: [{ values: { act_scan_size: 500 } }] }).act_scan_size_text === "500 Б" && runAdapter("config/adapters/stats.prize-act.execute.response.js", { rows: [{ values: { act_scan_size: 5242880 } }] }).act_scan_size_text === "5.0 МБ" && runAdapter("config/adapters/stats.prize-act.execute.response.js", { rows: [{ values: {} }] }).act_scan_size_text === "—");
  const actNoFile = runAdapter("config/adapters/stats.prize-act.execute.response.js", { rows: [{ values: { act_state: "WAITING_UPLOAD", act_scan_original_name: null } }] });
  check("adapter.act: без файла — «Ожидает загрузки», файла нет", actNoFile.act_state_label === "Ожидает загрузки" && actNoFile.act_file_present_label === "Нет" && actNoFile.act_scan_original_name === "—");
  const actEmpty = runAdapter("config/adapters/stats.prize-act.execute.response.js", { rows: [] });
  check("adapter.act: пусто → дефолтная панель", actEmpty.act_state_label === "—" && actEmpty.act_file_present_label === "—" && actEmpty.act_scan_uploaded_at === null);
}

main();
console.log("");
console.log(`Итого: ${pass} PASS / ${fail} FAIL`);
process.exit(fail === 0 ? 0 : 1);
