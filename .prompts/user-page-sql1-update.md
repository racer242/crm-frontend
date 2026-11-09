# Запрос: данные одного участника с местом в рейтинге (с названиями категории и лиги)

## Подстановки

| Макрос        | Смысл                                                    | Пример значения                                        |
| ------------- | -------------------------------------------------------- | ------------------------------------------------------ |
| `{{USER_ID}}` | UUID участника промо-инстанса (ключ `bot_users.user_id`) | `'01a0a9eb-5326-74ff-9b44-ca9f226e9b83'` (с кавычками) |

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
    COALESCE(dc.name, t.category_code) AS category_name,
    COALESCE(dl.name, t.league_code)   AS league_name,
    COALESCE(s.above, 0) + 1           AS place,
    CASE
        WHEN s.total > 1
            THEN GREATEST(0, FLOOR(((s.total - s.above - 1) / s.total) * 100))
        ELSE 0
    END                                AS better_than_percent
FROM target t
CROSS JOIN stats s
LEFT JOIN dict_category dc ON dc.code = t.category_code
LEFT JOIN dict_league dl   ON dl.code = t.league_code;
```

## Описание колонок (JSON)

```json
[
  { "name": "avito_id", "type": "string", "title": "Avito ID" },
  { "name": "telegram_id", "type": "number", "title": "Telegram ID" },
  { "name": "category_name", "type": "string", "title": "Категория" },
  { "name": "league_name", "type": "string", "title": "Лига" },
  { "name": "place", "type": "number", "title": "Место в рейтинге" },
  {
    "name": "better_than_percent",
    "type": "number",
    "title": "Результат лучше, чем у % участников"
  }
]
```

## Пояснения

1. **Названия из справочников** — `LEFT JOIN` к `dict_category` и `dict_league` по `code`, как в списке участников. `COALESCE(...)` возвращает название, а если записи в справочнике нет — сам код, чтобы не терять данные.
2. **Рейтинг не изменился** — `stats` по-прежнему считает `total` и `above` по кодам категории/лиги среди активных участников. Справочники присоединяются только в финальном `SELECT` и на расчёт не влияют.
3. **`<=>`** — NULL-безопасное равенство: `league_code` может быть `NULL`, обычный `=` с `NULL` не сработает.
