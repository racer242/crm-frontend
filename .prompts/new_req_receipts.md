# Спецификация: отчёт «Просмотр чеков»

## 1. Преобразование запроса с фронта

### 1.1. Пагинация

Фронт передаёт `first` (offset) и `limit` (размер страницы). Серверу SQL-исполнителя уходят `page` (номер страницы, начиная с 1) и `limit`.

```javascript
const page = Math.floor(first / limit) + 1;
// first=0,  limit=20 → page=1
// first=20, limit=20 → page=2
// first=40, limit=20 → page=3
```

На сервер уходит:

```json
{
  "page": 1,
  "limit": 20,
  "replacements": { ... },
  "sort": "registration_date",
  "direction": "desc",
  "search": "",
  "filters": [...]
}
```

В SQL-запросе **нет `LIMIT` и `OFFSET`** — пагинацию делает сервер сам.

### 1.2. Сортировка

| Параметр фронта | Макрос в SQL                                            |
| --------------- | ------------------------------------------------------- |
| `sort`          | `{{ORDER_BY}}` — имя колонки/выражения из белого списка |
| `direction`     | `{{ORDER_DIR}}` — `'ASC'` при `1`, `'DESC'` при `-1`    |

Если `sort` не в белом списке или колонка не `sortable` — используется дефолт (`registration_date DESC`).

### 1.3. Фильтры по типу

Фильтр имеет `id`, `type`, `opts` (опционально) и `value`. Преобразование зависит от `type`:

#### `options` (мультивыбор)

`value` — массив булевых длиной как `opts`. Индексу `i` соответствует значение БД из маппинга (задаётся в конфигурации фильтра).

```
opts: ['На проверке', 'Принят', 'Отклонён', 'Отложен', 'Требуется загрузка фото']
mapping: {0: 'CHECKING', 1: 'ACCEPTED', 2: 'REFUSED', 3: 'SUSPENDED', 4: 'NEED_PHOTO'}
value: [false, true, true, true, false]
→ макрос: "AND r.status IN ('ACCEPTED', 'REFUSED', 'SUSPENDED')"
```

- Если все `false` → макрос пустой (фильтр не применяется).
- Если все `true` → макрос тоже пустой (нет смысла ограничивать).

#### `period` (период)

`value: [fromISO, toISO]` или `null`. Даты приходят в UTC (`Z` на конце), в базе `DATETIME` трактуется как MSK — нужна конвертация.

```
value: ['2026-09-01T00:00:00.000Z', '2026-09-30T23:59:59.000Z']
column: 'r.created_at'
→ макросы:
   "REGISTRATION_DATE_FROM_FILTER": "AND r.created_at >= CONVERT_TZ('2026-09-01 03:00:00', '+00:00', '+03:00')"
   "REGISTRATION_DATE_TO_FILTER":   "AND r.created_at <= CONVERT_TZ('2026-10-01 02:59:59', '+00:00', '+03:00')"
```

Если `value === null` — оба макроса пустые.

#### `range` (числовой диапазон)

`value: [min, max]`. Оба числа, применяются через `BETWEEN` или сравнения.

```
value: [0, 985]
column: 'promo_products_amount'
→ макрос: "AND promo_products_amount BETWEEN 0 AND 985"
```

Если одна из границ `null` — используется только `>=` или `<=`.

#### `checkbox` (одиночный чекбокс)

`value: true | false | null`.

```
value: true  → макрос: "AND promo_products_count > 0"
value: false → макрос: "AND promo_products_count = 0"
value: null  → макрос: ""
```

### 1.4. Поиск (`search`)

Строка, применяется через `LIKE '%value%'` по нескольким полям. Значение экранируется (`%` и `_` заменяются, апострофы — удваиваются).

```
search: 'ivanov'
→ макрос: "AND (r.fn LIKE '%ivanov%' OR r.fp LIKE '%ivanov%' OR r.fd LIKE '%ivanov%' OR u.participant_code LIKE '%ivanov%' OR u.first_name LIKE '%ivanov%' OR u.last_name LIKE '%ivanov%' OR u.email LIKE '%ivanov%')"
```

