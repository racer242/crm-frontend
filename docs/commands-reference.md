# Справочник команд (CommandExecutor) CRM Platform

Полное описание всех типов команд, их параметров и примеров использования.

---

## Shortcuts (Именованные команды)

Shortcuts позволяют определить команды на уровне страницы и ссылаться на них по ID, упрощая конфигурацию и переиспользуя код.

### Определение shortcuts

В корне страницы добавляется объект `shortcuts`:

```json
{
  "id": "usersPage",
  "route": "/users",
  "shortcuts": {
    "requestUsers": {
      "type": "apiRequest",
      "params": {
        "url": "/api/users",
        "target": "state.users"
      }
    },
    "showLoading": {
      "type": "setProperty",
      "params": {
        "target": "state.loading",
        "value": true
      }
    },
    "logUsers": {
      "type": "log",
      "params": {
        "message": "Users loaded: {$state.users}"
      }
    }
  },
  "sections": [...]
}
```

### Использование в событиях

В массиве `commands` события можно использовать строки вместо полных объектов команд:

```json
{
  "id": "searchInput",
  "type": "component",
  "componentType": "InputText",
  "events": [
    {
      "type": "onChange",
      "commands": [
        "showLoading",
        "requestUsers",
        "logUsers",
        {
          "type": "setProperty",
          "params": {
            "source": "event.value",
            "target": "state.search"
          }
        }
      ]
    }
  ]
}
```

### Правила

- Строка в `commands` → ищется в `page.shortcuts` по ID
- Если shortcut не найден — выводится предупреждение в консоль
- Строки и объекты можно смешивать в одном массиве `commands`
- Shortcut это полноценный `Command` с `type`, `params` и всеми стандартными полями

---

## Что такое команды

Команды — действия, выполняемые при событиях компонентов (onClick, onChange, onLoad). Каждая команда имеет тип (`type`) и параметры (`params`).

**Где используются:**

- В `events` компонентов
- В `onConfirm`/`onCancel` команды confirm
- В `commands` команды sequence
- В `onSuccess`/`onError` других команд

---

## Command (структура команды)

```typescript
interface Command {
  id?: string; // Уникальный ID (необязательно)
  type: CommandType; // Тип команды
  params: Record<string, any>; // Параметры команды
  description?: string; // Описание
  trigger?: CommandTrigger; // Триггер выполнения
  conditions?: Condition[]; // Условия-фильтры
  onSuccess?: Command[]; // Команды при успехе
  onError?: Command[]; // Команды при ошибке
  timeout?: number; // Таймаут (мс)
  retry?: RetryConfig; // Конфигурация повторов
}
```

---

## CommandTrigger (триггер)

```typescript
interface CommandTrigger {
  type: TriggerType; // Тип триггера
  delay?: number; // Задержка (мс)
  interval?: number; // Интервал повторения (мс)
  condition?: Condition; // Условие выполнения
}
```

### TriggerType

| Тип           | Описание                |
| ------------- | ----------------------- |
| `onLoad`      | При загрузке компонента |
| `onUnload`    | При выгрузке компонента |
| `onClick`     | При клике               |
| `onChange`    | При изменении значения  |
| `onSubmit`    | При отправке формы      |
| `onTimer`     | По таймеру              |
| `onCondition` | При выполнении условия  |
| `manual`      | Ручной запуск           |

---

## Источники данных (source)

Команды `setProperty`, `setState`, `mergeState` используют `source` для получения данных:

| Формат                  | Описание                    | Пример                  |
| ----------------------- | --------------------------- | ----------------------- |
| `event.value`           | Значение из события         | `"event.value"`         |
| `event.field.subfield`  | Вложенное поле из eventData | `"event.data.items"`    |
| `elementId.state.field` | State другого элемента      | `"form.state.username"` |
| `state.field`           | State текущей страницы      | `"state.filter"`        |

**Если source — объект**, он используется напрямую (с поддержкой макросов).

---

## Целевые пути (target)

| Формат                  | Описание                                | Пример               |
| ----------------------- | --------------------------------------- | -------------------- |
| `state.field`           | Запись в state страницы                 | `"state.loading"`    |
| `elementId.state.field` | Запись в state элемента                 | `"form.state.value"` |
| `state`                 | Корневой state страницы (полная замена) | `"state"`            |
| `field` (без "state")   | State компонента-триггера               | `"value"`            |

