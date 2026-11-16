# Спецификация: отчёт «Транзакции чат-бота»

Список обработанных транзакций (`bot_transaction_log`) с данными участника, задания и лиги. Фильтры + поиск + сортировка. Пагинация — на стороне сервера.

---

## 1. Преобразование запроса с фронта

### 1.1. Пагинация

Фронт передаёт `first` (offset) и `limit`. Серверу SQL-исполнителя уходят `page` и `limit`:

```javascript
const page = Math.floor(first / limit) + 1;
```

На сервер:

```json
{
  "page": 1,
  "limit": 20,
  "replacements": {},
  "sort": "processed_at_msk",
  "direction": -1,
  "search": "",
  "filters": []
}
```

В SQL **нет `LIMIT`/`OFFSET`**.

### 1.2. Сортировка

- `{{ORDER_BY}}` — SQL-выражение из белого списка (раздел 4) по имени колонки из `sort`.
- `{{ORDER_DIR}}` — `ASC` при `direction = 1`, иначе `DESC`.
- Если `sort` пуст, не найден в маппинге или значение маппинга `null` — дефолт отчёта: `processed_at_msk DESC`.

### 1.3. Безопасность подстановки

- Числа (границы `range`) — только цифры, иначе ошибка.
- Строки в `IN (...)` и `LIKE` — экранирование (`QUOTE()` / prepared statements).
- `ORDER BY` — только из белого списка.

---

## 2. SQL-запрос

```sql
SELECT
    tl.transaction_id,
    CONVERT_TZ(tl.processed_at, '+00:00', '+03:00') AS processed_at_msk,
    tl.type_code,
    tl.status,
    tl.points,
    tl.error_message,
    tl.avito_id,
    bu.telegram_id,
    bu.participant_code,
    BIN_TO_UUID(bu.user_id)                          AS user_id,
    TRIM(CONCAT_WS(' ', u.last_name, u.first_name, u.third_name)) AS full_name,
    u.email,
    COALESCE(dc.name, bu.category_code)              AS category_name,
    tl.task_code,
    tc.title                                         AS task_title,
    tc.segment,
    tl.league_code,
    COALESCE(dl.name, tl.league_code)                AS league_name
FROM bot_transaction_log tl
LEFT JOIN bot_users bu          ON bu.avito_id = tl.avito_id
LEFT JOIN `user` u              ON u.id = bu.user_id
LEFT JOIN dict_task_calendar tc ON tc.code = tl.task_code
LEFT JOIN dict_league dl        ON dl.code = tl.league_code
LEFT JOIN dict_category dc      ON dc.code = bu.category_code
WHERE 1=1
  {{TYPE_FILTER}}
  {{STATUS_FILTER}}
  {{DATE_FROM_FILTER}}
  {{DATE_TO_FILTER}}
  {{POINTS_FILTER}}
  {{LEAGUE_FILTER}}
  {{SEGMENT_FILTER}}
  {{SEARCH_FILTER}}
ORDER BY {{ORDER_BY}} {{ORDER_DIR}}
```

---

## 3. Описание колонок (JSON)

Контракт: `columns[].name` = ключ в `rows[].values`.