Если `search === ''` — макрос пустой.

### 1.5. Безопасность подстановки

- Числа (`LIMIT`, `OFFSET`, границы `range`) — только цифры, иначе ошибка.
- Строки в `IN (...)` и `LIKE` — обязательное экранирование (prepared statements или `QUOTE()`).
- Имена колонок в `ORDER BY` — только из белого списка.

---

## 2. SQL-запрос

```sql
SELECT * FROM (
    SELECT
        BIN_TO_UUID(r.id)                          AS receipt_id,
        r.created_at                               AS registration_date,
        r.purchase_at                              AS purchase_date,
        u.participant_code,
        TRIM(CONCAT_WS(' ', u.first_name, u.last_name)) AS full_name,
        u.email,
        COALESCE(ri_agg.promo_count, 0)            AS promo_products_count,
        ROUND(COALESCE(ri_agg.promo_sum, 0) / 100, 2) AS promo_products_amount,
        ROUND(r.sum / 100, 2)                      AS total_amount,
        CASE
            WHEN r.store_name LIKE '%Магнит%' THEN 'Магнит'
            WHEN r.store_name LIKE '%Пятёрочка%' OR r.store_name LIKE '%Пятерочка%' THEN 'Пятёрочка'
            ELSE 'Другие'
        END                                        AS retail_chain,
        r.fns_status,
        r.status                                   AS moderation_status,
        BIN_TO_UUID(r.user_id)                     AS user_id,
        r.fn,
        r.fp,
        r.fd
    FROM receipt r
    JOIN `user` u ON u.id = r.user_id
    LEFT JOIN (
        SELECT
            receipt_id,
            COUNT(*) AS promo_count,
            SUM(price * quantity) AS promo_sum
        FROM receipt_item
        WHERE accepted = 1
        GROUP BY receipt_id
    ) ri_agg ON ri_agg.receipt_id = r.id
    WHERE 1=1
      {{MODERATION_STATUS_FILTER}}
      {{FNS_STATUS_FILTER}}
      {{RETAIL_CHAIN_FILTER}}
      {{REGISTRATION_DATE_FROM_FILTER}}
      {{REGISTRATION_DATE_TO_FILTER}}
      {{PURCHASE_DATE_FROM_FILTER}}
      {{PURCHASE_DATE_TO_FILTER}}
      {{SEARCH_FILTER}}
) t
WHERE 1=1
  {{PROMO_AMOUNT_FILTER}}
  {{HAS_PROMO_FILTER}}
ORDER BY {{ORDER_BY}} {{ORDER_DIR}}
```

---

## 3. Описание колонок (JSON)

`receipt_id` и `user_id` присутствуют в SQL для внутренних нужд, но не выводятся в UI.

```json
[
  {
    "name": "registration_date",
    "title": "Дата регистрации",
    "type": "date",
    "sortable": true,
    "props": {}
  },
  {
    "name": "purchase_date",
    "title": "Дата покупки",
    "type": "date",
    "sortable": true,
    "props": {}
  },
  {
    "name": "participant_code",
    "title": "Код участника",
    "type": "string",
    "sortable": true,
    "props": {}
  },
  {
    "name": "full_name",
    "title": "Имя и фамилия",
    "type": "string",
    "sortable": false,
    "props": {}
  },
  {
    "name": "email",
    "title": "Email",
    "type": "string",
    "sortable": true,
    "props": {}
  },
  {
    "name": "promo_products_count",
    "title": "Акционных продуктов",
    "type": "number",
    "sortable": false,
    "props": {}
  },
  {
    "name": "promo_products_amount",
    "title": "Сумма акционных",
    "type": "number",
    "sortable": false,
    "props": {}
  },
  {
    "name": "total_amount",
    "title": "Сумма чека",
    "type": "number",
    "sortable": true,
    "props": {}
  },
  {
    "name": "retail_chain",
    "title": "Торговая сеть",
    "type": "string",
    "sortable": true,
    "props": {}
  },
  {
    "name": "fns_status",
    "title": "Статус ФНС",
    "type": "string",
    "sortable": true,
    "props": {}
  },
  {
    "name": "moderation_status",
    "title": "Статус модерации",
    "type": "string",
    "sortable": true,
    "props": {}
  }
]
```

