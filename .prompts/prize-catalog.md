# Спецификация: отчёт «Справочник призов» (`prize_catalog`)

Список позиций каталога призов. Фильтры по `active` и `is_removed`, поиск, сортировка. Пагинация — на стороне сервера.

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
  "sort": "created_at",
  "direction": -1,
  "search": "",
  "filters": []
}
```

В SQL **нет `LIMIT`/`OFFSET`**.

### 1.2. Сортировка

- `{{ORDER_BY}}` — SQL-выражение из белого списка (раздел 4) по имени колонки из `sort`.
- `{{ORDER_DIR}}` — `ASC` при `direction = 1`, иначе `DESC`.
- Если `sort` пуст, не найден в маппинге или значение маппинга `null` — дефолт: `created_at DESC`.

### 1.3. Безопасность подстановки

- Числа (значения маппинга фильтров) — только `0`/`1`, иначе ошибка.
- Строки в `LIKE` — экранирование (`%`, `_`, апостроф).
- `ORDER BY` — только из белого списка.

---

## 2. SQL-запрос

```sql
SELECT
    BIN_TO_UUID(pc.id)          AS prize_id,
    pc.code,
    pc.type_code,
    pc.title,
    pc.description,
    ROUND(pc.price / 100, 2)    AS price_rub,
    pc.points_cost,
    pc.act_required,
    pc.active,
    pc.is_removed,
    pc.target_count,
    pc.image,
    pc.image_source_url,
    pc.created_at,
    pc.updated_at
FROM prize_catalog pc
WHERE 1=1
  {{ACTIVE_FILTER}}
  {{IS_REMOVED_FILTER}}
  {{SEARCH_FILTER}}
ORDER BY {{ORDER_BY}} {{ORDER_DIR}}
```

---

## 3. Описание колонок (JSON)

Контракт: `columns[].name` = ключ в `rows[].values`.

```json
[
  {
    "name": "prize_id",
    "type": "string",
    "title": "ID приза",
    "sortable": true
  },
  { "name": "code", "type": "string", "title": "Код в CRM", "sortable": true },
  {
    "name": "type_code",
    "type": "string",
    "title": "Группа (тип)",
    "sortable": true
  },
  { "name": "title", "type": "string", "title": "Название", "sortable": true },
  {
    "name": "description",
    "type": "string",
    "title": "Описание",
    "sortable": false
  },
  {
    "name": "price_rub",
    "type": "number",
    "title": "Стоимость, ₽ (для акта)",
    "sortable": true
  },
  {
    "name": "points_cost",
    "type": "number",
    "title": "Цена в баллах",
    "sortable": true
  },
  {
    "name": "act_required",
    "type": "boolean",
    "title": "Нужен акт получения",
    "sortable": true
  },
  {
    "name": "active",
    "type": "boolean",
    "title": "Видимость участнику",
    "sortable": true
  },
  {
    "name": "is_removed",
    "type": "boolean",
    "title": "Нет в плане CRM",
    "sortable": true
  },
  {
    "name": "target_count",
    "type": "number",
    "title": "Плановое кол-во экземпляров",
    "sortable": true
  },
  {
    "name": "image",
    "type": "string",
    "title": "Картинка (локальный адрес)",
    "sortable": false
  },
  {
    "name": "image_source_url",
    "type": "string",
    "title": "Источник картинки",
    "sortable": false
  },
  {
    "name": "created_at",
    "type": "datetime",
    "title": "Дата создания",
    "sortable": true
  },
  {
    "name": "updated_at",
    "type": "datetime",
    "title": "Дата обновления",
    "sortable": true
  }
]
```

---

## 4. Маппинг сортировки

Имя колонки → SQL-выражение для `{{ORDER_BY}}`. `null` = не сортируется (фронт не показывает стрелку, запрос уходит в дефолт).

```json
{
  "prize_id": "pc.id",
  "code": "pc.code",
  "type_code": "pc.type_code",
  "title": "pc.title",
  "description": null,
  "price_rub": "pc.price",
  "points_cost": "pc.points_cost",
  "act_required": "pc.act_required",
  "active": "pc.active",
  "is_removed": "pc.is_removed",
  "target_count": "pc.target_count",
  "image": null,
  "image_source_url": null,
  "created_at": "pc.created_at",
  "updated_at": "pc.updated_at"
}
```

Правило формирования (дефолт — `created_at DESC`):

```javascript
const DEFAULT_SORT = "created_at";

