# CRM Platform — Metadata-Driven UI

Универсальная CRM-платформа с архитектурой **Metadata-Driven UI**, где вся структура, внешний вид и поведение приложения описываются в JSON-конфигурации, а не жёстко кодируются.

## Архитектура

Система состоит из трёх частей:

| Компонент                     | Описание                                                                    |
| ----------------------------- | --------------------------------------------------------------------------- |
| **Чертеж (Blueprint)**        | JSON-конфигурация (`config/crm-config.json`), описывающая всю структуру CRM |
| **Движок (Engine)**           | Next.js-приложение, читающее конфигурацию и строящее интерфейс              |
| **Источник данных (Backend)** | API-слой с адаптером для преобразования ответов к формату платформы         |

## Иерархия элементов

```
App (приложение)
 └── Page (страница)
      └── Section (секция)
           └── Block (блок)
                └── Component (компонент PrimeReact)
```

Каждый элемент имеет уникальный ID, состояние (state) и специфичные параметры.

## Технологический стек

- **Next.js 16** — App Router, динамический роутинг `[[...slug]]`, серверный рендеринг
- **TypeScript** — полная типизация
- **PrimeReact** — UI-компоненты (40+ типов)
- **PrimeFlex** — CSS-утилиты
- **PrimeIcons** — иконки
- **chart.js** — графики и диаграммы
- **$RefParser** — разрешение `$ref` в конфигурации
- Тёмная тема **lara-dark-blue**

## Структура проекта

```
├── config/
│   ├── crm-config.json          # Главная конфигурация CRM (Blueprint)
│   ├── pages/                   # Конфигурации страниц
│   └── api/                     # Конфигурации API-маршрутов
├── src/
│   ├── types/                   # Система типов
│   │   ├── base.ts              # Базовые типы (BaseElement, Condition, LayoutConfig)
│   │   ├── app.ts               # App, NavbarConfig, AppConfig
│   │   ├── page.ts              # Page, PageMeta, AccessControl
│   │   ├── section.ts           # Section, SectionState
│   │   ├── block.ts             # Block, BlockType, WrapperConfig
│   │   ├── component.ts         # Component, ComponentType, DataBinding
│   │   ├── commands.ts          # Command, CommandType, Condition
│   │   ├── datafeed.ts          # DataFeedConfig, SendRequestParams
│   │   ├── linkage.ts           # Linkage types
│   │   ├── macro.ts             # MacroSources, MacroOptions
│   │   └── index.ts
│   ├── core/                    # Ядро платформы
│   │   ├── StateManager.ts      # Управление состояниями элементов
│   │   ├── CommandExecutor.ts   # Исполнитель команд
│   │   ├── MacroEngine.ts       # Система макросов (24 типа)
│   │   ├── Linkage.ts           # Система линковки (реактивные связи)
│   │   ├── ElementIndex.ts      # Индекс элементов по ID
│   │   ├── PathResolver.ts      # Разрешение путей и парсинг target
│   │   ├── config.ts            # Загрузчик конфигурации
│   │   └── index.ts
│   ├── engine/                  # Рендер-движок
│   │   ├── AppEngine.tsx        # Главный компонент, роутинг, sidebar
│   │   ├── PageRenderer.tsx     # Рендер страницы с секциями
│   │   ├── SectionRenderer.tsx  # Рендер секции с layout
│   │   ├── BlockRenderer.tsx    # Рендер блока с обёрткой
│   │   ├── ComponentRenderer.tsx# Рендер PrimeReact компонентов
│   │   ├── components/          # Render-функции компонентов (16 файлов)
│   │   ├── hooks/               # React-хуки
│   │   │   └── useComponentBindings.ts # Подписка на state + binding logic
│   │   └── index.ts
│   ├── utils/                   # Общие утилиты
│   │   └── date.ts              # Парсинг и конвертация дат
│   └── app/
│       ├── layout.tsx           # Корневой layout с PrimeReactProvider
│       ├── globals.css          # Минимальные CSS-reset
│       ├── [[...slug]]/page.tsx # Динамический роутер
│       └── api/[...route]/route.ts # API Router (проксирование запросов)
└── docs/                        # Документация и ТЗ
```

---

# Ключевые возможности платформы

## 1. Система состояний (StateManager)

