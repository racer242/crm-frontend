/**
 * Временный тест-стенд исполнения request-адаптеров в среде движка
 * (new Function("data", shared + script + "; return transform(data);") —
 * как в src/core/DataAdapterEngine.ts:applyJs).
 *
 * Доказывает баг: при SSR-обновлении страницы («Чеки»/«Чеки участника»)
 * execute-фид доставляет filters из URL сырой JSON-строкой
 * (getServerLocation params — сырые строки; route.ts парсит JSON только
 * ВЕРХНЕГО уровня тела) — stats.receipts.execute.request отбрасывал строку
 * (Array.isArray ? ... : []) → все *_FILTER = "" → таблица без фильтров.
 * stats.users.execute.request строку парсит — поэтому на «Участниках» работало.
 *
 * Запуск: node tmp-test-filters.js
 */
const fs = require("fs");
const path = require("path");

const SHARED = fs.readFileSync(path.join(__dirname, "config/adapters/_shared.js"), "utf8");

function compileAdapter(rel) {
  const script = fs.readFileSync(path.join(__dirname, rel), "utf8");
  return new Function("data", `${SHARED}; ${script}; return transform(data);`);
}

const receiptsAdapter = compileAdapter("config/adapters/stats.receipts.execute.request.js");
const usersAdapter = compileAdapter("config/adapters/stats.users.execute.request.js");

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

// Тело POST, которое route.ts отдаёт адаптеру при обновлении страницы «Чеки»
// с URL ?filters=[{"id":"moderation_status","value":[false,true,false,false,false]}]:
// filters — JSON-строка (route парсит только верхний уровень). Значение
// [false, true, ...] → второй статус MODERATION_STATUS_VALUES = "ACCEPTED".
const urlFiltersString = JSON.stringify([
  { id: "moderation_status", value: [false, true, false, false, false] },
]);

// 1. БАГ: строка фильтров из URL должна давать SQL-фрагмент статуса
const fromUrlString = receiptsAdapter({
  first: "0",
  rows: "10",
  sortField: "registration_date",
  sortOrder: "-1",
  search: "",
  filters: urlFiltersString,
});
check(
  "receipts: URL-строка фильтров → AND r.status IN ('ACCEPTED')",
  fromUrlString.replacements.MODERATION_STATUS_FILTER,
  "AND r.status IN ('ACCEPTED')",
);

// 2. Регресс: массив (клиентский путь sendRequest после list-format) — работал
const fromArray = receiptsAdapter({
  first: "0",
  rows: "10",
  sortField: "registration_date",
  sortOrder: "-1",
  search: "",
  filters: [{ id: "moderation_status", value: [false, true, false, false, false] }],
});
check(
  "receipts: массив фильтров (клиентский путь) → тот же фрагмент",
  fromArray.replacements.MODERATION_STATUS_FILTER,
  "AND r.status IN ('ACCEPTED')",
);

// 3. Регресс: не-JSON мусор в URL-параметре — без падения, фрагмент пустой
const garbage = receiptsAdapter({
  first: "0",
  rows: "10",
  search: "05",
  filters: "05",
});
check(
  "receipts: не-JSON строка → пустой фрагмент без падения",
  garbage.replacements.MODERATION_STATUS_FILTER,
  "",
);

// 4. Регресс: всё выбрано → "" (spec §1.3) — и через строку из URL тоже
const allSelected = receiptsAdapter({
  first: "0",
  rows: "10",
  filters: JSON.stringify([
    { id: "moderation_status", value: [true, true, true, true, true] },
  ]),
});
check(
  "receipts: все статусы выбраны (строка из URL) → пустой фрагмент",
  allSelected.replacements.MODERATION_STATUS_FILTER,
  "",
);

// 5. Контроль: users-адаптер URL-строку фильтров ПРИНИМАЕТ (эталон фикса)
const usersWith = usersAdapter({
  rows: "10",
  filters: JSON.stringify([{ id: "mailing", value: "Принял" }]),
});
const usersWithout = usersAdapter({ rows: "10" });
check(
  "users: URL-строка фильтров влияет на SQL (паттерн уже в users)",
  usersWith.replacements.MAILING_FILTER !== "" &&
    usersWith.replacements.MAILING_FILTER !== usersWithout.replacements.MAILING_FILTER
    ? "fragment=" + usersWith.replacements.MAILING_FILTER
    : "DROPPED",
  "fragment=" + usersWith.replacements.MAILING_FILTER,
);

if (failed) {
  console.log("\nFAILED:", failed);
  process.exit(1);
}
console.log("\nAll tests passed");
