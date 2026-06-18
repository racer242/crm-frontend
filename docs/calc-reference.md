# Calc Engine — трансформация данных

Calc Engine — утилита для описания вычисляемых значений в конфигурации страниц. Позволяет выполнять различные операции трансформации данных, такие как склейка строк, условный выбор, форматирование и другие.

Calc-выражения разрешаются **реактивно** — при изменении зависимых полей state результат пересчитывается автоматически.

---

## Синтаксис

Calc-выражение — это объект с двумя обязательными полями:

```json
{
  "calc": "operationName",
  "params": { ... }
}
```

| Поле     | Тип    | Описание                            |
| -------- | ------ | ----------------------------------- |
| `calc`   | string | Имя операции                        |
| `params` | object | Параметры, специфичные для операции |

Внутри `params` можно использовать:

- **Линковку** `@ELEMENT_ID.state.PATH` — реактивная привязка к state
- **Inline-линковку** `{@ELEMENT_ID.state.PATH}` — вставка в строку
- **Макросы** `{$state.PATH}` — однократная подстановка
- **Вложенные calc-выражения** — композиция операций

---

## Встроенные операции

### 1. `join` — склеивание массива с разделителем

```json
{
  "calc": "join",
  "params": {
    "separator": "/",
    "items": ["/users", "@state.userData.id", "edit"]
  }
}
// → "/users/42/edit"
```

**Параметры:**

| Параметр    | Тип    | Описание                       |
| ----------- | ------ | ------------------------------ |
| `separator` | string | Разделитель элементов          |
| `items`     | array  | Массив значений для склеивания |

---

### 2. `concat` — конкатенация значений

```json
{
  "calc": "concat",
  "params": {
    "items": [
      "@state.lastName",
      " ",
      "@state.firstName",
      " ",
      "@state.middleName"
    ]
  }
}
// → "Иванов Иван Иванович"
```

**Параметры:**

| Параметр | Тип   | Описание                        |
| -------- | ----- | ------------------------------- |
| `items`  | array | Массив значений для объединения |

---

### 3. `if` — условный выбор

```json
{
  "calc": "if",
  "params": {
    "condition": "@state.isAdmin",
    "then": "Администратор",
    "else": "Пользователь"
  }
}
// → "Администратор" если state.isAdmin === true
```

```json
{
  "calc": "if",
  "params": {
    "condition": "@state.userData.id",
    "then": {
      "calc": "concat",
      "params": { "items": ["/users/", "@state.userData.id"] }
    },
    "else": "/users/new"
  }
}
// → "/users/42" если есть id, иначе "/users/new"
```

**Параметры:**

| Параметр    | Тип | Описание                       |
| ----------- | --- | ------------------------------ |
| `condition` | any | Условие (приводится к boolean) |
| `then`      | any | Значение если true             |
| `else`      | any | Значение если false            |

---

### 4. `default` — значение по умолчанию

```json
{
  "calc": "default",
  "params": {
    "value": "@state.userData.avatar",
    "defaultValue": "/assets/default-avatar.png"
  }
}
// → "/assets/default-avatar.png" если avatar === null/undefined
```

**Параметры:**

| Параметр       | Тип | Описание                            |
| -------------- | --- | ----------------------------------- |
| `value`        | any | Проверяемое значение                |
| `defaultValue` | any | Значение, если value null/undefined |

---

### 5. `format` — форматирование строки

```json
{
  "calc": "format",
  "params": {
    "template": "{0} — {1}",
    "args": ["@state.firstName", "@state.lastName"]
  }
}
// → "Иван — Иванов"
```

```json
{
  "calc": "format",
  "params": {
    "template": "Счёт №{0} от {1}",
    "args": ["@state.invoice.number", "@state.invoice.date"]
  }
}
// → "Счёт №1245 от 15.06.2026"
```

**Параметры:**

| Параметр   | Тип    | Описание                              |
| ---------- | ------ | ------------------------------------- |
| `template` | string | Шаблон с плейсхолдерами {0}, {1}, ... |
| `args`     | array  | Значения для подстановки              |

---

## Композиция операций

Calc-выражения могут быть вложенными — результат одной операции передаётся в params другой:

```json
{
  "calc": "join",
  "params": {
    "separator": " | ",
    "items": [
      {
        "calc": "default",
        "params": {
          "value": "@state.userData.fullName",
          "defaultValue": "Гость"
        }
      },
      {
        "calc": "if",
        "params": {
          "condition": "@state.isOnline",
          "then": "онлайн",
          "else": "офлайн"
        }
      }
    ]
  }
}
// → "Иван Иванов | онлайн"
```

---

## Использование в конфигурации страниц

### В props компонента

```json
{
  "id": "breadcrumb",
  "type": "Breadcrumb",
  "props": {
    "model": [
      { "label": "Главная", "route": "/" },
      { "label": "Пользователи", "route": "/users" },
      {
        "label": "@state.userData.fullName",
        "route": {
          "calc": "join",
          "params": {
            "separator": "/",
            "items": ["/users", "@state.userData.id"]
          }
        }
      }
    ]
  }
}
```

### Комбинация с inline-линковкой

```json
{
  "label": "{@state.firstName} {@state.lastName}",
  "route": "/users/{@state.userData.id}"
}
```

---

## Реактивность

Calc-выражения реактивны. Если любое поле state, на которое ссылается calc-выражение, изменится — компонент с этим выражением перерендерится.

<div class="note">

**Важно:** Calc-выражения не заменяют линковку, а дополняют её. Для простой привязки значения используйте линковку `@state.field`. Calc используйте когда нужно преобразовать данные: склеить строки, выбрать по условию, подставить значение по умолчанию.

</div>

---

## API

### CalcEngine class

```typescript
class CalcEngine {
  constructor();

  // Выполнить calc-операцию
  execute(name: string, params: Record<string, any>): any;

  // Зарегистрировать новую операцию
  register(name: string, handler: CalcHandler): void;
}
```

### Helper functions

```typescript
// Проверка: является ли значение calc-выражением
function isCalcOperation(value: unknown): value is CalcOperation;
```

### Types

```typescript
interface CalcOperation {
  calc: string;
  params: Record<string, any>;
}

type CalcHandler = (params: Record<string, any>) => any;

type CalcRegistry = Record<string, CalcHandler>;
```
