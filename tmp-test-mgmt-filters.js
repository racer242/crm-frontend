// Стенд проверки хардененинга transformFilters в mgmt.receipts.get.request.js
// (исполнение адаптера как в движке — через new Function; см. tmp-test-filters.js)
const fs = require("fs");
const path = require("path");

const adapterPath = path.join(
  __dirname,
  "config",
  "adapters",
  "mgmt.receipts.get.request.js",
);
const src = fs.readFileSync(adapterPath, "utf8");
const transform = new Function(`${src};return transform;`)();

let pass = 0;
let fail = 0;
function check(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) pass++;
  else fail++;
  console.log(`${ok ? "PASS" : "FAIL"} ${name}`);
  if (!ok) {
    console.log("  actual:  " + JSON.stringify(actual));
    console.log("  expected:" + JSON.stringify(expected));
  }
}

// 1. SSR-путь: filters приходит JSON-строкой из URL → парсится
const jsonStr = JSON.stringify([{ id: "status", value: "ACCEPTED" }]);
check(
  "SSR JSON string -> parsed array",
  transform({ filters: jsonStr }).filters,
  [{ id: "status", value: "ACCEPTED" }],
);

// 2. Клиентский путь: массив из state проходит как есть
check(
  "array from state -> unchanged",
  transform({ filters: [{ id: "status", value: "REFUSED" }] }).filters,
  [{ id: "status", value: "REFUSED" }],
);

// 3. Битая JSON-строка -> [] (не JSON)
check("broken JSON string -> []", transform({ filters: "[broken" }).filters, []);

// 4. JSON-строка не-массива -> []
check(
  "JSON object string -> []",
  transform({ filters: '{"id":"x"}' }).filters,
  [],
);

// 5. Пустой массив («выбрано всё»/нет фильтров) -> []
check("empty array -> []", transform({ filters: [] }).filters, []);

// 6. Числоподобная строка поиска «05» остаётся в search, filters -> []
check(
  "numeric-like search string in filters -> []",
  transform({ filters: "05" }).filters,
  [],
);

// 7. search/sort/пагинация не задеты
const full = transform({
  first: 20,
  rows: 10,
  sortField: "created_at",
  sortOrder: -1,
  search: "05",
  filters: jsonStr,
});
check("limit = 10", full.limit, 10);
check("sort = created_at", full.sort, "created_at");
check("direction = desc", full.direction, "desc");
check("search = 05", full.search, "05");

console.log(`\n${pass} pass, ${fail} fail`);
process.exit(fail > 0 ? 1 : 0);