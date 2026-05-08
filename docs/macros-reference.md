# Справочник макросов CRM Platform

Система макросов для динамической подстановки данных в конфигурацию, URL, команды и data-запросы.

---

## Формат макроса

```
{$PREFIX.PATH.TO.FIELD}
```

Макросы распознаются по паттерну `{$...}` и разрешаются (заменяются на значения) на сервере или клиенте.

---

## Типы макросов

### 1. State элемента

```
{$ELEMENT_ID.state.PATH.TO.FIELD}
```

| Параметр              | Описание                                   |
| --------------------- | ------------------------------------------ |
| `ELEMENT_ID`          | ID элемента (страницы, секции, компонента) |
| `state.PATH.TO.FIELD` | Путь к полю в состоянии элемента           |

**Примеры:**

```json
// URL с макросом
"{$userProfile.state.userId}"
// → "123"

// Вложенный путь
"{$dataTable.state.data.items.0.name}"
// → "Иван"

// Всё состояние (вернёт объект)
"{$form.state}"
// → { username: "admin", role: "admin" }
```

**Особенности:**

- Работает и на сервере, и на клиенте
- Если элемент не найден — макрос остаётся неразрешённым

---

### 2. State страницы

```
{$state.PATH.TO.FIELD}
```

Краткая форма для доступа к state текущей страницы (страницы, на которой находится компонент).

**Примеры:**

```json
"{$state.filter.startDate}"
"{$state.loading}"
"{$state.selectedId}"
```

---

### 3. Конфиг приложения

```
{$config.PATH.TO.FIELD}
```

Доступ к конфигурации приложения (`crm-config.json`).

**Примеры:**

```json
"{$config.name}"        // → "CRM Platform"
"{$config.version}"     // → "1.0.0"
"{$config.api.baseURL}" // → "http://localhost:3000"
"{$config.features.darkMode}" // → true
```

---

### 4. Location (URL)

```
{$location.PROP}
{$location.pathParams.N}
{$location.params.KEY}
```

#### Свойства location

| Свойство   | Описание      | Пример значения                            |
| ---------- | ------------- | ------------------------------------------ |
| `href`     | Полный URL    | `http://localhost:3000/users/312?tab=info` |
| `protocol` | Протокол      | `http:`                                    |
| `host`     | Хост с портом | `localhost:3000`                           |
| `hostname` | Имя хоста     | `localhost`                                |
| `port`     | Порт          | `3000`                                     |
| `pathname` | Путь          | `/users/312`                               |
| `search`   | Query-строка  | `?tab=info`                                |
| `hash`     | Хэш           | `#section1`                                |
| `origin`   | Origin        | `http://localhost:3000`                    |

#### pathParams (сегменты пути)

Массив сегментов пути после найденного маршрута (fallback route matching).

```
// URL: /users/312/settings
// Page route: /users
// pathParams: ["312", "settings"]
```

| Макрос                     | Значение     |
| -------------------------- | ------------ |
| `{$location.pathParams.0}` | `"312"`      |
| `{$location.pathParams.1}` | `"settings"` |

#### params (query-параметры)

| Макрос                    | Значение                  |
| ------------------------- | ------------------------- |
| `{$location.params.tab}`  | `"info"` (из `?tab=info`) |
| `{$location.params.page}` | `"2"` (из `?page=2`)      |

**Пример использования:**

```json
{
  "dataFeed": [
    {
      "url": "https://api.example.com/users/{$location.pathParams.0}",
      "method": "GET",
      "target": "state.userData"
    }
  ]
}
```

---

### 5. Date/Time (текущее время)

```
{$now.FORMAT}
```

| Формат                       | Описание          | Пример                     |
| ---------------------------- | ----------------- | -------------------------- |
| `{$now.iso}`                 | ISO 8601          | `2025-05-08T14:30:00.000Z` |
| `{$now.timestamp}`           | Timestamp (ms)    | `1715175000000`            |
| `{$now.DD.MM.YY}`            | Дата короткая     | `08.05.25`                 |
| `{$now.DD.MM.YYYY}`          | Дата полная       | `08.05.2025`               |
| `{$now.HH:mm}`               | Время             | `14:30`                    |
| `{$now.HH:mm:ss}`            | Время с секундами | `14:30:45`                 |
| `{$now.DD.MM.YYYY HH:mm:ss}` | Дата и время      | `08.05.2025 14:30:45`      |
| `{$now.MM.YYYY}`             | Месяц и год       | `05.2025`                  |

**Пример:**

```json
{
  "type": "setProperty",
  "params": {
    "target": "state.createdAt",
    "value": "{$now.DD.MM.YYYY HH:mm:ss}"
  }
}
```

---

### 6. Session / LocalStorage

```
{$session.KEY}       // sessionStorage
{$localStorage.KEY}  // localStorage (авто-JSON parse)
```

| Макрос                 | Описание                                         |
| ---------------------- | ------------------------------------------------ |
| `{$session.token}`     | Значение из sessionStorage                       |
| `{$localStorage.user}` | Значение из localStorage (если JSON — распарсит) |

**Особенности:**

- Работает только на клиенте
- `localStorage` автоматически пытается распарсить JSON

---

### 7. Cookie

```
{$cookie.NAME}
```

| Макрос                | Описание                    |
| --------------------- | --------------------------- |
| `{$cookie.sessionId}` | Значение cookie `sessionId` |
| `{$cookie}`           | Все cookies как объект      |

---

### 8. Window

