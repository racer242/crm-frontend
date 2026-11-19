# Спецификация: отчёт «Акты получения призов»

Акт — не отдельная сущность: это `act_status` и поля скана у экземпляра приза. Список строится из `prize_instances` с позицией каталога, владельцем и флагами наличия документов. Фильтры, поиск, сортировка. Пагинация — на стороне сервера.

**Область выборки:** экземпляры, у которых акт требуется (`pc.act_required = 1`) **или** файл акта загружен. Свободные экземпляры и призы без акта в отчёт не попадают.

**Персональные данные:** в выдачу идут только признаки наличия (`boolean`). Значения — серия/номер паспорта, дата и место выдачи, адрес, ИНН, СНИЛС — не выгружаются и в поиск не включаются. Отчёт только для административной роли.

---

## 1. Преобразование запроса с фронта

### 1.1. Пагинация

```javascript
const page = Math.floor(first / limit) + 1;
```

На сервер: `{ page, limit, replacements, sort, direction, search, filters }`. В SQL **нет `LIMIT`/`OFFSET`**.

### 1.2. Сортировка

- `{{ORDER_BY}}` — выражение из белого списка (раздел 4).
- `{{ORDER_DIR}}` — `ASC` при `direction = 1`, иначе `DESC`.
- Дефолт: `act_scan_uploaded_at DESC`.

### 1.3. Безопасность подстановки

- Строки в `IN (...)`/`LIKE` — экранирование.
- Границы `range` — только числа (`price` в рублях, допускает дробную часть).
- Значения маппинга `act_required` — только `0`/`1`.
- `ORDER BY` — только из белого списка.
- Значения документов не подставляются в запрос ни в каком виде.

---

## 2. SQL-запрос

