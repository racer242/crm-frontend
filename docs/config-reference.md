# Справочник конфигурации CRM Platform

Полное описание всех параметров конфигурации с примерами.

---

## 1. App (Приложение)

Корневой элемент конфигурации. Определяет глобальные настройки приложения.

### Параметры

| Параметр   | Тип                   | Описание                                     | Обязательно |
| ---------- | --------------------- | -------------------------------------------- | ----------- |
| `id`       | `string`              | Уникальный ID приложения                     | ✅          |
| `type`     | `"app"`               | Тип элемента                                 | ✅          |
| `title`    | `string`              | Заголовок приложения (отображается в header) | ✅          |
| `state`    | `Record<string, any>` | Глобальное состояние приложения              | ❌          |
| `pages`    | `Page[]`              | Массив страниц                               | ✅          |
| `navbar`   | `NavbarConfig`        | Конфигурация боковой панели                  | ❌          |
| `userMenu` | `UserMenuConfig`      | Конфигурация меню пользователя               | ❌          |
| `adapters` | `Record<string, ...>` | Адаптеры данных (replace, js)                | ❌          |
| `config`   | `AppConfig`           | Конфигурация приложения                      | ✅          |

### Пример

```json
{
  "id": "crm",
  "type": "app",
  "title": "CRM Platform",
  "state": {},
  "navbar": { ... },
  "userMenu": { ... },
  "pages": [{ "$ref": "./pages/dashboard.json" }],
  "config": { ... }
}
```

### NavbarConfig

| Параметр | Тип         | Описание              |
| -------- | ----------- | --------------------- |
| `id`     | `string`    | Уникальный ID навбара |
| `items`  | `NavItem[]` | Пункты навигации      |

### NavItem

| Параметр    | Тип       | Описание                                      |
| ----------- | --------- | --------------------------------------------- |
| `label`     | `string`  | Текст пункта                                  |
| `icon`      | `string`  | CSS-класс иконки (например, `pi pi-home`)     |
| `route`     | `string`  | Маршрут для перехода (например, `/dashboard`) |
| `separator` | `boolean` | Показать разделитель                          |

### AppConfig

| Параметр      | Тип                       | Описание                             |
| ------------- | ------------------------- | ------------------------------------ |
| `name`        | `string`                  | Имя приложения                       |
| `version`     | `string`                  | Версия приложения                    |
| `indexPageId` | `string`                  | ID страницы для маршру `/`           |
| `api`         | `ApiConfig`               | Настройки API (baseURL, timeout)     |
| `features`    | `Record<string, boolean>` | Флаги функциональности               |
| `apiRoutes`   | `ApiRouteConfig[]`        | Маршруты API (path → url)            |
| `locale`      | `LocaleConfig`            | Настройки локали (default, fallback) |

### indexPageId

Специальный параметр для определения страницы, которая загружается при访问 `/` (корневой маршрут).

```json
{
  "config": {
    "indexPageId": "dashboard"
  }
}
```

При открытии `/` система находит страницу с `id: "dashboard"` и загружает её.

---

## 2. Page (Страница)

Страница приложения с уникальным маршрутом.

### Параметры

| Параметр   | Тип                   | Описание                              | Обязательно |
| ---------- | --------------------- | ------------------------------------- | ----------- |
| `id`       | `string`              | Уникальный ID страницы                | ✅          |
| `type`     | `"page"`              | Тип элемента                          | ✅          |
| `route`    | `string`              | Маршрут страницы (например, `/users`) | ✅          |
| `state`    | `Record<string, any>` | Начальное состояние страницы          | ❌          |
| `meta`     | `PageMeta`            | Метаданные (title, description)       | ❌          |
| `sections` | `Section[]`           | Секции страницы                       | ❌          |
| `dataFeed` | `DataFeedConfig[]`    | Запросы API при загрузке страницы     | ❌          |
| `access`   | `AccessControl`       | Контроль доступа                      | ❌          |

### Пример

