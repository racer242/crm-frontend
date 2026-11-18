# Мост найден

В `payload` выигрышного шанса лежит **прямой идентификатор экземпляра приза**:

```json
{
  "prize": "MVIDEO_2",
  "source": "xlsx",
  "prize_instance": "01a0c828-5d8f-7b60-867b-266d1fbdbafa"
}
```

Выводы по diagnostике:

| Поле                     | Что видно                                                                                                                     |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| `payload.prize_instance` | UUID экземпляра → **рабочий ключ** к `prize_instances.id`                                                                     |
| `payload.prize`          | код позиции, совпадает с `prize_catalog.code` (`MVIDEO_2`, `MAGNIT`, `SAMSUNG`, `MVIDEO_3`, `MVIDEO_15`) — годится для сверки |
| `payload.source`         | `xlsx` — результат загружен файлом                                                                                            |
| `external_id`            | пустой у всех строк → **не мост**, как и предполагал                                                                          |
| `place`                  | пустой у всех строк → места в этих розыгрышах не проставлены                                                                  |

Связываю через `prize_instance`, без эвристик по датам.

---

# Спецификация: отчёт «Призы» с данными розыгрыша

## 1. Преобразование запроса с фронта

**Пагинация:** `page = Math.floor(first / limit) + 1`. В SQL нет `LIMIT`/`OFFSET`.

**Сортировка:** `{{ORDER_BY}}` из белого списка, `{{ORDER_DIR}}` — `ASC` при `direction = 1`, иначе `DESC`. Дефолт: `created_at DESC`.

**Безопасность:** строки в `IN`/`LIKE` экранируются, UUID валидируются, `ORDER BY` только из белого списка.

## 2. SQL-запрос

```sql
SELECT
    BIN_TO_UUID(pi.id)                               AS instance_id,
    pc.code                                          AS prize_code,
    pc.title                                         AS prize_title,
    pc.type_code,
    ROUND(pc.price / 100, 2)                         AS price_rub,
    pc.points_cost,
    pc.act_required,
    BIN_TO_UUID(pi.user_id)                          AS user_id,
    u.participant_code,
    TRIM(CONCAT_WS(' ', u.last_name, u.first_name, u.third_name)) AS full_name,
    u.email,
    pi.issued_at,
    pi.pool_status,
    pi.status,
    pi.act_status,
    pi.act_scan_uploaded_at,
    pi.act_scan_original_name,
    pi.external_id,
    pi.created_at,
    r.name                                           AS raffle_name,
    r.type                                           AS raffle_type,
    r.status                                         AS raffle_status,
    r.drawn_at,
    rc.place
FROM prize_instances pi
JOIN prize_catalog pc ON pc.id = pi.prize_id
LEFT JOIN `user` u    ON u.id = pi.user_id
LEFT JOIN (
    SELECT
        payload->>'$.prize_instance' AS prize_instance_uuid,
        raffle_id,
        place
    FROM raffle_chance
    WHERE is_winning = 1
      AND payload->>'$.prize_instance' IS NOT NULL
) rc ON rc.prize_instance_uuid = BIN_TO_UUID(pi.id)
LEFT JOIN raffle r ON r.id = rc.raffle_id
WHERE 1=1
  {{POOL_STATUS_FILTER}}
  {{STATUS_FILTER}}
  {{ACT_STATUS_FILTER}}
  {{HAS_OWNER_FILTER}}
  {{HAS_RAFFLE_FILTER}}
  {{RAFFLE_FILTER}}
  {{RAFFLE_STATUS_FILTER}}
  {{ISSUED_DATE_FROM_FILTER}}
  {{ISSUED_DATE_TO_FILTER}}
  {{SEARCH_FILTER}}
ORDER BY {{ORDER_BY}} {{ORDER_DIR}}
```

Подзапрос выбирает только выигрышные шансы — их немного, соединение идёт по строковому UUID с PK экземпляра.

## 3. Описание колонок (JSON)