```sql
SELECT
    BIN_TO_UUID(pi.id)                               AS instance_id,
    pi.act_status,
    CASE
        WHEN pc.act_required = 0            THEN 'NOT_REQUIRED'
        WHEN pi.act_status = 'APPROVED'     THEN 'APPROVED'
        WHEN pi.act_status = 'REJECTED'     THEN 'REJECTED'
        WHEN pi.act_status = 'ACT_UPLOADED' THEN 'ON_REVIEW'
        ELSE 'WAITING_UPLOAD'
    END                                              AS act_state,
    pi.act_scan_uploaded_at,
    CASE
        WHEN pi.act_status = 'ACT_UPLOADED' AND pi.act_scan_uploaded_at IS NOT NULL
            THEN TIMESTAMPDIFF(DAY, pi.act_scan_uploaded_at, NOW())
    END                                              AS days_on_review,
    (pi.act_scan_stored_name IS NOT NULL)            AS act_file_present,
    pi.act_scan_original_name,
    pi.act_scan_mime,
    pi.act_scan_size,
    pi.act_scan_stored_name,
    pc.act_required,
    pc.code                                          AS prize_code,
    pc.title                                         AS prize_title,
    pc.type_code,
    ROUND(pc.price / 100, 2)                         AS price_rub,
    BIN_TO_UUID(pi.user_id)                          AS user_id,
    u.participant_code,
    TRIM(CONCAT_WS(' ', u.last_name, u.first_name, u.third_name)) AS full_name,
    u.email,

    -- Данные расширенной анкеты
    (ue.passport_series_number IS NOT NULL AND ue.passport_series_number <> '') AS has_passport,
    (ue.passport_issue_date    IS NOT NULL)          AS has_passport_issue_date,
    (ue.passport_issued_by     IS NOT NULL AND ue.passport_issued_by <> '')     AS has_passport_issued_by,
    (ue.passport_address       IS NOT NULL AND ue.passport_address   <> '')     AS has_address,
    (ue.inn                    IS NOT NULL AND ue.inn   <> '')                  AS has_inn,
    (ue.snils                  IS NOT NULL AND ue.snils <> '')                  AS has_snils,
    (COALESCE(ue.agreement, 0) = 1)                  AS has_agreement,

    -- Сканы документов
    (ud_pm.id    IS NOT NULL)                        AS has_passport_main_scan,
    (ud_pr.id    IS NOT NULL)                        AS has_passport_reg_scan,
    (ud_inn.id   IS NOT NULL)                        AS has_inn_scan,
    (ud_snils.id IS NOT NULL)                        AS has_snils_scan,

    pi.issued_at,
    pi.status,
    pi.pool_status,
    pi.external_id,
    pi.created_at
FROM prize_instances pi
JOIN prize_catalog pc      ON pc.id = pi.prize_id
LEFT JOIN `user` u         ON u.id = pi.user_id
LEFT JOIN user_extended ue ON ue.user_id = pi.user_id
LEFT JOIN user_documents ud_pm    ON ud_pm.user_id    = pi.user_id AND ud_pm.document_type    = 'passport_main'
LEFT JOIN user_documents ud_pr    ON ud_pr.user_id    = pi.user_id AND ud_pr.document_type    = 'passport_reg'
LEFT JOIN user_documents ud_inn   ON ud_inn.user_id   = pi.user_id AND ud_inn.document_type   = 'inn_scan'
LEFT JOIN user_documents ud_snils ON ud_snils.user_id = pi.user_id AND ud_snils.document_type = 'snils_scan'
WHERE (pc.act_required = 1 OR pi.act_scan_stored_name IS NOT NULL)
  {{ACT_STATUS_FILTER}}
  {{ACT_REQUIRED_FILTER}}
  {{HAS_FILE_FILTER}}
  {{HAS_PASSPORT_FILTER}}
  {{HAS_PASSPORT_ISSUE_DATE_FILTER}}
  {{HAS_PASSPORT_ISSUED_BY_FILTER}}
  {{HAS_ADDRESS_FILTER}}
  {{HAS_INN_FILTER}}
  {{HAS_SNILS_FILTER}}
  {{HAS_AGREEMENT_FILTER}}
  {{HAS_PASSPORT_MAIN_SCAN_FILTER}}
  {{HAS_PASSPORT_REG_SCAN_FILTER}}
  {{HAS_INN_SCAN_FILTER}}
  {{HAS_SNILS_SCAN_FILTER}}
  {{PRIZE_FILTER}}
  {{PRICE_FILTER}}
  {{ACT_UPLOADED_FROM_FILTER}}
  {{ACT_UPLOADED_TO_FILTER}}
  {{ISSUED_FROM_FILTER}}
  {{ISSUED_TO_FILTER}}
  {{SEARCH_FILTER}}
ORDER BY {{ORDER_BY}} {{ORDER_DIR}}
```

### 2.1. Почему соединений семь и это нормально

| Соединение                | Ключ                                 | Тип доступа | Строк на строку акта |
| ------------------------- | ------------------------------------ | ----------- | -------------------- |
| `prize_catalog pc`        | PRIMARY                              | `eq_ref`    | 1                    |
| `user u`                  | PRIMARY                              | `eq_ref`    | 1                    |
| `user_extended ue`        | UNIQUE `idx_user_extended_user`      | `eq_ref`    | ≤1                   |
| `user_documents ud_pm`    | UNIQUE `idx_user_document_user_type` | `eq_ref`    | ≤1                   |
| `user_documents ud_pr`    | то же                                | `eq_ref`    | ≤1                   |
| `user_documents ud_inn`   | то же                                | `eq_ref`    | ≤1                   |
| `user_documents ud_snils` | то же                                | `eq_ref`    | ≤1                   |

Все соединения идут по уникальным ключам и **не размножают строки** — `total_items` и пагинация считаются верно. Четыре обращения к `user_documents` — четыре точечных lookup по одному индексу с разным вторым полем, а не четыре прохода по таблице. Группировка в производную таблицу была бы медленнее: она материализует документы всех участников независимо от размера страницы.

### 2.2. Почему только `has_agreement` требует `COALESCE`

Остальные флаги построены на `IS NOT NULL`: при отсутствующей строке `ue.passport_series_number IS NOT NULL` даёт `0`, а `0 AND NULL` в MySQL — `0`. Флаг всегда `0` или `1`.

