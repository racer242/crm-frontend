# Карточка приза: три запроса вместо одного

Все три принимают один и тот же параметр — `{{INSTANCE_ID}}`. Фронт вызывает их параллельно (или по мере открытия вкладок) и склеивает по `instance_id`.

| Запрос            | Что отдаёт                                  | Когда пусто                 |
| ----------------- | ------------------------------------------- | --------------------------- |
| 1. Приз + каталог | экземпляр, позиция каталога, владелец       | приз не найден → 404        |
| 2. Розыгрыш       | выигрышный шанс + розыгрыш + протокол       | приз не выигран в розыгрыше |
| 3. Акт            | `act_status` + скан + производное состояние | приз не найден              |

**Выигрыш от разделения:** тяжёлые `chances_snapshot` и `protocol_payload` уходят во второй запрос и не тормозят основную карточку; блок акта грузится по требованию.

> **Про акт:** по текущей схеме акт — не отдельная сущность, а `act_status` и `act_scan_*` того же экземпляра. Третий запрос выбирает их из `prize_instances`. Если вы завели отдельную таблицу актов — пришлите DDL, переделаю.

---

## 0. Общая подстановка

| Макрос            | Смысл                                  | Пример значения                                        |
| ----------------- | -------------------------------------- | ------------------------------------------------------ |
| `{{INSTANCE_ID}}` | UUID экземпляра (`prize_instances.id`) | `'01a0c828-5d8f-7b60-867b-266d1fbdbafa'` (с кавычками) |

```javascript
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
if (!UUID_RE.test(raw)) throw new Error("Некорректный UUID экземпляра");
return `'${raw}'`;
```

Для каждого запроса: `page = 1`, `limit = 1`. Макросов фильтров, поиска и сортировки нет.

---

# Запрос 1. Приз + каталог + владелец

## SQL

```sql
SELECT
    BIN_TO_UUID(pi.id)                               AS instance_id,
    BIN_TO_UUID(pi.prize_id)                         AS prize_id,
    BIN_TO_UUID(pi.user_id)                          AS user_id,
    pi.issued_at,
    pi.pool_status,
    pi.status,
    pi.external_id,
    pi.created_at,
    (pi.user_id IS NOT NULL)                         AS is_issued,
    (pi.user_id IS NULL AND pi.pool_status = 'active') AS is_free,
    pc.code                                          AS prize_code,
    pc.type_code,
    pc.title                                         AS prize_title,
    pc.description                                   AS catalog_description,
    ROUND(pc.price / 100, 2)                         AS price_rub,
    pc.points_cost,
    pc.act_required,
    pc.active                                        AS catalog_active,
    pc.is_removed                                    AS catalog_is_removed,
    pc.target_count                                  AS catalog_target_count,
    pc.image                                         AS catalog_image,
    pc.image_source_url                              AS catalog_image_source_url,
    pc.created_at                                    AS catalog_created_at,
    pc.updated_at                                    AS catalog_updated_at,
    u.participant_code,
    TRIM(CONCAT_WS(' ', u.last_name, u.first_name, u.third_name)) AS full_name,
    u.email,
    u.phone                                          AS owner_phone,
    u.status                                         AS owner_status,
    u.participant_status                             AS owner_participant_status,
    u.balance                                        AS owner_balance,
    u.total_earned                                   AS owner_total_earned,
    u.created_at                                     AS owner_registered_at
FROM prize_instances pi
JOIN prize_catalog pc ON pc.id = pi.prize_id
LEFT JOIN `user` u    ON u.id = pi.user_id
WHERE pi.id = UUID_TO_BIN({{INSTANCE_ID}})
```

## Колонки (JSON)

