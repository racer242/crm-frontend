# Справочник архитектуры CRM Platform

Описание ключевых модулей архитектуры платформы.

---

## StateManager — Управление состоянием

Центральный модуль управления состоянием всех элементов страницы.

### Хранение состояния

Состояние хранится непосредственно в объектах элементов конфигурации (`element.state`). StateManager — обёртка над этими данными с уведомлениями.

### Инициализация

```typescript
new StateManager(
  appConfig: App,           // Конфигурация приложения
  elementIndex: ElementIndex, // Индекс элементов
  initialDataFeed?: DataFeedResult[],  // Результаты dataFeed
  initialPageId?: string,   // ID страницы для state
);
```

При инициализации применяются результаты серверного dataFeed:

- Для каждого успешного результата записывает данные в state по target
- Если target = `state` — merge в корневой state страницы
- Если target = `state.field` — set в конкретное поле

### Методы

| Метод                                      | Описание                                    |
| ------------------------------------------ | ------------------------------------------- |
| `getState(elementPath)`                    | Получить состояние элемента                 |
| `getStateField(elementPath, field)`        | Получить поле state (вложенные через точку) |
| `setState(elementPath, newState)`          | Полная замена состояния                     |
| `setStateField(elementPath, field, value)` | Установка поля state                        |
| `mergeState(elementPath, updates)`         | Частичное обновление (shallow merge)        |
| `clearState(elementPath)`                  | Очистка состояния                           |
| `toggleStateField(elementPath, field)`     | Переключение boolean                        |
| `subscribe(listener)`                      | Подписка на изменения                       |
| `getPage(pageId)`                          | Получить страницу по ID                     |
| `getPageByRoute(route)`                    | Получить страницу по route                  |
| `getAppConfig()`                           | Получить всю конфигурацию                   |

### Подписка на изменения

```typescript
type StateChangeListener = (
  elementPath: ElementPath,
  changedPath: string | null, // null = полная замена
  oldState: Record<string, any>,
  newState: Record<string, any>,
) => void;

const unsubscribe = stateManager.subscribe(
  (elementPath, changedPath, oldState, newState) => {
    console.log(`${elementPath} changed:`, oldState, "→", newState);
  },
);

// Отписка
unsubscribe();
```

### changedPath формат

| Значение            | Описание                                                       |
| ------------------- | -------------------------------------------------------------- |
| `null`              | Полная замена state (`setState`, `clearState`)                 |
| `"elementId.field"` | Изменено конкретное поле (`setStateField`, `toggleStateField`) |

### Вложенные пути

`setStateField` поддерживает вложенные пути через точку:

```typescript
stateManager.setStateField("form", "user.address.city", "Москва");
// form.state.user.address.city = "Москва"
```

---

## ElementIndex — Индекс элементов

O(1) поиск элементов по ID.

### Создание

```typescript
// На сервере: buildFullIndex(config) → { pageId: { elementId: element, ... }, ... }
// Для конкретной страницы: buildPageIndex(page) → { elementId: element, ... }

const index = new ElementIndex(pageIndex);
```

### Методы

| Метод            | Описание                | Сложность |
| ---------------- | ----------------------- | :-------: |
| `getElement(id)` | Получить элемент по ID  |   O(1)    |
| `hasElement(id)` | Проверить существование |   O(1)    |
| `getAllIds()`    | Все ID элементов        |   O(n)    |
| `size`           | Количество элементов    |   O(1)    |

### Построение индекса

Индекс строится рекурсивным обходом иерархии страницы:

```
Page → Sections → Blocks → Components
```

Каждый элемент добавляется в индекс по своему `id`:

```typescript
function buildPageIndex(page: BaseElement): PageIndex {
  const index: PageIndex = {};
  addSubtreeToIndex(page, index); // page.id → page
  return index;
}
```

---

## PathResolver — Система адресации

Утилиты для работы с путями в объектах и парсинга target-адресов.

### Разрешение путей

| Метод                        | Описание                                              |
| ---------------------------- | ----------------------------------------------------- |
| `parse(path)`                | Разбить путь на части (`"a.b.c"` → `["a", "b", "c"]`) |
| `getValue(obj, path)`        | Получить значение по пути                             |
| `setValue(obj, path, value)` | Установить значение по пути                           |
| `hasPath(obj, path)`         | Проверить существование пути                          |

### Примеры

```typescript
// parse
PathResolver.parse("user.address.city");
// → ["user", "address", "city"]

// getValue
PathResolver.getValue({ user: { name: "John" } }, "user.name");
// → "John"

// setValue (создаёт промежуточные объекты)
const obj = {};
PathResolver.setValue(obj, "user.address.city", "Москва");
// obj = { user: { address: { city: "Москва" } } }

// hasPath
PathResolver.hasPath({ user: { name: "John" } }, "user.name");
// → true
```

### Парсинг target

```typescript
parseTarget(target: string): { elementId: string | null; statePath: string }
```

**Формат:** `[ELEMENT_ID.]state[.PATH.TO.FIELD]`

| target                   | elementId       | statePath     |
| ------------------------ | --------------- | ------------- |
| `ordersTable.state.data` | `ordersTable`   | `data`        |
| `state.feed.orders`      | `null` (page)   | `feed.orders` |
| `state.loading`          | `null` (page)   | `loading`     |
| `state`                  | `null` (page)   | `""`          |
| `usernameInput`          | `usernameInput` | `""`          |

