# Сортировка по столбцам для запроса заданий участника

## Обновлённый SQL-запрос

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
    bt.updated_at
FROM bot_tasks bt
WHERE bt.user_id = UUID_TO_BIN({{USER_ID}})
ORDER BY {{ORDER_BY}} {{ORDER_DIR}}
```

## Описание колонок (JSON, с флагом `sortable`)

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
  "status": "bt.status",
  "display_status": "display_status",
  "accrued_at": "bt.accrued_at",
  "avito_id": "bt.avito_id",
  "telegram_id": "bt.telegram_id",
  "assigned_at": "bt.created_at",
  "updated_at": "bt.updated_at"
}
```

## Правила

- **`{{ORDER_BY}}`** — подставляется значение из маппинга по имени колонки из `sort` запроса.
- **`{{ORDER_DIR}}`** — `ASC` при `direction = 1`, `DESC` при `direction = -1`.
- **Дефолтная сортировка** (если `sort` пуст или не найден в белом списке): `assigned_at DESC` — новые задания сверху.
- **`display_status`** сортируется по алиасу — в MySQL `ORDER BY` может ссылаться на алиасы из `SELECT`, поэтому дублировать `CASE` в маппинге не нужно. Сортировка идёт по строковому значению: «Выполнено…» → «Назначено» → «Начислено…» → «Срок истёк…» (алфавит). Если нужен логический порядок (Назначено → Выполнено → Срок истёк), замените значение маппинга на числовое выражение:
  ```
  "display_status": "CASE WHEN bt.status = 'execution' THEN 1 WHEN bt.status = 'complete' AND bt.accrued_at IS NOT NULL THEN 2 WHEN bt.status = 'complete' AND bt.accrued_at IS NULL THEN 3 ELSE 4 END"
  ```
- **`task_id`** сортируется по `bt.id` — UUID v7 монотонен по времени, поэтому фактически это сортировка по моменту создания записи.
- **Безопасность**: имя колонки подставляется только из этого белого списка — никакого пользовательского ввода напрямую в `ORDER BY`.