```json
[
  { "name": "instance_id", "type": "string", "title": "ID экземпляра" },
  { "name": "prize_id", "type": "string", "title": "ID позиции каталога" },
  { "name": "user_id", "type": "string", "title": "ID владельца" },
  { "name": "issued_at", "type": "datetime", "title": "Дата выдачи" },
  { "name": "pool_status", "type": "string", "title": "Статус в пуле" },
  { "name": "status", "type": "string", "title": "Статус приза" },
  { "name": "external_id", "type": "string", "title": "ID во внешней системе" },
  {
    "name": "created_at",
    "type": "datetime",
    "title": "Дата создания экземпляра"
  },
  { "name": "is_issued", "type": "boolean", "title": "Выдан участнику" },
  { "name": "is_free", "type": "boolean", "title": "Свободный экземпляр" },

  { "name": "prize_code", "type": "string", "title": "Код приза в CRM" },
  { "name": "type_code", "type": "string", "title": "Группа (тип)" },
  { "name": "prize_title", "type": "string", "title": "Название приза" },
  { "name": "catalog_description", "type": "string", "title": "Описание" },
  { "name": "price_rub", "type": "number", "title": "Стоимость, ₽ (для акта)" },
  { "name": "points_cost", "type": "number", "title": "Цена в баллах" },
  { "name": "act_required", "type": "boolean", "title": "Нужен акт получения" },
  {
    "name": "catalog_active",
    "type": "boolean",
    "title": "Видимость участнику"
  },
  {
    "name": "catalog_is_removed",
    "type": "boolean",
    "title": "Нет в плане CRM"
  },
  {
    "name": "catalog_target_count",
    "type": "number",
    "title": "Плановое кол-во экземпляров"
  },
  {
    "name": "catalog_image",
    "type": "string",
    "title": "Картинка (локальный адрес)"
  },
  {
    "name": "catalog_image_source_url",
    "type": "string",
    "title": "Источник картинки"
  },
  {
    "name": "catalog_created_at",
    "type": "datetime",
    "title": "Дата создания позиции"
  },
  {
    "name": "catalog_updated_at",
    "type": "datetime",
    "title": "Дата обновления позиции"
  },

  { "name": "participant_code", "type": "string", "title": "Код участника" },
  { "name": "full_name", "type": "string", "title": "ФИО владельца" },
  { "name": "email", "type": "string", "title": "Email владельца" },
  { "name": "owner_phone", "type": "string", "title": "Телефон владельца" },
  {
    "name": "owner_status",
    "type": "string",
    "title": "Статус учётной записи"
  },
  {
    "name": "owner_participant_status",
    "type": "string",
    "title": "Статус анкеты"
  },
  { "name": "owner_balance", "type": "number", "title": "Баланс баллов" },
  {
    "name": "owner_total_earned",
    "type": "number",
    "title": "Всего начислено баллов"
  },
  {
    "name": "owner_registered_at",
    "type": "datetime",
    "title": "Дата регистрации участника"
  }
]
```

## Нюансы

- `act_status` здесь нет — он в запросе 3. `act_required` — флаг каталога, дублируется в запросе 3 намеренно, чтобы тот был самодостаточным.
- В `prize_instances` нет `updated_at`; даты обновления — `catalog_updated_at` и `raffle_updated_at`.
- Персональные данные (`user_extended`, `user_documents`) не входят — по правилу схемы они не попадают в выгрузки.
- Пустой результат = приз не найден → 404.

---

# Запрос 2. Розыгрыш

## SQL