```json
{
  "id": "dashboard",
  "type": "page",
  "route": "/",
  "state": {
    "loading": false,
    "initialized": true
  },
  "meta": {
    "title": "Dashboard — CRM Platform"
  },
  "dataFeed": [
    {
      "url": "/api/get-stats",
      "method": "GET",
      "target": "state.stats"
    }
  ],
  "sections": [ ... ]
}
```

### PageMeta

| Параметр      | Тип      | Описание                        |
| ------------- | -------- | ------------------------------- |
| `title`       | `string` | Заголовок страницы (HTML title) |
| `description` | `string` | Описание страницы               |

### AccessControl

| Параметр      | Тип        | Описание               |
| ------------- | ---------- | ---------------------- |
| `roles`       | `string[]` | Разрешённые роли       |
| `permissions` | `string[]` | Необходимые разрешения |

---

## 3. Section (Секция)

Секция страницы — контейнер для блоков с layout.

### Параметры

| Параметр  | Тип                       | Описание             | Обязательно |
| --------- | ------------------------- | -------------------- | ----------- |
| `id`      | `string`                  | Уникальный ID секции | ✅          |
| `type`    | `"section"`               | Тип элемента         | ✅          |
| `state`   | `Record<string, any>`     | Состояние секции     | ❌          |
| `layout`  | `LayoutConfig`            | Конфигурация макета  | ❌          |
| `blocks`  | `Block[]`                 | Блоки внутри секции  | ❌          |
| `visible` | `boolean\|VisibilityRule` | Условие видимости    | ❌          |

### LayoutConfig

| Параметр         | Тип                                                     | Описание                      |
| ---------------- | ------------------------------------------------------- | ----------------------------- |
| `type`           | `"grid"`, `"flex"`, `"stack"`, `"custom"`               | Тип макета                    |
| `direction`      | `"row"`, `"column"`                                     | Направление flex-контейнера   |
| `gap`            | `number`, `string`                                      | Отступы между элементами      |
| `columns`        | `number`                                                | Количество колонок (для grid) |
| `rows`           | `number`                                                | Количество строк (для grid)   |
| `alignItems`     | `"start"`, `"center"`, `"end"`, `"stretch"`             | Выравнивание по вертикали     |
| `justifyContent` | `"start"`, `"center"`, `"end"`, `"between"`, `"around"` | Выравнивание по горизонтали   |

---

## 4. Block (Блок)

Блок — контейнер для компонентов с обёрткой.

### Параметры

| Параметр     | Тип                       | Описание                                     | Обязательно |
| ------------ | ------------------------- | -------------------------------------------- | ----------- |
| `id`         | `string`                  | Уникальный ID блока                          | ✅          |
| `type`       | `"block"`                 | Тип элемента                                 | ✅          |
| `blockType`  | `string`                  | Тип блока (content, header, sidebar, и т.д.) | ❌          |
| `state`      | `Record<string, any>`     | Состояние блока                              | ❌          |
| `wrapper`    | `WrapperConfig`           | Настройки обёртки (Card, Panel, и т.д.)      | ❌          |
| `components` | `Component[]`             | Компоненты внутри блока                      | ❌          |
| `visible`    | `boolean\|VisibilityRule` | Условие видимости                            | ❌          |

### WrapperConfig

| Параметр    | Тип       | Описание                                    |
| ----------- | --------- | ------------------------------------------- |
| `type`      | `string`  | Тип обёртки (card, panel, fieldset, и т.д.) |
| `header`    | `string`  | Заголовок обёртки                           |
| `collapsed` | `boolean` | Начальное состояние (свёрнут)               |

---

## 5. Component (Компонент)

UI-компонент PrimeReact.

### Параметры

