# Справочник форматирования данных (FormatEngine) CRM Platform

Система форматирования значений с использованием нативной Intl API.

---

## Что такое FormatEngine

FormatEngine — модуль для форматирования данных в командах (setProperty, setState и т.д.). Форматирование применяется **после разрешения макросов** и **перед записью в state**.

**Ключевые возможности:**

- 7 типов форматирования (Date, Time, Number, Currency, RelativeTime, List, Plural)
- 5 функций Intl API (DateTimeFormat, NumberFormat, RelativeTimeFormat, ListFormat, PluralRules)
- Поддержка вложенных свойств (`data.amount`, `items.price`)
- Fallback на `en-US` при ошибке создания форматтера
- Настраиваемая локаль (по умолчанию `ru-RU`)

---

## Конфигурация форматирования

Форматирование задаётся через массив `format` в `params` команды:

```json
{
  "type": "setProperty",
  "params": {
    "value": "2025-01-15T10:30:00",
    "target": "state.date",
    "format": [
      {
        "prop": "value",
        "type": "Date",
        "func": "DateTimeFormat",
        "params": { "dateStyle": "full", "timeStyle": "medium" }
      }
    ]
  }
}
```

---

## FormatRule (правило форматирования)

```typescript
interface FormatRule {
  prop: string; // Путь к свойству (может быть вложенным)
  type: FormatType; // Тип форматирования
  func: FormatFunc; // Функция Intl API
  params?: object; // Опции форматирования
}
```

### FormatType

| Тип            | Описание                            |
| -------------- | ----------------------------------- |
| `Date`         | Форматирование даты                 |
| `Time`         | Форматирование времени              |
| `Number`       | Форматирование чисел                |
| `Currency`     | Форматирование валюты               |
| `RelativeTime` | Относительное время (вчера, завтра) |
| `List`         | Форматирование списков              |
| `Plural`       | Правила множественных чисел         |

### FormatFunc

| Функция              | Используется в типах |
| -------------------- | -------------------- |
| `DateTimeFormat`     | Date, Time           |
| `NumberFormat`       | Number, Currency     |
| `RelativeTimeFormat` | RelativeTime         |
| `ListFormat`         | List                 |
| `PluralRules`        | Plural               |

---

## 1. Date / Time — DateTimeFormat

Форматирование даты и времени.

### Опции

| Опция          | Возможные значения                                        | Описание      |
| -------------- | --------------------------------------------------------- | ------------- |
| `dateStyle`    | `"full"`, `"long"`, `"medium"`, `"short"`                 | Стиль даты    |
| `timeStyle`    | `"full"`, `"long"`, `"medium"`, `"short"`                 | Стиль времени |
| `weekday`      | `"long"`, `"short"`, `"narrow"`                           | День недели   |
| `year`         | `"numeric"`, `"2-digit"`                                  | Год           |
| `month`        | `"numeric"`, `"2-digit"`, `"long"`, `"short"`, `"narrow"` | Месяц         |
| `day`          | `"numeric"`, `"2-digit"`                                  | День          |
| `hour`         | `"numeric"`, `"2-digit"`                                  | Час           |
| `minute`       | `"numeric"`, `"2-digit"`                                  | Минута        |
| `second`       | `"numeric"`, `"2-digit"`                                  | Секунда       |
| `timeZoneName` | `"short"`, `"long"`                                       | Часовой пояс  |

### Примеры

```json
{
  "type": "Date",
  "func": "DateTimeFormat",
  "params": { "dateStyle": "full", "timeStyle": "short" }
}
// → "15 января 2025 г., 10:30"

{
  "type": "Date",
  "func": "DateTimeFormat",
  "params": { "day": "2-digit", "month": "2-digit", "year": "numeric" }
}
// → "15.01.2025"

{
  "type": "Time",
  "func": "DateTimeFormat",
  "params": { "hour": "2-digit", "minute": "2-digit" }
}
// → "10:30"
```

### Входные типы

- `Date` — объект даты
- `string` — строка даты (ISO или другая распознаваемая)
- `number` — timestamp в миллисекундах

---

## 2. Number — NumberFormat

Форматирование чисел.

### Опции

