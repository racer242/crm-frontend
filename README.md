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
│   ├── core/                    # Ядро платформы (StateManager, CommandExecutor, MacroEngine, Linkage...)
│   ├── engine/                  # Рендер-движок (AppEngine, PageRenderer, ComponentRenderer...)
│   ├── utils/                   # Общие утилиты
│   └── app/
│       ├── layout.tsx           # Корневой layout с PrimeReactProvider
│       ├── globals.css          # Минимальные CSS-reset
│       ├── [[...slug]]/page.tsx # Динамический роутер
│       └── api/[...route]/route.ts # API Router (проксирование запросов)
└── docs/                        # Документация
```

---

# Ключевые возможности платформы

## 1. Система состояний (StateManager)

Каждый элемент имеет собственное состояние (`state`), доступное по пути: `dashboard.mainContent.statsCard.state.data`.

| Возможность                       | Описание                                 |
| --------------------------------- | ---------------------------------------- |
| `getState` / `getStateField`      | Чтение состояния (вложенные через точку) |
| `setState` / `setStateField`      | Полная замена / установка поля           |
| `mergeState`                      | Частичное обновление (shallow merge)     |
| `clearState` / `toggleStateField` | Очистка / переключение boolean           |
| `subscribe`                       | Подписка на изменения                    |

→ Полное описание: [docs/architecture-reference.md](docs/architecture-reference.md#statemanager--управление-состоянием)

## 2. Система линковки (Linkage)

Реактивная связь свойств компонентов с состояниями через формат `@ELEMENT_ID.state.PATH`.

| Формат                   | Описание                          |
| ------------------------ | --------------------------------- |
| `@ELEMENT_ID.state.PATH` | Линковка к state элемента         |
| `@state.PATH`            | Линковка к state текущей страницы |

Изменение state автоматически обновляет привязанные компоненты через хук `useComponentBindings`.

→ Полное описание: [docs/linkage-reference.md](docs/linkage-reference.md)

## 3. Система макросов (MacroEngine)

Динамическая подстановка данных в URL, команды, данные запросов.

**Формат:** `{$PREFIX.PATH.TO.FIELD}`

| Префикс                        | Описание              | Сервер | Клиент |
| ------------------------------ | --------------------- | :----: | :----: |
| `{$ELEMENT_ID.state.PATH}`     | State элемента        |   ✅   |   ✅   |
| `{$state.PATH}`                | State страницы        |   ✅   |   ✅   |
| `{$config.PATH}`               | Конфиг приложения     |   ✅   |   ✅   |
| `{$location.*}`                | URL, slug, params     |   ✅   |   ✅   |
| `{$now.*}`                     | Дата/время            |   ✅   |   ✅   |
| `{$math.*}`                    | random, GUID, UUID    |   ✅   |   ✅   |
| `{$device.*}` / `{$browser.*}` | Платформа, User-Agent |   ✅   |   ✅   |
| `{$env.VAR}`                   | Переменные окружения  |   ✅   |   ✅   |

**Особенности:**

- Одиночный макрос сохраняет тип (Object, Boolean, Number, String)
- Несколько макросов в строке — конкатенация
- Рекурсивная подстановка (лимит `maxRecursion`)
- Обработка вложенных объектов и массивов

→ Полное описание: [docs/macros-reference.md](docs/macros-reference.md)

## 4. Система команд (CommandExecutor)

Команды привязываются к событиям компонентов (`onClick`, `onChange`, `onLoad`) и выполняют действия.

| Команда                                           | Описание                                  |
| ------------------------------------------------- | ----------------------------------------- |
| `setProperty` / `setState` / `mergeState`         | Запись / замена / слияние state           |
| `clearState` / `toggleProperty`                   | Очистка / переключение boolean            |
| `sendRequest`                                     | HTTP-запрос к API                         |
| `showToast`                                       | Toast-уведомление                         |
| `navigate`                                        | Переход по URL                            |
| `confirm`                                         | Диалог подтверждения (onConfirm/onCancel) |
| `sequence` / `delay`                              | Последовательность / пауза                |
| `log`                                             | Логирование                               |
| `setUrlParams` / `setUrlParam` / `removeUrlParam` | Управление URL параметрами                |
| `refresh`                                         | Обновление страницы                       |

**Источники данных:** `event.value`, `event.field`, `elementId.state.field`, `state.field`

**Целевые пути:** `state.field`, `elementId.state.field`, `field` (триггер)

→ Полное описание: [docs/commands-reference.md](docs/commands-reference.md)

## 5. Форматирование данных

Команды поддерживают форматирование через `format` в `params` (после макросов, перед записью в state).

| Тип             | Функция              | Входной тип          | Пример                     |
| --------------- | -------------------- | -------------------- | -------------------------- |
| `Date` / `Time` | `DateTimeFormat`     | Date, string, number | `"15 января 2025 г."`      |
| `Number`        | `NumberFormat`       | number               | `"1 234,56"`               |
| `Currency`      | `NumberFormat`       | number               | `"1 234,56 ₽"`             |
| `RelativeTime`  | `RelativeTimeFormat` | number               | `"вчера"`                  |
| `List`          | `ListFormat`         | string[]             | `"A, B и C"`               |
| `Plural`        | `PluralRules`        | number               | `"one"`, `"few"`, `"many"` |

Поддержка вложенных свойств: `data.amount`, `items.date`.

→ Полное описание: [docs/data-format-reference.md](docs/data-format-reference.md)

## 6. External API Data Feed

Загрузка данных из внешних API при загрузке страницы и по событиям.

| Режим                                           | Описание                            |
| ----------------------------------------------- | ----------------------------------- |
| **Server-side** (`dataFeed` в конфиге страницы) | Запросы API при загрузке на сервере |
| **Client-side** (`sendRequest` команда)         | Запросы API из событий              |
| **API Router** (`/api/[route]`)                 | Проксирование через сервер          |

**Формат запроса:**

```json
{
  "url": "URL/TO/API/ENDPOINT",
  "method": "GET/POST/PUT/PATCH/DELETE",
  "data": { "key": "value" },
  "target": "[ELEMENT_ID.]state[.PATH.TO.FIELD]",
  "adapter": "stats.replace"
}
```

→ Полное описание: [docs/data-feed-reference.md](docs/data-feed-reference.md)

## 7. Адаптеры данных

Преобразуют ответы API в формат, пригодный для CRM.

| Тип       | Описание                                                   |
| --------- | ---------------------------------------------------------- |
| `replace` | Словарная замена имён свойств и значений (макро `$value$`) |
| `js`      | JS-скрипт `transform(data)` из `public/`                   |

**Пример replace:**

```json
{
  "title": { "name": "label" },
  "url": {
    "name": "command",
    "value": { "type": "navigate", "params": { "url": "$value$" } }
  }
}
```

**Пример JS:**

```javascript
// public/adapters/analytics2menu.js
function transform(data) {
  return data.items.map((item) => ({
    label: item.title,
    command: { type: "navigate", params: { url: item.url } },
  }));
}
```

→ Полное описание: [docs/data-adapter-reference.md](docs/data-adapter-reference.md)

## 8. API Router

Next.js API Route (`/api/[...route]`) проксирует запросы клиента к внешним API через сервер.

- Безопасность: внешние URL скрыты от клиента
- Разрешение макросов на сервере
- Применение адаптеров к ответам
- Проброс заголовков (Authorization, Cookie)
- Поддержка GET, POST, PUT, PATCH, DELETE

→ Полное описание: [docs/api-router-reference.md](docs/api-router-reference.md)

---

# Навигация

- **Sidebar** — боковая панель на уровне приложения, НЕ перезагружается при переходах
- **Desktop** — сворачивается до иконок кнопкой внизу
- **Mobile** — полноэкранное меню из кнопки «бургер»
- Активный раздел подсвечивается
- Поддержка кнопок «Назад/Вперёд» браузера

# Производительность

- Фильтрация подписок — компоненты обновляются только при изменении relevant binding-ов
- Исключены лишние ре-рендеры при вводе в поля
- `setStateField` для вложенных путей через точку

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

### Графики

Chart (line, pie, bar, doughnut, radar, polarArea)

### Отображение

Avatar, Badge, Tag, Chip, Skeleton, ProgressBar, ProgressSpinner, Message, Divider, Timeline, Text, HTML

---

# Страницы

| Страница       | Маршрут          | Описание                                                                    |
| -------------- | ---------------- | --------------------------------------------------------------------------- |
| **Dashboard**  | `/`              | Карточки статистики, быстрые действия, таблица заказов, timeline активности |
| **Statistics** | `/statistics`    | Фильтры по дате (неделя, диапазон), экспорт CSV, календари                  |
| **Users**      | `/users`         | Фильтры, таблица пользователей, профиль, прогресс, аватары                  |
| **Orders**     | `/orders`        | Вкладки (TabView), форма заказа, сообщения                                  |
| **Products**   | `/products`      | Поиск/фильтры, карточки товаров, таблица, форма редактирования              |
| **Reports**    | `/reports`       | Фильтры дат, графики (line/pie), carousel, skeleton-заглушки                |
| **Settings**   | `/settings`      | Steps, профиль, уведомления, безопасность, интеграции, FAQ (Accordion)      |
| **Components** | `/components`    | Демонстрация всех типов компонентов PrimeReact                              |
| **Testing**    | `/stats/testing` | Тестирование DataFeed, макросов, адаптеров и линковки                       |

---

# Запуск

```bash
npm install
npm run dev       # Dev-сервер
npm run build     # Production-билд
```

# Конфигурация

Все настройки в `config/crm-config.json`:

| Раздел               | Описание                                          |
| -------------------- | ------------------------------------------------- |
| `title`              | Заголовок приложения                              |
| `navbar`             | Пункты навигации (label, icon, route)             |
| `userMenu`           | Меню пользователя (профиль, выйти)                |
| `pages`              | Массив страниц с секциями, блоками и компонентами |
| `adapters`           | Адаптеры данных (replace, js)                     |
| `config`             | Конфигурация приложения (name, version, baseURL)  |
| `config.indexPageId` | ID страницы для маршру `/`                        |
| `config.baseURL`     | Базовый URL для API-запросов                      |
| `config.timeout`     | Таймаут запросов в мс                             |
| `config.features`    | Флаги функциональности                            |
| `config.apiRoutes`   | Маршруты API (path → url) с поддержкой макросов   |

→ Полное описание: [docs/config-reference.md](docs/config-reference.md)

---

# Справочники

## Конфигурация

→ [docs/config-reference.md](docs/config-reference.md)

App, Page, Section, Block, Component, Command, LayoutConfig, ElementMeta.

## Макросы

→ [docs/macros-reference.md](docs/macros-reference.md)

13 типов макросов: state, config, location, now, session/localStorage, cookie, window, math, device/browser, env.

## Линковка

→ [docs/linkage-reference.md](docs/linkage-reference.md)

Реактивная привязка `@...`, binding-строки, подписка, отличие от макросов.

## Форматирование данных

→ [docs/data-format-reference.md](docs/data-format-reference.md)

7 типов: Date, Time, Number, Currency, RelativeTime, List, Plural.

## Команды

→ [docs/commands-reference.md](docs/commands-reference.md)

17 типов команд: setProperty, setState, sendRequest, showToast, navigate, confirm, sequence, URL params, refresh.

## Data Adapter

→ [docs/data-adapter-reference.md](docs/data-adapter-reference.md)

Replace-адаптер (макро `$value$`), JS-адаптер (`transform(data)`).

## Data Feed

→ [docs/data-feed-reference.md](docs/data-feed-reference.md)

DataFeedConfig, серверный/клиентский режимы, обработка ошибок.

## API Router

→ [docs/api-router-reference.md](docs/api-router-reference.md)

`/api/[...route]`, apiRoutes, безопасность, проброс заголовков.

## Архитектура

→ [docs/architecture-reference.md](docs/architecture-reference.md)

StateManager, ElementIndex, PathResolver, Component Rendering, Event System.
