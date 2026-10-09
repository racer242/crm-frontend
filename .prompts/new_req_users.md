# Спецификация: преобразование запросов и ответов для отчётов

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
  "sort": "created_at",
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

Если `sort` не в белом списке или колонка не `sortable` — используется дефолт.

**Маппинг `sort` → SQL-выражение** (задаётся в конфигурации):

```json
{
  "user_id": "u.id",
  "participant_code": "u.participant_code",
  "email": "u.email",
  "full_name": null,
  "status": "u.status",
  "participant_status": "u.participant_status",
  "balance": "u.balance",
  "total_earned": "u.total_earned",
  "mailing": "u.mailing",
  "created_at": "u.created_at"
}
```

Если значение `null` (как у `full_name`) — сортировка по этому полю игнорируется, используется дефолт.

### 1.3. Фильтры по типу

Фильтр имеет `id`, `type`, `opts` (опционально) и `value`. Преобразование зависит от `type`:

#### `options` (мультивыбор)

`value` — массив булевых длиной как `opts`. Индексу `i` соответствует значение БД из маппинга (задаётся в конфигурации фильтра, не приходит с фронта).

```
opts: ['Активен', 'Заблокирован', 'Удалён']
mapping: {0: 'active', 1: 'blocked', 2: 'deleted'}
value: [true, false, true]
→ макрос: "AND u.status IN ('active', 'deleted')"
```

- Если все `false` → макрос пустой (фильтр не применяется).
- Если все `true` → макрос тоже пустой (нет смысла ограничивать).

#### `period` (период)

`value: [fromISO, toISO]` или `null`. Даты приходят в UTC (`Z` на конце), в базе `DATETIME` трактуется как MSK — нужна конвертация.

```
value: ['2026-09-01T00:00:00.000Z', '2026-09-30T23:59:59.000Z']
→ макросы:
   "DATE_FROM_FILTER": "AND u.created_at >= CONVERT_TZ('2026-09-01 03:00:00', '+00:00', '+03:00')"
   "DATE_TO_FILTER":   "AND u.created_at <= CONVERT_TZ('2026-10-01 02:59:59', '+00:00', '+03:00')"
```

Если `value === null` — оба макроса пустые.

#### `range` (числовой диапазон)

`value: [min, max]`. Оба числа, применяются через `BETWEEN`.

```
value: [0, 10000]
→ макрос: "AND u.balance BETWEEN 0 AND 10000"
```

Если одна из границ `null` — используется только `>=` или `<=`.

#### `checkbox` (одиночный чекбокс)

`value: true | false | null`.

```
value: true  → макрос: "AND u.mailing = 1"
value: false → макрос: "AND u.mailing = 0"
value: null  → макрос: ""
```

### 1.4. Поиск (`search`)

Строка, применяется через `LIKE '%value%'` по всем текстовым полям, помеченным как searchable (обычно email, код, имя, телефон). Значение экранируется (`%` и `_` заменяются, апострофы — удваиваются).

```
search: 'иван'
→ макрос: "AND (u.email LIKE '%иван%' OR u.participant_code LIKE '%иван%' OR u.first_name LIKE '%иван%' OR u.last_name LIKE '%иван%' OR u.phone LIKE '%иван%')"
```

Если `search === ''` — макрос пустой.

### 1.5. Безопасность подстановки

- Числа (`LIMIT`, `OFFSET`, границы `range`) — только цифры, иначе ошибка.
- Строки в `IN (...)` и `LIKE` — обязательное экранирование (prepared statements или `QUOTE()`).
- Имена колонок в `ORDER BY` — только из белого списка.

---

## 2. SQL-запрос, поля выдачи и макросы

### SQL-запрос

```sql
SELECT
    BIN_TO_UUID(u.id)                                AS user_id,
    u.participant_code,
    u.email,
    TRIM(CONCAT_WS(' ', u.first_name, u.last_name))  AS full_name,
    u.phone,
    u.status,
    u.participant_status,
    u.balance,
    u.total_earned,
    u.mailing,
    u.created_at
FROM `user` u
WHERE 1=1
  {{STATUS_FILTER}}
  {{PARTICIPANT_STATUS_FILTER}}
  {{MAILING_FILTER}}
  {{DATE_FROM_FILTER}}
  {{DATE_TO_FILTER}}
  {{BALANCE_FILTER}}
  {{SEARCH_FILTER}}
ORDER BY {{ORDER_BY}} {{ORDER_DIR}}
```

### Поля выдачи (JSON-описание колонок)

```json
[
  {
    "name": "user_id",
    "title": "ID участника",
    "type": "string",
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
    "name": "email",
    "title": "Email",
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
    "name": "phone",
    "title": "Телефон",
    "type": "string",
    "sortable": false,
    "props": {}
  },
  {
    "name": "status",
    "title": "Статус",
    "type": "string",
    "sortable": true,
    "props": {}
  },
  {
    "name": "participant_status",
    "title": "Статус анкеты",
    "type": "string",
    "sortable": true,
    "props": {}
  },
  {
    "name": "balance",
    "title": "Баланс, баллов",
    "type": "number",
    "sortable": true,
    "props": {}
  },
  {
    "name": "total_earned",
    "title": "Всего начислено",
    "type": "number",
    "sortable": true,
    "props": {}
  },
  {
    "name": "mailing",
    "title": "Рассылка",
    "type": "boolean",
    "sortable": true,
    "props": {}
  },
  {
    "name": "created_at",
    "title": "Дата регистрации",
    "type": "date",
    "sortable": true,
    "props": {}
  }
]
```

