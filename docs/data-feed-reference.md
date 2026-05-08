# Справочник DataFeedService CRM Platform

Сервис выполнения data feed запросов — загрузка данных из внешних API.

---

## Что такое DataFeedService

DataFeedService — модуль для выполнения HTTP-запросов к внешним API с подстановкой макросов, применением адаптеров и записью результатов в state элементов.

**Ключевые особенности:**

- Серверный и клиентский режимы
- Параллельное выполнение нескольких запросов
- Разрешение макросов в URL и data
- Интеграция с API Router
- Автоматическая запись в state
- Обработка ошибок с dataFeedErrors

---

## DataFeedConfig (формат запроса)

```typescript
interface DataFeedConfig {
  url: string; // URL API-эндпоинта (с макросами)
  method: string; // HTTP-метод (GET, POST, PUT, PATCH, DELETE)
  data?: Record<string, any>; // Данные запроса (с макросами)
  target: string; // Куда записать результат
  adapter?: string; // ID адаптера для трансформации
  cache?: boolean; // Включить кэширование (пока не реализовано)
  cacheTTL?: number; // Время жизни кэша в мс
}
```

### target — адрес записи

| Формат                  | Описание                        | Пример                |
| ----------------------- | ------------------------------- | --------------------- |
| `state.field`           | Запись в state страницы         | `"state.userData"`    |
| `elementId.state.field` | Запись в state элемента         | `"table.state.items"` |
| `state`                 | Корневой state страницы (merge) | `"state"`             |
| `field` (без "state")   | State компонента-триггера       | `"data"`              |

---

## Серверный data feed

Выполняется при загрузке страницы на сервере.

**Как работает:**

1. Загружается конфигурация страницы
2. Если есть `dataFeed[]` — создаётся MacroEngine
3. Для каждого feed:
   - Разрешаются макросы в URL
   - Разрешаются макросы в data
   - Если URL начинается с `/api/` — резолвится через apiRoutes
   - Выполняется HTTP-запрос
   - Если указан adapter — применяется трансформация
   - Результат записывается в state по target
4. Ошибки собираются и показываются как Toast

**Функция:**

```typescript
function executeDataFeed(
  feed: DataFeedConfig,
  stateManager: StateManager,
  pageId: string,
  authToken?: string,
  apiRoutes?: ApiRouteConfig[],
  appConfig?: Record<string, any>,
): Promise<DataFeedResult>;
```

**Для всей страницы:**

```typescript
function executePageDataFeeds(
  dataFeeds: DataFeedConfig[],
  stateManager: StateManager,
  pageId: string,
  authToken?: string,
  apiRoutes?: ApiRouteConfig[],
  appConfig?: Record<string, any>,
): Promise<DataFeedResult[]>;
```

Все feeds выполняются **параллельно** через `Promise.all`.

---

## Клиентский data feed (sendRequest команда)

Выполняется на клиенте при вызове команды `sendRequest`.

**Функция:**

```typescript
function executeClientDataFeed(
  params: SendRequestParams,
  stateManager: StateManager,
  pageId: string,
  authToken?: string,
  appConfig?: Record<string, any>,
): Promise<DataFeedResult>;
```

**Отличия от серверного:**

- Не применяет adapter (адаптеры только на сервере)
- URL уже разрешён через API Router

---

## DataFeedResult (результат)

```typescript
interface DataFeedResult {
  success: boolean; // Успешно ли выполнен
  target: string; // Целевой path
  data?: any; // Данные ответа (при успехе)
  error?: string; // Текст ошибки (при ошибке)
}
```

---

## HTTP-запрос

### Методы

| Метод  | Поддерживает body |
| ------ | :---------------: |
| GET    |        ❌         |
| POST   |        ✅         |
| PUT    |        ✅         |
| PATCH  |        ✅         |
| DELETE |        ❌         |

### Заголовки

Автоматически добавляются:

- `Content-Type: application/json`
- `Accept: application/json`
- `Authorization: Bearer {token}` (если есть authToken)

### Ответ

- `application/json` → парсится как JSON
- Иначе → возвращается как текст

---

## Хранение в state

```typescript
function storeInState(stateManager, elementId, statePath, data): void {
  Если statePath пустой:
    Если data — объект → mergeState(elementId, data)
    Иначе → setStateField(elementId, statePath, data)
  Иначе:
    setStateField(elementId, statePath, data)
}
```

---

## Примеры

### Базовый GET

```json
{
  "dataFeed": [
    {
      "url": "https://api.example.com/users",
      "method": "GET",
      "target": "state.users"
    }
  ]
}
```

### POST с данными

```json
{
  "dataFeed": [
    {
      "url": "https://api.example.com/search",
      "method": "POST",
      "data": {
        "query": "{$searchForm.state.query}",
        "page": "{$state.currentPage}"
      },
      "target": "results.state.items"
    }
  ]
}
```

### Через API Router

```json
{
  "dataFeed": [
    {
      "url": "/api/get-stats",
      "method": "GET",
      "target": "state",
      "adapter": "stats.replace"
    }
  ]
}
```

### Несколько запросов (параллельно)

```json
{
  "dataFeed": [
    {
      "url": "/api/get-users",
      "method": "GET",
      "target": "users.state.list"
    },
    {
      "url": "/api/get-stats",
      "method": "GET",
      "target": "stats.state.data"
    }
  ]
}
```

---

## Обработка ошибок

При ошибке запроса:

- `result.success = false`
- `result.error = "HTTP 404: Not Found"`
- Ошибка сохраняется в `state.dataFeedErrors`
- На клиенте — Toast-уведомление

---

## MacroSources (источники макросов)

Для разрешения макросов создаются:

```typescript
{
  stateManager,    // StateManager для {$ELEMENT_ID.state.PATH}
  pageId,          // ID страницы для {$state.PATH}
  config,          // Конфиг приложения для {$config.PATH}
  env,             // Переменные окружения для {$env.VAR}
}
```

---

## API

```typescript
// Один запрос
function executeDataFeed(
  feed: DataFeedConfig,
  stateManager: StateManager,
  pageId: string,
  authToken?: string,
  apiRoutes?: ApiRouteConfig[],
  appConfig?: Record<string, any>,
): Promise<DataFeedResult>;

// Все запросы страницы (параллельно)
function executePageDataFeeds(
  dataFeeds: DataFeedConfig[],
  stateManager: StateManager,
  pageId: string,
  authToken?: string,
  apiRoutes?: ApiRouteConfig[],
  appConfig?: Record<string, any>,
): Promise<DataFeedResult[]>;

// Клиентский запрос (sendRequest команда)
function executeClientDataFeed(
  params: SendRequestParams,
  stateManager: StateManager,
  pageId: string,
  authToken?: string,
  appConfig?: Record<string, any>,
): Promise<DataFeedResult>;
```