`ue.agreement = 1` при отсутствующей строке вернул бы `NULL`, поэтому там нужно приведение: `COALESCE(ue.agreement, 0) = 1`.

---

## 3. Описание колонок (JSON)

Контракт: `columns[].name` = ключ в `rows[].values`.

```json
[
  {
    "name": "instance_id",
    "type": "string",
    "title": "ID экземпляра",
    "sortable": true
  },
  {
    "name": "act_status",
    "type": "string",
    "title": "Статус акта",
    "sortable": true
  },
  {
    "name": "act_state",
    "type": "string",
    "title": "Состояние акта (сводно)",
    "sortable": true
  },
  {
    "name": "act_scan_uploaded_at",
    "type": "datetime",
    "title": "Дата загрузки акта",
    "sortable": true
  },
  {
    "name": "days_on_review",
    "type": "number",
    "title": "Дней на проверке",
    "sortable": true
  },
  {
    "name": "act_file_present",
    "type": "boolean",
    "title": "Файл акта загружен",
    "sortable": true
  },
  {
    "name": "act_scan_original_name",
    "type": "string",
    "title": "Файл акта",
    "sortable": false
  },
  {
    "name": "act_scan_mime",
    "type": "string",
    "title": "Тип файла акта",
    "sortable": false
  },
  {
    "name": "act_scan_size",
    "type": "number",
    "title": "Размер файла акта, байт",
    "sortable": true
  },
  {
    "name": "act_scan_stored_name",
    "type": "string",
    "title": "Внутреннее имя файла",
    "sortable": false
  },
  {
    "name": "act_required",
    "type": "boolean",
    "title": "Акт требуется",
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
    "name": "has_passport",
    "type": "boolean",
    "title": "Паспорт: серия и номер",
    "sortable": true
  },
  {
    "name": "has_passport_issue_date",
    "type": "boolean",
    "title": "Паспорт: дата выдачи",
    "sortable": true
  },
  {
    "name": "has_passport_issued_by",
    "type": "boolean",
    "title": "Паспорт: кем выдан",
    "sortable": true
  },
  {
    "name": "has_address",
    "type": "boolean",
    "title": "Адрес регистрации",
    "sortable": true
  },
  { "name": "has_inn", "type": "boolean", "title": "ИНН", "sortable": true },
  {
    "name": "has_snils",
    "type": "boolean",
    "title": "СНИЛС",
    "sortable": true
  },
  {
    "name": "has_agreement",
    "type": "boolean",
    "title": "Согласие",
    "sortable": true
  },
  {
    "name": "has_passport_main_scan",
    "type": "boolean",
    "title": "Скан: паспорт (основной)",
    "sortable": true
  },
  {
    "name": "has_passport_reg_scan",
    "type": "boolean",
    "title": "Скан: паспорт (регистрация)",
    "sortable": true
  },
  {
    "name": "has_inn_scan",
    "type": "boolean",
    "title": "Скан: ИНН",
    "sortable": true
  },
  {
    "name": "has_snils_scan",
    "type": "boolean",
    "title": "Скан: СНИЛС",
    "sortable": true
  },

  {
    "name": "issued_at",
    "type": "datetime",
    "title": "Дата выдачи приза",
    "sortable": true
  },
  {
    "name": "status",
    "type": "string",
    "title": "Статус приза",
    "sortable": true
  },
  {
    "name": "pool_status",
    "type": "string",
    "title": "Статус в пуле",
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
    "title": "Дата создания экземпляра",
    "sortable": true
  }
]
```

---

## 4. Маппинг сортировки

`null` = колонка не сортируется (фронт не показывает стрелку, запрос уходит в дефолт).