Каждый элемент имеет собственное состояние (`state`).

| Возможность                                | Описание                                                        |
| ------------------------------------------ | --------------------------------------------------------------- |
| `getState(elementPath)`                    | Получить полное состояние элемента                              |
| `getStateField(elementPath, field)`        | Получить поле состояния (поддержка вложенных путей через точку) |
| `setState(elementPath, newState)`          | Полная замена состояния                                         |
| `setStateField(elementPath, field, value)` | Установка поля состояния                                        |
| `mergeState(elementPath, updates)`         | Частичное обновление (слияние с существующим)                   |
| `clearState(elementPath)`                  | Очистка состояния                                               |
| `toggleStateField(elementPath, field)`     | Переключение boolean-поля                                       |
| `subscribe(listener)`                      | Подписка на изменения состояний                                 |

Доступ к состоянию: `dashboard.mainContent.statsCard.state.data`

## 2. Система линковки (Linkage)

Реактивная связь свойств элементов с состояниями. При изменении state автоматически обновляются все привязанные элементы.

| Формат                                       | Описание                           |
| -------------------------------------------- | ---------------------------------- |
| `"value": "@ELEMENT_ID.state.PATH.TO.FIELD"` | Линковка параметра к state         |
| `"@state.PATH"`                              | Линковка к state текущей страницы  |
| `"@.state.PATH"`                             | Линковка к state текущего элемента |

- Изменение state влечёт рендер только линкованных элементов
- Линковка работает в рамках страницы
- Поддержка вложенных путей: `@form.state.textData.input`

## 3. Система макросов (MacroEngine)

Динамическая подстановка данных в параметры команд, конфигурации, URL и data запросов.

Формат: `{$PREFIX.PATH.TO.FIELD}`

### Типы макросов

| Префикс                      | Описание                                                   | Сервер | Клиент |
| ---------------------------- | ---------------------------------------------------------- | :----: | :----: |
| `{$ELEMENT_ID.state.PATH}`   | State элемента                                             |   ✅   |   ✅   |
| `{$state.PATH}`              | State страницы                                             |   ✅   |   ✅   |
| `{$config.PATH}`             | Конфиг приложения                                          |   ✅   |   ✅   |
| `{$location.PROP}`           | URL (href, protocol, host, pathname, search, hash, origin) |   ❌   |   ✅   |
| `{$location.query.PARAM}`    | Query-параметры URL                                        |   ❌   |   ✅   |
| `{$location.slug.N}`         | Сегменты пути URL                                          |   ❌   |   ✅   |
| `{$now.iso}`                 | Текущая дата ISO                                           |   ✅   |   ✅   |
| `{$now.timestamp}`           | Timestamp (ms)                                             |   ✅   |   ✅   |
| `{$now.DD.MM.YY}`            | Дата в формате ДД.ММ.ГГ                                    |   ✅   |   ✅   |
| `{$now.DD.MM.YYYY HH:mm:ss}` | Дата+время                                                 |   ✅   |   ✅   |
| `{$session.PROP}`            | sessionStorage                                             |   ❌   |   ✅   |
| `{$localStorage.PROP}`       | localStorage (авто-JSON parse)                             |   ❌   |   ✅   |
| `{$cookie.PROP}`             | document.cookie                                            |   ❌   |   ✅   |
| `{$window.PROP}`             | Любое свойство window                                      |   ❌   |   ✅   |
| `{$user.PROP}`               | Данные пользователя (заглушка)                             |   ❌   |   ❌   |
| `{$auth.PROP}`               | Данные авторизации (заглушка)                              |   ❌   |   ❌   |
| `{$math.random}`             | Случайное число 0-1                                        |   ✅   |   ✅   |
| `{$math.randomInt.MIN.MAX}`  | Случайное целое                                            |   ✅   |   ✅   |
| `{$math.guid}`               | GUID                                                       |   ✅   |   ✅   |
| `{$device.platform}`         | Платформа (win32, linux...)                                |   ✅   |   ✅   |
| `{$device.mobile}`           | Мобильное устройство (boolean)                             |   ✅   |   ✅   |
| `{$browser.userAgent}`       | User-Agent                                                 |   ✅   |   ✅   |
| `{$env.VAR}`                 | NEXT*PUBLIC*\* переменные окружения                        |   ✅   |   ✅   |