**Алгоритм:**

1. Если первый сегмент = `state` → elementId = null, statePath = всё после `state`
2. Ищем `state` в пути → elementId = всё до `state`, statePath = всё после

---

## Component Rendering — Рендеринг компонентов

### Иерархия рендеринга

```
AppEngine
 └── PageRenderer
      └── SectionRenderer
           └── BlockRenderer
                └── ComponentRenderer
                     └── Component модули (16 файлов)
                          └── PrimeReact Component
```

### ComponentRenderer

ComponentRenderer определяет тип компонента и делегирует рендеринг специализированным модулям.

**Модульная структура (`src/engine/components/`):**

| Модуль                | Компоненты                                         |
| --------------------- | -------------------------------------------------- |
| `TextComponent`       | Text: H1, H2, H3, P                                |
| `InputComponents`     | InputText, InputNumber, InputTextarea, Password    |
| `SelectComponents`    | Dropdown, MultiSelect, AutoComplete, Calendar      |
| `ToggleComponents`    | Checkbox, RadioButton, InputSwitch, Slider, Rating |
| `MiscInputComponents` | ColorPicker, FileUpload                            |
| `ButtonComponent`     | Button                                             |
| `DataTableComponent`  | DataTable                                          |
| `CardComponent`       | Card                                               |
| `ToastComponent`      | Toast                                              |
| `NavComponents`       | Menubar, Breadcrumb, Steps                         |
| `ContainerComponents` | TabView, Accordion, Carousel                       |
| `DisplayComponents`   | Skeleton, Chip, Avatar, Badge, Tag                 |
| `ProgressComponents`  | ProgressBar, ProgressSpinner                       |
| `FeedbackComponents`  | Message, Divider, Timeline                         |
| `ChartComponent`      | Chart (line, pie, bar, doughnut, radar, polarArea) |

**Всего:** 16 модулей, покрывающих 40+ типов компонентов PrimeReact.

### Хук useComponentBindings

Для реактивной подписки на изменения state используется хук:

```typescript
function useComponentBindings(
  elementId: string,
  bindingPaths: string[],
): { needsReRender: boolean };
```

Хук парсит binding-строки (`@ELEMENT_ID.state.PATH`), подписывается через `Linkage.subscribe()`, и возвращает `needsReRender: true` при изменении зависимого state. React перерендеривает только этот компонент.

### ComponentContext

Провайдер контекста, передающий необходимые зависимости компонентам:

```typescript
// ComponentProvider оборачивает всё дерево рендеринга
<ComponentProvider
  pageId={currentPage.id}
  appConfig={config}
  stateManager={stateManager}
  elementIndex={resolvedIndex}
  showToast={showToast}
  navigate={navigate}
  confirm={confirm}
  refresh={refresh}
>
  <PageRenderer page={currentPage} />
</ComponentProvider>
```

### Оптимизация

- Компоненты без bindings не подписываются
- Фильтрация подписок — только изменения relevant bindings

---

## Event System — Система событий

### Привязка событий

События задаются в конфигурации компонентов:

```json
{
  "id": "submitBtn",
  "type": "Button",
  "events": [
    {
      "type": "onClick",
      "commands": [
        { "type": "sendRequest", "params": { ... } },
        { "type": "showToast", "params": { ... } }
      ]
    }
  ]
}
```

### eventData

При событии передаётся объект eventData:

```typescript
interface EventData {
  value?: any; // Значение компонента
  originalEvent?: any; // Оригинальное событие (React)
  [key: string]: any; // Дополнительные данные
}
```

**Доступ из команд:**

- `event.value` — значение компонента
- `event.data.items` — вложенные поля
- `event.*` — любой параметр через CommandExecutor

### Триггеры

| Триггер    | Когда срабатывает                  |
| ---------- | ---------------------------------- |
| `onClick`  | Клик по компоненту                 |
| `onChange` | Изменение значения (input, select) |
| `onSubmit` | Отправка формы                     |
| `onLoad`   | Загрузка компонента (монтирование) |
| `onUnload` | Размонтирование компонента         |

### Выполнение команд

Команды выполняются через `CommandExecutor.executeCommand()`:

1. Макросы разрешаются в params
2. Применяется форматирование (если задано)
3. Команда выполняется с eventData
4. При успехе → onSuccess
5. При ошибке → onError

---

## Взаимодействие модулей

```
                    ┌─────────────────┐
                    │   AppEngine     │
                    │  (роутинг, UI)  │
                    └────────┬────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
     ┌────────▼──────┐ ┌────▼──────┐ ┌─────▼──────┐
     │PageRenderer   │ │StateManager│ │MacroEngine │
     │SectionRenderer│ │            │ │            │
     │BlockRenderer  │ └────┬───────┘ └─────┬──────┘
     │ComponentRend.  │      │              │
     └────────┬───────┘      │              │
              │              │              │
              │       ┌──────▼──────┐       │
              │       │ElementIndex │       │
              │       │PathResolver │       │
              │       │Linkage      │       │
              │       └─────────────┘       │
              │              │              │
              │       ┌──────▼──────┐       │
              │       │CommandExec  │───────┘
              │       └──────┬──────┘
              │              │
              │       ┌──────▼──────┐
              │       │DataFeedSvc  │
              │       │DataAdapter  │
              │       │API Router   │
              │       └─────────────┘
```