| Параметр    | Тип                       | Описание                                   | Обязательно |
| ----------- | ------------------------- | ------------------------------------------ | ----------- |
| `id`        | `string`                  | Уникальный ID компонента                   | ✅          |
| `type`      | `ComponentType`           | Тип компонента (InputText, Button, и т.д.) | ✅          |
| `props`     | `Record<string, any>`     | Props компонента                           | ❌          |
| `value`     | `any`                     | Значение (с поддержкой линковки `@...`)    | ❌          |
| `events`    | `EventConfig[]`           | Обработчики событий                        | ❌          |
| `visible`   | `boolean\|VisibilityRule` | Условие видимости                          | ❌          |
| `className` | `string`                  | CSS-классы                                 | ❌          |
| `style`     | `Record<string, any>`     | Inline-стили                               | ❌          |

### ComponentType

| Категория       | Типы                                                                                                                                                                        |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Формы**       | InputText, InputNumber, InputTextarea, Password, Dropdown, MultiSelect, AutoComplete, Calendar, Checkbox, RadioButton, InputSwitch, Slider, Rating, ColorPicker, FileUpload |
| **Кнопки**      | Button, SplitButton                                                                                                                                                         |
| **Данные**      | DataTable                                                                                                                                                                   |
| **Панели**      | Card, Panel, Fieldset, Toolbar, TabView, Accordion                                                                                                                          |
| **Меню**        | Menubar, Breadcrumb, Steps                                                                                                                                                  |
| **Графики**     | Chart                                                                                                                                                                       |
| **Отображение** | Avatar, Badge, Tag, Chip, Skeleton, ProgressBar, ProgressSpinner, Message, Divider, Timeline, Text                                                                          |

### EventConfig

| Параметр   | Тип         | Описание                        |
| ---------- | ----------- | ------------------------------- |
| `type`     | `string`    | Тип события (onClick, onChange) |
| `commands` | `Command[]` | Команды для выполнения          |

---

## 6. Command (Команда)

Действие, выполняемое при событии компонента.

### Параметры

| Параметр     | Тип                   | Описание              | Обязательно |
| ------------ | --------------------- | --------------------- | ----------- |
| `id`         | `string`              | Уникальный ID команды | ❌          |
| `type`       | `CommandType`         | Тип команды           | ✅          |
| `params`     | `Record<string, any>` | Параметры команды     | ✅          |
| `trigger`    | `CommandTrigger`      | Условия выполнения    | ❌          |
| `conditions` | `Condition[]`         | Условия-фильтры       | ❌          |
| `onSuccess`  | `Command[]`           | Команды при успехе    | ❌          |
| `onError`    | `Command[]`           | Команды при ошибке    | ❌          |

### CommandType

| Команда          | Описание                                                         |
| ---------------- | ---------------------------------------------------------------- |
| `setProperty`    | Запись значения из source в target                               |
| `setState`       | Полная замена состояния элемента                                 |
| `mergeState`     | Слияние данных с текущим состоянием                              |
| `clearState`     | Очистка состояния элемента                                       |
| `toggleProperty` | Инвертирование boolean-поля                                      |
| `sendRequest`    | HTTP-запрос к API с записью результата в state                   |
| `showToast`      | Показ Toast-уведомления                                          |
| `navigate`       | Переход по URL                                                   |
| `confirm`        | Диалог подтверждения с ветвлением (onConfirm/onCancel)           |
| `delay`          | Пауза в последовательности команд (мс)                           |
| `sequence`       | Последовательное выполнение нескольких команд                    |
| `log`            | Логирование в консоль (info, warn, error, debug)                 |
| `setUrlParams`   | Заменяет все URL параметры                                       |
| `mergeUrlParams` | Обновляет/добавляет URL параметры (сохраняет существующие)       |
| `setUrlParam`    | Изменяет один URL параметр                                       |
| `removeUrlParam` | Удаляет URL параметр                                             |
| `refresh`        | Обновление страницы (mode: `"refresh"`, `"replace"`, `"reload"`) |

### Источники данных (source)

| Формат                    | Описание                        |
| ------------------------- | ------------------------------- |
| `"event.value"`           | Значение из события (eventData) |
| `"event.field.subfield"`  | Вложенное поле из eventData     |
| `"elementId.state.field"` | State другого элемента          |
| `"state.field"`           | State текущей страницы          |

### Целевые пути (target)