### Особенности макросов

- **Одиночный макрос** — возвращает оригинальный тип (Object, Boolean, Number, String)
- **Несколько макросов в строке** — приводятся к строке и конкатенируются
- **Рекурсивная подстановка** — если результат макроса содержит макрос, он тоже разрешается
- **Лимит рекурсии** — настраиваемый параметр `maxRecursion` (по умолчанию 3)
- **Объекты и массивы** — рекурсивная обработка каждого поля/элемента

## 4. Система команд (CommandExecutor)

Команды привязываются к событиям компонентов и выполняют действия.

| Команда          | Описание                                               |
| ---------------- | ------------------------------------------------------ |
| `setProperty`    | Запись значения из source в target                     |
| `setState`       | Полная замена состояния элемента                       |
| `mergeState`     | Слияние данных с текущим состоянием                    |
| `clearState`     | Очистка состояния элемента                             |
| `toggleProperty` | Инвертирование boolean-поля                            |
| `sendRequest`    | HTTP-запрос к API с записью результата в state         |
| `showToast`      | Показ Toast-уведомления                                |
| `navigate`       | Переход по URL                                         |
| `confirm`        | Диалог подтверждения с ветвлением (onConfirm/onCancel) |
| `delay`          | Пауза в последовательности команд (мс)                 |
| `sequence`       | Последовательное выполнение нескольких команд          |
| `log`            | Логирование в консоль (info, warn, error, debug)       |
| `setUrlParams`   | Заменяет все URL параметры                             |
| `setUrlParam`    | Изменяет один URL параметр                             |
| `removeUrlParam` | Удаляет URL параметр                                   |

### Форматирование данных

Все команды поддерживают форматирование значений через свойство `format` в `params`. Форматирование применяется **после разрешения макросов** и **перед записью в state**.

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

#### Поддерживаемые типы форматирования

| Тип            | Описание                            | Функция              | Входной тип                |
| -------------- | ----------------------------------- | -------------------- | -------------------------- |
| `Date`         | Форматирование даты                 | `DateTimeFormat`     | `Date`, `string`, `number` |
| `Time`         | Форматирование времени              | `DateTimeFormat`     | `Date`, `string`, `number` |
| `Number`       | Форматирование чисел                | `NumberFormat`       | `number`                   |
| `Currency`     | Форматирование валюты               | `NumberFormat`       | `number`                   |
| `RelativeTime` | Относительное время (вчера, завтра) | `RelativeTimeFormat` | `number`                   |
| `List`         | Форматирование списков              | `ListFormat`         | `string[]`                 |
| `Plural`       | Правила множественных чисел         | `PluralRules`        | `number`                   |

#### Опции форматирования по типам

**DateTimeFormat (Date, Time):**

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

Пример:

```json
{
  "type": "Date",
  "func": "DateTimeFormat",
  "params": { "dateStyle": "full", "timeStyle": "short" }
}
// → "15 января 2025 г., 10:30"
```

**NumberFormat (Number):**

| Опция                   | Возможные значения                           | Описание                    |
| ----------------------- | -------------------------------------------- | --------------------------- |
| `style`                 | `"decimal"`, `"percent"`, `"unit"`           | Стиль числа                 |
| `currency`              | `"RUB"`, `"USD"`, `"EUR"`                    | Валюта (для style=currency) |
| `minimumIntegerDigits`  | `1`, `2`, `3`...                             | Мин. цифр целой части       |
| `minimumFractionDigits` | `0`, `1`, `2`...                             | Мин. цифр дробной части     |
| `maximumFractionDigits` | `0`, `1`, `2`...                             | Макс. цифр дробной части    |
| `useGrouping`           | `true`, `false`                              | Разделитель тысяч           |
| `unit`                  | `"kilometer-per-hour"`, `"meter"`, `"liter"` | Единица измерения           |

Пример:

```json
{
  "type": "Number",
  "func": "NumberFormat",
  "params": { "minimumFractionDigits": 2, "useGrouping": true }
}
// → 1 234,56
```

**Currency (через NumberFormat):**

| Опция                   | Возможные значения                          | Описание                  |
| ----------------------- | ------------------------------------------- | ------------------------- |
| `currency`              | `"RUB"`, `"USD"`, `"EUR"`, `"GBP"`, `"JPY"` | Код валюты                |
| `currencyDisplay`       | `"symbol"`, `"code"`, `"name"`              | Отображение валюты        |
| `minimumFractionDigits` | `0`, `1`, `2`...                            | Мин. знаков после запятой |