### Объект макросов (пример)

```json
{
  "STATUS_FILTER": "AND u.status IN ('active', 'blocked')",
  "PARTICIPANT_STATUS_FILTER": "",
  "MAILING_FILTER": "",
  "DATE_FROM_FILTER": "AND u.created_at >= CONVERT_TZ('2026-09-01 03:00:00', '+00:00', '+03:00')",
  "DATE_TO_FILTER": "AND u.created_at <= CONVERT_TZ('2026-10-01 02:59:59', '+00:00', '+03:00')",
  "BALANCE_FILTER": "AND u.balance BETWEEN 0 AND 10000",
  "SEARCH_FILTER": "AND (u.email LIKE '%иван%' OR u.participant_code LIKE '%иван%' OR u.first_name LIKE '%иван%' OR u.last_name LIKE '%иван%' OR u.phone LIKE '%иван%')",
  "ORDER_BY": "created_at",
  "ORDER_DIR": "DESC"
}
```

### Маппинги фильтров (задаются в конфигурации, не в макросах)

```json
{
  "status": {
    "type": "options",
    "opts": ["Активен", "Заблокирован", "Удалён"],
    "mapping": { "0": "active", "1": "blocked", "2": "deleted" }
  },
  "participant_status": {
    "type": "options",
    "opts": ["Анкета не заполнена", "Участник"],
    "mapping": { "0": "ANKET_REQUIRED", "1": "PARTICIPANT" }
  },
  "mailing": { "type": "checkbox" },
  "registration_date": { "type": "period", "column": "u.created_at" },
  "balance": { "type": "range", "column": "u.balance" }
}
```

---

## 3. Преобразование ответа

### 3.1. Структура ответа сервера

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

### 3.2. Преобразование значений колонок

| Тип БД                  | Тип в `values`      | Правило                                                                    |
| ----------------------- | ------------------- | -------------------------------------------------------------------------- |
| `BINARY(16)` (UUID)     | `string`            | `BIN_TO_UUID()` → строка вида `0192a1b2-...`                               |
| `INT` (копейки)         | `number`            | делить на 100, `ROUND(..., 2)`                                             |
| `INT` (баллы, счётчики) | `number`            | как есть                                                                   |
| `TINYINT` (булевы)      | `boolean`           | `0` → `false`, `1` → `true`                                                |
| `VARCHAR` (enum)        | `string` + `_label` | машинное значение в основной колонке, человекочитаемое — в `<field>_label` |
| `DATETIME`              | `string` (ISO-8601) | формат `YYYY-MM-DDTHH:MM:SS+03:00` (с часовым поясом акции)                |
| `DATE`                  | `string`            | формат `YYYY-MM-DD`                                                        |
| `JSON`                  | `object` / `array`  | как есть, без дополнительной обработки                                     |
| `NULL`                  | `null`              | в JSON                                                                     |

Пример преобразования строки:

```
БД:   id=0x0192a1b2..., email='ivanov@mail.ru', balance=1500, mailing=1, status='active', created_at='2026-09-23 14:05:31'
→
values: {
  user_id: '0192a1b2-...',
  email: 'ivanov@mail.ru',
  balance: 1500,
  mailing: true,
  status: 'active',
  status_label: 'Активен',
  created_at: '2026-09-23T14:05:31+03:00'
}
```

### 3.3. Формирование `rows`

```javascript
rows = result.rows.map((row, index) => ({
  id: (pagination.page - 1) * pagination.limit + index + 1,
  values: transformRow(row),
}));
```

### 3.4. Формирование `filters`

Возвращаются те же фильтры, что пришли с фронта, с их `value` (текущее состояние формы). Для `options` — добавляется `opts` (подписи) и `type`.

### 3.5. Формирование `meta` для фронта

```javascript
meta = {
  total_count: pagination.total_items,
  first: (pagination.page - 1) * pagination.limit,
  limit: pagination.limit,
  sort: request.sort,
  direction: request.direction === 1 ? "asc" : "desc",
};
```

---

## 4. Ключевые соглашения

1. **Пагинация** — `page/limit` на сервер, `first/limit` на фронте. Преобразование: `page = Math.floor(first / limit) + 1`.
2. **Часовые пояса** — даты с фронта в UTC, в базе `DATETIME` трактуется как MSK. Конвертация через `CONVERT_TZ({{...}}, '+00:00', '+03:00')`.
3. **Контракт «колонка ↔ значение»** — `columns[].id` = ключ в `rows[].values`.
4. **Даты** — ISO-8601 с TZ, деньги — в рублях (float), идентификаторы — строковые UUID.
5. **Enum-поля** — машинное значение + `<field>_label` для отображения.
6. **Фильтр `options`** — булевый массив по позициям `opts`, а не массив выбранных значений.
7. **`pagination.total_items`** — для пагинатора, `page/limit` — для offset-пагинации (не курсорной).
8. **`filters` в ответе** — состояние формы, можно восстанавливать UI из ответа.
9. **`LIMIT`/`OFFSET` в SQL не пишутся** — сервер делает пагинацию сам.
10. **Безопасность** — все строковые подстановки экранируются, имена колонок — по белому списку.