function buildOrderMacros(sort, direction, mapping) {
  const expr = sort && mapping[sort] ? mapping[sort] : mapping[DEFAULT_SORT];
  return {
    ORDER_BY: expr,
    ORDER_DIR: direction === 1 ? "ASC" : "DESC",
  };
}
```

`price_rub` сортируется по `pc.price` (копейки) — порядок тот же, что у рублей.

---

## 5. Фильтры

### 5.1. Описание (JSON)

```json
[
  {
    "id": "active",
    "name": "Видимость участнику",
    "type": "options",
    "opts": ["Видимые", "Скрытые"],
    "mapping": { "0": 1, "1": 0 }
  },
  {
    "id": "is_removed",
    "name": "Наличие в плане CRM",
    "type": "options",
    "opts": ["В плане", "Вне плана"],
    "mapping": { "0": 0, "1": 1 }
  }
]
```

### 5.2. Правило формирования макросов

Значения маппинга числовые (`0`/`1`), подставляются без кавычек:

```javascript
const sel = value
  .map((v, i) => (v ? mapping[i] : null))
  .filter((v) => v !== null);
if (sel.length === 0 || sel.length === Object.keys(mapping).length) return "";
const col = { active: "pc.active", is_removed: "pc.is_removed" }[id];
return `AND ${col} IN (${sel.join(", ")})`;
```

- Ничего не выбрано или выбрано всё → макрос пустой (фильтр не применяется).
- «Видимые» → `AND pc.active IN (1)`; «Скрытые» → `AND pc.active IN (0)`.
- «В плане» → `AND pc.is_removed IN (0)`; «Вне плана» → `AND pc.is_removed IN (1)`.

---

## 6. Поиск

### 6.1. Поля поиска

`prize_id` (UUID приза), `code`, `type_code`, `title`, `description`.

Drill-down по конкретному призу — вставкой полного или частичного UUID в строку поиска. Сравнение регистронезависимое (`utf8mb4_unicode_ci`), поэтому `LIKE` по `code`/`type_code`/`title` находит и верхний, и нижний регистр.

### 6.2. Правило формирования `SEARCH_FILTER`

```javascript
if (!search || !search.trim()) return "";
const e = search.replace(/[%_']/g, "\\$&");
return `AND (
  BIN_TO_UUID(pc.id) LIKE '%${e}%' OR
  pc.code LIKE '%${e}%' OR
  pc.type_code LIKE '%${e}%' OR
  pc.title LIKE '%${e}%' OR
  pc.description LIKE '%${e}%'
)`;
```

UUID не валидируется регуляркой — это обычная строка поиска, частичное совпадение допустимо.

---

## 7. Пример объекта макросов (JSON)

Витрина каталога: только видимые и в плане, поиск по названию/коду, по названию:

```json
{
  "ACTIVE_FILTER": "AND pc.active IN (1)",
  "IS_REMOVED_FILTER": "AND pc.is_removed IN (0)",
  "SEARCH_FILTER": "AND (BIN_TO_UUID(pc.id) LIKE '%сертификат%' OR pc.code LIKE '%сертификат%' OR pc.type_code LIKE '%сертификат%' OR pc.title LIKE '%сертификат%' OR pc.description LIKE '%сертификат%')",
  "ORDER_BY": "pc.title",
  "ORDER_DIR": "ASC"
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
  "pagination": { "page": 1, "limit": 20, "total_items": 42, "total_pages": 3 }
}
```

### 8.2. Преобразование значений

| Тип БД                   | Тип в `values` | Правило                                                             |
| ------------------------ | -------------- | ------------------------------------------------------------------- |
| `BINARY(16)`             | `string`       | `BIN_TO_UUID()` в SQL                                               |
| `INT` (копейки, `price`) | `number`       | делить на 100, `ROUND(..., 2)`                                      |
| `INT` (баллы, счётчики)  | `number`       | как есть, не делить                                                 |
| `TINYINT` (булевы)       | `boolean`      | `0` → `false`, `1` → `true`                                         |
| `DATETIME`               | `string`       | ISO-8601 `YYYY-MM-DDTHH:MM:SS+03:00`; даты уже МСК, без конвертации |
| `LONGTEXT` / `VARCHAR`   | `string`       | как есть                                                            |
| `NULL`                   | `null`         | в JSON                                                              |

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

1. **Два флага независимы**: `active` — показ участнику, `is_removed` — наличие в плане CRM. Комбинация «Видимые + В плане» даёт актуальную витрину. Без фильтров выгружаются все позиции, включая скрытые и выведенные из плана.
2. **Деньги и баллы**: `price` в копейках (делится на 100), `points_cost` — баллы (не делятся).
3. **Даты** — в поясе акции (МСК), выводятся как есть, без `CONVERT_TZ`.
4. **Производительность поиска**: `BIN_TO_UUID(pc.id) LIKE '%…%'` и `LIKE` по `description` (`LONGTEXT`) не используют индексы. Для каталога небольшого объёма это приемлемо; при росте — ограничить поиск по `description` или вынести точный фильтр по UUID.
5. **Дефолт сортировки** — `created_at DESC`.