**Парсинг target:**

- `state.field` → elementId = pageId, fieldPath = `field`
- `elementId.state.field` → elementId = `elementId`, fieldPath = `field`
- `field` → elementId = triggerComponentId, fieldPath = `field`

---

## Команды управления состоянием

### 1. setProperty

Записывает значение из `source` (или `value`) в `target`.

**Params:**

| Параметр | Тип                | Описание               | Обязательно |
| -------- | ------------------ | ---------------------- | :---------: |
| `source` | `string`, `object` | Источник данных        |     ❌      |
| `value`  | `any`              | Прямое значение        |     ❌      |
| `target` | `string`           | Целевой путь           |     ✅      |
| `format` | `FormatRule[]`     | Правила форматирования |     ❌      |

**Примеры:**

```json
// Прямое значение
{
  "type": "setProperty",
  "params": {
    "target": "state.loading",
    "value": true
  }
}

// Из source
{
  "type": "setProperty",
  "params": {
    "source": "event.value",
    "target": "state.username"
  }
}

// С макросом и форматированием
{
  "type": "setProperty",
  "params": {
    "value": "{$now.iso}",
    "target": "state.createdAt",
    "format": [{ "prop": "value", "type": "Date", "func": "DateTimeFormat" }]
  }
}
```

**Логика:**

- Если `value` задан — используется он
- Иначе берётся из `source`
- Применяются макросы → форматирование → запись

---

### 2. setState

Полная замена состояния элемента.

**Params:**

| Параметр | Тип                | Описание               | Обязательно |
| -------- | ------------------ | ---------------------- | :---------: |
| `source` | `string`, `object` | Источник данных        |     ❌      |
| `target` | `string`           | Целевой path           |     ✅      |
| `format` | `FormatRule[]`     | Правила форматирования |     ❌      |

**Примеры:**

```json
// Замена всего state
{
  "type": "setState",
  "params": {
    "source": "event.data",
    "target": "state"
  }
}

// Замена state элемента
{
  "type": "setState",
  "params": {
    "source": "event.userData",
    "target": "profile.state"
  }
}

// С форматированием вложенных свойств
{
  "type": "setState",
  "params": {
    "source": "event.data",
    "target": "state",
    "format": [
      { "prop": "data.amount", "type": "Currency", "func": "NumberFormat" },
      { "prop": "data.createdAt", "type": "Date", "func": "DateTimeFormat" }
    ]
  }
}
```

---

### 3. mergeState

Слияние данных с текущим состоянием (частичное обновление).

**Params:**

| Параметр | Тип                | Описание               | Обязательно |
| -------- | ------------------ | ---------------------- | :---------: |
| `source` | `string`, `object` | Источник данных        |     ❌      |
| `target` | `string`           | Целевой path           |     ✅      |
| `format` | `FormatRule[]`     | Правила форматирования |     ❌      |

**Примеры:**

```json
// Обновление одного поля
{
  "type": "mergeState",
  "params": {
    "source": "event.value",
    "target": "state",
    "value": { "loading": false }
  }
}

// Слияние с макросами
{
  "type": "mergeState",
  "params": {
    "value": {
      "lastUpdated": "{$now.DD.MM.YYYY HH:mm:ss}",
      "count": "{$state.count}"
    },
    "target": "state"
  }
}
```

**Особенности:**

- Value должен быть объектом
- Поверх существующего state

---

### 4. clearState

Очистка состояния элемента.

**Params:**

| Параметр | Тип      | Описание     | Обязательно |
| -------- | -------- | ------------ | :---------: |
| `target` | `string` | Целевой path |     ✅      |

**Примеры:**

```json
{
  "type": "clearState",
  "params": {
    "target": "form.state"
  }
}
```

---

### 5. toggleProperty

Инвертирование boolean-поля.

**Params:**

| Параметр | Тип      | Описание            | Обязательно |
| -------- | -------- | ------------------- | :---------: |
| `target` | `string` | Целевой путь к полю |     ✅      |

**Примеры:**

```json
{
  "type": "toggleProperty",
  "params": {
    "target": "state.visible"
  }
}
```

**Логика:** `newValue = !Boolean(currentValue)`

---

## Команды API

### 6. sendRequest

HTTP-запрос к API с записью результата в state.

**Params:**

