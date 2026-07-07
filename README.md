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
- **jose** — JWT верификация и создание токенов
- **1С Битрикс** — источник пользователей для авторизации
- Тёмная тема **lara-dark-blue**

## Структура проекта

```
├── config/
│   ├── crm-config.json          # Главная конфигурация CRM (Blueprint)
│   ├── pages/                   # Конфигурации страниц
│   ├── menus/                   # Конфигурации меню (navbar)
│   ├── adapters/                # JS-адаптеры данных
│   └── system/                  # Системные конфиги (api-routes, camps, adapters)
├── src/
│   ├── types/                   # Система типов (+ auth.ts)
│   ├── auth/                    # Сервисы авторизации (JWT, cookies, Bitrix API)
│   │   ├── constants.ts         # Cookie keys, lifetimes, protected/guest routes
│   │   ├── bitrixClient.ts      # HTTP клиент для 1С Битрикс
│   │   ├── tokenService.ts      # JWT верификация / декодирование через jose
│   │   ├── cookieService.ts     # Установка/удаление httpOnly cookies
│   │   ├── getServerUser.ts     # Серверный хелпер для Server Components
│   │   └── AuthContext.tsx      # React Context (AuthProvider + useAuth)
│   ├── core/                    # Ядро платформы (StateManager, CommandExecutor, MacroEngine, Linkage...)
│   ├── engine/                  # Рендер-движок (AppEngine, PageRenderer, ComponentRenderer...)
│   ├── utils/                   # Общие утилиты
│   ├── proxy.ts                 # Proxy (бывш. middleware) — проверка JWT, refresh, редиректы
│   └── app/
│       ├── layout.tsx           # Корневой layout с PrimeReactProvider + AuthProvider
│       ├── globals.css          # Минимальные CSS-reset
│       ├── [[...slug]]/page.tsx # Динамический роутер
│       ├── api/[...route]/route.ts     # API Router (проксирование запросов)
│       ├── api/auth/[...auth]/route.ts # Auth API (login, refresh, logout)
│       └── login/page.tsx       # Страница логина
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

| Префикс                        | Описание                       | Сервер | Клиент |
| ------------------------------ | ------------------------------ | :----: | :----: |
| `{$ELEMENT_ID.state.PATH}`     | State элемента                 |   ✅   |   ✅   |
| `{$state.PATH}`                | State страницы                 |   ✅   |   ✅   |
| `{$config.PATH}`               | Конфиг приложения              |   ✅   |   ✅   |
| `{$location.*}`                | URL, slug, params, routeParams |   ✅   |   ✅   |
| `{$now.*}`                     | Дата/время                     |   ✅   |   ✅   |
| `{$math.*}`                    | random, GUID, UUID             |   ✅   |   ✅   |
| `{$device.*}` / `{$browser.*}` | Платформа, User-Agent          |   ✅   |   ✅   |
| `{$env.VAR}`                   | Переменные окружения           |   ✅   |   ✅   |

**Особенности:**

- Одиночный макрос сохраняет тип (Object, Boolean, Number, String)
- Несколько макросов в строке — конкатенация
- Рекурсивная подстановка (лимит `maxRecursion`)
- Обработка вложенных объектов и массивов

→ Полное описание: [docs/macros-reference.md](docs/macros-reference.md)

## 4. Система команд (CommandExecutor)

Команды привязываются к событиям компонентов (`onClick`, `onChange`, `onLoad`) и выполняют действия.

| Команда                                                                  | Описание                                  |
| ------------------------------------------------------------------------ | ----------------------------------------- |
| `setProperty` / `setState` / `mergeState`                                | Запись / замена / слияние state           |
| `setPathParams` / `mergePathParams` / `setPathParam` / `removePathParam` | Управление path-параметрами по индексу    |
| `clearState` / `toggleProperty`                                          | Очистка / переключение boolean            |
| `sendRequest`                                                            | HTTP-запрос к API                         |
| `showToast`                                                              | Toast-уведомление                         |
| `navigate`                                                               | Переход по URL                            |
| `confirm`                                                                | Диалог подтверждения (onConfirm/onCancel) |
| `sequence` / `delay`                                                     | Последовательность / пауза                |
| `log`                                                                    | Логирование                               |
| `setUrlParams` / `setUrlParam` / `removeUrlParam`                        | Управление URL параметрами                |
| `refresh`                                                                | Обновление страницы                       |

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
- **Автоматическая инъекция access_token** — сервер читает `access_token` из httpOnly cookies и добавляет `Authorization: Bearer <token>` к исходящему запросу
- Проброс заголовков (Cookie)
- Поддержка GET, POST, PUT, PATCH, DELETE

→ Полное описание: [docs/api-router-reference.md](docs/api-router-reference.md)

## 9. Авторизация (NextJS + 1С Битрикс)

Система авторизации использует **1С Битрикс** как источник пользователей и **JWT** для аутентификации сессий.

**Архитектура:**

- Все запросы к Битрикс идут **только с сервера** NextJS
- Токены хранятся исключительно в **httpOnly cookies**
- **Proxy** (`src/proxy.ts`) валидирует токен локально через `JWT_SECRET`
- Данные пользователя для UI читаются на сервере в `layout.tsx` и передаются в `AuthProvider`

**API эндпоинты:**

| Метод | Путь                | Описание                                      |
| ----- | ------------------- | --------------------------------------------- |
| POST  | `/api/auth/login`   | Принимает логин/пароль, устанавливает cookies |
| POST  | `/api/auth/refresh` | Обновляет токены через refresh_token          |
| POST  | `/api/auth/logout`  | Удаляет cookies, уведомляет Битрикс           |

**Ключевые файлы:**

| Файл                                  | Назначение                                         |
| ------------------------------------- | -------------------------------------------------- |
| `src/auth/constants.ts`               | Ключи cookies, время жизни, списки protected/guest |
| `src/auth/bitrixClient.ts`            | HTTP клиент с `X-Internal-Secret`                  |
| `src/auth/tokenService.ts`            | Верификация JWT через `jose`                       |
| `src/auth/cookieService.ts`           | Установка/удаление httpOnly cookies                |
| `src/auth/getServerUser.ts`           | Чтение пользователя из токена (Server Components)  |
| `src/auth/AuthContext.tsx`            | React Context (AuthProvider + useAuth)             |
| `src/proxy.ts`                        | Proxy — проверка/refresh токенов, редиректы        |
| `src/app/login/page.tsx`              | Страница логина                                    |
| `src/app/api/auth/[...auth]/route.ts` | Route handler для login/refresh/logout             |

**Переменные окружения:**

| Переменная               | Описание                                         |
| ------------------------ | ------------------------------------------------ |
| `BITRIX_API_URL`         | URL для API 1С Битрикс                           |
| `BITRIX_INTERNAL_SECRET` | Секретный ключ для внутренних запросов к Битрикс |
| `JWT_SECRET`             | Секрет для верификации JWT-токенов               |

→ Описание задачи: [.prompts/auth.md](.prompts/auth.md)

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

### Фильтры

**FiltersPanel** — выездная панель фильтров на основе PrimeReact Sidebar (Drawer). Управляется через состояние (`visible`, `value`), поддерживает 10 типов фильтров: checkbox, switch, range (мульти-слайдер), slider, text, number, date, period (диапазон дат), options (группа чекбоксов), radio (группа радио-кнопок). Кнопки «Применить» и «Очистить» в фиксированном нижнем блоке. Данные передаются как массив `FilterItem[]` через линковку `@state.filters`.

**ActiveFiltersBar** — горизонтальная панель с чипами активных фильтров. Отображается только если есть выбранные фильтры. Каждый чип имеет кнопку удаления. Слева — кнопка «Очистить все». Поддерживает все типы фильтров: название для checkbox/switch, «Название: значение» для text/number/slider/radio, «Название: мин – макс» для range/period, отдельные чипы для каждой выбранной опции в options. Удаление чипа генерирует `onChange` с обновлённой моделью.

### Меню

Menubar, Breadcrumb, Steps

### Графики

Chart (line, pie, bar, doughnut, radar, polarArea)

### Отображение

Avatar, Badge, Tag, Chip, Skeleton, ProgressBar, ProgressSpinner, Message, Divider, Timeline, Text, HTML

---

# Страницы

| Страница       | Маршрут                 | Описание                                                                                                          |
| -------------- | ----------------------- | ----------------------------------------------------------------------------------------------------------------- |
| **Dashboard**  | `/`                     | Карточки статистики, быстрые действия, таблица заказов, timeline активности                                       |
| **Statistics** | `/statistics`           | Фильтры по дате (неделя, диапазон), экспорт CSV, календари                                                        |
| **Users**      | `/users`, `/users/[id]` | Фильтры, таблица пользователей, профиль, прогресс, аватары. Поддерживает динамические маршруты с `[id]`-шаблонами |
| **Orders**     | `/orders`               | Вкладки (TabView), форма заказа, сообщения                                                                        |
| **Products**   | `/products`             | Поиск/фильтры, карточки товаров, таблица, форма редактирования                                                    |
| **Reports**    | `/reports`              | Фильтры дат, графики (line/pie), carousel, skeleton-заглушки                                                      |
| **Settings**   | `/settings`             | Steps, профиль, уведомления, безопасность, интеграции, FAQ (Accordion)                                            |
| **Components** | `/components`           | Демонстрация всех типов компонентов PrimeReact                                                                    |
| **Testing**    | `/stats/testing`        | Тестирование DataFeed, макросов, адаптеров и линковки                                                             |

---

# Запуск

```bash
npm install
npm run dev       # Dev-сервер
npm run build     # Production-билд
```

### Docker

```bash
docker compose up -d          # Собрать и запустить на порту 3030
docker compose logs -f        # Смотреть логи
docker compose down           # Остановить
```

Приложение будет доступно на `http://localhost:3030`.

