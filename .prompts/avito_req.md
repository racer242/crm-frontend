## SQL-запрос

```sql
SELECT
    BIN_TO_UUID(u.id)                        AS user_id,
    u.participant_code,
    TRIM(CONCAT_WS(' ', u.first_name, u.last_name)) AS full_name,
    u.email,
    u.phone,
    u.status,
    u.participant_status,
    u.balance,
    u.mailing,
    u.created_at,
    bu.avito_id,
    bu.telegram_id,
    COALESCE(dc.name, bu.category_code)      AS category_name,
    COALESCE(dl.name, bu.league_code)        AS league_name
FROM `user` u
LEFT JOIN bot_users bu    ON bu.user_id = u.id
LEFT JOIN dict_category dc ON dc.code = bu.category_code
LEFT JOIN dict_league dl   ON dl.code = bu.league_code
WHERE 1=1
  {{STATUS_FILTER}}
  {{PARTICIPANT_STATUS_FILTER}}
  {{MAILING_FILTER}}
  {{DATE_FROM_FILTER}}
  {{DATE_TO_FILTER}}
  {{BALANCE_FILTER}}
  {{SEARCH_FILTER}}
  {{CATEGORY_FILTER}}
  {{LEAGUE_FILTER}}
ORDER BY {{ORDER_BY}} {{ORDER_DIR}}
```

## Описание колонок (JSON)

В вашем списке была опечатка в последнем поле — исправил.

```json
[
  { "name": "user_id", "type": "string", "title": "ID участника" },
  { "name": "participant_code", "type": "string", "title": "Код участника" },
  { "name": "full_name", "type": "string", "title": "Имя и фамилия" },
  { "name": "email", "type": "string", "title": "Email" },
  { "name": "phone", "type": "string", "title": "Телефон" },
  { "name": "status", "type": "string", "title": "Статус" },
  { "name": "participant_status", "type": "string", "title": "Статус анкеты" },
  { "name": "balance", "type": "number", "title": "Баланс, баллов" },
  { "name": "mailing", "type": "boolean", "title": "Рассылка" },
  { "name": "created_at", "type": "date", "title": "Дата регистрации" },
  { "name": "avito_id", "type": "string", "title": "Avito ID" },
  { "name": "telegram_id", "type": "number", "title": "Telegram ID" },
  { "name": "category_name", "type": "string", "title": "Категория" },
  { "name": "league_name", "type": "string", "title": "Лига" }
]
```

## Маппинг сортировки

```json
{
  "user_id": "u.id",
  "participant_code": "u.participant_code",
  "full_name": null,
  "email": "u.email",
  "phone": "u.phone",
  "status": "u.status",
  "participant_status": "u.participant_status",
  "balance": "u.balance",
  "mailing": "u.mailing",
  "created_at": "u.created_at",
  "avito_id": "bu.avito_id",
  "telegram_id": "bu.telegram_id",
  "category_name": "category_name",
  "league_name": "league_name"
}
```

## Пояснения

1. **`LEFT JOIN` к справочникам** — если у кода нет записи в `dict_category` / `dict_league`, участник всё равно попадёт в выдачу.
2. **`COALESCE(dc.name, bu.category_code)`** — если названия в справочнике нет, выведется сам код, чтобы не терять информацию. Если нужно строго `NULL` при отсутствии справочника — замените на просто `dc.name`.
3. **Фильтры `{{CATEGORY_FILTER}}` и `{{LEAGUE_FILTER}}`** остаются по кодам:
   ```
   "CATEGORY_FILTER": "AND bu.category_code IN ('CAT1', 'CAT2')"
   "LEAGUE_FILTER":   "AND bu.league_code IN ('GOLD', 'SILVER')"
   ```
   Фильтровать по кодам правильнее, чем по названиям — названия могут меняться.
4. **Имена колонок сменились** с `category_code`/`league_code` на `category_name`/`league_name` — фронтенд должен это учитывать. Если нужно сохранить старые имена для совместимости, замените алиасы: `AS category_code` и `AS league_code`.
5. **Если в справочниках есть `is_active`** — добавьте в условия JOIN, чтобы не подтягивать погашенные записи:

   ```sql
   LEFT JOIN dict_category dc ON dc.code = bu.category_code AND dc.is_active = 1
   LEFT JOIN dict_league dl   ON dl.code = bu.league_code AND dl.is_active = 1
   ```

   # Сортировка для запроса участников с полями бота

## Описание колонок (с флагом `sortable`)

```json
[
  {
    "name": "user_id",
    "type": "string",
    "title": "ID участника",
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
    "title": "Имя и фамилия",
    "sortable": false
  },
  { "name": "email", "type": "string", "title": "Email", "sortable": true },
  { "name": "phone", "type": "string", "title": "Телефон", "sortable": false },
  { "name": "status", "type": "string", "title": "Статус", "sortable": true },
  {
    "name": "participant_status",
    "type": "string",
    "title": "Статус анкеты",
    "sortable": true
  },
  {
    "name": "balance",
    "type": "number",
    "title": "Баланс, баллов",
    "sortable": true
  },
  {
    "name": "mailing",
    "type": "boolean",
    "title": "Рассылка",
    "sortable": true
  },
  {
    "name": "created_at",
    "type": "date",
    "title": "Дата регистрации",
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
    "name": "category_name",
    "type": "string",
    "title": "Категория",
    "sortable": true
  },
  { "name": "league_name", "type": "string", "title": "Лига", "sortable": true }
]
```

## Маппинг сортировки (имя колонки → SQL-выражение)

```json
{
  "user_id": "u.id",
  "participant_code": "u.participant_code",
  "full_name": null,
  "email": "u.email",
  "phone": "u.phone",
  "status": "u.status",
  "participant_status": "u.participant_status",
  "balance": "u.balance",
  "mailing": "u.mailing",
  "created_at": "u.created_at",
  "avito_id": "bu.avito_id",
  "telegram_id": "bu.telegram_id",
  "category_name": "category_name",
  "league_name": "league_name"
}
```

## Правила

- **`{{ORDER_BY}}`** — подставляется значение из маппинга по имени колонки из `sort` запроса.
- **`{{ORDER_DIR}}`** — `ASC` при `direction = 1`, `DESC` при `direction = -1`.
- **Дефолтная сортировка** (если `sort` пуст или не в белом списке): `created_at DESC`.
- **`full_name: null`** — сортировка по этому полю игнорируется (вычисляемое выражение `CONCAT_WS` без отдельного индекса), фронт не показывает стрелку сортировки (`sortable: false`).
- **`category_name` и `league_name`** сортируются по алиасу.