Пример:

```json
{
  "type": "Currency",
  "func": "NumberFormat",
  "params": { "currency": "RUB", "currencyDisplay": "symbol" }
}
// → 1 234,56 ₽
```

**RelativeTimeFormat (RelativeTime):**

| Опция     | Возможные значения                                                       | Описание                                     |
| --------- | ------------------------------------------------------------------------ | -------------------------------------------- |
| `unit`    | `"year"`, `"month"`, `"week"`, `"day"`, `"hour"`, `"minute"`, `"second"` | Единица времени                              |
| `numeric` | `"always"`, `"auto"`                                                     | Всегда показывать число или "вчера"/"завтра" |
| `style`   | `"long"`, `"short"`, `"narrow"`                                          | Стиль вывода                                 |

Пример:

```json
{
  "type": "RelativeTime",
  "func": "RelativeTimeFormat",
  "params": { "unit": "day", "numeric": "auto" }
}
// → -5 → "5 дн. назад", 1 → "завтра"
```

**ListFormat (List):**

| Опция   | Возможные значения                         | Описание       |
| ------- | ------------------------------------------ | -------------- |
| `type`  | `"conjunction"`, `"disjunction"`, `"unit"` | Тип соединения |
| `style` | `"long"`, `"short"`, `"narrow"`            | Стиль вывода   |

Пример:

```json
{
  "type": "List",
  "func": "ListFormat",
  "params": { "type": "conjunction", "style": "long" }
}
// → ["яблоки", "груши", "сливы"] → "яблоки, груши и сливы"
```

**PluralRules (Plural):**

| Опция  | Возможные значения        | Описание  |
| ------ | ------------------------- | --------- |
| `type` | `"cardinal"`, `"ordinal"` | Тип числа |

Пример:

```json
{ "type": "Plural", "func": "PluralRules" }
// → 1 → "one", 2 → "other", 3 → "other" (для ru-RU)
```

#### Форматирование объектов и массивов

Форматирование поддерживает вложенные свойства через точку:

**Объект:**

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

**Массив:**