| Опция                   | Возможные значения                           | Описание                 |
| ----------------------- | -------------------------------------------- | ------------------------ |
| `style`                 | `"decimal"`, `"percent"`, `"unit"`           | Стиль числа              |
| `minimumIntegerDigits`  | `1`, `2`, `3`...                             | Мин. цифр целой части    |
| `minimumFractionDigits` | `0`, `1`, `2`...                             | Мин. цифр дробной части  |
| `maximumFractionDigits` | `0`, `1`, `2`...                             | Макс. цифр дробной части |
| `useGrouping`           | `true`, `false`                              | Разделитель тысяч        |
| `unit`                  | `"kilometer-per-hour"`, `"meter"`, `"liter"` | Единица измерения        |

### Примеры

```json
{
  "type": "Number",
  "func": "NumberFormat",
  "params": { "minimumFractionDigits": 2, "useGrouping": true }
}
// → 1234.56 → "1 234,56"

{
  "type": "Number",
  "func": "NumberFormat",
  "params": { "style": "percent", "minimumFractionDigits": 1 }
}
// → 0.75 → "75,0%"

{
  "type": "Number",
  "func": "NumberFormat",
  "params": { "minimumIntegerDigits": 3 }
}
// → 5 → "005"
```

---

## 3. Currency — NumberFormat

Форматирование валюты.

### Опции

| Опция                   | Возможные значения                          | Описание                  |
| ----------------------- | ------------------------------------------- | ------------------------- |
| `currency`              | `"RUB"`, `"USD"`, `"EUR"`, `"GBP"`, `"JPY"` | Код валюты                |
| `currencyDisplay`       | `"symbol"`, `"code"`, `"name"`              | Отображение валюты        |
| `minimumFractionDigits` | `0`, `1`, `2`...                            | Мин. знаков после запятой |

### Примеры

```json
{
  "type": "Currency",
  "func": "NumberFormat",
  "params": { "currency": "RUB", "currencyDisplay": "symbol" }
}
// → 1234.56 → "1 234,56 ₽"

{
  "type": "Currency",
  "func": "NumberFormat",
  "params": { "currency": "USD", "currencyDisplay": "code" }
}
// → 1234.56 → "1 234,56 USD"

{
  "type": "Currency",
  "func": "NumberFormat",
  "params": { "currency": "EUR", "currencyDisplay": "name" }
}
// → 1234.56 → "1 234,56 евро"
```

---

## 4. RelativeTime — RelativeTimeFormat

Относительное время (вчера, завтра, N дней назад).

### Опции

| Опция     | Возможные значения                                                       | Описание                          |
| --------- | ------------------------------------------------------------------------ | --------------------------------- |
| `unit`    | `"year"`, `"month"`, `"week"`, `"day"`, `"hour"`, `"minute"`, `"second"` | Единица времени                   |
| `numeric` | `"always"`, `"auto"`                                                     | Всегда число или "вчера"/"завтра" |
| `style`   | `"long"`, `"short"`, `"narrow"`                                          | Стиль вывода                      |

### Примеры

```json
{
  "type": "RelativeTime",
  "func": "RelativeTimeFormat",
  "params": { "unit": "day", "numeric": "auto" }
}
// → -1 → "вчера", 1 → "завтра", -5 → "5 дн. назад"

{
  "type": "RelativeTime",
  "func": "RelativeTimeFormat",
  "params": { "unit": "month", "numeric": "always" }
}
// → -1 → "1 мес. назад", 2 → "через 2 мес."

{
  "type": "RelativeTime",
  "func": "RelativeTimeFormat",
  "params": { "unit": "hour", "numeric": "auto" }
}
// → -3 → "3 ч. назад", 0 → "сейчас"
```

### Входное значение

Число — количество единиц времени относительно текущего момента:

- Отрицательное — в прошлом
- Положительное — в будущем
- 0 — сейчас

---

## 5. List — ListFormat

Форматирование списков с соединением элементов.

### Опции

| Опция   | Возможные значения                         | Описание       |
| ------- | ------------------------------------------ | -------------- |
| `type`  | `"conjunction"`, `"disjunction"`, `"unit"` | Тип соединения |
| `style` | `"long"`, `"short"`, `"narrow"`            | Стиль вывода   |

### Типы соединения

| Тип           | Описание | Пример                      |
| ------------- | -------- | --------------------------- |
| `conjunction` | И (and)  | `"яблоки, груши и сливы"`   |
| `disjunction` | Или (or) | `"яблоки, груши или сливы"` |
| `unit`        | Единицы  | `"1 кг, 2 л, 3 м"`          |

### Примеры

```json
{
  "type": "List",
  "func": "ListFormat",
  "params": { "type": "conjunction", "style": "long" }
}
// → ["яблоки", "груши", "сливы"] → "яблоки, груши и сливы"

{
  "type": "List",
  "func": "ListFormat",
  "params": { "type": "disjunction", "style": "short" }
}
// → ["да", "нет"] → "да или нет"
```