```json
{
  "instance_id": "pi.id",
  "act_status": "pi.act_status",
  "act_state": "act_state",
  "act_scan_uploaded_at": "pi.act_scan_uploaded_at",
  "days_on_review": "days_on_review",
  "act_file_present": "act_file_present",
  "act_scan_original_name": null,
  "act_scan_mime": null,
  "act_scan_size": "pi.act_scan_size",
  "act_scan_stored_name": null,
  "act_required": "pc.act_required",
  "prize_code": "pc.code",
  "prize_title": "pc.title",
  "type_code": "pc.type_code",
  "price_rub": "pc.price",
  "user_id": "pi.user_id",
  "participant_code": "u.participant_code",
  "full_name": null,
  "email": "u.email",

  "has_passport": "has_passport",
  "has_passport_issue_date": "has_passport_issue_date",
  "has_passport_issued_by": "has_passport_issued_by",
  "has_address": "has_address",
  "has_inn": "has_inn",
  "has_snils": "has_snils",
  "has_agreement": "has_agreement",
  "has_passport_main_scan": "has_passport_main_scan",
  "has_passport_reg_scan": "has_passport_reg_scan",
  "has_inn_scan": "has_inn_scan",
  "has_snils_scan": "has_snils_scan",

  "issued_at": "pi.issued_at",
  "status": "pi.status",
  "pool_status": "pi.pool_status",
  "external_id": "pi.external_id",
  "created_at": "pi.created_at"
}
```

```javascript
const DEFAULT_SORT = "act_scan_uploaded_at";

function buildOrderMacros(sort, direction, mapping) {
  const expr = sort && mapping[sort] ? mapping[sort] : mapping[DEFAULT_SORT];
  return { ORDER_BY: expr, ORDER_DIR: direction === 1 ? "ASC" : "DESC" };
}
```

Флаги сортируются по алиасу — значения всегда `0`/`1`, отдельное выражение в маппинге не нужно. `has_passport ASC` — сначала те, у кого паспорта нет.

`act_state` сортируется по алфавиту. Если нужен логический порядок (Ожидает → На проверке → Подтверждён → Отклонён → Не требуется), замените значение маппинга:

```
CASE WHEN pc.act_required = 0 THEN 5 WHEN pi.act_status = 'PENDING' THEN 1 WHEN pi.act_status = 'ACT_UPLOADED' THEN 2 WHEN pi.act_status = 'APPROVED' THEN 3 ELSE 4 END
```

---

## 5. Фильтры

### 5.1. Описание (JSON)

```json
[
  {
    "id": "act_status",
    "name": "Статус акта",
    "type": "options",
    "opts": ["Ожидает загрузки", "Акт загружен", "Подтверждён", "Отклонён"],
    "mapping": {
      "0": "PENDING",
      "1": "ACT_UPLOADED",
      "2": "APPROVED",
      "3": "REJECTED"
    }
  },
  {
    "id": "act_required",
    "name": "Акт требуется",
    "type": "options",
    "opts": ["Требуется", "Не требуется"],
    "mapping": { "0": 1, "1": 0 }
  },
  { "id": "has_file", "name": "Файл акта загружен", "type": "checkbox" },
  {
    "id": "has_passport",
    "name": "Паспорт: серия и номер",
    "type": "checkbox"
  },
  {
    "id": "has_passport_issue_date",
    "name": "Паспорт: дата выдачи",
    "type": "checkbox"
  },
  {
    "id": "has_passport_issued_by",
    "name": "Паспорт: кем выдан",
    "type": "checkbox"
  },
  { "id": "has_address", "name": "Адрес регистрации", "type": "checkbox" },
  { "id": "has_inn", "name": "ИНН", "type": "checkbox" },
  { "id": "has_snils", "name": "СНИЛС", "type": "checkbox" },
  { "id": "has_agreement", "name": "Согласие", "type": "checkbox" },
  {
    "id": "has_passport_main_scan",
    "name": "Скан паспорта (основной)",
    "type": "checkbox"
  },
  {
    "id": "has_passport_reg_scan",
    "name": "Скан паспорта (регистрация)",
    "type": "checkbox"
  },
  { "id": "has_inn_scan", "name": "Скан ИНН", "type": "checkbox" },
  { "id": "has_snils_scan", "name": "Скан СНИЛС", "type": "checkbox" },
  {
    "id": "prize",
    "name": "Приз",
    "type": "options",
    "opts": [],
    "mapping": {}
  },
  {
    "id": "price",
    "name": "Стоимость приза, ₽",
    "type": "range",
    "column": "pc.price",
    "opts": [0, 500000]
  },
  {
    "id": "act_uploaded_date",
    "name": "Период загрузки акта",
    "type": "period",
    "column": "pi.act_scan_uploaded_at"
  },
  {
    "id": "issued_date",
    "name": "Период выдачи приза",
    "type": "period",
    "column": "pi.issued_at"
  }
]
```

