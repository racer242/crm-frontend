# Справочник DataAdapterEngine CRM Platform

Система адаптеров для трансформации API-ответов в формат CRM.

---

## Что такое DataAdapterEngine

DataAdapterEngine — серверный модуль, применяющий адаптеры к данным API для преобразования в формат, совместимый с CRM.

**Ключевые особенности:**

- Работает **только на сервере**
- Два типа адаптеров: `replace`, `js`
- Рекурсивный обход данных
- Поддержка вложенных объектов и массивов

---

## Типы адаптеров

### Replace-адаптер

Словарная замена имён свойств и значений.

**Структура:**

```typescript
interface ReplaceAdapter {
  type: "replace";
  rules: Record<string, ReplaceRule>;
}

interface ReplaceRule {
  name?: string; // Новое имя свойства
  value?: any; // Новое значение (с поддержкой $value$)
}
```

**Как работает:**

1. Рекурсивно обходит все свойства объекта
2. Если свойство найдено в `rules`:
   - Имя заменяется на `rule.name`
   - Значение заменяется на `rule.value` (с макросом `$value$`)
   - Если `value` не задан — рекурсия вглубь
3. Если свойство не найдено — остаётся как есть, рекурсия

### Макрос `$value$`

Специальный макрос для подстановки исходного значения.

| Шаблон                                                   | Исходное значение | Результат                                               |
| -------------------------------------------------------- | ----------------- | ------------------------------------------------------- |
| `"$value$"`                                              | `"hello"`         | `"hello"`                                               |
| `"https://example.com/$value$"`                          | `"path"`          | `"https://example.com/path"`                            |
| `{ "type": "navigate", "params": { "url": "$value$" } }` | `"/users"`        | `{ "type": "navigate", "params": { "url": "/users" } }` |

**Поддержка вложенных объектов:**
Если `value` — объект, макрос `$value$` рекурсивно заменяется во всех строках.

### Примеры Replace-адаптера

**Базовый:**

```json
{
  "adapters": {
    "stats.replace": {
      "type": "replace",
      "rules": {
        "title": { "name": "label" },
        "count": { "name": "value" },
        "url": { "name": "command" }
      }
    }
  }
}
```

**Входные данные:**

```json
{ "title": "Users", "count": 42, "url": "/users" }
```

**Результат:**

```json
{ "label": "Users", "value": 42, "command": "/users" }
```

**С $value$ макросом:**

```json
{
  "adapters": {
    "menu.replace": {
      "type": "replace",
      "rules": {
        "title": { "name": "label" },
        "url": {
          "name": "command",
          "value": {
            "type": "navigate",
            "params": { "url": "$value$" }
          }
        }
      }
    }
  }
}
```

**Вход:** `{ "title": "Dashboard", "url": "/dashboard" }`

**Результат:**

```json
{
  "label": "Dashboard",
  "command": { "type": "navigate", "params": { "url": "/dashboard" } }
}
```

**Без value — рекурсия:**

```json
{
  "rules": {
    "data": { "name": "items" }
  }
}
```

**Вход:** `{ "data": { "name": "John", "age": 30 } }`

**Результат:** `{ "items": { "name": "John", "age": 30 } }`

---

### JS-адаптер

Произвольная трансформация данных через JavaScript.

**Структура:**

```typescript
interface JsAdapter {
  type: "js";
  script: string; // Путь к скрипту относительно public/
}
```

**Как работает:**

1. Загружает скрипт из `public/{scriptPath}`
2. Выполняет как функцию: `transform(data)` → transformedData
3. Если `transform` не найден — ищет `exports.default` или `exports.transform`

### Требования к скрипту

Скрипт должен содержать функцию `transform(data)`:

```javascript
function transform(data) {
  // Принимает исходные данные
  // Возвращает преобразованные
  return {
    items: data.items.map((item) => ({
      label: item.title,
      value: item.count,
    })),
  };
}
```

### Примеры JS-адаптера

**Конфигурация:**

```json
{
  "adapters": {
    "analytics.js": {
      "type": "js",
      "script": "adapters/analytics2menu.js"
    }
  }
}
```

**Файл `public/adapters/analytics2menu.js`:**

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

**Вход:**

```json
{
  "items": [
    { "title": "Users", "url": "/users", "count": 150 },
    { "title": "Orders", "url": "/orders", "count": 42 }
  ]
}
```

**Результат:**

```json
[
  {
    "label": "Users",
    "command": { "type": "navigate", "params": { "url": "/users" } },
    "badge": 150
  },
  {
    "label": "Orders",
    "command": { "type": "navigate", "params": { "url": "/orders" } },
    "badge": 42
  }
]
```

---

## Использование

### В dataFeed страницы

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

### В apiRoutes

```json
{
  "apiRoutes": [
    {
      "path": "get-stats",
      "url": "https://api.example.com/stats",
      "adapter": "analytics.js"
    }
  ]
}
```

---

## Алгоритм replace-адаптера

```
applyReplace(data, rules):
  Если null/undefined → вернуть как есть
  Если массив → применить к каждому элементу
  Если не объект → вернуть как есть

  result = {}
  Для каждого [key, value] в data:
    Если key есть в rules:
      targetKey = rule.name || key
      Если rule.value задан:
        result[targetKey] = replaceValueMacro(rule.value, value)
      Иначе:
        result[targetKey] = applyReplace(value, rules)
    Иначе:
      result[key] = applyReplace(value, rules)

  Вернуть result
```

---

## Обработка ошибок

| Ошибка                             | Описание                     |
| ---------------------------------- | ---------------------------- |
| `Unknown adapter type: xxx`        | Неизвестный тип адаптера     |
| `JS adapter script not found: xxx` | Скрипт не найден в `public/` |
| `JS adapter execution failed: xxx` | Ошибка выполнения скрипта    |

---

## API

```typescript
// Главная функция
function applyAdapter(data: any, adapter: Adapter): Promise<any>;

// Внутренние функции
function applyReplace(data: any, rules: Record<string, ReplaceRule>): any;
function applyJs(data: any, scriptPath: string): Promise<any>;
```
