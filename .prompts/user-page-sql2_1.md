# Структура `dict_task_calendar`

Календарь заданий бота (физически в схеме `promo_instance`, используется ботом). Поля:

| Колонка                      | Тип        | Смысл                                                                          |
| ---------------------------- | ---------- | ------------------------------------------------------------------------------ |
| `id`                         | BINARY(16) | UUID v7, PK                                                                    |
| `code`                       | VARCHAR    | код задания, уникален для каждой недели (`Cargo_S_5_W1`, `Cargo_ML_big_5_W3`…) |
| `league_code`                | VARCHAR    | лига задания (`Cargo_S`, `Evacuation_ML`…)                                     |
| `title`                      | VARCHAR    | название («Отзывы», «Расходы», «Ответы в чатах»…)                              |
| `description`                | LONGTEXT   | описание задания                                                               |
| `start_date` / `finish_date` | DATETIME   | период выполнения                                                              |
| `is_continuous`              | TINYINT    | 1 — длительное задание на весь период акции («Отзывы»), 0 — недельное          |
| `segment`                    | VARCHAR    | сегмент (`S`, `ML`, `ML_big`, NULL)                                            |
| `is_active`                  | TINYINT    | флаг активности                                                                |
| `created_at` / `updated_at`  | DATETIME   | технические                                                                    |

Связь с ботом: `bot_tasks.task_code` → `dict_task_calendar.code`.

---

# Обновлённый запрос заданий участника

## Подстановки

| Макрос          | Смысл                                                    | Пример                                   |
| --------------- | -------------------------------------------------------- | ---------------------------------------- |
| `{{USER_ID}}`   | UUID участника промо-инстанса (ключ `bot_tasks.user_id`) | `'01a0a9eb-5326-74ff-9b44-ca9f226e9b83'` |
| `{{ORDER_BY}}`  | поле сортировки из белого списка                         | `assigned_at`                            |
| `{{ORDER_DIR}}` | направление                                              | `DESC`                                   |

## SQL-запрос

```sql
SELECT
    BIN_TO_UUID(bt.id)          AS task_id,
    bt.task_code,
    bt.status,
    CASE
        WHEN bt.status = 'execution' THEN 'Назначено'
        WHEN bt.status = 'complete' AND bt.accrued_at IS NOT NULL THEN 'Выполнено (баллы начислены)'
        WHEN bt.status = 'complete' AND bt.accrued_at IS NULL THEN 'Срок истёк (баллы не начислены)'
        WHEN bt.status = 'accrued' THEN 'Начислено (legacy)'
        ELSE bt.status
    END                          AS display_status,
    bt.accrued_at,
    bt.avito_id,
    bt.telegram_id,
    bt.created_at                AS assigned_at,
    bt.updated_at,
    tc.title,
    tc.description,
    tc.start_date,
    tc.finish_date,
    tc.is_continuous,
    tc.league_code,
    tc.segment
FROM bot_tasks bt
LEFT JOIN dict_task_calendar tc ON tc.code = bt.task_code
WHERE bt.user_id = UUID_TO_BIN({{USER_ID}})
ORDER BY {{ORDER_BY}} {{ORDER_DIR}}
```

## Описание колонок (JSON)

```json
[
  {
    "name": "task_id",
    "type": "string",
    "title": "ID задания",
    "sortable": true
  },
  {
    "name": "task_code",
    "type": "string",
    "title": "Код задания",
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
    "name": "start_date",
    "type": "datetime",
    "title": "Дата старта",
    "sortable": true
  },
  {
    "name": "finish_date",
    "type": "datetime",
    "title": "Дата окончания",
    "sortable": true
  },
  {
    "name": "is_continuous",
    "type": "boolean",
    "title": "Длительное задание",
    "sortable": true
  },
  {
    "name": "league_code",
    "type": "string",
    "title": "Код лиги",
    "sortable": true
  },
  { "name": "segment", "type": "string", "title": "Сегмент", "sortable": true },
  {
    "name": "status",
    "type": "string",
    "title": "Статус (системный)",
    "sortable": true
  },
  {
    "name": "display_status",
    "type": "string",
    "title": "Статус (отображение)",
    "sortable": true
  },
  {
    "name": "accrued_at",
    "type": "datetime",
    "title": "Дата начисления баллов",
    "sortable": true
  },
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
    "name": "assigned_at",
    "type": "datetime",
    "title": "Дата назначения",
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

## Маппинг сортировки (имя колонки → SQL-выражение)

```json
{
  "task_id": "bt.id",
  "task_code": "bt.task_code",
  "title": "tc.title",
  "description": null,
  "start_date": "tc.start_date",
  "finish_date": "tc.finish_date",
  "is_continuous": "tc.is_continuous",
  "league_code": "tc.league_code",
  "segment": "tc.segment",
  "status": "bt.status",
  "display_status": "display_status",
  "accrued_at": "bt.accrued_at",
  "avito_id": "bt.avito_id",
  "telegram_id": "bt.telegram_id",
  "assigned_at": "bt.created_at",
  "updated_at": "bt.updated_at"
}
```

Дефолт: `assigned_at DESC` (новые задания сверху).

## Пояснения

1. **Код задания** — уже выводится как `bt.task_code`; `tc.code` дублировать не стал, так как связь `tc.code = bt.task_code` и значения идентичны. Если нужно отдельное поле `code` из календаря — скажите, добавлю.
2. **`LEFT JOIN`** — если `task_code` не найдётся в календаре (задание из другой версии календаря), запись всё равно выведется с `NULL` в полях календаря.
3. **`is_continuous`** — `1` для длительных заданий на весь период акции (например, «Отзывы» с `2026-11-02` по `2026-12-13`), `0` для недельных.
4. **`description`** не сортируется (`null` в маппинге) — это длинный текст без индекса.
5. **Таймзона**: `start_date`/`finish_date` выводятся как есть. Судя по данным (`00:00:00`–`23:59:59` по неделям), они в МСК. Если нужна конвертация или приведение к единому формату — скажите, добавлю.
6. **`is_active` календаря** не фильтруется — в данных все записи активны. Если нужно учитывать погашенные задания, добавлю `AND tc.is_active = 1` в условие `JOIN`.