```json
[
  {
    "name": "instance_id",
    "type": "string",
    "title": "ID экземпляра",
    "sortable": true
  },
  {
    "name": "prize_code",
    "type": "string",
    "title": "Код приза в CRM",
    "sortable": true
  },
  {
    "name": "prize_title",
    "type": "string",
    "title": "Название приза",
    "sortable": true
  },
  {
    "name": "type_code",
    "type": "string",
    "title": "Группа (тип)",
    "sortable": true
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
    "name": "user_id",
    "type": "string",
    "title": "ID владельца",
    "sortable": true
  },
  {
    "name": "participant_code",
    "type": "string",
    "title": "Код участника",
    "sortable": true
  },
  {
    "name": "full_name",
    "type": "string",
    "title": "ФИО владельца",
    "sortable": false
  },
  {
    "name": "email",
    "type": "string",
    "title": "Email владельца",
    "sortable": true
  },
  {
    "name": "issued_at",
    "type": "datetime",
    "title": "Дата выдачи",
    "sortable": true
  },
  {
    "name": "pool_status",
    "type": "string",
    "title": "Статус в пуле",
    "sortable": true
  },
  {
    "name": "status",
    "type": "string",
    "title": "Статус приза",
    "sortable": true
  },
  {
    "name": "act_status",
    "type": "string",
    "title": "Статус акта",
    "sortable": true
  },
  {
    "name": "act_scan_uploaded_at",
    "type": "datetime",
    "title": "Дата загрузки акта",
    "sortable": true
  },
  {
    "name": "act_scan_original_name",
    "type": "string",
    "title": "Файл акта",
    "sortable": false
  },
  {
    "name": "raffle_name",
    "type": "string",
    "title": "Розыгрыш",
    "sortable": true
  },
  {
    "name": "raffle_type",
    "type": "string",
    "title": "Тип розыгрыша",
    "sortable": true
  },
  {
    "name": "raffle_status",
    "type": "string",
    "title": "Статус розыгрыша",
    "sortable": true
  },
  {
    "name": "drawn_at",
    "type": "datetime",
    "title": "Дата розыгрыша",
    "sortable": true
  },
  {
    "name": "place",
    "type": "number",
    "title": "Место в розыгрыше",
    "sortable": true
  },
  {
    "name": "external_id",
    "type": "string",
    "title": "ID во внешней системе",
    "sortable": true
  },
  {
    "name": "created_at",
    "type": "datetime",
    "title": "Дата создания",
    "sortable": true
  }
]
```

## 4. Маппинг сортировки

```json
{
  "instance_id": "pi.id",
  "prize_code": "pc.code",
  "prize_title": "pc.title",
  "type_code": "pc.type_code",
  "price_rub": "pc.price",
  "points_cost": "pc.points_cost",
  "act_required": "pc.act_required",
  "user_id": "pi.user_id",
  "participant_code": "u.participant_code",
  "full_name": null,
  "email": "u.email",
  "issued_at": "pi.issued_at",
  "pool_status": "pi.pool_status",
  "status": "pi.status",
  "act_status": "pi.act_status",
  "act_scan_uploaded_at": "pi.act_scan_uploaded_at",
  "act_scan_original_name": null,
  "raffle_name": "r.name",
  "raffle_type": "r.type",
  "raffle_status": "r.status",
  "drawn_at": "r.drawn_at",
  "place": "rc.place",
  "external_id": "pi.external_id",
  "created_at": "pi.created_at"
}
```

## 5. Фильтры

### 5.1. Описание (JSON)

