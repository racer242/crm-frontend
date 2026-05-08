# Справочник API Router CRM Platform

Серверный прокси-роутер для безопасных запросов к внешним API.

---

## Что такое API Router

API Router — Next.js API Route (`/api/[...route]`), проксирующий запросы клиента к внешним API через сервер.

**Ключевые особенности:**

- Безопасность: внешние URL скрыты от клиента
- Разрешение макросов на сервере
- Применение адаптеров к ответам
- Проброс заголовков (Authorization, Cookie)
- Маппинг path → url через config.apiRoutes

---

## Конфигурация

Маршруты задаются в `config.apiRoutes`:

```json
{
  "config": {
    "apiRoutes": [
      {
        "path": "get-users",
        "url": "https://api.example.com/users"
      },
      {
        "path": "search",
        "url": "https://api.example.com/search"
      },
      {
        "path": "user-profile",
        "url": "https://api.example.com/users/{$config.defaultUserId}"
      }
    ]
  }
}
```

### ApiRouteConfig

```typescript
interface ApiRouteConfig {
  path: string; // Имя маршрута (для /api/PATH)
  url: string; // Внешний URL (с макросами)
  adapter?: string; // ID адаптера (из config.adapters)
  method?: string; // Ограничение по методу (пока не используется)
  headers?: Record<string, string>; // Дополнительные заголовки
}
```

---

## Как работает

### 1. Клиент отправляет запрос

```
POST /api/get-users
Content-Type: application/json
Authorization: Bearer token123

{ "page": 1, "limit": 20 }
```

### 2. API Router обрабатывает

- Извлекает routeName из URL: `get-users`
- Загружает config через `initApp()`
- Ищет маршрут в `config.apiRoutes`
- Если не найден → 404

### 3. Разрешение макросов

Создаёт MacroSources:

```typescript
{
  config: config.config,
  env: getServerEnv(),
}
```

Применяет макросы к routeConfig.url:

```
"https://api.example.com/users/{$config.defaultUserId}"
→ "https://api.example.com/users/12345"
```

### 4. Проброс заголовков

Из оригинального запроса:

- `Authorization` → проксируется
- `Cookie` → проксируется
- `Content-Type: application/json` → добавляется
- `Accept: application/json` → добавляется

### 5. Запрос к внешнему API

```
POST https://api.example.com/users
Authorization: Bearer token123
Cookie: session=abc
Content-Type: application/json

{ "page": 1, "limit": 20 }
```

### 6. Адаптация ответа

Если в routeConfig указан `adapter`:

- Ищет адаптер в `config.config.adapters`
- Применяет через `applyAdapter(responseData, adapter)`
- Возвращает трансформированные данные

### 7. Ответ клиенту

```json
{
  "items": [...],
  "total": 150,
  "page": 1
}
```

---

## Структура маршрута

### URL клиента

```
/api/{routeName}
```

### Динамический роутинг

Next.js catch-all route `[[...route]]` позволяет:

| Запрос клиента         | routeName         |
| ---------------------- | ----------------- |
| `/api/get-users`       | `get-users`       |
| `/api/v2/users`        | `v2/users`        |
| `/api/stats/analytics` | `stats/analytics` |

---

## Обработка ошибок

### Маршрут не найден

```json
{ "error": "Route not found: unknown-route" }
```

**Status:** 404

### Ошибка внешнего API

Возвращает оригинальный статус и текст ошибки.

### Ошибка адаптера

```json
{ "error": "Adapter execution failed: ..." }
```

**Status:** 500

---

## Примеры конфигурации

### Базовый маршрут

```json
{
  "path": "get-stats",
  "url": "https://api.example.com/stats"
}
```

**Клиент:** `GET /api/get-stats`
**Внешний:** `GET https://api.example.com/stats`

### С макросом

```json
{
  "path": "user-profile",
  "url": "https://api.example.com/users/{$config.defaultUserId}"
}
```

**Клиент:** `GET /api/user-profile`
**Внешний:** `GET https://api.example.com/users/12345`

### С адаптером

```json
{
  "path": "get-menu",
  "url": "https://api.example.com/analytics",
  "adapter": "analytics.js"
}
```

**Клиент:** `GET /api/get-menu`
**Внешний:** `GET https://api.example.com/analytics`
**Адаптер:** Применяет `public/adapters/analytics.js`

### С replace-адаптером

```json
{
  "path": "get-data",
  "url": "https://api.example.com/data",
  "adapter": "stats.replace"
}
```

Где `stats.replace` определён в корне конфига:

```json
{
  "adapters": {
    "stats.replace": {
      "type": "replace",
      "rules": {
        "title": { "name": "label" }
      }
    }
  }
}
```

---

## Безопасность

### Скрытые URL

Клиент не знает внешний URL, только имя маршрута:

```
/api/get-users  →  https://api.example.com/internal/v2/users/secure
```

### Проброс авторизации

Заголовок `Authorization` пробрасывается на внешний API:

```
Client → /api/get-users (Bearer token123)
  → External API (Bearer token123)
```

### Cookie

Cookie клиента пробрасываются на внешний API для аутентификации.

---

## API

### Route Handler

```typescript
// src/app/api/[...route]/route.ts

// Обрабатывает GET, POST, PUT, PATCH, DELETE
async function handleRequest(
  request: NextRequest,
  { params }: { params: Promise<{ route: string[] }> },
): Promise<NextResponse>;
```

### Внутренние функции

```typescript
// Поиск маршрута по имени
function findRouteConfig(
  routeName: string,
  apiRoutes: ApiRouteConfig[],
): ApiRouteConfig | undefined;

// Сборка запроса с заголовками
function buildFetchOptions(request: NextRequest): RequestInit;
```

---

## Интеграция с dataFeed

### Серверный dataFeed

```json
{
  "dataFeed": [
    {
      "url": "/api/get-stats",
      "method": "GET",
      "target": "state"
    }
  ]
}
```

DataFeedService резолвит `/api/get-stats` через apiRoutes, но при серверном dataFeed запрос идёт напрямую к внешнему API (без проксирования через API Router).

### Клиентский sendRequest

```json
{
  "type": "sendRequest",
  "params": {
    "url": "/api/get-stats",
    "method": "GET",
    "target": "state.data"
  }
}
```

На клиенте запрос идёт через `/api/get-stats` → API Router → внешний API.