```json
[
  {
    "name": "transaction_id",
    "type": "string",
    "title": "ID транзакции",
    "sortable": true
  },
  {
    "name": "processed_at_msk",
    "type": "datetime",
    "title": "Дата обработки (МСК)",
    "sortable": true
  },
  {
    "name": "type_code",
    "type": "string",
    "title": "Тип транзакции",
    "sortable": true
  },
  {
    "name": "status",
    "type": "string",
    "title": "Статус обработки",
    "sortable": true
  },
  { "name": "points", "type": "number", "title": "Баллы", "sortable": true },
  {
    "name": "avito_id",
    "type": "string",
    "title": "Avito ID",
    "sortable": true
  },
  {
    "name": "telegram_id",
    "type": "number",
    "title": "Telegram ID",
    "sortable": true
  },
  {
    "name": "participant_code",
    "type": "string",
    "title": "Код участника",
    "sortable": true
  },
  {
    "name": "user_id",
    "type": "string",
    "title": "ID участника (пром.)",
    "sortable": true
  },
  { "name": "full_name", "type": "string", "title": "ФИО", "sortable": false },
  { "name": "email", "type": "string", "title": "Email", "sortable": true },
  {
    "name": "category_name",
    "type": "string",
    "title": "Категория",
    "sortable": true
  },
  {
    "name": "task_code",
    "type": "string",
    "title": "Код задания",
    "sortable": true
  },
  {
    "name": "task_title",
    "type": "string",
    "title": "Название задания",
    "sortable": true
  },
  { "name": "segment", "type": "string", "title": "Сегмент", "sortable": true },
  {
    "name": "league_code",
    "type": "string",
    "title": "Код лиги",
    "sortable": true
  },
  {
    "name": "league_name",
    "type": "string",
    "title": "Лига",
    "sortable": true
  },
  {
    "name": "error_message",
    "type": "string",
    "title": "Причина ошибки",
    "sortable": false
  }
]
```

---

## 4. Маппинг сортировки

Имя колонки → SQL-выражение для `{{ORDER_BY}}`. `null` = колонка не сортируется (фронт не показывает стрелку, запрос игнорируется и уходит в дефолт).

```json
{
  "transaction_id": "tl.transaction_id",
  "processed_at_msk": "tl.processed_at",
  "type_code": "tl.type_code",
  "status": "tl.status",
  "points": "tl.points",
  "avito_id": "tl.avito_id",
  "telegram_id": "bu.telegram_id",
  "participant_code": "bu.participant_code",
  "user_id": "bu.user_id",
  "full_name": null,
  "email": "u.email",
  "category_name": "category_name",
  "task_code": "tl.task_code",
  "task_title": "tc.title",
  "segment": "tc.segment",
  "league_code": "tl.league_code",
  "league_name": "league_name",
  "error_message": null
}
```

Правило формирования:

```javascript
const DEFAULT_SORT = "processed_at_msk";
const DEFAULT_DIR = "DESC";

function buildOrderMacros(sort, direction, mapping) {
  const expr = sort && mapping[sort] ? mapping[sort] : mapping[DEFAULT_SORT];
  return {
    ORDER_BY: expr,
    ORDER_DIR: direction === 1 ? "ASC" : "DESC",
  };
}
```

`category_name` и `league_name` сортируются по алиасу — MySQL `ORDER BY` допускает алиасы из `SELECT`, дублировать `COALESCE` не нужно.

---

## 5. Фильтры

### 5.1. Описание (JSON)

```json
[
  {
    "id": "type_code",
    "name": "Тип транзакции",
    "type": "options",
    "opts": ["Начисление баллов", "Назначение лиги"],
    "mapping": { "0": "TASK", "1": "LEAGUE" }
  },
  {
    "id": "status",
    "name": "Статус обработки",
    "type": "options",
    "opts": ["Успешно", "Ошибка"],
    "mapping": { "0": "success", "1": "error" }
  },
  {
    "id": "processed_date",
    "name": "Период обработки",
    "type": "period",
    "column": "tl.processed_at"
  },
  {
    "id": "points",
    "name": "Баллы",
    "type": "range",
    "column": "tl.points",
    "opts": [0, 100]
  },
  {
    "id": "league_code",
    "name": "Лига",
    "type": "options",
    "opts": [
      "Cargo_S",
      "Cargo_ML",
      "Cargo_ML_big",
      "Evacuation_S",
      "Evacuation_ML",
      "Evacuation_ML_big",
      "Passenger_S",
      "Passenger_ML",
      "Passenger_ML_big"
    ],
    "mapping": {
      "0": "Cargo_S",
      "1": "Cargo_ML",
      "2": "Cargo_ML_big",
      "3": "Evacuation_S",
      "4": "Evacuation_ML",
      "5": "Evacuation_ML_big",
      "6": "Passenger_S",
      "7": "Passenger_ML",
      "8": "Passenger_ML_big"
    }
  },
  {
    "id": "segment",
    "name": "Сегмент",
    "type": "options",
    "opts": ["S", "ML", "ML_big"],
    "mapping": { "0": "S", "1": "ML", "2": "ML_big" }
  }
]
```

