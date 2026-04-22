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

### Источники данных (source)

| Формат                    | Описание                    |
| ------------------------- | --------------------------- |
| `"event.value.start"`     | Значение из eventData       |
| `"this.value"`            | Значение триггер-компонента |
| `"elementId.state.field"` | State другого элемента      |
| `"state.field"`           | State текущей страницы      |

### Целевые пути (target)

| Формат                    | Описание                           |
| ------------------------- | ---------------------------------- |
| `"state.field"`           | Запись в state страницы            |
| `"elementId.state.field"` | Запись в state указанного элемента |
| `"field"`                 | Запись в state триггер-компонента  |

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
          "source": "this.value",
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

## 6. Привязка данных к компонентам (Bindings)

| Привязка          | Формат                         | Описание                             |
| ----------------- | ------------------------------ | ------------------------------------ |
| `valueBinding`    | `"@ELEMENT_ID.state.FIELD"`    | Привязка значения компонента к state |
| `visibleBinding`  | `"@ELEMENT_ID.state.visible"`  | Управление видимостью                |
| `disabledBinding` | `"@ELEMENT_ID.state.disabled"` | Управление блокировкой               |

- Автоконвертация форматов даты для Calendar (ISO ↔ custom)
- Контроллируемые инпуты с fallback значениями по умолчанию
- Автоматический ре-рендер при изменении привязанного state

## 7. Система адресации

| Тип                | Пример                                       |
| ------------------ | -------------------------------------------- |
| Полный путь        | `appId.pageId.sectionId.blockId.componentId` |
| Доступ к состоянию | `pageId.sectionId.state.fieldName`           |
| Относительный путь | `../state.data`                              |
| Wildcard-селекторы | `*.section1.state.visible`                   |

## 8. Навигация

- **Sidebar** — боковая панель на уровне приложения, НЕ перезагружается при переходах
- **Desktop** — сворачивается до иконок кнопкой внизу
- **Mobile** — полноэкранное меню из кнопки «бургер»
- Активный раздел подсвечивается
- Поддержка кнопок «Назад/Вперёд» браузера

## 9. Производительность

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