```sql
WITH win AS (
    SELECT
        id,
        raffle_id,
        source,
        source_id,
        occurred_at,
        status,
        is_winning,
        place,
        payload,
        created_at,
        ROW_NUMBER() OVER (ORDER BY occurred_at DESC, id DESC) AS rn,
        COUNT(*) OVER ()                                      AS linked_count
    FROM raffle_chance
    WHERE is_winning = 1
      AND LOWER(payload->>'$.prize_instance') = LOWER({{INSTANCE_ID}})
)
SELECT
    BIN_TO_UUID(w.id)                                AS chance_id,
    w.source                                         AS chance_source,
    BIN_TO_UUID(w.source_id)                         AS chance_source_id,
    w.occurred_at                                    AS chance_occurred_at,
    w.status                                         AS chance_status,
    w.is_winning                                     AS chance_is_winning,
    w.place                                          AS place,
    w.payload                                        AS chance_payload,
    w.payload->>'$.prize'                            AS chance_payload_prize_code,
    w.payload->>'$.source'                           AS chance_payload_source,
    w.created_at                                     AS chance_created_at,
    w.linked_count                                   AS chances_linked_count,
    BIN_TO_UUID(r.id)                                AS raffle_id,
    r.name                                           AS raffle_name,
    r.type                                           AS raffle_type,
    r.status                                         AS raffle_status,
    r.collection_from                                AS raffle_collection_from,
    r.collection_to                                  AS raffle_collection_to,
    r.source_types                                   AS raffle_source_types,
    r.start_at                                       AS raffle_start_at,
    r.end_at                                         AS raffle_end_at,
    r.publish_at                                     AS raffle_publish_at,
    r.drawn_at                                       AS drawn_at,
    r.started_at                                     AS raffle_started_at,
    r.finished_at                                    AS raffle_finished_at,
    r.input_hash                                     AS raffle_input_hash,
    r.sample_size                                    AS raffle_sample_size,
    r.seed                                           AS raffle_seed,
    r.algorithm_version                              AS raffle_algorithm_version,
    r.result_hash                                    AS raffle_result_hash,
    r.result_chunks_total                            AS raffle_result_chunks_total,
    r.protocol_payload                               AS raffle_protocol_payload,
    r.chances_snapshot                               AS raffle_chances_snapshot,
    r.annul_reason                                   AS raffle_annul_reason,
    r.initiated_by_name                              AS raffle_initiated_by_name,
    r.initiated_by_external_id                       AS raffle_initiated_by_external_id,
    BIN_TO_UUID(r.initiated_by_id)                   AS raffle_initiated_by_id,
    au.email                                         AS raffle_initiated_by_email,
    r.crm_key_id                                     AS raffle_crm_key_id,
    r.created_at                                     AS raffle_created_at,
    r.updated_at                                     AS raffle_updated_at,
    (SELECT COUNT(*)
       FROM raffle_result_chunk c
      WHERE c.raffle_id = r.id)                      AS raffle_chunks_received,
    (SELECT COALESCE(SUM(c.winners_count), 0)
       FROM raffle_result_chunk c
      WHERE c.raffle_id = r.id)                      AS raffle_winners_declared,
    (SELECT MAX(c.received_at)
       FROM raffle_result_chunk c
      WHERE c.raffle_id = r.id)                      AS raffle_last_chunk_at
FROM win w
JOIN raffle r           ON r.id = w.raffle_id
LEFT JOIN admin_user au ON au.id = r.initiated_by_id
WHERE w.rn = 1
```

## Колонки (JSON)

