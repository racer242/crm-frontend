# Справочник DataAdapterEngine CRM Platform

Система адаптеров для трансформации API-ответов в формат CRM.

---

## Что такое DataAdapterEngine

DataAdapterEngine — серверный модуль, применяющий адаптеры к данным API для преобразования в формат, совместимый с CRM.

**Ключевые особенности:**

- Работает **только на сервере**
- Два типа адаптеров: `replace`, `js`
- Рекурсивный обход данных
- Поддержка вложенных объектов и массивов

---

## Типы адаптеров

### Replace-адаптер

Словарная замена имён свойств и значений.

**Структура:**

```typescript
interface ReplaceAdapter {
  type: "replace";
  rules: Record<string, ReplaceRule>;
}

interface ReplaceRule {
  name?: string; // Новое имя свойства
  value?: any; // Новое значение (с поддержкой $value$)
}
```

**Как работает:**

1. Рекурсивно обходит все свойства объекта
2. Если свойство найдено в `rules`:
   - Имя заменяется на `rule.name`
   - Значение заменяется на `rule.value` (с макросом `$value$`)
   - Если `value` не задан — рекурсия вглубь
3. Если свойство не найдено — остаётся как есть, рекурсия

### Макрос `$value$`

Специальный макрос для подстановки исходного значения.

| Шаблон                                                   | Исходное значение | Результат                                               |
| -------------------------------------------------------- | ----------------- | ------------------------------------------------------- |
| `"$value$"`                                              | `"hello"`         | `"hello"`                                               |
| `"https://example.com/$value$"`                          | `"path"`          | `"https://example.com/path"`                            |
| `{ "type": "navigate", "params": { "url": "$value$" } }` | `"/users"`        | `{ "type": "navigate", "params": { "url": "/users" } }` |

**Поддержка вложенных объектов:**
Если `value` — объект, макрос `$value$` рекурсивно заменяется во всех строках.

### Примеры Replace-адаптера

**Базовый:**

```json
{
  "adapters": {
    "stats.replace": {
      "type": "replace",
      "rules": {
        "title": { "name": "label" },
        "count": { "name": "value" },
        "url": { "name": "command" }
      }
    }
  }
}
```

**Входные данные:**

```json
{ "title": "Users", "count": 42, "url": "/users" }
```

**Результат:**

```json
{ "label": "Users", "value": 42, "command": "/users" }
```

**С $value$ макросом:**

```json
{
  "adapters": {
    "menu.replace": {
      "type": "replace",
      "rules": {
        "title": { "name": "label" },
        "url": {
          "name": "command",
          "value": {
            "type": "navigate",
            "params": { "url": "$value$" }
          }
        }
      }
    }
  }
}
```

**Вход:** `{ "title": "Dashboard", "url": "/dashboard" }`

**Результат:**

```json
{
  "label": "Dashboard",
  "command": { "type": "navigate", "params": { "url": "/dashboard" } }
}
```

**Без value — рекурсия:**

```json
{
  "rules": {
    "data": { "name": "items" }
  }
}
```

**Вход:** `{ "data": { "name": "John", "age": 30 } }`

**Результат:** `{ "items": { "name": "John", "age": 30 } }`

---

### JS-адаптер

Произвольная трансформация данных через JavaScript.

**Структура:**

```typescript
interface JsAdapter {
  type: "js";
  script: string; // Путь к скрипту относительно public/
}
```

**Как работает:**

1. Загружает скрипт из `public/{scriptPath}`
2. Выполняет как функцию: `transform(data)` → transformedData
3. Если `transform` не найден — ищет `exports.default` или `exports.transform`

### Требования к скрипту

Скрипт должен содержать функцию `transform(data)`:

```javascript
function transform(data) {
  // Принимает исходные данные
  // Возвращает преобразованные
  return {
    items: data.items.map((item) => ({
      label: item.title,
      value: item.count,
    })),
  };
}
```