```json
[
  {
    "id": "pool_status",
    "name": "Статус в пуле",
    "type": "options",
    "opts": ["В пуле", "К изъятию", "Изъят"],
    "mapping": { "0": "active", "1": "removing", "2": "removed" }
  },
  {
    "id": "status",
    "name": "Статус приза",
    "type": "options",
    "opts": [
      "Свободен",
      "Нужны данные",
      "Получен",
      "Отправляется",
      "Отправлен",
      "Ошибка",
      "Скачивается",
      "В обработке",
      "Готов к выдаче",
      "Нужен код",
      "Удалён",
      "Ожидает (legacy)",
      "Акт загружен (legacy)",
      "Отклонён (legacy)"
    ],
    "mapping": {
      "0": "FREE",
      "1": "DATA_NEEDED",
      "2": "RECEIVED",
      "3": "SENDING",
      "4": "SENT",
      "5": "ERROR",
      "6": "DOWNLOAD",
      "7": "PROCESSING",
      "8": "READY_FOR_DELIVERY",
      "9": "NEED_CODE",
      "10": "DELETED",
      "11": "PENDING",
      "12": "ACT_UPLOADED",
      "13": "REJECTED"
    }
  },
  {
    "id": "act_status",
    "name": "Статус акта",
    "type": "options",
    "opts": ["Ожидает", "Акт загружен", "Подтверждён", "Отклонён"],
    "mapping": {
      "0": "PENDING",
      "1": "ACT_UPLOADED",
      "2": "APPROVED",
      "3": "REJECTED"
    }
  },
  { "id": "has_owner", "name": "Выдан участнику", "type": "checkbox" },
  { "id": "has_raffle", "name": "Выигран в розыгрыше", "type": "checkbox" },
  {
    "id": "raffle",
    "name": "Розыгрыш",
    "type": "options",
    "opts": [],
    "mapping": {}
  },
  {
    "id": "raffle_status",
    "name": "Статус розыгрыша",
    "type": "options",
    "opts": [
      "Черновик",
      "В процессе",
      "Завершён",
      "Опубликован",
      "Аннулирован"
    ],
    "mapping": {
      "0": "DRAFT",
      "1": "IN_PROGRESS",
      "2": "COMPLETED",
      "3": "PUBLISHED",
      "4": "ANNULLED"
    }
  },
  {
    "id": "issued_date",
    "name": "Период выдачи",
    "type": "period",
    "column": "pi.issued_at"
  }
]
```

`opts`/`mapping` для `raffle` заполняются динамически:

```sql
SELECT BIN_TO_UUID(id) AS value, name AS label
FROM raffle
ORDER BY created_at DESC;
```

### 5.2. Правила формирования макросов

**options по строковым статусам** (`pool_status`, `status`, `act_status`, `raffle_status`):

```javascript
const sel = value
  .map((v, i) => (v ? mapping[i] : null))
  .filter((v) => v !== null);
if (sel.length === 0 || sel.length === Object.keys(mapping).length) return "";
const col = {
  pool_status: "pi.pool_status",
  status: "pi.status",
  act_status: "pi.act_status",
  raffle_status: "r.status",
}[id];
return `AND ${col} IN (${sel.map((s) => `'${s}'`).join(", ")})`;
```

**options по розыгрышу** (`raffle`) — значения маппинга это UUID, оборачиваем в `UUID_TO_BIN`:

```javascript
const sel = value
  .map((v, i) => (v ? mapping[i] : null))
  .filter((v) => v !== null);
if (sel.length === 0 || sel.length === Object.keys(mapping).length) return "";
return `AND r.id IN (${sel.map((s) => `UUID_TO_BIN('${s}')`).join(", ")})`;
```

**checkbox:**

```javascript
// has_owner
if (value === true) return "AND pi.user_id IS NOT NULL";
if (value === false) return "AND pi.user_id IS NULL";
return "";

// has_raffle
if (value === true) return "AND rc.raffle_id IS NOT NULL";
if (value === false) return "AND rc.raffle_id IS NULL";
return "";
```

**period** (`issued_date`) — МСК, без конвертации:

```javascript
if (!value || value.length !== 2) return { from: "", to: "" };
const [from, to] = value;
return {
  from: `AND pi.issued_at >= '${from}'`,
  to: `AND pi.issued_at <= '${to}'`,
};
```

## 6. Поиск

### 6.1. Поля поиска

`instance_id`, `external_id`, `prize_code`, `prize_title`, `user_id`, `participant_code`, `email`, `first_name`, `last_name`, `act_scan_original_name`, **`raffle_name`**.

### 6.2. Правило формирования `SEARCH_FILTER`

```javascript
if (!search || !search.trim()) return "";
const e = search.replace(/[%_']/g, "\\$&");
return `AND (
  BIN_TO_UUID(pi.id) LIKE '%${e}%' OR
  pi.external_id LIKE '%${e}%' OR
  pc.code LIKE '%${e}%' OR
  pc.title LIKE '%${e}%' OR
  BIN_TO_UUID(pi.user_id) LIKE '%${e}%' OR
  u.participant_code LIKE '%${e}%' OR
  u.email LIKE '%${e}%' OR
  u.first_name LIKE '%${e}%' OR
  u.last_name LIKE '%${e}%' OR
  pi.act_scan_original_name LIKE '%${e}%' OR
  r.name LIKE '%${e}%'
)`;
```