```
{$window.PROP}
```

Любое свойство объекта `window`.

| Макрос                    | Значение      |
| ------------------------- | ------------- |
| `{$window.innerWidth}`    | Ширина окна   |
| `{$window.location.href}` | Текущий URL   |
| `{$window.screen.width}`  | Ширина экрана |

---

### 9. Math (генераторы)

```
{$math.random}           // Случайное число 0-1
{$math.randomInt.MIN.MAX} // Случайное целое
{$math.guid}             // GUID v4
{$math.uuid}             // UUID v4
```

| Макрос                    | Описание    | Пример              |
| ------------------------- | ----------- | ------------------- |
| `{$math.random}`          | Float 0-1   | `0.45678`           |
| `{$math.randomInt.1.100}` | Целое 1-100 | `42`                |
| `{$math.guid}`            | GUID        | `550e8400-e29b-...` |
| `{$math.uuid}`            | UUID        | `f47ac10b-58cc-...` |

---

### 10. Device / Browser

```
{$device.platform}   // Платформа
{$device.mobile}     // Мобильное устройство (boolean)
{$browser.userAgent} // User-Agent
```

| Макрос                 | Значение             | Пример                  |
| ---------------------- | -------------------- | ----------------------- |
| `{$device.platform}`   | Платформа            | `Win32`, `Linux x86_64` |
| `{$device.mobile}`     | Мобильное устройство | `true` / `false`        |
| `{$browser.userAgent}` | User-Agent           | `Mozilla/5.0...`        |

---

### 11. Environment variables

```
{$env.VAR_NAME}
```

Переменные окружения `NEXT_PUBLIC_*`.

| Макрос                       | Описание          |
| ---------------------------- | ----------------- |
| `{$env.NEXT_PUBLIC_API_URL}` | URL API из .env   |
| `{$env.NEXT_PUBLIC_APP_ENV}` | Окружение из .env |

---

## Особенности макросов

### 1. Типы возвращаемых значений

| Ситуация                            | Тип результата                                     |
| ----------------------------------- | -------------------------------------------------- |
| Одиночный макрос `{$...}`           | Оригинальный тип (Object, Boolean, Number, String) |
| Несколько макросов `"{$a} и {$b}"`  | Строка (конкатенация)                              |
| Текст + макрос `"Привет, {$name}!"` | Строка                                             |

### 2. Рекурсивная подстановка

Если результат макроса содержит другой макрос, он тоже разрешается:

```json
// state.template = "Привет, {$user.name}!"
// user.name = "Иван"
// → "Привет, Иван!"
```

Лимит рекурсии: `maxRecursion` (по умолчанию 3).

### 3. Объекты и массивы

Макросы рекурсивно обрабатываются в объектах и массивах:

```json
{
  "data": {
    "userId": "{$user.state.id}",
    "createdAt": "{$now.DD.MM.YYYY}"
  }
}
// → { "userId": "123", "createdAt": "08.05.2025" }
```

### 4. Неразрешённые макросы

Если макрос не найден — он остаётся как есть:

```
{$unknown.state.field} → "{$unknown.state.field}"
```

---

## Примеры использования

### В URL dataFeed

```json
{
  "dataFeed": [
    {
      "url": "https://api.example.com/users/{$userPage.state.selectedId}/orders",
      "method": "GET",
      "target": "orders.state.data"
    }
  ]
}
```

### В data запроса

```json
{
  "type": "sendRequest",
  "params": {
    "url": "https://api.example.com/search",
    "method": "POST",
    "data": {
      "query": "{$searchForm.state.query}",
      "date": "{$now.iso}",
      "userId": "{$user.state.id}"
    },
    "target": "searchResults.state.data"
  }
}
```

### В командах

```json
{
  "type": "showToast",
  "params": {
    "message": "Данные загружены: {$stats.state.count} записей",
    "severity": "success"
  }
}
```

### В navigate

```json
{
  "type": "navigate",
  "params": {
    "url": "/users/{$userList.state.selectedId}/profile"
  }
}
```

### Передача всего state

```json
{
  "type": "sendRequest",
  "params": {
    "url": "https://api.example.com/submit",
    "method": "POST",
    "data": {$form.state},
    "target": "result.state"
  }
}
```

---

## Дополнительные макросы

| Префикс        | Описание                       |
| -------------- | ------------------------------ |
| `{$user.PROP}` | Данные пользователя (заглушка) |
| `{$auth.PROP}` | Данные авторизации (заглушка)  |

Эти макросы зарезервированы для будущего использования.

---

## Таблица поддержки

| Макрос                     | Сервер | Клиент |
| -------------------------- | :----: | :----: |
| `{$ELEMENT_ID.state.PATH}` |   ✅   |   ✅   |
| `{$state.PATH}`            |   ✅   |   ✅   |
| `{$config.PATH}`           |   ✅   |   ✅   |
| `{$location.*}`            |   ❌   |   ✅   |
| `{$now.*}`                 |   ✅   |   ✅   |
| `{$session.*}`             |   ❌   |   ✅   |
| `{$localStorage.*}`        |   ❌   |   ✅   |
| `{$cookie.*}`              |   ❌   |   ✅   |
| `{$window.*}`              |   ❌   |   ✅   |
| `{$math.*}`                |   ✅   |   ✅   |
| `{$device.*}`              |   ✅   |   ✅   |
| `{$browser.*}`             |   ✅   |   ✅   |
| `{$env.*}`                 |   ✅   |   ✅   |