### HTTPS (production) — CentOS 7 / Bitrix

На production-сервере приложение доступно через nginx reverse proxy в Bitrix-окружении:

- **Публичный URL:** `https://dev.ssd26.srv08.ru:3003`
- **Внутренний порт контейнера:** 3000
- **Внутренний порт Docker (localhost):** 3030 (только для nginx)
- **nginx config:** `deploy/CentOS7/nginx-crm.conf`
- **deploy script:** `deploy/CentOS7/deploy-remote.sh`
- **reconfigure script (update config only):** `deploy/CentOS7/deploy-remote-configure.sh`

**Настройка nginx на сервере (выполняется один раз):**

```bash
# 1. Копируем и активируем конфигурацию Nginx
sudo cp deploy/CentOS7/nginx-crm.conf /etc/nginx/bx/site_avaliable/
sudo ln -s /etc/nginx/bx/site_avaliable/nginx-crm.conf /etc/nginx/bx/site_enabled/nginx-crm.conf

# 2. Проверяем синтаксис и перезапускаем Nginx
sudo nginx -t && sudo systemctl reload nginx

# 3. Открываем внешний порт 3003 в файрволе
sudo firewall-cmd --zone=public --add-port=3003/tcp --permanent
sudo firewall-cmd --reload
```

**Схема подключения:**

