/**
 * Стенд: семантика наложения per-camp дельт на эталонный конфиг
 * (src/core/configMerge.ts → applyConfigDelta).
 *
 * Модуль компилируется из TS в tmp-merge-build/ (tsc), затем гоняется набор
 * проверок: слияние вглубь, null = удаление поля, матчинг массивов по
 * id/route/path, need_to_remove, добавление новых элементов, клонирование
 * вставляемых значений, нетронутость эталона.
 */
const { execSync } = require("child_process");
const fs = require("fs");

// 1) Компиляция configMerge.ts (чистый модуль без импортов)
execSync(
  "npx tsc src/core/configMerge.ts --outDir tmp-merge-build --module commonjs --target es2020 --lib es2020,dom --skipLibCheck",
  { stdio: "pipe" },
);
const { applyConfigDelta } = require("./tmp-merge-build/configMerge.js");
// Собранный JS больше не нужен — модуль загружен в память
fs.rmSync("tmp-merge-build", { recursive: true, force: true });

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
function eq(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

// Эталон для тестов (структура повторяет реальный конфиг)
const reference = {
  config: { title: "CRM", indexPageId: "home" },
  pages: [
    {
      id: "home",
      route: "/",
      title: "Home",
      sections: [
        {
          id: "s1",
          blocks: [
            {
              id: "b1",
              components: [{ id: "c1", props: { header: "Old" } }],
            },
          ],
        },
      ],
    },
    { id: "users", route: "/users", title: "Users" },
  ],
  adapters: {
    "user.get.request": { transform: { a: 1, b: 2 }, note: "keep" },
    "users.get.response": { map: [1, 2, 3] },
  },
  apiRoutes: [
    { path: "ops/users", url: "{$config.baseURL}/users", method: "GET" },
    { path: "ops/receipts", url: "{$config.baseURL}/receipts" },
  ],
  navbar: [
    { id: "n1", label: "Users" },
    { id: "n2", label: "Old item" },
  ],
};

// --- T1: слияние вглубь — заменяется именно указанный вложенный адаптер
const c1 = JSON.parse(JSON.stringify(reference));
applyConfigDelta(c1, {
  adapters: { "user.get.request": { transform: { b: 99 } } },
});
check("T1 deep: b replaced", c1.adapters["user.get.request"].transform.b === 99);
check("T1 deep: sibling a kept", c1.adapters["user.get.request"].transform.a === 1);
check("T1 deep: note kept", c1.adapters["user.get.request"].note === "keep");
check("T1 deep: other adapter untouched", eq(c1.adapters["users.get.response"].map, [1, 2, 3]));

// --- T2: null удаляет поле
const c2 = JSON.parse(JSON.stringify(reference));
applyConfigDelta(c2, { config: { indexPageId: null } });
check("T2 null deletes field", !("indexPageId" in c2.config) && c2.config.title === "CRM");

// --- T3: массив страниц — изменение существующей по id
const c3 = JSON.parse(JSON.stringify(reference));
applyConfigDelta(c3, { pages: [{ id: "users", title: "Users v2" }] });
check("T3 page matched by id, title replaced", c3.pages[1].title === "Users v2");
check("T3 page matched: home untouched", c3.pages[0].title === "Home");
check("T3 page matched: count unchanged", c3.pages.length === 2);

// --- T4: новая страница добавляется в конец
const c4 = JSON.parse(JSON.stringify(reference));
applyConfigDelta(c4, { pages: [{ id: "prizes", route: "/prizes", title: "Prizes" }] });
check("T4 new page appended", c4.pages.length === 3 && c4.pages[2].id === "prizes");

// --- T5: need_to_remove удаляет страницу по id
const c5 = JSON.parse(JSON.stringify(reference));
applyConfigDelta(c5, { pages: [{ id: "users", need_to_remove: true }] });
check("T5 page removed by id", c5.pages.length === 1 && c5.pages[0].id === "home");

// --- T6: apiRoutes — матч по path, новое добавляется
const c6 = JSON.parse(JSON.stringify(reference));
applyConfigDelta(c6, {
  apiRoutes: [
    { path: "ops/users", url: "{$config.baseURL}/users-v2" },
    { path: "ops/messages", url: "{$config.baseURL}/messages" },
  ],
});
check("T6 route matched by path", c6.apiRoutes[0].url === "{$config.baseURL}/users-v2");
check("T6 route matched: method kept", c6.apiRoutes[0].method === "GET");
check("T6 new route appended", c6.apiRoutes.length === 3 && c6.apiRoutes[2].path === "ops/messages");

// --- T7: need_to_remove у route (по path)
const c7 = JSON.parse(JSON.stringify(reference));
applyConfigDelta(c7, { apiRoutes: [{ path: "ops/receipts", need_to_remove: true }] });
check("T7 route removed by path", c7.apiRoutes.length === 1 && c7.apiRoutes[0].path === "ops/users");

// --- T8: вложенные секции/блоки/компоненты страницы
const c8 = JSON.parse(JSON.stringify(reference));
applyConfigDelta(c8, {
  pages: [
    {
      id: "home",
      sections: [
        { id: "s1", blocks: [{ id: "b1", components: [{ id: "c1", props: { header: "New" } }] }] },
      ],
    },
  ],
});
check("T8 nested component replaced", c8.pages[0].sections[0].blocks[0].components[0].props.header === "New");
check("T8 nested: page title kept", c8.pages[0].title === "Home");

// --- T9: navbar — матч по id, удаление по need_to_remove
const c9 = JSON.parse(JSON.stringify(reference));
applyConfigDelta(c9, {
  navbar: [{ id: "n1", label: "Участники" }, { id: "n2", need_to_remove: true }],
});
check("T9 navbar item renamed", c9.navbar[0].label === "Участники");
check("T9 navbar item removed", c9.navbar.length === 1);

// --- T10: несовпадение типов — полная замена
const c10 = JSON.parse(JSON.stringify(reference));
applyConfigDelta(c10, { adapters: { "users.get.response": { map: { replaced: true } } } });
check("T10 object over array replaces", eq(c10.adapters["users.get.response"].map, { replaced: true }));
applyConfigDelta(c10, { config: { title: 42 } });
check("T10 primitive replaces", c10.config.title === 42);

// --- T11: эталон не мутируется при наложении дельты на клон
const refCopy = JSON.parse(JSON.stringify(reference));
const c11 = JSON.parse(JSON.stringify(reference));
applyConfigDelta(c11, { pages: [{ id: "users", title: "X" }], config: { title: null } });
check("T11 reference untouched", eq(reference, refCopy));

// --- T12: объект без идентификатора добавляется в конец массива
const c12 = JSON.parse(JSON.stringify(reference));
applyConfigDelta(c12, { navbar: [{ label: "Без id" }] });
check("T12 identity-less object appended", c12.navbar.length === 3 && c12.navbar[2].label === "Без id");

// --- T13: need_to_remove без идентификатора — безопасно игнорируется
const c13 = JSON.parse(JSON.stringify(reference));
applyConfigDelta(c13, { navbar: [{ need_to_remove: true }] });
check("T13 remove without identity ignored", c13.navbar.length === 2);

// --- T14: маркер need_to_remove:false не копируется в конфиг
const c14 = JSON.parse(JSON.stringify(reference));
applyConfigDelta(c14, { pages: [{ id: "users", note: "x", need_to_remove: false }] });
check("T14 marker not copied", !("need_to_remove" in c14.pages[1]) && c14.pages[1].note === "x");

// --- T15: массив примитивов — добавление без дублей
const c15 = JSON.parse(JSON.stringify(reference));
applyConfigDelta(c15, { adapters: { "users.get.response": { map: [2, 5] } } });
check("T15 primitive array appended w/o dupes", eq(c15.adapters["users.get.response"].map, [1, 2, 3, 5]));

// --- T16: undefined в дельте — «не трогать»
const c16 = JSON.parse(JSON.stringify(reference));
applyConfigDelta(c16, { config: { title: undefined } });
check("T16 undefined skips", c16.config.title === "CRM");

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