---

## 4. Маппинг сортировки (JSON)

Ключи соответствуют `name` колонок. Если значение `null` — сортировка по этому полю игнорируется, используется дефолт.

```json
{
  "registration_date": "registration_date",
  "purchase_date": "purchase_date",
  "participant_code": "participant_code",
  "full_name": null,
  "email": "email",
  "promo_products_count": null,
  "promo_products_amount": null,
  "total_amount": "total_amount",
  "retail_chain": "retail_chain",
  "fns_status": "fns_status",
  "moderation_status": "moderation_status"
}
```

---

## 5. Описание фильтров с маппингами (JSON)

```json
[
  {
    "id": "moderation_status",
    "name": "Статус модерации",
    "type": "options",
    "opts": [
      "На проверке",
      "Принят",
      "Отклонён",
      "Отложен",
      "Требуется загрузка фото"
    ],
    "mapping": {
      "0": "CHECKING",
      "1": "ACCEPTED",
      "2": "REFUSED",
      "3": "SUSPENDED",
      "4": "NEED_PHOTO"
    }
  },
  {
    "id": "fns_status",
    "name": "Статус ФНС",
    "type": "options",
    "opts": ["Не проверен", "Ожидает ФНС", "Не найден в ФНС", "Чек корректный"],
    "mapping": { "0": "no_check", "1": "wait", "2": "wrong", "3": "correct" }
  },
  {
    "id": "retail_chain",
    "name": "Торговая сеть",
    "type": "options",
    "opts": ["Другие", "Магнит", "Пятёрочка"],
    "mapping": { "0": "OTHER", "1": "MAGNIT", "2": "PYATEROCHKA" }
  },
  {
    "id": "registration_date",
    "name": "Период регистрации",
    "type": "period",
    "column": "r.created_at"
  },
  {
    "id": "purchase_date",
    "name": "Период покупки",
    "type": "period",
    "column": "r.purchase_at"
  },
  {
    "id": "promo_products_amount",
    "name": "Сумма акционных продуктов, ₽",
    "type": "range",
    "column": "promo_products_amount",
    "opts": [0, 10000]
  },
  {
    "id": "has_promo_products",
    "name": "Есть акционные продукты",
    "type": "checkbox"
  }
]
```

---

## 6. Правила формирования макросов

### `moderation_status` (options)

```javascript
const selected = value
  .map((v, i) => (v ? mapping[i] : null))
  .filter((v) => v !== null);

if (selected.length === 0 || selected.length === Object.keys(mapping).length) {
  return "";
}
return `AND r.status IN (${selected.map((s) => `'${s}'`).join(", ")})`;
```

### `fns_status` (options)

```javascript
const selected = value
  .map((v, i) => (v ? mapping[i] : null))
  .filter((v) => v !== null);

if (selected.length === 0 || selected.length === Object.keys(mapping).length) {
  return "";
}
return `AND r.fns_status IN (${selected.map((s) => `'${s}'`).join(", ")})`;
```

### `retail_chain` (options)

```javascript
const selected = value
  .map((v, i) => (v ? mapping[i] : null))
  .filter((v) => v !== null);

if (selected.length === 0 || selected.length === Object.keys(mapping).length) {
  return "";
}

const conditions = selected
  .map((code) => {
    if (code === "MAGNIT") return "r.store_name LIKE '%Магнит%'";
    if (code === "PYATEROCHKA")
      return "(r.store_name LIKE '%Пятёрочка%' OR r.store_name LIKE '%Пятерочка%')";
    if (code === "OTHER")
      return "(r.store_name NOT LIKE '%Магнит%' AND r.store_name NOT LIKE '%Пятёрочка%' AND r.store_name NOT LIKE '%Пятерочка%')";
  })
  .filter(Boolean);

return `AND (${conditions.join(" OR ")})`;
```

### `registration_date` / `purchase_date` (period)

