# Запрос: данные одного участника с местом в рейтинге

## Подстановки

| Макрос        | Смысл                                                    | Пример значения                                        |
| ------------- | -------------------------------------------------------- | ------------------------------------------------------ |
| `{{USER_ID}}` | UUID участника промо-инстанса (ключ `bot_users.user_id`) | `'01a0a9eb-5326-74ff-9b44-ca9f226e9b83'` (с кавычками) |

Если удобнее искать по другому ключу (например, `telegram_id` или `avito_id`), скажите — заменю условие в `target`.

## SQL-запрос

```sql
WITH target AS (
    SELECT
        id,
        balance,
        category_code,
        league_code,
        avito_id,
        telegram_id
    FROM bot_users
    WHERE user_id = UUID_TO_BIN({{USER_ID}})
),
stats AS (
    SELECT
        COUNT(p.id) AS total,
        COALESCE(SUM(CASE WHEN p.balance > t.balance THEN 1 ELSE 0 END), 0) AS above
    FROM target t
    JOIN bot_users p
      ON p.is_active = TRUE
     AND p.category_code <=> t.category_code
     AND p.league_code <=> t.league_code
)
SELECT
    t.avito_id,
    t.telegram_id,
    t.category_code,
    t.league_code,
    COALESCE(s.above, 0) + 1 AS place,
    CASE
        WHEN s.total > 1
            THEN GREATEST(0, FLOOR(((s.total - s.above - 1) / s.total) * 100))
        ELSE 0
    END AS better_than_percent
FROM target t
CROSS JOIN stats s;
```

## Описание колонок (JSON)

```json
[
  { "name": "avito_id", "type": "string", "title": "Avito ID" },
  { "name": "telegram_id", "type": "number", "title": "Telegram ID" },
  { "name": "category_code", "type": "string", "title": "Категория" },
  { "name": "league_code", "type": "string", "title": "Лига" },
  { "name": "place", "type": "number", "title": "Место в рейтинге" },
  {
    "name": "better_than_percent",
    "type": "number",
    "title": "Результат лучше, чем у % участников"
  }
]
```

## Пояснения по логике рейтинга

1. **`target`** — находит запись участника в `bot_users` по UUID промо-инстанса.
2. **`stats`** — считает среди всех **активных** участников той же категории и лиги:
   - `total` — общее число таких участников (включая текущего);
   - `above` — сколько из них имеют `balance` **строго больше**, чем у текущего.
3. **`place = above + 1`** — строго больше кода (`const above = peers.filter(peer => peer.balance > user.balance).length; return above + 1`).
4. **`better_than_percent`**:
   - `below = total - above - 1` (включая тех, у кого баланс равен текущему);
   - `floor((below / total) * 100)`;
   - при `total <= 1` возвращается `0` — как в коде `total > 1 ? ... : 0`.
5. **`<=>`** — NULL-безопасное равенство в MySQL. Нужно, потому что `league_code` может быть `NULL`: обычный `=` с `NULL` не сработает, а `<=>` корректно сравнит `NULL <=> NULL` как истину.

## Примечания

- Вывожу **коды** категории и лиги (`category_code`, `league_code`). Если нужны названия из справочников (`dict_category.name`, `dict_league.name`), скажите — добавлю `LEFT JOIN`.
- `telegram_id` в `bot_users` — `BIGINT`, не UUID, поэтому `BIN_TO_UUID` к нему не применяется.
- `is_active = TRUE` — как в коде `listActiveByCategoryAndLeague`: считаются только активные участники.
- Если участник не найден (`target` пуст), запрос вернёт ноль строк — это штатная ситуация, фронт должен обработать.
