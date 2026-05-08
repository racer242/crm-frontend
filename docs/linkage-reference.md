# Справочник линковки (Linkage) CRM Platform

Система реактивной привязки свойств компонентов к состоянию элементов (state).

---

## Что такое линковка

Линковка — это механизм связки свойств компонентов с состояниями элементов. При изменении state автоматически обновляются все привязанные свойства компонентов.

**Ключевое отличие от макросов:**

- **Макросы** `{$...}` — разрешаются один раз при загрузке/рендеринге
- **Линковка** `@...` — реактивная привязка, обновляется автоматически при изменении state

---

## Формат binding-строки

```
@ELEMENT_ID.source.PATH.TO.FIELD
```

| Часть           | Описание                                     |
| --------------- | -------------------------------------------- |
| `@`             | Обозначает привязку (binding)                |
| `ELEMENT_ID`    | ID элемента (страницы, секции, компонента)   |
| `source`        | Источник данных (`state`, `config`, `props`) |
| `PATH.TO.FIELD` | Путь к полю в источнике                      |

---

## BindingRef (внутренняя структура)

```typescript
interface BindingRef {
  elementId: string | null; // ID элемента (null = страница)
  source: string; // Источник данных
  fieldPath: string; // Путь к полю
}
```

---

## Типы binding-строк

### 1. Полная привязка

```
@ELEMENT_ID.state.PATH.TO.FIELD
```

**Примеры:**

```json
// Привязка к полю компонента
"value": "@form.state.username"
// → Значение из form.state.username

// Вложенный путь
"value": "@dataTable.state.data.items.0.name"
// → Первый элемент из data.items

// Всё состояние
"props": "@form.state"
// → Весь объект form.state
```

### 2. Привязка к state страницы

```
@state.PATH.TO.FIELD
```

Краткая форма — `elementId` автоматически определяется как ID текущей страницы.

**Примеры:**

```json
"value": "@state.filter.startDate"
"value": "@state.loading"
"value": "@state.selectedId"
"props": "@state.review"
```

### 3. Привязка к config/props

```
@ELEMENT_ID.config.PATH
@ELEMENT_ID.props.PATH
```

**Примеры:**

```json
// Привязка к конфигурации элемента
"value": "@settings.config.theme"

// Привязка к props элемента
"value": "@button.props.icon"
```

---

## Где используется линковка

### В value компонента

```json
{
  "id": "usernameInput",
  "type": "InputText",
  "value": "@form.state.username"
}
```

### В props компонента

```json
{
  "id": "analyticsTable",
  "type": "DataTable",
  "props": {
    "model": "@state.analytics"
  }
}
```

### В целых props (полная замена)

```json
{
  "id": "reviewSection",
  "type": "TabView",
  "props": "@state.review"
}
```

### В model компонентов

```json
{
  "type": "DataTable",
  "props": {
    "model": "@state.analytics",
    "allowMobile": true
  }
}
```

---

## Реактивность

При изменении state через `StateManager` все компоненты с линковкой автоматически обновляются.

### Подписка на изменения

```typescript
// Linkage.subscribe отслеживает изменения конкретных bindings
linkage.subscribe(["@form.state.username", "@state.loading"], () => {
  // Вызывается при изменении любого из bindings
  console.log("Bindings changed");
});
```

### Логика обновления

Линковка уведомляет об изменении, если:

| Изменение state              | Binding                | Уведомление |
| ---------------------------- | ---------------------- | :---------: |
| `form.state.username`        | `@form.state.username` |     ✅      |
| `form.state` (полная замена) | `@form.state.username` |     ✅      |
| `form.state.username.first`  | `@form.state.username` |     ✅      |
| `form.state.email`           | `@form.state.username` |     ❌      |
| `form.state.username`        | `@state.other`         |     ❌      |

---

## Рекурсивное разрешение

Линковка рекурсивно обрабатывает вложенные объекты и массивы:

### Объект

```json
{
  "props": {
    "label": "@form.state.label",
    "disabled": "@form.state.isDisabled"
  }
}
// → { "label": "Иван", "disabled": false }
```

### Массив

```json
{
  "props": {
    "items": ["@state.item1", "@state.item2", "@state.item3"]
  }
}
// → { "items": ["A", "B", "C"] }
```

---

## Отличие линковки от макросов

| Характеристика       |        Линковка `@...`        |       Макрос `{$...}`       |
| -------------------- | :---------------------------: | :-------------------------: |
| **Реактивность**     | ✅ Автоматическое обновление  | ❌ Однократная подстановка  |
| **Тип значения**     | Любое (объект, массив, число) |     Строка или значение     |
| **Где используется** |   `value`, `props`, `model`   | URL, команды, data, message |
| **Сервер**           |            ❌ Нет             |            ✅ Да            |
| **Клиент**           |             ✅ Да             |            ✅ Да            |

### Когда использовать что

| Задача                     | Решение                                      |
| -------------------------- | -------------------------------------------- |
| Привязка input к state     | `value: "@form.state.input"`                 |
| Привязка модели таблицы    | `model: "@state.items"`                      |
| URL в dataFeed             | `url: "https://api.example.com/{$state.id}"` |
| Сообщение Toast            | `message: "Сохранено: {$state.count}"`       |
| Данные команды sendRequest | `data: {"query": "{$form.state.q}"}`         |

---

## Примеры из реальных страниц

### statistics.json — привязка значений фильтров

```json
{
  "type": "Calendar",
  "props": {
    "dateFormat": "dd.mm.yy",
    "value": "@state.start"
  }
}
```

### testing.json — привязка модели таблицы

```json
{
  "type": "DataTable",
  "props": {
    "model": "@state.analytics",
    "allowMobile": true
  }
}
```

### testing.json — полная замена props

```json
{
  "type": "TabView",
  "props": "@state.review"
}
```

---

## Парсинг binding-строк

Алгоритм парсинга (`parseBinding`):

1. Проверка начинается ли строка с `@`
2. Разделение по `.`
3. Поиск известного источника (`state`, `config`, `props`)
4. Если источник найден — всё перед ним = `elementId`
5. Если не найден — первый элемент = `elementId`, source = `state`

**Примеры парсинга:**

| Binding                                | elementId  | source  | fieldPath              |
| -------------------------------------- | ---------- | ------- | ---------------------- |
| `@form.state.username`                 | `form`     | `state` | `username`             |
| `@state.visible`                       | `null`     | `state` | `visible`              |
| `@settings.state.theme.colors.primary` | `settings` | `state` | `theme.colors.primary` |

---

## API

### Linkage class

```typescript
class Linkage {
  constructor(stateManager: StateManager, pageId: string);

  // Разрешить binding-строку
  resolve(binding: string | undefined): any;

  // Рекурсивно разрешить bindings в любом значении
  resolveDeep(value: any): any;

  // Подписаться на изменения bindings
  subscribe(
    bindings: (string | undefined)[],
    callback: LinkageChangeListener,
  ): () => void;
}
```

### LinkageChangeListener

```typescript
type LinkageChangeListener = () => void;
```

### Helper functions

```typescript
// Проверка: является ли значение binding-строкой
function isBinding(value: unknown): value is string;

// Парсинг binding-строки
function parseBinding(value: string): BindingRef | null;
```

---

## Таблица поддержки

| Источник | Линковка | Описание                         |
| -------- | :------: | -------------------------------- |
| `state`  |    ✅    | Состояние элемента (основной)    |
| `config` |    ⏳    | Конфигурация (зарезервировано)   |
| `props`  |    ⏳    | Props элемента (зарезервировано) |
