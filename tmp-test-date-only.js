/**
 * Временный тест-стенд: контракт period-фильтров «календарная дата вне
 * поясов» (date-only wall-date). Проверяются:
 *  1) утилиты src/utils/date.ts — formatDateOnly/parseDateOnly
 *     (автономная компиляция tsc, как в tmp-test-filter-empty.js);
 *  2) хелпер config/adapters/_shared.js — toWallPeriodBound (загрузка через
 *     new Function, как DataAdapterEngine.applyJs): 'YYYY-MM-DD' →
 *     начало/конец дня пояса хранения, ISO-полночь пояса → снап to на конец
 *     дня, явно выбранное время — как есть.
 *
 * Запуск: node tmp-test-date-only.js
 */
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

let pass = 0;
let failed = 0;
function check(name, actual, expected) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) {
    pass++;
    console.log("PASS", name);
  } else {
    failed++;
    console.log("FAIL", name, "\n  actual:  ", a, "\n  expected:", e);
  }
}

// ── 1. Утилиты дат (src/utils/date.ts) ──────────────────────────────────
execSync(
  "npx tsc src/utils/date.ts --outDir tmp-standalone-date --module commonjs --target es2020 --strict --skipLibCheck",
  { stdio: "pipe" },
);
const { formatDateOnly, parseDateOnly } = require("./tmp-standalone-date/date.js");

check("formatDateOnly: локальные части → YYYY-MM-DD", formatDateOnly(new Date(2026, 10, 16)), "2026-11-16");
check("formatDateOnly: паддинг месяца/дня", formatDateOnly(new Date(2026, 0, 5)), "2026-01-05");
const parsed = parseDateOnly("2026-11-16");
check("parseDateOnly: строка → локальные части (год/месяц/день)", parsed !== null && parsed.getFullYear() === 2026 && parsed.getMonth() === 10 && parsed.getDate() === 16, true);
check("parseDateOnly: раундтрип (нет сдвига пояса)", formatDateOnly(parsed), "2026-11-16");
check("parseDateOnly: не-ISO формат → null", parseDateOnly("16.11.2026"), null);
check("parseDateOnly: нереальная дата → null (без прокрутки)", parseDateOnly("2026-02-30"), null);
check("parseDateOnly: с временем → null (не date-only)", parseDateOnly("2026-11-16T00:00:00Z"), null);

// ── 2. Хелпер границ периода (config/adapters/_shared.js) ───────────────
delete process.env.BITRIX_API_TIMEZONE; // дефолт Europe/Moscow — как на стенде
const sharedSrc = fs.readFileSync(path.join(__dirname, "config/adapters/_shared.js"), "utf8");
const toWallPeriodBound = new Function(`${sharedSrc}; return toWallPeriodBound;`)();

check("bound: date-only from → начало дня", toWallPeriodBound("2026-11-16", "from"), "2026-11-16 00:00:00");
check("bound: date-only to → конец дня", toWallPeriodBound("2026-11-16", "to"), "2026-11-16 23:59:59");
check("bound: ISO-полночь МСК, to → конец дня", toWallPeriodBound("2026-11-15T21:00:00Z", "to"), "2026-11-16 23:59:59");
check("bound: ISO-полночь МСК, from → начало дня", toWallPeriodBound("2026-11-15T21:00:00Z", "from"), "2026-11-16 00:00:00");
check("bound: явное время не трогаем (to)", toWallPeriodBound("2026-11-10T23:59:59Z", "to"), "2026-11-11 02:59:59");
check("bound: явное время не трогаем (from)", toWallPeriodBound("2026-11-01T00:00:00Z", "from"), "2026-11-01 03:00:00");
check("bound: null → null", toWallPeriodBound(null, "to"), null);
check("bound: пустая строка → null", toWallPeriodBound("", "from"), null);
check("bound: мусор проходит как есть (не ломаем запрос)", toWallPeriodBound("мусор", "to"), "мусор");

fs.rmSync(path.join(__dirname, "tmp-standalone-date"), { recursive: true, force: true });

if (failed) {
  console.log(`\nFAILED: ${failed} (passed ${pass})`);
  process.exit(1);
}
console.log(`\nAll ${pass} checks passed`);