`opts`/`mapping` для `prize` заполняются динамически:

```sql
SELECT pc.code AS value, pc.title AS label
FROM prize_catalog pc
WHERE pc.act_required = 1
ORDER BY pc.title;
```

### 5.2. Правила формирования макросов

**`act_status` (options, строковые значения):**

```javascript
const sel = value
  .map((v, i) => (v ? mapping[i] : null))
  .filter((v) => v !== null);
if (sel.length === 0 || sel.length === Object.keys(mapping).length) return "";
return `AND pi.act_status IN (${sel.map((s) => `'${s}'`).join(", ")})`;
```

**`act_required` (options, числовые значения — без кавычек):**

```javascript
const sel = value
  .map((v, i) => (v ? mapping[i] : null))
  .filter((v) => v !== null);
if (sel.length === 0 || sel.length === Object.keys(mapping).length) return "";
return `AND pc.act_required IN (${sel.join(", ")})`;
```

**`prize` (options, коды каталога):**

```javascript
const sel = value
  .map((v, i) => (v ? mapping[i] : null))
  .filter((v) => v !== null);
if (sel.length === 0 || sel.length === Object.keys(mapping).length) return "";
return `AND pc.code IN (${sel.map((s) => `'${s}'`).join(", ")})`;
```

**`has_file` (checkbox):**

```javascript
if (value === true) return "AND pi.act_scan_stored_name IS NOT NULL";
if (value === false) return "AND pi.act_scan_stored_name IS NULL";
return "";
```

**Флаги документов (checkbox) — единое правило:**

```javascript
const TEXT_FIELD = {
  has_passport: "ue.passport_series_number",
  has_passport_issued_by: "ue.passport_issued_by",
  has_address: "ue.passport_address",
  has_inn: "ue.inn",
  has_snils: "ue.snils",
};
const DATE_FIELD = { has_passport_issue_date: "ue.passport_issue_date" };
const SCAN_ALIAS = {
  has_passport_main_scan: "ud_pm",
  has_passport_reg_scan: "ud_pr",
  has_inn_scan: "ud_inn",
  has_snils_scan: "ud_snils",
};

if (value !== true && value !== false) return "";

if (id === "has_agreement")
  return `AND COALESCE(ue.agreement, 0) = ${value ? 1 : 0}`;

if (SCAN_ALIAS[id]) {
  const a = SCAN_ALIAS[id];
  return value ? `AND ${a}.id IS NOT NULL` : `AND ${a}.id IS NULL`;
}
if (DATE_FIELD[id]) {
  const f = DATE_FIELD[id];
  return value ? `AND ${f} IS NOT NULL` : `AND ${f} IS NULL`;
}
const f = TEXT_FIELD[id];
return value
  ? `AND (${f} IS NOT NULL AND ${f} <> '')`
  : `AND (${f} IS NULL OR ${f} = '')`;
```

Условия работают напрямую с полями соединений — без обращения к алиасам (в `WHERE` они не видны). Отсутствующая запись `user_extended` или `user_documents` попадает в ветку `false`, как и пустое значение.

**«Все документы указаны»** — отдельного фильтра нет, ставится нужными checkbox в `true`. Пример полного комплекта — в разделе 7.

**`price` (range, рубли → копейки):**

```javascript
const [min, max] = value;
const c = [];
if (min !== null && min !== undefined)
  c.push(`pc.price >= ${Math.round(min * 100)}`);
if (max !== null && max !== undefined)
  c.push(`pc.price <= ${Math.round(max * 100)}`);
return c.length ? `AND ${c.join(" AND ")}` : "";
```