```
Пользователь → https://dev.ssd26.srv08.ru:3003 → nginx (ssl) → http://127.0.0.1:3030 → Docker (порт 3000)
```

Порт 3030 контейнера привязан к `127.0.0.1` (localhost), поэтому недоступен извне напрямую — только через nginx.

**Конфигурация вне контейнера:**

- `config/` — конфигурация CRM и адаптеры (монтируется в `/app/config`)
- `messages/` — файлы локализации (монтируется в `/app/messages`)
- `.env.production` — переменные окружения

Для применения изменений в конфигурации достаточно перезапустить контейнер:

```bash
docker compose restart
```

# Конфигурация

Все настройки в `config/crm-config.json` и переменных окружения (`.env`):

**Переменные окружения:**

| Variable                       | По умолчанию               | Описание                                                                                                                             |
| ------------------------------ | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `CONFIG_PATH`                  | `./config/crm-config.json` | Путь к главному конфигу CRM                                                                                                          |
| `NODE_ENV`                     | `development`              | Режим окружения                                                                                                                      |
| `DEBUG_MODE`                   | `false`                    | Включить отладочное логирование                                                                                                      |
| `NEXT_PUBLIC_BASE_URL`         | (пусто)                    | Базовый URL приложения (используется в макросах)                                                                                     |
| `PORT`                         | `3000`                     | Порт dev-сервера                                                                                                                     |
| `BITRIX_API_URL`               | (пусто)                    | URL для API 1С Битрикс (авторизация)                                                                                                 |
| `BITRIX_INTERNAL_SECRET`       | (пусто)                    | Секретный ключ для внутренних запросов к Битрикс. Если значение содержит спецсимволы, закодируйте его в Base64 с префиксом `Base64_` |
| `JWT_SECRET`                   | (пусто)                    | Секрет для верификации JWT-токенов. Если значение содержит спецсимволы, закодируйте его в Base64 с префиксом `Base64_`               |
| `NEXT_PUBLIC_USE_SYSTEM_FONTS` | `false`                    | Пропустить загрузку Google Fonts (системные шрифты)                                                                                  |

**Параметры `config/crm-config.json`:**

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
| `config.camps`       | Список кампаний (id, name) для мульти-кампаний    |

→ Полное описание: [docs/config-reference.md](docs/config-reference.md)

---

# Справочники

## Компоненты

→ [docs/components-reference.md](docs/components-reference.md)

Полное описание всех реализованных компонентов системы: пропсы, события, типы фильтров, примеры конфигурации.

## Конфигурация

→ [docs/config-reference.md](docs/config-reference.md)

App, Page, Section, Block, Component, Command, LayoutConfig, ElementMeta.

## Макросы

→ [docs/macros-reference.md](docs/macros-reference.md)

14 типов макросов: state, config, location (включая routeParams для динамических маршрутов вида `[id]`), now, session/localStorage, cookie, window, math, device/browser, env.

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
Адаптер может быть строкой (response) или объектом `{ request: "...", response: "..." }` для трансформации данных до/после запроса.

## API Router

→ [docs/api-router-reference.md](docs/api-router-reference.md)

`/api/[...route]`, apiRoutes, безопасность, проброс заголовков.

## Архитектура

→ [docs/architecture-reference.md](docs/architecture-reference.md)

StateManager, ElementIndex, PathResolver, Component Rendering, Event System.

## Авторизация

→ [docs/auth-reference.md](docs/auth-reference.md)
