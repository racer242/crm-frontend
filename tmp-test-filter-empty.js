// Стенд нормализации фильтров (см. фикс «FiltersPanel: Очистить всегда
// активна; range = весь opts-диапазон — не выбран»):
//  1) config/adapters/mgmt.receipts.get.response.js — normalizeFilters;
//  2) src/engine/components/filtersUtils.ts — isFilterActive (компилируется
//     отдельно: npx tsc src/engine/components/filtersUtils.ts --outDir
//     tmp-standalone --module commonjs --target es2020 --strict --skipLibCheck);
//  3) сквозной: response -> request (PROMO-фильтр не уходит в SQL).
// Запуск: node tmp-test-filter-empty.js
const fs = require("fs");
const path = require("path");

const loadAdapter = (rel, fn) =>
  new Function(
    `${fs.readFileSync(path.join(__dirname, rel), "utf8")};return ${fn};`,
  )();
const responseAdapter = loadAdapter(
  "config/adapters/mgmt.receipts.get.response.js",
  "transform",
);
const requestAdapter = loadAdapter(
  "config/adapters/mgmt.receipts.get.request.js",
  "transform",
);
const { isFilterActive } = require("./tmp-standalone/filtersUtils.js");

let pass = 0;
let fail = 0;
const check = (name, actual, expected) => {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  ok ? pass++ : fail++;
  console.log(`${ok ? "PASS" : "FAIL"} ${name}`);
  if (!ok) {
    console.log("  actual:  " + JSON.stringify(actual));
    console.log("  expected:" + JSON.stringify(expected));
  }
};
const f = (id, type, opts, value) => ({ id, name: "X", type, opts, value });
const norm = (filters) => responseAdapter({ filters }).filters;

// ── 1. normalizeFilters (response-адаптер) ──────────────────────────────
const preset = [
  f("status", "options", ["A", "B"], [false, true]),
  f("promo_products_amount", "range", [0, 985], [0, 985]),
];
check("full-range preset -> value undefined", norm(preset)[1].value, undefined);
check("neighbour filter untouched", norm(preset)[0].value, [false, true]);
check("neighbour opts kept", norm(preset)[1].opts, [0, 985]);
check("sub-range kept", norm([f("x", "range", [0, 985], [10, 20])])[0].value, [10, 20]);
// «До 985» (begin null): Number(null) === 0 — не считается полным
check("until-max kept (Number(null)=0 trap)", norm([f("x", "range", [0, 985], [null, 985])])[0].value, [null, 985]);
check("from-min kept", norm([f("x", "range", [0, 985], [0, null])])[0].value, [0, null]);
check("reversed full-range cleared", norm([f("x", "range", [500, 100], [100, 500])])[0].value, undefined);
check("non-numeric opts untouched", norm([f("x", "range", ["a", "b"], ["a", "b"])])[0].value, ["a", "b"]);
check("free range untouched", norm([f("x", "range", null, [null, null])])[0].value, [null, null]);
check("options type untouched", norm([f("x", "options", ["A"], [false])])[0].value, [false]);
check("empty array ok", norm([]), []);
check("undefined filters ok", norm(undefined), undefined);

// ── 2. isFilterActive (клиентская семантика) ────────────────────────────
const act = (type, opts, value) => isFilterActive(f("x", type, opts, value));
check("checkbox true -> active", act("checkbox", null, true), true);
check("checkbox false -> inactive", act("checkbox", null, false), false);
check("switch undefined -> inactive", isFilterActive({ id: "x", name: "X", type: "switch" }), false);
check("options some true -> active", act("options", ["A", "B"], [false, true]), true);
check("options all false -> inactive", act("options", ["A"], [false]), false);
check("range full opts -> inactive", act("range", [0, 985], [0, 985]), false);
check("range sub-range -> active", act("range", [0, 985], [10, 20]), true);
check("range until-max -> active", act("range", [0, 985], [null, 985]), true);
check("range from-min -> active", act("range", [0, 985], [0, null]), true);
check("range empty free -> inactive", act("range", null, [null, null]), false);
check("range free partial -> active", act("range", null, [5, null]), true);
check("range undefined value -> inactive", isFilterActive(f("x", "range", [0, 985])), false);
check("period empty -> inactive", act("period", null, [null, null]), false);
check("period from -> active", act("period", null, ["2026-01-01", null]), true);
check("text empty -> inactive", act("text", null, ""), false);
check("text value -> active", act("text", null, "иван"), true);
check("number zero -> active", act("number", null, 0), true);

// ── 3. Сквозной: панель Применить -> state -> request ───────────────────
const applied = preset.map((item) =>
  isFilterActive(item) ? item : { ...item, value: undefined },
);
check("pipeline: applied model has no promo value", applied[1].value, undefined);
check(
  "pipeline: request filters drop empty promo",
  requestAdapter({ filters: applied, rows: 10 }).filters.map((x) => x.id),
  ["status"],
);

// ── 4. Smoke: response-адаптер не задел таблицу ─────────────────────────
const full = responseAdapter({
  columns: [{ id: "fn", title: "ФН", sortable: true }],
  rows: [{ id: "r1", values: { fn: "123", status_label: "Принят", status: "x" } }],
  meta: { total_count: 7, limit: 10, first: 0, direction: "desc", sort: "fn" },
  filters: preset,
});
check("smoke: rows mapped", full.value[0].fn, "123");
check("smoke: labels applied", full.value[0].status, "Принят");
check("smoke: totalRecords", full.totalRecords, 7);
check("smoke: sortOrder", full.sortOrder, -1);

console.log(`\n${pass} pass, ${fail} fail`);
process.exit(fail > 0 ? 1 : 0);