Границы приходят в рублях, колонка в копейках. По алиасу `price_rub` фильтровать нельзя.

**Периоды** — даты МСК, хранение МСК, без конвертации:

```javascript
if (!value || value.length !== 2) return { from: "", to: "" };
const [from, to] = value;
return {
  from: `AND ${column} >= '${from}'`,
  to: `AND ${column} <= '${to}'`,
};
```

`column` = `pi.act_scan_uploaded_at` для `act_uploaded_date`, `pi.issued_at` для `issued_date`. Имена макросов: `ACT_UPLOADED_FROM_FILTER`/`ACT_UPLOADED_TO_FILTER` и `ISSUED_FROM_FILTER`/`ISSUED_TO_FILTER`.

---

## 6. Поиск

### 6.1. Поля поиска

`instance_id` (UUID), `external_id`, `prize_code`, `prize_title`, `act_scan_original_name`, `user_id` (UUID владельца), `participant_code`, `email`, `first_name`, `last_name`.

Drill-down по экземпляру или участнику — вставкой полного или частичного UUID. Сравнение регистронезависимое (`utf8mb4_unicode_ci`).

**Документы в поиск не включаются** — ни значения, ни флаги. Поиск по подстроке номера позволил бы восстановить значение по факту попадания строки в выдачу; фильтрация по флагам такой возможности не даёт.

### 6.2. Правило формирования `SEARCH_FILTER`

```javascript
if (!search || !search.trim()) return "";
const e = search.replace(/[%_']/g, "\\$&");
return `AND (
  BIN_TO_UUID(pi.id) LIKE '%${e}%' OR
  pi.external_id LIKE '%${e}%' OR
  pc.code LIKE '%${e}%' OR
  pc.title LIKE '%${e}%' OR
  pi.act_scan_original_name LIKE '%${e}%' OR
  BIN_TO_UUID(pi.user_id) LIKE '%${e}%' OR
  u.participant_code LIKE '%${e}%' OR
  u.email LIKE '%${e}%' OR
  u.first_name LIKE '%${e}%' OR
  u.last_name LIKE '%${e}%'
)`;
```

---

## 7. Примеры объектов макросов (JSON)

### 7.1. Очередь модерации с полным комплектом

Загруженные акты, все данные и сканы на месте, старые сверху:

```json
{
  "ACT_STATUS_FILTER": "AND pi.act_status IN ('ACT_UPLOADED')",
  "ACT_REQUIRED_FILTER": "",
  "HAS_FILE_FILTER": "AND pi.act_scan_stored_name IS NOT NULL",
  "HAS_PASSPORT_FILTER": "AND (ue.passport_series_number IS NOT NULL AND ue.passport_series_number <> '')",
  "HAS_PASSPORT_ISSUE_DATE_FILTER": "AND ue.passport_issue_date IS NOT NULL",
  "HAS_PASSPORT_ISSUED_BY_FILTER": "AND (ue.passport_issued_by IS NOT NULL AND ue.passport_issued_by <> '')",
  "HAS_ADDRESS_FILTER": "AND (ue.passport_address IS NOT NULL AND ue.passport_address <> '')",
  "HAS_INN_FILTER": "AND (ue.inn IS NOT NULL AND ue.inn <> '')",
  "HAS_SNILS_FILTER": "AND (ue.snils IS NOT NULL AND ue.snils <> '')",
  "HAS_AGREEMENT_FILTER": "AND COALESCE(ue.agreement, 0) = 1",
  "HAS_PASSPORT_MAIN_SCAN_FILTER": "AND ud_pm.id IS NOT NULL",
  "HAS_PASSPORT_REG_SCAN_FILTER": "AND ud_pr.id IS NOT NULL",
  "HAS_INN_SCAN_FILTER": "AND ud_inn.id IS NOT NULL",
  "HAS_SNILS_SCAN_FILTER": "AND ud_snils.id IS NOT NULL",
  "PRIZE_FILTER": "",
  "PRICE_FILTER": "",
  "ACT_UPLOADED_FROM_FILTER": "",
  "ACT_UPLOADED_TO_FILTER": "",
  "ISSUED_FROM_FILTER": "",
  "ISSUED_TO_FILTER": "",
  "SEARCH_FILTER": "",
  "ORDER_BY": "pi.act_scan_uploaded_at",
  "ORDER_DIR": "ASC"
}
```