| Формат                    | Описание                           |
| ------------------------- | ---------------------------------- |
| `"state.field"`           | Запись в state страницы            |
| `"elementId.state.field"` | Запись в state указанного элемента |
| `"field"`                 | Запись в state компонента-триггера |

### Особые правила target

- `"state"` (без элемента) — корневой state страницы (pageId)
- `"state.field"` — поле в state страницы
- `"elementId.state.field"` — поле в state указанного элемента
- `"field"` (без "state") — state компонента-триггера

---

## 7. Data Feed

Загрузка данных из внешних API.

### DataFeedConfig

| Параметр   | Тип       | Описание                                   |
| ---------- | --------- | ------------------------------------------ |
| `url`      | `string`  | URL API-эндпоинта (с поддержкой макросов)  |
| `method`   | `string`  | HTTP-метод (GET, POST, PUT, PATCH, DELETE) |
| `data`     | `object`  | Данные запроса (с поддержкой макросов)     |
| `target`   | `string`  | Куда записать результат                    |
| `adapter`  | `string`  | ID адаптера для трансформации ответа       |
| `cache`    | `boolean` | Включить кэширование (пока не реализовано) |
| `cacheTTL` | `number`  | Время жизни кэша в мс                      |

### Адаптеры

Определяются в корне конфига (`adapters`):

| Тип       | Описание                                        |
| --------- | ----------------------------------------------- |
| `replace` | Словарная замена имён свойств и их значений     |
| `js`      | JS-скрипт для произвольной трансформации данных |

---

## 8. Общие типы

### ElementMeta

| Параметр      | Тип        | Описание              |
| ------------- | ---------- | --------------------- |
| `version`     | `string`   | Версия элемента       |
| `createdAt`   | `string`   | Дата создания (ISO)   |
| `updatedAt`   | `string`   | Дата обновления (ISO) |
| `author`      | `string`   | Автор                 |
| `description` | `string`   | Описание              |
| `tags`        | `string[]` | Теги                  |

### Condition

| Параметр    | Тип             | Описание                           |
| ----------- | --------------- | ---------------------------------- |
| `path`      | `string`        | Путь к проверяемому значению       |
| `operator`  | `string`        | Оператор (`==`, `!=`, `>`, и т.д.) |
| `value`     | `any`           | Значение для сравнения             |
| `logicalOp` | `"AND"`, `"OR"` | Логическая операция                |

### VisibilityRule

| Параметр         | Тип           | Описание               |
| ---------------- | ------------- | ---------------------- |
| `conditions`     | `Condition[]` | Условия видимости      |
| `defaultVisible` | `boolean`     | Видимость по умолчанию |

---

## 9. Макросы

Формат: `{$PREFIX.PATH.TO.FIELD}`

| Префикс                     | Описание                               |
| --------------------------- | -------------------------------------- |
| `{$ELEMENT_ID.state.PATH}`  | State элемента                         |
| `{$state.PATH}`             | State страницы                         |
| `{$config.PATH}`            | Конфиг приложения                      |
| `{$location.PATH_PARAMS.N}` | N-й сегмент path (после matched route) |
| `{$location.params.KEY}`    | Query-параметр URL                     |
| `{$env.VAR}`                | Переменная окружения                   |

### location.pathParams

При использовании fallback route matching, pathParams содержат сегменты пути после найденного маршрута.

**Пример:**

- URL: `/users/312`
- Page route: `/users`
- `{$location.pathParams.0}` → `"312"`

---

## 10. Адресация элементов

### Формат пути

| Формат                  | Описание                |
| ----------------------- | ----------------------- |
| `ELEMENT_ID`            | Прямой доступ по ID     |
| `ELEMENT_ID.state`      | Полное state элемента   |
| `ELEMENT_ID.state.PATH` | Конкретное поле state   |
| `state.PATH`            | State текущей страницы  |
| `.state.PATH`           | State текущего элемента |

### Примеры

```
dashboard.mainContent.statsCard.state.data
state.loading
.state.value
```