```json
[
  { "name": "chance_id", "type": "string", "title": "ID выигрышного шанса" },
  { "name": "chance_source", "type": "string", "title": "Источник шанса" },
  {
    "name": "chance_source_id",
    "type": "string",
    "title": "ID события-источника"
  },
  {
    "name": "chance_occurred_at",
    "type": "datetime",
    "title": "Дата события шанса"
  },
  { "name": "chance_status", "type": "string", "title": "Статус шанса" },
  {
    "name": "chance_is_winning",
    "type": "boolean",
    "title": "Шанс выигрышный"
  },
  { "name": "place", "type": "number", "title": "Место в розыгрыше" },
  { "name": "chance_payload", "type": "json", "title": "Payload шанса" },
  {
    "name": "chance_payload_prize_code",
    "type": "string",
    "title": "Код приза из payload"
  },
  {
    "name": "chance_payload_source",
    "type": "string",
    "title": "Источник результата из payload"
  },
  {
    "name": "chance_created_at",
    "type": "datetime",
    "title": "Дата создания шанса"
  },
  {
    "name": "chances_linked_count",
    "type": "number",
    "title": "Связано выигрышных шансов"
  },

  { "name": "raffle_id", "type": "string", "title": "ID розыгрыша" },
  { "name": "raffle_name", "type": "string", "title": "Розыгрыш" },
  { "name": "raffle_type", "type": "string", "title": "Тип розыгрыша" },
  { "name": "raffle_status", "type": "string", "title": "Статус розыгрыша" },
  {
    "name": "raffle_collection_from",
    "type": "datetime",
    "title": "Сбор шансов: с"
  },
  {
    "name": "raffle_collection_to",
    "type": "datetime",
    "title": "Сбор шансов: по"
  },
  {
    "name": "raffle_source_types",
    "type": "json",
    "title": "Источники шансов розыгрыша"
  },
  { "name": "raffle_start_at", "type": "datetime", "title": "Плановый старт" },
  { "name": "raffle_end_at", "type": "datetime", "title": "Плановый финиш" },
  {
    "name": "raffle_publish_at",
    "type": "datetime",
    "title": "Дата публикации"
  },
  { "name": "drawn_at", "type": "datetime", "title": "Дата розыгрыша (факт)" },
  {
    "name": "raffle_started_at",
    "type": "datetime",
    "title": "Фактический старт"
  },
  {
    "name": "raffle_finished_at",
    "type": "datetime",
    "title": "Фактический финиш"
  },
  {
    "name": "raffle_input_hash",
    "type": "string",
    "title": "Отпечаток выборки"
  },
  { "name": "raffle_sample_size", "type": "number", "title": "Размер выборки" },
  { "name": "raffle_seed", "type": "string", "title": "Seed розыгрыша" },
  {
    "name": "raffle_algorithm_version",
    "type": "string",
    "title": "Версия алгоритма"
  },
  {
    "name": "raffle_result_hash",
    "type": "string",
    "title": "Отпечаток результата"
  },
  {
    "name": "raffle_result_chunks_total",
    "type": "number",
    "title": "Порций результата всего"
  },
  {
    "name": "raffle_protocol_payload",
    "type": "json",
    "title": "Протокол розыгрыша"
  },
  {
    "name": "raffle_chances_snapshot",
    "type": "json",
    "title": "Снимок шансов выборки"
  },
  {
    "name": "raffle_annul_reason",
    "type": "string",
    "title": "Причина аннулирования"
  },
  {
    "name": "raffle_initiated_by_name",
    "type": "string",
    "title": "Кто запустил (имя)"
  },
  {
    "name": "raffle_initiated_by_external_id",
    "type": "string",
    "title": "Кто запустил (внешний ID)"
  },
  {
    "name": "raffle_initiated_by_id",
    "type": "string",
    "title": "ID администратора"
  },
  {
    "name": "raffle_initiated_by_email",
    "type": "string",
    "title": "Email администратора"
  },
  { "name": "raffle_crm_key_id", "type": "string", "title": "Ключ CRM" },
  {
    "name": "raffle_created_at",
    "type": "datetime",
    "title": "Дата создания розыгрыша"
  },
  {
    "name": "raffle_updated_at",
    "type": "datetime",
    "title": "Дата обновления розыгрыша"
  },
  {
    "name": "raffle_chunks_received",
    "type": "number",
    "title": "Порций результата получено"
  },
  {
    "name": "raffle_winners_declared",
    "type": "number",
    "title": "Победителей заявлено в порциях"
  },
  {
    "name": "raffle_last_chunk_at",
    "type": "datetime",
    "title": "Дата последней порции"
  }
]
```

## Нюансы

- **Связь** — через `payload.prize_instance` (подтверждено выгрузкой). `LOWER()` с двух сторон: строки из JSON сравниваются бинарно.
- **CTE отфильтрован сразу по целевому UUID**, поэтому `ROW_NUMBER()` без `PARTITION BY` — все строки в нём относятся к одному экземпляру.
- **Пустой результат — не ошибка**: приз куплен за баллы, выдан вручную, либо шанс пришёл без ключа `prize_instance`.
- **`chances_linked_count > 1`** — аномалия: на экземпляр ссылается несколько выигрышных шансов; берётся самый поздний по `occurred_at`.
- **Сверка**: `chance_payload_prize_code` должен совпадать с `prize_code` из запроса 1.
- **`place` сейчас `NULL`** у выигрышных шансов в текущих данных.
- **Чувствительный блок**: `raffle_seed`, `raffle_input_hash`, `raffle_result_hash`, `raffle_chances_snapshot`, `raffle_crm_key_id` — отдавать только административной роли. `chances_snapshot` может быть объёмным.
- **Контроль доставки**: `raffle_chunks_received` против `raffle_result_chunks_total`.
- Имена `drawn_at` и `place` сохранены из отчёта «Призы» (`raffle.drawn_at` и `raffle_chance.place`).
- Если розыгрыш уже известен (`raffle_id` получен ранее), CTE можно заменить прямым выбором из `raffle` по `UUID_TO_BIN({{RAFFLE_ID}})` — блок шанса тогда убирается.

---

# Запрос 3. Акт

## SQL

