/**
 * Стенд: семантика наложения per-camp дельт на эталонный конфиг
 * (src/core/configMerge.ts → applyConfigDelta).
 *
 * Модуль компилируется из TS в tmp-merge-build-camp/ (tsc), затем гоняется набор
 * проверок: слияние вглубь, null = удаление поля, матчинг массивов по
 * id/route/path/url, need_to_remove, добавление новых элементов, замена
 * неиндексируемых массивов целиком (commands/dataInit), клонирование
 * вставляемых значений, нетронутость эталона.
 */
const { execSync } = require("child_process");
const fs = require("fs");

// 1) Компиляция configMerge.ts (чистый модуль без импортов)
execSync(
  "npx tsc src/core/configMerge.ts --outDir tmp-merge-build-camp --module commonjs --target es2020 --lib es2020,dom --skipLibCheck",
  { stdio: "pipe" },
);
const { applyConfigDelta } = require("./tmp-merge-build-camp/configMerge.js");
// Собранный JS больше не нужен — модуль загружен в память
fs.rmSync("tmp-merge-build-camp", { recursive: true, force: true });

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

// --- T12: массив без идентифицирующих полей — родитель указан целиком → замена
const c12 = JSON.parse(JSON.stringify(reference));
applyConfigDelta(c12, { navbar: [{ label: "Без id" }] });
check("T12 identity-less array replaces base", c12.navbar.length === 1 && c12.navbar[0].label === "Без id");
check("T12 base items not kept", !c12.navbar.some((n) => n.id === "n1"));

// --- T13: need_to_remove в заменяющем массиве — маркер не копируется,
// чтобы убрать элемент, его просто не включают в дельту
const c13 = JSON.parse(JSON.stringify(reference));
applyConfigDelta(c13, { navbar: [{ need_to_remove: true }] });
check("T13 remove-only delta → array emptied, marker not copied", c13.navbar.length === 0 && !c13.navbar.some((n) => n && n.need_to_remove === true));

// --- T14: маркер need_to_remove:false не копируется в конфиг
const c14 = JSON.parse(JSON.stringify(reference));
applyConfigDelta(c14, { pages: [{ id: "users", note: "x", need_to_remove: false }] });
check("T14 marker not copied", !("need_to_remove" in c14.pages[1]) && c14.pages[1].note === "x");

// --- T15: массив примитивов (без идентификаторов) — полная замена родителя
const c15 = JSON.parse(JSON.stringify(reference));
applyConfigDelta(c15, { adapters: { "users.get.response": { map: [2, 5] } } });
check("T15 primitive array replaced", eq(c15.adapters["users.get.response"].map, [2, 5]));

// --- T16: undefined в дельте — «не трогать»
const c16 = JSON.parse(JSON.stringify(reference));
applyConfigDelta(c16, { config: { title: undefined } });
check("T16 undefined skips", c16.config.title === "CRM");

// --- T17: неиндексируемый список (commands) — родитель целиком → замена массива
const page17 = {
  shortcuts: {
    requestUsers: {
      type: "sequence",
      params: {
        commands: [
          { type: "sendRequest", data: { a: 1, b: 2 } },
          { type: "mergeUrlParams", values: { c: 3 } },
        ],
      },
    },
  },
};
applyConfigDelta(page17, {
  shortcuts: {
    requestUsers: {
      type: "sequence",
      params: {
        commands: [
          { type: "sendRequest", data: { a: 1, b: 2, category: "{$x}" } },
          { type: "mergeUrlParams", values: { c: 3, league: "{$y}" } },
        ],
      },
    },
  },
});
check("T17 non-indexable commands replaced (not appended)", page17.shortcuts.requestUsers.params.commands.length === 2);
check("T17 replaced command has new key", page17.shortcuts.requestUsers.params.commands[0].data.category === "{$x}");
check("T17 second command replaced", page17.shortcuts.requestUsers.params.commands[1].values.league === "{$y}");
check("T17 parent fields preserved", page17.shortcuts.requestUsers.type === "sequence");

// --- T18: индексируемый список по url — матч фида + добавление нового
const page18 = {
  dataInit: [
    { source: "s1", target: "t1" },
    { source: "s2", target: "t2" },
  ],
  dataFeed: [
    { url: "/api/report", method: "GET", target: "state.report" },
    { url: "/api/execute", method: "POST", target: "state.rows", data: { first: "1", rows: "10" } },
  ],
};
applyConfigDelta(page18, {
  dataFeed: [
    { url: "/api/dict_categories", method: "GET", target: "state.cats" },
    { url: "/api/execute", data: { category: "{$p}" } },
  ],
});
check("T18 url-matched feed merged, new appended", page18.dataFeed.length === 3);
check("T18 url-matched data keys added & kept", page18.dataFeed[1].data.category === "{$p}" && page18.dataFeed[1].data.first === "1");
check("T18 url-matched method/target kept", page18.dataFeed[1].method === "POST" && page18.dataFeed[1].target === "state.rows");
check("T18 new feed appended", page18.dataFeed[2].url === "/api/dict_categories" && page18.dataFeed[2].target === "state.cats");
check("T18 untouched feed intact", page18.dataFeed[0].url === "/api/report");

// --- T19: неиндексируемый dataInit — полная замена (дублирование эталонных записей)
applyConfigDelta(page18, {
  dataInit: [
    { source: "s1", target: "t1" },
    { source: "s2", target: "t2" },
    { source: "s3", target: "t3" },
  ],
});
check("T19 non-indexable dataInit replaced", page18.dataInit.length === 3 && page18.dataInit[2].target === "t3");

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