| Параметр | Тип            | Описание                  | Обязательно |
| -------- | -------------- | ------------------------- | :---------: |
| `url`    | `string`       | URL запроса (с макросами) |     ✅      |
| `method` | `string`       | HTTP-метод (GET, POST...) |  ❌ (GET)   |
| `data`   | `object`       | Данные запроса            |     ❌      |
| `target` | `string`       | Куда записать результат   |     ✅      |
| `format` | `FormatRule[]` | Форматирование data       |     ❌      |

**Примеры:**

```json
// GET запрос
{
  "type": "sendRequest",
  "params": {
    "url": "https://api.example.com/users/{$state.userId}",
    "method": "GET",
    "target": "userData.state.profile"
  }
}

// POST с данными
{
  "type": "sendRequest",
  "params": {
    "url": "https://api.example.com/search",
    "method": "POST",
    "data": {
      "query": "{$searchForm.state.query}",
      "page": "{$state.currentPage}"
    },
    "target": "results.state.items"
  }
}

// Передача всего state
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

**Особенности:**

- URL и data разрешают макросы перед запросом
- При ошибке — запись в `state.dataFeedErrors`
- API-маршруты `/api/ROUTE` резолвятся из `config.apiRoutes`

---

## Команды UI

### 7. showToast

Показ Toast-уведомления.

**Params:**

| Параметр   | Тип      | Описание            | Обязательно |
| ---------- | -------- | ------------------- | :---------: |
| `message`  | `string` | Текст (с макросами) |     ✅      |
| `severity` | `string` | Уровень             |  ❌ (info)  |
| `summary`  | `string` | Заголовок           |     ❌      |
| `life`     | `number` | Время показа (мс)   |     ❌      |

**Severity:** `success`, `info`, `warn`, `error`

**Примеры:**

```json
{
  "type": "showToast",
  "params": {
    "message": "Данные сохранены",
    "severity": "success"
  }
}

// С макросом
{
  "type": "showToast",
  "params": {
    "message": "Загружено {$state.count} записей",
    "severity": "info",
    "life": 3000
  }
}
```

---

### 8. navigate

Переход по URL.

**Params:**

| Параметр | Тип            | Описание                   | Обязательно |
| -------- | -------------- | -------------------------- | :---------: |
| `url`    | `string`       | URL перехода (с макросами) |     ✅      |
| `format` | `FormatRule[]` | Форматирование URL         |     ❌      |

**Примеры:**

```json
{
  "type": "navigate",
  "params": {
    "url": "/users"
  }
}

// С макросом
{
  "type": "navigate",
  "params": {
    "url": "/users/{$userList.state.selectedId}/profile"
  }
}
```

---

### 9. confirm

Диалог подтверждения с ветвлением.

**Params:**

| Параметр    | Тип         | Описание                          | Обязательно |
| ----------- | ----------- | --------------------------------- | :---------: |
| `message`   | `string`    | Текст подтверждения (с макросами) |     ✅      |
| `onConfirm` | `Command[]` | Команды при подтверждении         |     ❌      |
| `onCancel`  | `Command[]` | Команды при отмене                |     ❌      |

**Примеры:**

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
      },
      {
        "type": "showToast",
        "params": { "message": "Удалено", "severity": "success" }
      }
    ],
    "onCancel": [
      {
        "type": "showToast",
        "params": { "message": "Отменено", "severity": "warn" }
      }
    ]
  }
}
```

**Особенности:**

- Если callback confirm не задан — считается подтверждённым

---

### 10. delay

Пауза в последовательности команд.

**Params:**

| Параметр   | Тип      | Описание          | Обязательно |
| ---------- | -------- | ----------------- | :---------: |
| `duration` | `number` | Длительность (мс) |  ❌ (1000)  |

**Примеры:**

```json
{
  "type": "delay",
  "params": {
    "duration": 2000
  }
}
```

---

### 11. sequence

Последовательное выполнение команд.

**Params:**

| Параметр   | Тип         | Описание      | Обязательно |
| ---------- | ----------- | ------------- | :---------: |
| `commands` | `Command[]` | Массив команд |     ✅      |

**Примеры:**

```json
{
  "type": "sequence",
  "params": {
    "commands": [
      {
        "type": "setProperty",
        "params": { "target": "state.loading", "value": true }
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
      },
      {
        "type": "delay",
        "params": { "duration": 500 }
      },
      {
        "type": "showToast",
        "params": { "message": "Готово!", "severity": "success" }
      }
    ]
  }
}
```

