# Запрос: список транзакций конкретного участника

Ключ — UUID участника промо-инстанса (`bot_users.user_id`), как в других карточных запросах. Связь с журналом — через `avito_id`. Поля участника не выводятся (они константны для этой выборки и известны из карточки); при необходимости добавляются.

## Подстановки

| Макрос              | Смысл                            | Пример                                   |
| ------------------- | -------------------------------- | ---------------------------------------- |
| `{{USER_ID}}`       | UUID участника промо-инстанса    | `'01a0a9eb-5326-74ff-9b44-ca9f226e9b83'` |
| `{{SEARCH_FILTER}}` | условие поиска (или пусто)       | `AND (…)`                                |
| `{{ORDER_BY}}`      | поле сортировки из белого списка | `tl.processed_at`                        |
| `{{ORDER_DIR}}`     | направление                      | `DESC`                                   |

## SQL-запрос

```sql
SELECT
    tl.transaction_id,
    CONVERT_TZ(tl.processed_at, '+00:00', '+03:00') AS processed_at_msk,
    tl.type_code,
    tl.status,
    tl.points,
    tl.error_message,
    tl.task_code,
    tc.title                                         AS task_title,
    tc.segment,
    tl.league_code,
    COALESCE(dl.name, tl.league_code)                AS league_name
FROM bot_transaction_log tl
JOIN bot_users bu          ON bu.avito_id = tl.avito_id
LEFT JOIN dict_task_calendar tc ON tc.code = tl.task_code
LEFT JOIN dict_league dl        ON dl.code = tl.league_code
WHERE bu.user_id = UUID_TO_BIN({{USER_ID}})
  {{SEARCH_FILTER}}
ORDER BY {{ORDER_BY}} {{ORDER_DIR}}
```

## Описание колонок (JSON)

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

## Маппинг сортировки (JSON)

```json
{
  "transaction_id": "tl.transaction_id",
  "processed_at_msk": "tl.processed_at",
  "type_code": "tl.type_code",
  "status": "tl.status",
  "points": "tl.points",
  "task_code": "tl.task_code",
  "task_title": "tc.title",
  "segment": "tc.segment",
  "league_code": "tl.league_code",
  "league_name": "league_name",
  "error_message": null
}
```

Дефолт: `processed_at_msk DESC`.

## Правило формирования `SEARCH_FILTER`

Поиск по полям транзакции и задания (поля участника константны, в поиск не включены):

```javascript
if (!search || !search.trim()) return "";
const e = search.replace(/[%_']/g, "\\$&");
return `AND (
  tl.transaction_id LIKE '%${e}%' OR
  tl.type_code LIKE '%${e}%' OR
  tl.status LIKE '%${e}%' OR
  tl.task_code LIKE '%${e}%' OR
  tl.league_code LIKE '%${e}%' OR
  tl.error_message LIKE '%${e}%' OR
  tc.title LIKE '%${e}%'
)`;
```

## Пример объекта макросов (JSON)

```json
{
  "USER_ID": "'01a0a9eb-5326-74ff-9b44-ca9f226e9b83'",
  "SEARCH_FILTER": "",
  "ORDER_BY": "tl.processed_at",
  "ORDER_DIR": "DESC"
}
```

## Нюансы

1. **Таймзона.** `processed_at` в UTC — вывод конвертируется в МСК. Даты календаря не выводятся, только `title`/`segment`.
2. **`JOIN bot_users` — INNER.** Если участник не связан с ботом (нет записи в `bot_users`), запрос вернёт 0 строк — связь журнал↔участник идёт только через `avito_id`.
3. **Альтернативный ключ.** Если удобнее передавать не UUID, а другой идентификатор, замените условие `WHERE`:
   - по Avito: `WHERE tl.avito_id = {{AVITO_ID}}` (тогда `JOIN bot_users` можно убрать);
   - по Telegram: `WHERE bu.telegram_id = {{TELEGRAM_ID}}`.
4. **`LEFT JOIN` справочников** сохраняет транзакции с неизвестным `task_code`/`league_code` (поля календаря/лиги будут `NULL` / код как есть).
5. **`points` и `segment` пустые у LEAGUE-транзакций** — это штатно, такие строки всё равно выводятся (фильтров по ним здесь нет).
