/**
 * Временный тест-стенд серверной сборки initialDataFeed (src/utils/initialResult.ts).
 * Запуск: node tmp-test-initial.js
 */
const fs = require("fs");
const path = require("path");
const ts = require("typescript");
const vm = require("vm");

const file = path.join(__dirname, "src", "utils", "initialResult.ts");
let src = fs.readFileSync(file, "utf8");
// Импорт "@/types" — только типы: в рантайме стенда не нужен
src = src.replace(/import\s*\{[^}]*\}\s*from\s*"@\/types";\s*/g, "");

const { outputText } = ts.transpileModule(src, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
});

const sandbox = { require, console, module: { exports: {} } };
sandbox.exports = sandbox.module.exports;
vm.createContext(sandbox);
vm.runInContext(outputText, sandbox, { filename: "initialResult.js" });
const { mergeById, buildInitialDataFeed } = sandbox.module.exports;

let failed = 0;
function check(name, actual, expected) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) {
    console.log("PASS", name);
  } else {
    failed++;
    console.log("FAIL", name, "\n  actual:  ", a, "\n  expected:", e);
  }
}

// ---------- mergeById ----------
// 1. join по id: значение оверлея на базу, имя/опции базы сохраняются, порядок базы
check("mergeById: array join by id", mergeById(
  [
    { id: "moderation_status", name: "Статус", type: "checkbox", opts: [], value: null },
    { id: "user_id", name: "Участник", value: null },
  ],
  [
    { id: "moderation_status", value: [false, true, false, false, false] },
    { id: "stale_id", value: 1 },
  ],
), [
  { id: "moderation_status", name: "Статус", type: "checkbox", opts: [], value: [false, true, false, false, false] },
  { id: "user_id", name: "Участник", value: null },
]);

// 2. пустая база поглощает оверлей
check("mergeById: empty base absorbs overlay", mergeById([], [{ id: "a", value: 1 }]), []);

// 3. рекурсия по объектам
check("mergeById: objects recursive", mergeById({ a: 1, b: { c: 2 } }, { b: { d: 3 } }), { a: 1, b: { c: 2, d: 3 } });

// 4. прочие комбинации — оверлей перезаписывает
check("mergeById: scalar overwrite", mergeById("x", "y"), "y");
check("mergeById: non-id array overwrite", mergeById([1, 2], [3]), [3]);

// ---------- buildInitialDataFeed ----------
const metadataFilters = [
  { id: "moderation_status", name: "Статус модерации", type: "checkbox", opts: ["a"], value: null },
];
const urlOverlay = [{ id: "moderation_status", value: [false, true, false, false, false] }];

const inits = [
  { success: true, target: "state.receiptsQuery.search", data: "05" },
  { success: true, target: "state.receiptsQuery.sortField", data: "created_at" },
  { success: true, target: "state.receiptsQuery.sortOrder", data: -1 },
  { success: true, target: "state.report.filters", data: urlOverlay, method: "merge", priority: "feed" },
  { success: false, target: "state.broken", error: "boom" },
];
const feeds = [
  { success: true, target: "state.report", data: { id: "receipts", title: "Чеки", columns: [], filters: metadataFilters } },
  { success: true, target: "state.receiptsList", data: { value: [1, 2], totalRecords: 2 } },
];
const pageState = { report: { filters: [] }, receiptsQuery: { search: "", sortField: "", sortOrder: 1 } };

const queue = buildInitialDataFeed(inits, feeds, pageState);

// 5. очередь: merge-запись влита в фид, ошибочная запись отброшена
check("queue: length", queue.length, 5);
check("queue: order", queue.map((e) => e.target), [
  "state.receiptsQuery.search",
  "state.receiptsQuery.sortField",
  "state.receiptsQuery.sortOrder",
  "state.report",
  "state.receiptsList",
]);

// 6. merge влит в результат report-фида
const reportEntry = queue.find((e) => e.target === "state.report");
check("feed merge: filters merged", reportEntry.data.filters, [
  { id: "moderation_status", name: "Статус модерации", type: "checkbox", opts: ["a"], value: [false, true, false, false, false] },
]);

// 7. исходные результаты фидов не мутируются
check("no mutation of source feed result", feeds[0].data.filters[0].value, null);

// 8. в записях очереди нет серверных маркеров method/priority
check("no method/priority markers", queue.every((e) => !("method" in e) && !("priority" in e)), true);

// 9. merge без фида → мердж с дефолтом состояния страницы
const queueNoFeed = buildInitialDataFeed(
  [{ success: true, target: "state.report.filters", data: urlOverlay, method: "merge" }],
  [],
  pageState,
);
check("merge fallback: merged with page default (empty absorbs)", queueNoFeed[0].data, []);

// 10. merge без фида и без pageState → оверлей как есть
const queueNoState = buildInitialDataFeed(
  [{ success: true, target: "state.report.filters", data: urlOverlay, method: "merge" }],
  [],
);
check("merge fallback: overlay as-is without pageState", queueNoState[0].data, urlOverlay);

// 11. priority:"feed" без method → перезапись после фидов
const queuePriorityFeed = buildInitialDataFeed(
  [{ success: true, target: "state.report.title", data: "Из URL", priority: "feed" }],
  [{ success: true, target: "state.report", data: { title: "Из metadata" } }],
  pageState,
);
check("priority feed rewrite: after feeds", queuePriorityFeed.map((e) => e.target), ["state.report", "state.report.title"]);
check("priority feed rewrite: value", queuePriorityFeed[1].data, "Из URL");

// 12. merge с непустым дефолтом состояния (фид упал) — база сохраняется
const pageStateWithDefault = { report: { filters: [{ id: "moderation_status", name: "Статус", value: null }] } };
const queueFallbackMerge = buildInitialDataFeed(
  [{ success: true, target: "state.report.filters", data: urlOverlay, method: "merge" }],
  [],
  pageStateWithDefault,
);
check("merge fallback: non-empty default", queueFallbackMerge[0].data, [
  { id: "moderation_status", name: "Статус", value: [false, true, false, false, false] },
]);

if (failed) {
  console.log("\nFAILED:", failed);
  process.exit(1);
}
console.log("\nAll tests passed");