```javascript
if (!value || value.length !== 2) return { from: "", to: "" };

const [fromISO, toISO] = value;
const fromMSK = convertUTCToMSK(fromISO);
const toMSK = convertUTCToMSK(toISO);

return {
  from: `AND ${column} >= CONVERT_TZ('${fromMSK}', '+00:00', '+03:00')`,
  to: `AND ${column} <= CONVERT_TZ('${toMSK}', '+00:00', '+03:00')`,
};
```

### `promo_products_amount` (range)

```javascript
const [min, max] = value;
const conditions = [];

if (min !== null) conditions.push(`promo_products_amount >= ${min}`);
if (max !== null) conditions.push(`promo_products_amount <= ${max}`);

if (conditions.length === 0) return "";
return `AND ${conditions.join(" AND ")}`;
```

### `has_promo_products` (checkbox)

```javascript
if (value === true) return "AND promo_products_count > 0";
if (value === false) return "AND promo_products_count = 0";
return "";
```

### `search`

```javascript
if (!search || search.trim() === "") return "";

const escaped = search.replace(/[%_']/g, "\\$&");
return `AND (
  r.fn LIKE '%${escaped}%' OR
  r.fp LIKE '%${escaped}%' OR
  r.fd LIKE '%${escaped}%' OR
  u.participant_code LIKE '%${escaped}%' OR
  u.first_name LIKE '%${escaped}%' OR
  u.last_name LIKE '%${escaped}%' OR
  u.email LIKE '%${escaped}%'
)`;
```

---

## 7. Пример объекта макросов (JSON)

```json
{
  "MODERATION_STATUS_FILTER": "AND r.status IN ('ACCEPTED', 'REFUSED', 'SUSPENDED')",
  "FNS_STATUS_FILTER": "",
  "RETAIL_CHAIN_FILTER": "",
  "REGISTRATION_DATE_FROM_FILTER": "AND r.created_at >= CONVERT_TZ('2026-09-01 03:00:00', '+00:00', '+03:00')",
  "REGISTRATION_DATE_TO_FILTER": "AND r.created_at <= CONVERT_TZ('2026-10-01 02:59:59', '+00:00', '+03:00')",
  "PURCHASE_DATE_FROM_FILTER": "",
  "PURCHASE_DATE_TO_FILTER": "",
  "SEARCH_FILTER": "AND (r.fn LIKE '%ivanov%' OR r.fp LIKE '%ivanov%' OR r.fd LIKE '%ivanov%' OR u.participant_code LIKE '%ivanov%' OR u.first_name LIKE '%ivanov%' OR u.last_name LIKE '%ivanov%' OR u.email LIKE '%ivanov%')",
  "PROMO_AMOUNT_FILTER": "AND promo_products_amount BETWEEN 0 AND 985",
  "HAS_PROMO_FILTER": "",
  "ORDER_BY": "registration_date",
  "ORDER_DIR": "DESC"
}
```

---

## 8. Преобразование ответа

### 8.1. Структура ответа сервера

```json
{
  "columns": [...],
  "rows": [...],
  "filters": [...],
  "search": "...",
  "pagination": {
    "page": 1,
    "limit": 20,
    "total_items": 6552,
    "total_pages": 328
  }
}
```

### 8.2. Преобразование значений колонок

| Тип БД              | Тип в `values`      | Правило                                                                    |
| ------------------- | ------------------- | -------------------------------------------------------------------------- |
| `BINARY(16)` (UUID) | `string`            | `BIN_TO_UUID()` → строка вида `0192a1b2-...`                               |
| `INT` (копейки)     | `number`            | делить на 100, `ROUND(..., 2)`                                             |
| `INT` (счётчики)    | `number`            | как есть                                                                   |
| `TINYINT` (булевы)  | `boolean`           | `0` → `false`, `1` → `true`                                                |
| `VARCHAR` (enum)    | `string` + `_label` | машинное значение в основной колонке, человекочитаемое — в `<field>_label` |
| `DATETIME`          | `string` (ISO-8601) | формат `YYYY-MM-DDTHH:MM:SS+03:00` (с часовым поясом акции)                |
| `DATE`              | `string`            | формат `YYYY-MM-DD`                                                        |
| `JSON`              | `object` / `array`  | как есть, без дополнительной обработки                                     |
| `NULL`              | `null`              | в JSON                                                                     |