`opts` для `type_code` расширяются из `dict_transaction_types`, для лиг — из `dict_league`.

### 5.2. Правила формирования макросов

**options** (`type_code`, `status`, `league_code`, `segment`) — общий шаблон:

```javascript
const sel = value
  .map((v, i) => (v ? mapping[i] : null))
  .filter((v) => v !== null);
if (sel.length === 0 || sel.length === Object.keys(mapping).length) return "";
const col = {
  type_code: "tl.type_code",
  status: "tl.status",
  league_code: "tl.league_code",
  segment: "tc.segment",
}[id];
return `AND ${col} IN (${sel.map((s) => `'${s}'`).join(", ")})`;
```

**period** (`processed_date`). Параметр — строка МСК `YYYY-MM-DD HH:MM:SS`; хранение бота — UTC, поэтому конвертируем МСК→UTC:

```javascript
if (!value || value.length !== 2) return { from: "", to: "" };
const [from, to] = value;
return {
  from: `AND tl.processed_at >= CONVERT_TZ('${from}', '+03:00', '+00:00')`,
  to: `AND tl.processed_at <= CONVERT_TZ('${to}',   '+03:00', '+00:00')`,
};
```

Если параметры приходят уже в UTC — уберите `CONVERT_TZ` в `WHERE`.

**range** (`points`):

```javascript
const [min, max] = value;
const c = [];
if (min !== null && min !== undefined) c.push(`tl.points >= ${min}`);
if (max !== null && max !== undefined) c.push(`tl.points <= ${max}`);
return c.length ? `AND ${c.join(" AND ")}` : "";
```

---

## 6. Поиск

### 6.1. Поля поиска

`transaction_id`, `avito_id`, `task_code`, `league_code`, `user_id` (UUID участника), `participant_code`, `telegram_id`, `email`, `first_name`, `last_name`, `title` (название задания).

Drill-down по участнику — вставкой полного или частичного UUID в строку поиска. Отдельного фильтра по UUID нет.

### 6.2. Правило формирования `SEARCH_FILTER`

```javascript
if (!search || !search.trim()) return "";
const e = search.replace(/[%_']/g, "\\$&");
return `AND (
  tl.transaction_id LIKE '%${e}%' OR
  tl.avito_id LIKE '%${e}%' OR
  tl.task_code LIKE '%${e}%' OR
  tl.league_code LIKE '%${e}%' OR
  BIN_TO_UUID(bu.user_id) LIKE '%${e}%' OR
  bu.participant_code LIKE '%${e}%' OR
  CAST(bu.telegram_id AS CHAR) LIKE '%${e}%' OR
  u.email LIKE '%${e}%' OR
  u.first_name LIKE '%${e}%' OR
  u.last_name LIKE '%${e}%' OR
  tc.title LIKE '%${e}%'
)`;
```

UUID не валидируется регуляркой — это обычная строка поиска, частичное совпадение допустимо.

---

## 7. Пример объекта макросов (JSON)