### 7.2. Запросить документы

Акт требуется, нет СНИЛС, дорогие призы сверху:

```json
{
  "ACT_REQUIRED_FILTER": "AND pc.act_required IN (1)",
  "HAS_SNILS_FILTER": "AND (ue.snils IS NULL OR ue.snils = '')",
  "ORDER_BY": "pc.price",
  "ORDER_DIR": "DESC"
}
```

### 7.3. Рассогласование статуса и файла

Статус «акт загружен», а файла нет:

```json
{
  "ACT_STATUS_FILTER": "AND pi.act_status IN ('ACT_UPLOADED')",
  "HAS_FILE_FILTER": "AND pi.act_scan_stored_name IS NULL",
  "ORDER_BY": "pi.act_scan_uploaded_at",
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
  "pagination": { "page": 1, "limit": 20, "total_items": 0, "total_pages": 0 }
}
```

### 8.2. Преобразование значений

| Тип БД                                       | Тип в `values`      | Правило                                                                    |
| -------------------------------------------- | ------------------- | -------------------------------------------------------------------------- |
| `BINARY(16)`                                 | `string`            | `BIN_TO_UUID()` в SQL                                                      |
| `INT` (копейки, `price`)                     | `number`            | /100, `ROUND(...,2)`                                                       |
| `INT` (байты, дни)                           | `number`            | как есть                                                                   |
| `TINYINT`, выражения сравнения/`IS NOT NULL` | `boolean`           | `1`/`0` → `true`/`false`                                                   |
| `DATETIME`                                   | `string`            | ISO-8601 `YYYY-MM-DDTHH:MM:SS+03:00`; даты МСК, без конвертации            |
| `VARCHAR` (enum)                             | `string` + `_label` | `act_status_label`, `act_state_label`, `status_label`, `pool_status_label` |
| `NULL`                                       | `null`              | в JSON; флаги документов `null` не бывают                                  |

### 8.3. Словарь `act_state`

| Значение         | Подпись          | Условие                           |
| ---------------- | ---------------- | --------------------------------- |
| `NOT_REQUIRED`   | Акт не требуется | `act_required = 0`                |
| `WAITING_UPLOAD` | Ожидает загрузки | требуется, `act_status = PENDING` |
| `ON_REVIEW`      | На проверке      | `act_status = ACT_UPLOADED`       |
| `APPROVED`       | Подтверждён      | `act_status = APPROVED`           |
| `REJECTED`       | Отклонён         | `act_status = REJECTED`           |

Подписи `status` и `pool_status` — из `opts` + `mapping` фильтров отчёта «Призы».

### 8.4. Формирование `rows` и `meta`

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

`filters` возвращаются с текущими `value`, для `options` — с `opts` и `type`.

### 8.5. Готовность комплекта на фронте

Собирается из флагов, без обращения к серверу и без счётчиков в SQL:

```javascript
const docsReady =
  v.has_passport &&
  v.has_passport_issue_date &&
  v.has_passport_issued_by &&
  v.has_address &&
  v.has_inn &&
  v.has_snils &&
  v.has_agreement &&
  v.has_passport_main_scan &&
  v.has_passport_reg_scan &&
  v.has_inn_scan &&
  v.has_snils_scan;

const missing = [
  !v.has_passport && "Паспорт: серия и номер",
  !v.has_passport_issue_date && "Паспорт: дата выдачи",
  !v.has_passport_issued_by && "Паспорт: кем выдан",
  !v.has_address && "Адрес регистрации",
  !v.has_inn && "ИНН",
  !v.has_snils && "СНИЛС",
  !v.has_agreement && "Согласие",
  !v.has_passport_main_scan && "Скан паспорта (основной)",
  !v.has_passport_reg_scan && "Скан паспорта (регистрация)",
  !v.has_inn_scan && "Скан ИНН",
  !v.has_snils_scan && "Скан СНИЛС",
].filter(Boolean);
```