---

### 12. log

Логирование в консоль.

**Params:**

| Параметр    | Тип       | Описание                | Обязательно |
| ----------- | --------- | ----------------------- | :---------: |
| `message`   | `any`     | Сообщение (с макросами) |     ✅      |
| `level`     | `string`  | Уровень лога            |  ❌ (info)  |
| `showExtra` | `boolean` | Показать eventData      |     ❌      |

**Level:** `info`, `warn`, `error`, `debug`, `log`

**Примеры:**

```json
{
  "type": "log",
  "params": {
    "message": "Клик по кнопке",
    "level": "info"
  }
}

// С макросом
{
  "type": "log",
  "params": {
    "message": "Выбран пользователь: {$user.state.name}",
    "level": "debug",
    "showExtra": true
  }
}
```

---

## PathParam команды

Команды для манипуляции сегментами пути (pathParams) — частью URL после маршрута страницы.

Требуют `pageRoute` в `CommandExecutionContext` для корректного вычисления сегментов.

### 17. setPathParams

Заменяет **все** path-параметры.

**Params:**

| Параметр | Тип     | Описание              | Обязательно |
| -------- | ------- | --------------------- | :---------: |
| `values` | `any[]` | Массив новых значений |     ✅      |

**Примеры:**

```json
// URL: /users/old/edit → /users/new/detail
{
  "type": "setPathParams",
  "params": {
    "values": ["new", "detail"]
  }
}

// С макросами
{
  "type": "setPathParams",
  "params": {
    "values": ["{$state.id}", "{$state.tab}"]
  }
}
```

---

### 18. mergePathParams

Обновляет/удаляет отдельные path-параметры по индексу.

**Params:**

| Параметр | Тип      | Описание                          | Обязательно |
| -------- | -------- | --------------------------------- | :---------: |
| `values` | `object` | `{ "index": value }` null удаляет |     ✅      |

**Примеры:**

```json
// URL: /users/a/b/c → /users/x/y
{
  "type": "mergePathParams",
  "params": {
    "values": { "0": "x", "1": "y", "2": null }
  }
}
```

---

### 19. setPathParam

Изменяет/удаляет один path-параметр по индексу.

**Params:**

| Параметр | Тип      | Описание                  | Обязательно |
| -------- | -------- | ------------------------- | :---------: |
| `index`  | `number` | Индекс параметра          |     ✅      |
| `value`  | `any`    | Значение (null — удаляет) |     ✅      |

**Примеры:**

```json
// Установить
{
  "type": "setPathParam",
  "params": { "index": 1, "value": "detail" }
}

// Удалить
{
  "type": "setPathParam",
  "params": { "index": 0, "value": null }
}
```

---

### 20. removePathParam

Удаляет path-параметр по индексу.

**Params:**

| Параметр | Тип      | Описание         | Обязательно |
| -------- | -------- | ---------------- | :---------: |
| `index`  | `number` | Индекс параметра |     ✅      |

**Примеры:**

```json
{
  "type": "removePathParam",
  "params": { "index": 0 }
}
```

---

## URL команды

### 21. setUrlParams

Заменяет **все** URL параметры.

**Params:**

| Параметр | Тип            | Описание              | Обязательно |
| -------- | -------------- | --------------------- | :---------: |
| `values` | `object`       | `{ key: value }`      |     ✅      |
| `format` | `FormatRule[]` | Форматирование values |     ❌      |

**Примеры:**

```json
{
  "type": "setUrlParams",
  "params": {
    "values": {
      "start": "2025-01-01",
      "end": "2025-12-31",
      "status": "active"
    }
  }
}
// → ?start=2025-01-01&end=2025-12-31&status=active

// С макросами
{
  "type": "setUrlParams",
  "params": {
    "values": {
      "start": "{$filterForm.state.startDate}",
      "end": "{$filterForm.state.endDate}"
    }
  }
}
```

---

### 22. mergeUrlParams

Обновляет/добавляет URL параметры (**сохраняет существующие**).

**Params:**

| Параметр | Тип            | Описание              | Обязательно |
| -------- | -------------- | --------------------- | :---------: |
| `values` | `object`       | `{ key: value }`      |     ✅      |
| `format` | `FormatRule[]` | Форматирование values |     ❌      |

**Примеры:**