```json
{
  "type": "setState",
  "params": {
    "source": "event.items",
    "format": [
      { "prop": "items.price", "type": "Currency", "func": "NumberFormat" },
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

#### Локаль

Локаль задаётся в конфигурации приложения (`config.locale`):

```json
{
  "config": {
    "name": "CRM Platform",
    "version": "1.0.0",
    "locale": {
      "default": "ru-RU",
      "fallback": "en-US"
    }
  }
}
```

### Источники данных (source)

| Формат                    | Описание                        |
| ------------------------- | ------------------------------- |
| `"event.value"`           | Значение из события (eventData) |
| `"event.field.subfield"`  | Вложенное поле из eventData     |
| `"elementId.state.field"` | State другого элемента          |
| `"state.field"`           | State текущей страницы          |

### Целевые пути (target)

| Формат                    | Описание                           |
| ------------------------- | ---------------------------------- |
| `"state.field"`           | Запись в state страницы (pageId)   |
| `"elementId.state.field"` | Запись в state указанного элемента |
| `"field"`                 | Запись в state компонента-триггера |

### Триггеры команд

`onClick`, `onChange`, `onLoad`, `onTimer`, `onCondition`

### Примеры команд

**showToast:**

```json
{
  "type": "showToast",
  "params": {
    "message": "Данные сохранены",
    "severity": "success"
  }
}
```

**navigate:**

```json
{
  "type": "navigate",
  "params": {
    "url": "/users"
  }
}
```

**confirm:**

```json
{
  "type": "confirm",
  "params": {
    "message": "Удалить запись?",
    "onConfirm": [
      {
        "type": "sendRequest",
        "params": {
          "url": "/api/delete",
          "method": "POST",
          "data": { "id": 1 },
          "target": "state.result"
        }
      }
    ],
    "onCancel": []
  }
}
```

**sequence:**

```json
{
  "type": "sequence",
  "params": {
    "commands": [
      {
        "type": "setProperty",
        "params": {
          "source": "event.value",
          "target": "state.loading",
          "value": true
        }
      },
      {
        "type": "sendRequest",
        "params": {
          "url": "/api/data",
          "method": "GET",
          "target": "state.data"
        }
      },
      {
        "type": "setProperty",
        "params": { "target": "state.loading", "value": false }
      }
    ]
  }
}
```

## 5. External API Data Feed

Загрузка данных из внешних API при загрузке страницы и по событиям.

| Режим                                                | Описание                                                   |
| ---------------------------------------------------- | ---------------------------------------------------------- |
| **Server-side** (`dataFeed` в конфигурации страницы) | Запросы API при загрузке страницы на сервере               |
| **Client-side** (`sendRequest` команда)              | Запросы API из событий (onClick, onLoad, и т.д.)           |
| **API Router** (`/api/[route]`)                      | Проксирование запросов через сервер с разрешением макросов |

### Формат запроса

```json
{
  "url": "URL/TO/API/ENDPOINT",
  "method": "GET/POST/PUT/PATCH/DELETE",
  "data": { "data1": "value1", "data2": "value2" },
  "target": "[ELEMENT_ID.]state[.PATH.TO.FIELD]",
  "cache": true,
  "cacheTTL": 60000
}
```

### Макросы в запросах

В любые поля (url, data) могут быть вставлены макросы `{$ELEMENT_ID.state.PATH.TO.FIELD}`:

```json
{
  "url": "https://api.example.com/users/{$userPage.state.selectedId}/",
  "method": "GET",
  "target": "userData.state.profile"
}
```

Можно передать всё состояние элемента:

```json
{
  "url": "https://api.example.com/search",
  "method": "POST",
  "data": {$form.state},
  "target": "results.state.items"
}
```

### Конфигурация dataFeed (серверная часть)

При загрузке страницы сервер обрабатывает раздел `dataFeed`:

```json
{
  "dataFeed": [
    {
      "url": "/api/get-dynamic-data",
      "method": "POST",
      "data": { "filter": "{$form.state.selectedItems}" },
      "target": "dataTable.state.data"
    }
  ]
}
```

### Особенности

- Макросы в URL и data разрешаются перед выполнением запроса
- API-маршруты (`/api/ROUTE_NAME`) резолвятся из `config.apiRoutes` с применением макросов
- Успешные данные записываются в state по адресу target
- При ошибке на сервере — Toast-уведомление при загрузке страницы
- При ошибке на клиенте — ошибка сохраняется в `state.dataFeedErrors`

## 5.1. Адаптеры данных

Адаптеры преобразуют ответы API в формат, пригодный для CRM. Указываются в `dataFeed` и `apiRoutes` через поле `adapter`. Определяются в корне конфига (`adapters`).

### Типы адаптеров

| Тип       | Описание                                        |
| --------- | ----------------------------------------------- |
| `replace` | Словарная замена имён свойств и их значений     |
| `js`      | JS-скрипт для произвольной трансформации данных |

### Replace-адаптер

Рекурсивно обходит данные. Если свойство найдено в `rules` — его имя заменяется на `name`, значение — на `value` (с поддержкой макроса `$value$` для исходного значения).

```json
{
  "adapters": {
    "stats.analytics.replace": {
      "type": "replace",
      "rules": {
        "title": { "name": "label" },
        "url": {
          "name": "command",
          "value": {
            "type": "download",
            "params": { "url": "$value$" }
          }
        }
      }
    }
  }
}
```

### JS-адаптер

Загружает и выполняет скрипт из `public/`. Скрипт должен содержать функцию `transform(data)`, которая принимает исходные данные и возвращает преобразованные.

```json
{
  "adapters": {
    "stats.analytics.js": {
      "type": "js",
      "script": "adapters/analytics2menu.js"
    }
  }
}
```

Пример файла `public/adapters/analytics2menu.js`:

```javascript
function transform(data) {
  if (!data || !data.items) return [];
  return data.items.map((item) => ({
    label: item.title,
    command: { type: "navigate", params: { url: item.url } },
    badge: item.count || 0,
  }));
}
```

### Использование

**В dataFeed страницы:**

```json
{
  "dataFeed": [
    {
      "url": "/api/get-stats",
      "method": "GET",
      "target": "state",
      "adapter": "stats.analytics.replace"
    }
  ]
}
```

**В apiRoutes:**

```json
{
  "apiRoutes": [
    {
      "path": "get-stats",
      "url": "https://api.example.com/stats",
      "adapter": "stats.analytics.js"
    }
  ]
}
```

### Особенности

- Адаптация выполняется **только на сервере**
- Если адаптер указан, но не найден — возвращается ошибка
- Скрипты загружаются относительно `public/`
- Макрос `$value$` в значениях правил заменяется на исходное значение свойства

## 6. Навигация

- **Sidebar** — боковая панель на уровне приложения, НЕ перезагружается при переходах
- **Desktop** — сворачивается до иконок кнопкой внизу
- **Mobile** — полноэкранное меню из кнопки «бургер»
- Активный раздел подсвечивается
- Поддержка кнопок «Назад/Вперёд» браузера

## 7. Производительность

- Фильтрация подписок на изменения state — компоненты обновляются только при изменении их binding-ов
- Исключены лишние ре-рендеры при вводе в поля
- `setStateField` для вложенных путей через точку
- `isMounted` через `useState` для SSR-совместимости

---

# Компоненты PrimeReact

### Формы

InputText, InputNumber, InputTextarea, Password, Dropdown, MultiSelect, AutoComplete, Calendar, Checkbox, RadioButton, InputSwitch, Slider, Rating, ColorPicker, FileUpload

### Кнопки

Button, SplitButton

### Данные

DataTable

### Панели

Card, Panel, Fieldset, Toolbar, TabView, Accordion

### Меню

Menubar, Breadcrumb, Steps

### Графики и медиа

Chart (line/pie), Carousel

### Отображение

Avatar, Badge, Tag, Chip, Skeleton, ProgressBar, ProgressSpinner, Message, Divider, Timeline, Text, HTML

---

# Страницы

| Страница       | Маршрут       | Описание                                                                    |
| -------------- | ------------- | --------------------------------------------------------------------------- |
| **Dashboard**  | `/`           | Карточки статистики, быстрые действия, таблица заказов, timeline активности |
| **Statistics** | `/statistics` | Фильтры по дате (неделя, диапазон), экспорт CSV, календари                  |
| **Users**      | `/users`      | Фильтры, таблица пользователей, профиль, прогресс, аватары                  |
| **Orders**     | `/orders`     | Вкладки (TabView), форма заказа, сообщения                                  |
| **Products**   | `/products`   | Поиск/фильтры, карточки товаров, таблица, форма редактирования              |
| **Reports**    | `/reports`    | Фильтры дат, графики (line/pie), carousel, skeleton-заглушки                |
| **Settings**   | `/settings`   | Steps, профиль, уведомления, безопасность, интеграции, FAQ (Accordion)      |

---

# Запуск

```bash
npm install
npm run dev       # Dev-сервер
npm run build     # Production-билд
```

# Конфигурация

Все настройки в `config/crm-config.json`:

| Раздел             | Описание                                          |
| ------------------ | ------------------------------------------------- |
| `title`            | Заголовок приложения                              |
| `navbar`           | Пункты навигации (label, icon, route)             |
| `userMenu`         | Меню пользователя (профиль, выйти)                |
| `pages`            | Массив страниц с секциями, блоками и компонентами |
| `config`           | Конфигурация приложения (name, version, baseURL)  |
| `config.features`  | Флаги функциональности                            |
| `config.apiRoutes` | Маршруты API (path → url) с поддержкой макросов   |

# Справочник конфигурации

Полное описание всех параметров элементов конфигурации с примерами:
→ [docs/config-reference.md](docs/config-reference.md)

Разделы справочника:

1. [App](docs/config-reference.md#1-app-приложение) — корневой элемент, навбар, глобальное состояние
2. [Page](docs/config-reference.md#2-page-страница) — страницы, мета-данные, контроль доступа
3. [Section](docs/config-reference.md#3-section-секция) — секции, макет, видимость
4. [Block](docs/config-reference.md#4-block-блок) — блоки, типы, обёртки
5. [Component](docs/config-reference.md#5-component-компонент) — компоненты, привязки, события
6. [Command](docs/config-reference.md#6-command-команда) — команды, триггеры, условия
7. [Общие типы](docs/config-reference.md#7-общие-типы) — LayoutConfig, ElementMeta, адресация