### 8.3. Формирование `rows`

```javascript
rows = result.rows.map((row, index) => ({
  id: (pagination.page - 1) * pagination.limit + index + 1,
  values: transformRow(row),
}));
```

### 8.4. Формирование `meta` для фронта

```javascript
meta = {
  total_count: pagination.total_items,
  first: (pagination.page - 1) * pagination.limit,
  limit: pagination.limit,
  sort: request.sort,
  direction: request.direction === 1 ? "asc" : "desc",
};
```

### 8.5. Формирование `filters`

Возвращаются те же фильтры, что пришли с фронта, с их `value` (текущее состояние формы). Для `options` — добавляется `opts` (подписи) и `type`.

---

## 9. Ключевые соглашения

1. **Пагинация** — `page/limit` на сервер, `first/limit` на фронте. Преобразование: `page = Math.floor(first / limit) + 1`.
2. **Часовые пояса** — даты с фронта в UTC, в базе `DATETIME` трактуется как MSK. Конвертация через `CONVERT_TZ({{...}}, '+00:00', '+03:00')`.
3. **Контракт «колонка ↔ значение»** — `columns[].name` = ключ в `rows[].values`.
4. **Даты** — ISO-8601 с TZ, деньги — в рублях (float), идентификаторы — строковые UUID.
5. **Enum-поля** — машинное значение + `<field>_label` для отображения.
6. **Фильтр `options`** — булевый массив по позициям `opts`, а не массив выбранных значений.
7. **`pagination.total_items`** — для пагинатора, `page/limit` — для offset-пагинации.
8. **`filters` в ответе** — состояние формы, можно восстанавливать UI из ответа.
9. **`LIMIT`/`OFFSET` в SQL не пишутся** — сервер делает пагинацию сам.
10. **Безопасность** — все строковые подстановки экранируются, имена колонок — по белому списку.

# Справочники статусов

## Статусы модерации чеков

| Код          | Название                |
| ------------ | ----------------------- |
| `CHECKING`   | На проверке             |
| `ACCEPTED`   | Принят                  |
| `REFUSED`    | Отклонён                |
| `SUSPENDED`  | Отложен                 |
| `NEED_PHOTO` | Требуется загрузка фото |
| `HAND_LOAD`  | Ручная загрузка         |

## Статусы ФНС

| Код        | Название        |
| ---------- | --------------- |
| `no_check` | Не проверен     |
| `wait`     | Ожидает ФНС     |
| `wrong`    | Не найден в ФНС |
| `correct`  | Чек корректный  |

## Причины отклонения

| Код                         | Название                                                  |
| --------------------------- | --------------------------------------------------------- |
| `OTHER`                     | Другое                                                    |
| `PREPAYMENT_PRODUCT`        | Чеки на предоплату не принимаются                         |
| `BAD_QUALITY`               | Плохое качество фото чека                                 |
| `NO_FISCAL_CHECK`           | Фото не является изображением фискального чека            |
| `DOUBLE_CHECK`              | Чек был загружен ранее                                    |
| `TO_MANY_CHECKS_FROM_STORE` | Превышен предел количества чеков по акции одной сети      |
| `MIN_CHECK_SUM`             | Сумма акционной продукции меньше необходимой              |
| `NO_PRODUCT`                | Отсутствует продукция, участвующая в Акции                |
| `LESS_PRODUCT`              | Количество акционной продукции в чеке меньше необходимого |
| `WRONG_DATE`                | Дата покупки не соответствует правилам Акции              |
| `WRONG_STORE`               | Магазин не участвует в Акции                              |
| `WRONG_CHECK`               | Чек не соответствует правилам Акции                       |
| `WRONG_UPLOAD_DATE`         | Дата загрузки чека не соответствует правилам Акции        |
| `DOUBLE_YOUR_CHECK`         | Чек был загружен вами ранее                               |