### Входное значение

Массив строк `string[]`.

---

## 6. Plural — PluralRules

Определение категории множественного числа.

### Опции

| Опция  | Возможные значения        | Описание  |
| ------ | ------------------------- | --------- |
| `type` | `"cardinal"`, `"ordinal"` | Тип числа |

### Категории (для ru-RU)

| Категория | Описание  | Примеры         |
| --------- | --------- | --------------- |
| `one`     | Один/одна | 1, 21, 31       |
| `few`     | Несколько | 2, 3, 4, 22, 23 |
| `many`    | Много     | 5-20, 25-30     |
| `other`   | Прочее    | 0, дроби        |

### Примеры

```json
{ "type": "Plural", "func": "PluralRules" }
// → 1 → "one", 2 → "few", 5 → "many", 0 → "other"
```

### Использование

PluralRules возвращает категорию, которую можно использовать для выбора правильной формы:

```typescript
const categories = {
  one: "файл",
  few: "файла",
  many: "файлов",
  other: "файла",
};
const count = 5;
const category = formatEngine.selectPlural(count);
// → "many"
const label = categories[category];
// → "файлов"
```

---

## Применение форматирования

### В командах

```json
{
  "type": "setProperty",
  "params": {
    "value": "2025-01-15T10:30:00",
    "target": "state.date",
    "format": [
      {
        "prop": "value",
        "type": "Date",
        "func": "DateTimeFormat",
        "params": { "dateStyle": "long" }
      }
    ]
  }
}
```

### Форматирование объектов

```json
{
  "type": "setState",
  "params": {
    "source": "event.data",
    "format": [
      {
        "prop": "data.amount",
        "type": "Currency",
        "func": "NumberFormat",
        "params": { "currency": "USD" }
      },
      {
        "prop": "data.createdAt",
        "type": "Date",
        "func": "DateTimeFormat",
        "params": { "dateStyle": "long" }
      }
    ]
  }
}
```

### Форматирование массивов

```json
{
  "type": "setState",
  "params": {
    "source": "event.items",
    "format": [
      {
        "prop": "items.price",
        "type": "Currency",
        "func": "NumberFormat"
      },
      {
        "prop": "items.date",
        "type": "Date",
        "func": "DateTimeFormat",
        "params": { "dateStyle": "medium" }
      }
    ]
  }
}
```

---

## Locale (локаль)

Локаль задаётся в конфигурации приложения:

```json
{
  "config": {
    "locale": {
      "default": "ru-RU",
      "fallback": "en-US",
      "options": {
        "numberingSystem": "latn",
        "calendar": "gregory"
      }
    }
  }
}
```

### Fallback

При ошибке создания форматтера (неподдерживаемая локаль/опция) автоматически используется `en-US`.

---

## API FormatEngine

### Класс

```typescript
class FormatEngine {
  constructor(locale?: string); // По умолчанию "ru-RU"

  getLocale(): string; // Получить текущую локаль
  setLocale(locale: string): void; // Установить локаль

  // Прямое форматирование
  formatDateTime(value: Date | string | number, options?): string;
  formatNumber(value: number, options?): string;
  formatCurrency(value: number, currency?: string, options?): string;
  formatRelativeTime(value: number, unit: string, options?): string;
  formatList(values: string[], options?): string;
  selectPlural(value: number, options?): string;

  // Применение правил к объекту
  applyFormat(data: object, rules: FormatRule[]): object;
  formatValue(value: any, rule: FormatRule): string;
}
```

---

## Сводная таблица

| Тип            | Функция              | Входной тип          | Результат | Пример                     |
| -------------- | -------------------- | -------------------- | --------- | -------------------------- |
| `Date`         | `DateTimeFormat`     | Date, string, number | string    | `"15 января 2025 г."`      |
| `Time`         | `DateTimeFormat`     | Date, string, number | string    | `"10:30"`                  |
| `Number`       | `NumberFormat`       | number               | string    | `"1 234,56"`               |
| `Currency`     | `NumberFormat`       | number               | string    | `"1 234,56 ₽"`             |
| `RelativeTime` | `RelativeTimeFormat` | number               | string    | `"вчера"`                  |
| `List`         | `ListFormat`         | string[]             | string    | `"A, B и C"`               |
| `Plural`       | `PluralRules`        | number               | string    | `"one"`, `"few"`, `"many"` |