```json
// Текущий URL: ?filter=active&page=1
{
  "type": "mergeUrlParams",
  "params": {
    "values": { "sort": "name" }
  }
}
// → ?filter=active&page=1&sort=name

// null/undefined значение — удаляет параметр
{
  "type": "mergeUrlParams",
  "params": {
    "values": { "filter": null }
  }
}
// → ?page=1&sort=name
```

---

### 23. setUrlParam

Изменяет **один** URL параметр.

**Params:**

| Параметр | Тип            | Описание       | Обязательно |
| -------- | -------------- | -------------- | :---------: |
| `name`   | `string`       | Имя параметра  |     ✅      |
| `value`  | `any`          | Значение       |     ✅      |
| `format` | `FormatRule[]` | Форматирование |     ❌      |

**Примеры:**

```json
{
  "type": "setUrlParam",
  "params": {
    "name": "page",
    "value": 2
  }
}
```

---

### 24. removeUrlParam

Удаляет URL параметр.

**Params:**

| Параметр | Тип      | Описание      | Обязательно |
| -------- | -------- | ------------- | :---------: |
| `name`   | `string` | Имя параметра |     ✅      |

**Примеры:**

```json
{
  "type": "removeUrlParam",
  "params": {
    "name": "filter"
  }
}
```

---

## Команды обновления

### 25. refresh

Обновление страницы без перезагрузки.

**Params:**

| Параметр | Тип      | Описание         |  Обязательно   |
| -------- | -------- | ---------------- | :------------: |
| `mode`   | `string` | Режим обновления | ❌ (`refresh`) |

**Mode:**

| Режим     | Описание                     |
| --------- | ---------------------------- |
| `refresh` | `router.refresh()` (Next.js) |
| `replace` | `router.replace(currentUrl)` |
| `reload`  | `window.location.reload()`   |

**Примеры:**

```json
{
  "type": "refresh",
  "params": { "mode": "reload" }
}
```

---

## Сводная таблица команд

| Команда           | Описание                    | Сервер | Клиент |
| ----------------- | --------------------------- | :----: | :----: |
| `setProperty`     | Запись значения             |   ✅   |   ✅   |
| `setState`        | Полная замена state         |   ✅   |   ✅   |
| `mergeState`      | Слияние с state             |   ✅   |   ✅   |
| `clearState`      | Очистка state               |   ✅   |   ✅   |
| `toggleProperty`  | Инвертирование boolean      |   ✅   |   ✅   |
| `sendRequest`     | HTTP-запрос                 |   ❌   |   ✅   |
| `showToast`       | Toast-уведомление           |   ❌   |   ✅   |
| `navigate`        | Переход по URL              |   ❌   |   ✅   |
| `confirm`         | Диалог подтверждения        |   ❌   |   ✅   |
| `delay`           | Пауза                       |   ✅   |   ✅   |
| `sequence`        | Последовательность          |   ✅   |   ✅   |
| `log`             | Логирование                 |   ✅   |   ✅   |
| `setPathParams`   | Замена всех path params     |   ❌   |   ✅   |
| `mergePathParams` | Обновление path params      |   ❌   |   ✅   |
| `setPathParam`    | Изменение одного path param |   ❌   |   ✅   |
| `removePathParam` | Удаление path param         |   ❌   |   ✅   |
| `setUrlParams`    | Замена всех URL params      |   ❌   |   ✅   |
| `mergeUrlParams`  | Добавление URL params       |   ❌   |   ✅   |
| `setUrlParam`     | Изменение одного URL param  |   ❌   |   ✅   |
| `removeUrlParam`  | Удаление URL param          |   ❌   |   ✅   |
| `refresh`         | Обновление страницы         |   ❌   |   ✅   |

---

## CommandExecutionContext

Контекст выполнения команд:

```typescript
interface CommandExecutionContext {
  pageId: string; // ID текущей страницы
  pageRoute?: string; // Маршрут страницы (для pathParams)
  triggerComponentId: string; // ID компонента-триггера
  appConfig: App; // Конфигурация приложения
  stateManager: StateManager; // Менеджер состояний
  showToast?: (message, severity?) => void; // Callback toast
  navigate?: (url: string) => void; // Callback навигации
  confirm?: (message: string) => Promise<boolean>; // Callback подтверждения
  refresh?: (mode: string) => void; // Callback обновления
}
```