```json
{
  "TYPE_FILTER": "AND tl.type_code IN ('TASK')",
  "STATUS_FILTER": "AND tl.status IN ('error')",
  "DATE_FROM_FILTER": "AND tl.processed_at >= CONVERT_TZ('2026-11-01 00:00:00', '+03:00', '+00:00')",
  "DATE_TO_FILTER": "AND tl.processed_at <= CONVERT_TZ('2026-11-30 23:59:59', '+03:00', '+00:00')",
  "POINTS_FILTER": "",
  "LEAGUE_FILTER": "",
  "SEGMENT_FILTER": "",
  "SEARCH_FILTER": "AND (tl.transaction_id LIKE '%01a0a9eb%' OR tl.avito_id LIKE '%01a0a9eb%' OR tl.task_code LIKE '%01a0a9eb%' OR tl.league_code LIKE '%01a0a9eb%' OR BIN_TO_UUID(bu.user_id) LIKE '%01a0a9eb%' OR bu.participant_code LIKE '%01a0a9eb%' OR CAST(bu.telegram_id AS CHAR) LIKE '%01a0a9eb%' OR u.email LIKE '%01a0a9eb%' OR u.first_name LIKE '%01a0a9eb%' OR u.last_name LIKE '%01a0a9eb%' OR tc.title LIKE '%01a0a9eb%')",
  "ORDER_BY": "tl.processed_at",
  "ORDER_DIR": "DESC"
}
```

---

## 8. Преобразование ответа

### 8.1. Структура ответа сервера

```json
{
  "columns": [],
  "rows": [],
  "filters": [],
  "search": "",
  "pagination": {
    "page": 1,
    "limit": 20,
    "total_items": 12480,
    "total_pages": 624
  }
}
```

### 8.2. Преобразование значений

| Тип БД                 | Тип в `values`      | Правило                                                                  |
| ---------------------- | ------------------- | ------------------------------------------------------------------------ |
| `BINARY(16)`           | `string`            | `BIN_TO_UUID()` в SQL                                                    |
| `INT` (баллы)          | `number`            | как есть, не делить                                                      |
| `BIGINT` (telegram_id) | `number`            | как есть                                                                 |
| `DATETIME` (вывод)     | `string`            | ISO-8601 `YYYY-MM-DDTHH:MM:SS+03:00`; `processed_at_msk` уже МСК из SQL  |
| `VARCHAR` (enum)       | `string` + `_label` | машинное значение + человекочитаемое (`type_code_label`, `status_label`) |
| `NULL`                 | `null`              | в JSON                                                                   |

### 8.3. Формирование `rows` и `meta`

```javascript
rows = result.rows.map((row, index) => ({
  id: (pagination.page - 1) * pagination.limit + index + 1,
  values: transformRow(row),
}));

meta = {
  total_count: pagination.total_items,
  first: (pagination.page - 1) * pagination.limit,
  limit: pagination.limit,
  sort: request.sort,
  direction: request.direction === 1 ? "asc" : "desc",
};
```

`filters` возвращаются с текущими `value` (состояние формы), для `options` — с `opts` и `type`.

---

## 9. Нюансы

1. **Таймзоны.** `bot_*` хранит даты в UTC: период конвертируется МСК→UTC в `WHERE`, вывод UTC→МСК. `dict_task_calendar` лежит в `promo_instance` (даты МСК), но в этом отчёте выводятся только `title`/`segment`, без дат.
2. **Фильтры `points` и `segment` отсекают NULL.** У LEAGUE-транзакций `points` и `task_code` пустые, поэтому при активном фильтре по баллам или сегменту они не попадут — это ожидаемо.
3. **`LEFT JOIN`** сохраняет ошибочные транзакции и транзакции по удалённым/несвязанным участникам (поля участника — `NULL`).
4. **Производительность поиска.** `BIN_TO_UUID(bu.user_id) LIKE '%…%'` и `CAST(bu.telegram_id AS CHAR) LIKE` не используют индексы. Для частых точных срезов по участнику имеет смысл вернуть отдельный точный макрос `bu.user_id = UUID_TO_BIN(...)` параллельно с поиском.
5. **Дефолт сортировки** — `processed_at_msk DESC` (дата обработки — событийная дата этого отчёта).