### Примеры JS-адаптера

**Конфигурация:**

```json
{
  "adapters": {
    "analytics.js": {
      "type": "js",
      "script": "adapters/analytics2menu.js"
    }
  }
}
```

**Файл `public/adapters/analytics2menu.js`:**

```javascript
function transform(data) {
  if (!data || !data.items) return [];
  return data.items.map((item) => ({
    label: item.title,
    command: { type: "navigate", params: { url: item.url } },
    badge: item.count || 0,
  }));
}
```

**Вход:**

```json
{
  "items": [
    { "title": "Users", "url": "/users", "count": 150 },
    { "title": "Orders", "url": "/orders", "count": 42 }
  ]
}
```

**Результат:**

```json
[
  {
    "label": "Users",
    "command": { "type": "navigate", "params": { "url": "/users" } },
    "badge": 150
  },
  {
    "label": "Orders",
    "command": { "type": "navigate", "params": { "url": "/orders" } },
    "badge": 42
  }
]
```

---

## Использование

### В dataFeed страницы

```json
{
  "dataFeed": [
    {
      "url": "/api/get-stats",
      "method": "GET",
      "target": "state",
      "adapter": "stats.replace"
    }
  ]
}
```

### В apiRoutes

```json
{
  "apiRoutes": [
    {
      "path": "get-stats",
      "url": "https://api.example.com/stats",
      "adapter": "analytics.js"
    }
  ]
}
```

---

## Алгоритм replace-адаптера

```
applyReplace(data, rules):
  Если null/undefined → вернуть как есть
  Если массив → применить к каждому элементу
  Если не объект → вернуть как есть

  result = {}
  Для каждого [key, value] в data:
    Если key есть в rules:
      targetKey = rule.name || key
      Если rule.value задан:
        result[targetKey] = replaceValueMacro(rule.value, value)
      Иначе:
        result[targetKey] = applyReplace(value, rules)
    Иначе:
      result[key] = applyReplace(value, rules)

  Вернуть result
```

---

## Обработка ошибок

| Ошибка                             | Описание                     |
| ---------------------------------- | ---------------------------- |
| `Unknown adapter type: xxx`        | Неизвестный тип адаптера     |
| `JS adapter script not found: xxx` | Скрипт не найден в `public/` |
| `JS adapter execution failed: xxx` | Ошибка выполнения скрипта    |

---

## Response-адаптеры (JS)

Response-адаптеры — это JS-скрипты в `config/adapters/`, которые преобразуют ответы API перед передачей в компонент.

### Общий файл `_shared.js`

Функции, общие для всех адаптеров, вынесены в `config/adapters/_shared.js`. Этот файл автоматически подгружается `DataAdapterEngine` перед выполнением любого JS-адаптера, поэтому его функции доступны во всех скриптах без дублирования.

**Доступные функции:**

| Функция                            | Описание                                                                        |
| ---------------------------------- | ------------------------------------------------------------------------------- |
| `formatSum(sum)`                   | Копейки → «1 234,56 ₽» (промо-инстанс; null/пусто → «—»)                        |
| `formatRubles(value)`              | Рубли с копейками → «590,30 ₽» (канал CRM-управления; деления на 100 нет)       |
| `getApiTimezone()`                 | Пояс сервера API: `BITRIX_API_TIMEZONE` из `.env`, по умолчанию `Europe/Moscow` |
| `toZonedDateTime(value, timeZone)` | Date/ISO (Z/offset) → настенное время пояса в формате `YYYY-MM-DD HH:mm:ss`     |

### Конвертация дат в пояс сервера (request-адаптеры статистики)

Даты `startDate`/`endDate` в `replacements` отчётов подставляются в SQL связанными параметрами, поэтому они должны быть в поясе хранения данных сервера, а не в «универсальном» ISO-мгновении. Адаптеры `stats.execute.request.js` и `stats.export.request.js` конвертируют их через `toZonedDateTime(value, getApiTimezone())`.