```sql
SELECT
    BIN_TO_UUID(pi.id)                               AS instance_id,
    pc.code                                          AS prize_code,
    pc.title                                         AS prize_title,
    pc.act_required,
    pi.act_status,
    pi.act_scan_stored_name,
    pi.act_scan_original_name,
    pi.act_scan_mime,
    pi.act_scan_size,
    pi.act_scan_uploaded_at,
    (pi.act_scan_stored_name IS NOT NULL)            AS act_file_present,
    CASE
        WHEN pc.act_required = 0            THEN 'NOT_REQUIRED'
        WHEN pi.act_status = 'APPROVED'     THEN 'APPROVED'
        WHEN pi.act_status = 'REJECTED'     THEN 'REJECTED'
        WHEN pi.act_status = 'ACT_UPLOADED' THEN 'ON_REVIEW'
        ELSE 'WAITING_UPLOAD'
    END                                              AS act_state
FROM prize_instances pi
JOIN prize_catalog pc ON pc.id = pi.prize_id
WHERE pi.id = UUID_TO_BIN({{INSTANCE_ID}})
```

## Колонки (JSON)

```json
[
  { "name": "instance_id", "type": "string", "title": "ID экземпляра" },
  { "name": "prize_code", "type": "string", "title": "Код приза в CRM" },
  { "name": "prize_title", "type": "string", "title": "Название приза" },
  { "name": "act_required", "type": "boolean", "title": "Нужен акт получения" },
  { "name": "act_status", "type": "string", "title": "Статус акта" },
  {
    "name": "act_scan_stored_name",
    "type": "string",
    "title": "Файл акта (внутреннее имя)"
  },
  {
    "name": "act_scan_original_name",
    "type": "string",
    "title": "Файл акта (исходное имя)"
  },
  { "name": "act_scan_mime", "type": "string", "title": "MIME файла акта" },
  {
    "name": "act_scan_size",
    "type": "number",
    "title": "Размер файла акта, байт"
  },
  {
    "name": "act_scan_uploaded_at",
    "type": "datetime",
    "title": "Дата загрузки акта"
  },
  {
    "name": "act_file_present",
    "type": "boolean",
    "title": "Файл акта загружен"
  },
  { "name": "act_state", "type": "string", "title": "Состояние акта (сводно)" }
]
```

## Словарь `act_state`

| Значение         | Подпись          | Условие                           |
| ---------------- | ---------------- | --------------------------------- |
| `NOT_REQUIRED`   | Акт не требуется | `act_required = 0`                |
| `WAITING_UPLOAD` | Ожидает загрузки | требуется, `act_status = PENDING` |
| `ON_REVIEW`      | На проверке      | `act_status = ACT_UPLOADED`       |
| `APPROVED`       | Подтверждён      | `act_status = APPROVED`           |
| `REJECTED`       | Отклонён         | `act_status = REJECTED`           |

## Нюансы

- **`act_scan_stored_name` — внутреннее имя файла**, не публичный адрес. Сам файл отдаёт приложение по своим маршрутам; наружу показывается только `act_scan_original_name`.
- **`act_file_present`** ловит рассогласование: файл есть, а `act_status` ещё `PENDING` (или наоборот) — повод проверить данные.
- **`act_required = 0`** при заполненном `act_status` — нормальная ситуация для призов, у которых акт не нужен; `act_state` показывает `NOT_REQUIRED`.
- Запрос возвращает строку всегда, когда приз существует.

---

## Общие правила ответа

Типы значений во всех трёх запросах:

| Тип БД                             | Тип в объекте      | Правило                                      |
| ---------------------------------- | ------------------ | -------------------------------------------- |
| `BINARY(16)`                       | `string`           | `BIN_TO_UUID()` в SQL                        |
| `INT` (копейки, `price`)           | `number`           | /100, `ROUND(...,2)`                         |
| `INT` (баллы, счётчики, байты)     | `number`           | как есть                                     |
| `TINYINT`, выражения `IS NOT NULL` | `boolean`          | `1`/`0` → `true`/`false`                     |
| `DATETIME`                         | `string`           | ISO-8601 `+03:00`; даты МСК, без конвертации |
| `JSON`                             | `object` / `array` | как есть; тип колонки `json`                 |
| `NULL`                             | `null`             | в JSON                                       |

```javascript
const row = result.rows[0] ?? null; // пусто → нет данных (для запроса 1 — 404)
const data = row ? transformRow(row) : null;
```

Подписи enum-полей (`pool_status`, `status`, `act_status`, `raffle_status`, `chance_status`, `chance_source`, `owner_status`, `owner_participant_status`) берутся из `opts` + `mapping` фильтров отчёта «Призы» — те же пары «код → подпись».