Если требуемый набор зависит от стоимости приза, состав проверки adjusts по `price_rub` и порогу. Порог задаётся бизнес-правилом — в схеме его нет.

---

## 9. Нюансы

1. **Флаги — только наличие.** Никаких счётчиков и производных перечней в SQL: выражения над полями соединений. Перечень недостающего и признак «всё указано» собираются на фронте (8.5).
2. **`NULL` и «не указано» неразличимы намеренно.** Нет записи в `user_extended`, нет владельца, пустое значение — во всех случаях флаг `false`. Отчёт отвечает «можно ли оформлять акт», а не «почему документа нет».
3. **Экземпляр без владельца.** `prize_instances.user_id` — `ON DELETE SET NULL`, а `user_extended` и `user_documents` — `ON DELETE CASCADE`. При удалении участника акт остаётся, все флаги `false`, поля владельца `NULL` — оформлять некому.
4. **У сканов нет флага отзыва.** В `user_documents` нет `is_active`/`is_removed` — удаление физическое, наличие = строка существует. Отозванный документ не может быть учтён как наличие.
5. **Один файл на тип.** `UNIQUE (user_id, document_type)` — повторная загрузка замещает запись, промежуточного состояния «два скана одного типа» не бывает.
6. **`document_type` без `CHECK`.** Значения `passport_main`, `passport_reg`, `inn_scan`, `snils_scan` взяты из описания схемы, ограничение на уровне БД отсутствует. Стоит сверить фактические:
   ```sql
   SELECT document_type, COUNT(*) AS cnt FROM user_documents GROUP BY document_type;
   ```
7. **Кто проверил акт — не хранится.** У экземпляра нет `act_moderator_id`/`act_checked_at` (в отличие от чека, где есть `moderator_id` и `moderated_at`). Доступны только `act_status` и дата загрузки скана. Аудит решений по актам требует доработки схемы.
8. **Нет `updated_at`.** Ни у `prize_instances`, ни у `user_documents` — только `created_at`. Дата обновления позиции каталога есть в `prize_catalog`, но в этот отчёт не выводится.
9. **`act_scan_stored_name` — внутреннее имя файла**, не публичный адрес. Файлы лежат вне каталога сайта, отдаёт их приложение по своим маршрутам; наружу показывается `act_scan_original_name`. Колонка для служебной диагностики — при внешней выгрузке убирайте.
10. **`act_required = 0` в выдаче** — аномалия: файл загружен у приза, которому акт не нужен. Такие строки попадают благодаря условию `OR pi.act_scan_stored_name IS NOT NULL`, `act_state` у них `NOT_REQUIRED`.
11. **NULL при сортировке по дате загрузки.** У ожидающих акта дата пустая: при `DESC` MySQL ставит `NULL` в конец, при `ASC` — в начало. Для очереди модерации — `ASC`.
12. **`days_on_review` недетерминирован** — считается от `NOW()` (сессия МСК), заполнен только для `act_status = 'ACT_UPLOADED'`. Не кэшировать и не использовать как ключ сверки.
13. **Деньги**: `pc.price` в копейках, в выдаче рубли; фильтр принимает рубли и умножает на 100.
14. **Производительность.** Соединения — `eq_ref` по уникальным ключам, не узкое место. Реальная нагрузка: `OR` в области выборки (индекс не применяется), filesort при сортировке по алиасам и полям joined-таблиц, `LIKE '%…%'` в поиске, условия по флагам (`IS NULL OR = ''`) не индексируются. Прежде чем оптимизировать — `EXPLAIN ANALYZE` с реальными макросами.
15. **Снятие области выборки.** Чтобы получить весь пул экземпляров, замените первую строку `WHERE` на `WHERE 1=1` — отчёт превратится в «Призы» с актовым блоком.
16. **Дефолт сортировки** — `act_scan_uploaded_at DESC`.