## 7. Пример объекта макросов (JSON)

Призы, выигранные в розыгрышах, выданные, в пуле:

```json
{
  "POOL_STATUS_FILTER": "AND pi.pool_status IN ('active')",
  "STATUS_FILTER": "",
  "ACT_STATUS_FILTER": "",
  "HAS_OWNER_FILTER": "AND pi.user_id IS NOT NULL",
  "HAS_RAFFLE_FILTER": "AND rc.raffle_id IS NOT NULL",
  "RAFFLE_FILTER": "",
  "RAFFLE_STATUS_FILTER": "AND r.status IN ('PUBLISHED')",
  "ISSUED_DATE_FROM_FILTER": "",
  "ISSUED_DATE_TO_FILTER": "",
  "SEARCH_FILTER": "",
  "ORDER_BY": "r.drawn_at",
  "ORDER_DIR": "DESC"
}
```

## 8. Преобразование ответа

| Тип БД                     | Тип в `values`      | Правило                                                                        |
| -------------------------- | ------------------- | ------------------------------------------------------------------------------ |
| `BINARY(16)`               | `string`            | `BIN_TO_UUID()` в SQL                                                          |
| `INT` (копейки)            | `number`            | /100, `ROUND(...,2)`                                                           |
| `INT` (баллы, место)       | `number`            | как есть                                                                       |
| `TINYINT` (`act_required`) | `boolean`           | `0`→`false`, `1`→`true`                                                        |
| `DATETIME`                 | `string`            | ISO-8601 `+03:00`, даты МСК                                                    |
| `VARCHAR` (enum)           | `string` + `_label` | `status_label`, `act_status_label`, `pool_status_label`, `raffle_status_label` |
| `NULL`                     | `null`              | в JSON                                                                         |

```javascript
rows = result.rows.map((row, i) => ({
  id: (pagination.page - 1) * pagination.limit + i + 1,
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

## 9. Нюансы

1. **`has_raffle` разделяет происхождение приза**: `true` — выигран в розыгрыше, `false` — куплен за баллы или выдан иначе. Это то, что нельзя было определить по датам.
2. **Связь односторонняя**: работают только шансы, у которых в `payload` есть `prize_instance`. Если CRM пришлёт выигрыш без этого ключа, приз не свяжется — для полного списка победителей остаётся отчёт по `raffle_chance` с `is_winning = 1`.
3. **`place` сейчас пустой** у всех выигрышных шансов в выборке — колонка будет `NULL`, пока CRM не начнёт проставлять места.
4. **Дубли строк**: если один экземпляр упомянут в двух выигрышных шансах, строка задвоится. Это сигнал о проблеме данных, а не о запросе — контроль ниже.
5. **Производительность**: подзапрос фильтрует `is_winning = 1` без подходящего индекса (индекс `idx_raffle_chance_raffle` начинается с `raffle_id`). Если журнал шансов вырастет, добавьте в подзапрос `AND status = 'PLAYED'` — тогда сработает `idx_raffle_chance_pick`.
6. **Даты** — МСК, без `CONVERT_TZ`. **Дефолт сортировки** — `created_at DESC`.

## 10. Контроль качества связи

```sql
-- Выигрышные шансы, которые не связались с экземпляром или расходятся по коду приза
SELECT
    BIN_TO_UUID(rc.id)                       AS chance_id,
    r.name                                   AS raffle_name,
    rc.payload->>'$.prize_instance'          AS payload_instance_uuid,
    rc.payload->>'$.prize'                   AS payload_prize_code,
    BIN_TO_UUID(pi.id)                       AS matched_instance_id,
    pc.code                                  AS catalog_code,
    CASE
        WHEN pi.id IS NULL THEN 'экземпляр не найден'
        WHEN pc.code <> rc.payload->>'$.prize' THEN 'код приза расходится'
        ELSE 'ok'
    END                                      AS problem
FROM raffle_chance rc
JOIN raffle r          ON r.id = rc.raffle_id
LEFT JOIN prize_instances pi ON BIN_TO_UUID(pi.id) = rc.payload->>'$.prize_instance'
LEFT JOIN prize_catalog pc   ON pc.id = pi.prize_id
WHERE rc.is_winning = 1
HAVING problem <> 'ok';
```

Пустой результат — связь чистая, отчёту можно доверять.
