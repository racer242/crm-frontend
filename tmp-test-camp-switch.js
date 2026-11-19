/**
 * Временный тест-стенд смены кампании: переключатель кампании в сайдбаре
 * (CampMenuSection.handleCampChange в src/engine/DashboardSidebar.tsx) после
 * записи cookie camp_id уводит на корневую страницу (window.location.replace
 * ("/")) — URL предыдущей кампании (карточки сущностей, query-параметры
 * списков, фича-гейтованные страницы) под новой cookie давал бы
 * несоответствие данных или 404. Корень резолвится через config.indexPageId
 * конфига выбранной кампании (src/app/[[...slug]]/page.tsx).
 *
 * Проверяются: 1) запись cookie с прежними параметрами не задета; 2) переход
 * на корень через replace; 3) reload() у переключателя удалён; 4) запись
 * cookie camp_id в src/ единственная; 5) indexPageId-резолв корня на месте
 * (цель перехода всегда валидна).
 *
 * Запуск: node tmp-test-camp-switch.js
 */
const fs = require("fs");
const path = require("path");

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

const sidebar = fs.readFileSync("src/engine/DashboardSidebar.tsx", "utf-8");
const page = fs.readFileSync("src/app/[[...slug]]/page.tsx", "utf-8");

// Все записи cookie camp_id в src/ (переключатель должен остаться
// единственным местом смены кампании)
function walk(dir, acc) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p, acc);
    else if (/\.tsx?$/.test(entry.name)) {
      const content = fs.readFileSync(p, "utf-8");
      const matches = content.match(/document\.cookie = `camp_id=/g);
      if (matches) acc.push({ file: p.replace(/\\/g, "/"), count: matches.length });
    }
  }
  return acc;
}
const campWrites = walk("src", []);

check(
  "handler: cookie camp_id записывается с прежними параметрами",
  /document\.cookie = `camp_id=\$\{campId\}; path=\/; max-age=31536000; SameSite=Lax`/.test(sidebar),
);
check(
  'handler: переход на корень через window.location.replace("/")',
  sidebar.includes('window.location.replace("/")'),
);
check(
  "handler: window.location.reload() у переключателя удалён",
  !sidebar.includes("window.location.reload()"),
);
check(
  "src/: запись cookie camp_id единственная (только DashboardSidebar)",
  campWrites.length === 1 &&
    campWrites[0].file.endsWith("src/engine/DashboardSidebar.tsx") &&
    campWrites[0].count === 1,
);
check(
  "page.tsx: корень резолвится через indexPageId (цель перехода валидна)",
  page.includes("indexPageId") &&
    page.includes("getPageConfigByRoute(indexPage.route"),
);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);