**Пример:**

- Вход: `"2026-09-01T00:00:00.000Z"` (браузер отправил Date → JSON → ISO UTC)
- Выход (при `BITRIX_API_TIMEZONE=Europe/Moscow`): `"2026-09-01 03:00:00"`

**Правила:**

1. Пустое значение → `null` — ключ в `replacements` не включается (прежнее поведение «пустые даты не отправляются»)
2. Невалидная дата → возвращается как есть (запрос не ломается)
3. Невалидная таймзона в env (`Intl` бросает `RangeError`) → fallback `Europe/Moscow`
4. Строка собирается через `formatToParts` с `hourCycle: "h23"` — полночь всегда «00», а не «24»

**Использование в адаптере:**

```javascript
const start = toZonedDateTime(base.startDate, getApiTimezone());
if (start) {
  result.replacements.startDate = start;
}
```

**Реализация в `_shared.js`:**

```javascript
/**
 * Пояс сервера API промо-инстанса для дат подстановки статистических
 * отчётов (replacements.startDate/endDate). Настраивается переменной
 * окружения BITRIX_API_TIMEZONE, по умолчанию — Europe/Moscow.
 */
function getApiTimezone() {
  try {
    return (
      (typeof process !== "undefined" &&
        process.env &&
        process.env.BITRIX_API_TIMEZONE) ||
      "Europe/Moscow"
    );
  } catch (e) {
    return "Europe/Moscow";
  }
}

/**
 * Конвертирует дату (Date | ISO-строка с Z/offset | timestamp) в настенное
 * время заданного пояса в формате "YYYY-MM-DD HH:mm:ss".
 *
 * Пустое значение → null (адаптер не включает ключ в replacements).
 * Невалидная дата → возвращается как есть (не ломаем запрос).
 * Невалидный пояс → fallback на Europe/Moscow (Intl бросает RangeError).
 */
function toZonedDateTime(value, timeZone) {
  if (value === undefined || value === null || value === "") return null;

  const date = value instanceof Date ? value : new Date(value);
  if (isNaN(date.getTime())) return value;

  const options = {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    // h23 — чтобы полночь была "00", а не "24" (hour12: false недостаточно)
    hourCycle: "h23",
  };

  let parts;
  try {
    parts = new Intl.DateTimeFormat("en-CA", {
      ...options,
      timeZone: timeZone || getApiTimezone(),
    }).formatToParts(date);
  } catch (e) {
    parts = new Intl.DateTimeFormat("en-CA", {
      ...options,
      timeZone: "Europe/Moscow",
    }).formatToParts(date);
  }

  const get = (type) => {
    const p = parts.find((x) => x.type === type);
    return p ? p.value : "";
  };

  return (
    get("year") + "-" + get("month") + "-" + get("day") +
    " " + get("hour") + ":" + get("minute") + ":" + get("second")
  );
}
```

---

### Стандартный формат ответа

Большинство response-адаптеров используют функцию `transform(source)`, которая преобразует ответ API в формат таблицы:

```javascript
function transform(source) {
  // 1. Преобразуем колонки
  const columns = (source.columns || []).map((col) => ({
    field: col.id,
    header: col.title || col.id,
    sortable: !!col.sortable,
    ...col.props,
  }));

  // 2. Преобразуем строки
  const value = (source.rows || []).map((row) => ({
    ...row.values,
    ...(row.id && { _rowId: row.id }),
  }));

  // 3. Возвращаем итоговый объект
  return {
    value,
    columns,
    totalRecords: source.meta?.total_count ?? value.length,
    // ... другие поля
  };
}
```

---

## API

```typescript
// Главная функция
function applyAdapter(data: any, adapter: Adapter): Promise<any>;

// Внутренние функции
function applyReplace(data: any, rules: Record<string, ReplaceRule>): any;
function applyJs(data: any, scriptPath: string): Promise<any>;
```
