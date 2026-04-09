# CRM Platform — Configuration Reference

Полное описание всех параметров JSON-конфигурации CRM платформы, сгруппированных по типу элемента.

## Иерархия элементов

```
App (приложение)
 └── navbar — навигация
 └── pages[] — страницы
      └── sections[] — секции
           └── blocks[] — блоки
                └── components[] — компоненты
```

---

## 1. App (Приложение)

Корневой элемент конфигурации. Файл начинается с `{ "id": "crm", "type": "app", ... }`.

| Параметр | Тип | Обязательный | Описание |
|----------|-----|:------------:|----------|
| `id` | `string` | ✅ | Уникальный идентификатор приложения |
| `type` | `"app"` | ✅ | Тип элемента |
| `state` | `object` | | Состояние приложения (зарезервировано) |
| `navbar` | [`NavbarConfig`](#navbarconfig) | | Конфигурация бокового меню |
| `pages` | [`Page[]`](#2-page-страница) | ✅ | Массив страниц приложения |
| `globalState` | [`GlobalState`](#globalstate) | ✅ | Глобальное состояние |
| `config` | [`AppConfig`](#appconfig) | ✅ | Конфигурация приложения |

### NavbarConfig

Боковое меню навигации.

| Параметр | Тип | Обязательный | Описание |
|----------|-----|:------------:|----------|
| `id` | `string` | ✅ | Идентификатор навбара |
| `items` | [`NavItem[]`](#navitem) | ✅ | Пункты меню |

### NavItem

Один пункт меню навигации.

| Параметр | Тип | Обязательный | Описание |
|----------|-----|:------------:|----------|
| `label` | `string` | ✅ | Текст пункта |
| `icon` | `string` | ✅ | CSS-класс иконки PrimeIcons (напр. `"pi pi-home"`) |
| `route` | `string` | ✅ | Маршрут страницы (напр. `"/dashboard"`) |

### GlobalState

Глобальное состояние, доступное всем страницам.

| Параметр | Тип | Описание |
|----------|-----|----------|
| `user` | [`UserData`](#userdata) | Данные текущего пользователя |
| `auth` | [`AuthData`](#authdata) | Данные авторизации |
| `cache` | `object` | Кэш данных |

#### UserData

| Параметр | Тип | Описание |
|----------|-----|----------|
| `id` | `string` | ID пользователя |
| `name` | `string` | Имя |
| `email` | `string` | Email |
| `role` | `string` | Роль |
| `permissions` | `string[]` | Список прав |
| `avatar` | `string` | URL аватара |

#### AuthData

| Параметр | Тип | Описание |
|----------|-----|----------|
| `token` | `string` | JWT токен |
| `refreshToken` | `string` | Токен обновления |
| `expiresAt` | `number` | Время истечения (timestamp) |
| `isAuthenticated` | `boolean` | Флаг авторизации |

### AppConfig

Основные настройки приложения.

| Параметр | Тип | Обязательный | Описание |
|----------|-----|:------------:|----------|
| `name` | `string` | ✅ | Название приложения |
| `version` | `string` | ✅ | Версия |
| `api` | [`ApiConfig`](#apiconfig) | ✅ | Настройки API |
| `features` | [`FeatureFlags`](#featureflags) | | Флаги функциональности |

#### ApiConfig

| Параметр | Тип | Описание |
|----------|-----|----------|
| `baseURL` | `string` | Базовый URL API |
| `timeout` | `number` | Таймаут запросов (мс) |
| `headers` | `object` | Заголовки по умолчанию |
| `retryAttempts` | `number` | Количество повторов |
| `retryDelay` | `number` | Задержка между повторами (мс) |
| `endpoints` | `object` | Именованные эндпоинты |

#### EndpointConfig

| Параметр | Тип | Описание |
|----------|-----|----------|
| `path` | `string` | Путь эндпоинта |
| `method` | `"GET"\|"POST"\|"PUT"\|"PATCH"\|"DELETE"` | HTTP метод |
| `cache` | `boolean` | Кэшировать ответ |
| `cacheTTL` | `number` | Время жизни кэша (мс) |

#### FeatureFlags

Произвольные булевы флаги:

```json
{
  "darkMode": true,
  "apiAccess": true,
  "exportData": false
}
```

---

## 2. Page (Страница)

Страница приложения, доступна по маршруту.

| Параметр | Тип | Обязательный | Описание |
|----------|-----|:------------:|----------|
| `id` | `string` | ✅ | Уникальный ID страницы |
| `type` | `"page"` | ✅ | Тип элемента |
| `route` | `string` | ✅ | URL-маршрут (напр. `"/users"`) |
| `state` | `object` | | Состояние страницы |
| `sections` | [`Section[]`](#3-section-секция) | ✅ | Секции страницы |
| `layout` | [`LayoutConfig`](#layoutconfig) | | Макет страницы |
| `meta` | [`PageMeta`](#pagemeta) | | SEO-метаданные |
| `access` | [`AccessControl`](#accesscontrol) | | Контроль доступа |
| `onLoad` | [`Command[]`](#6-command-команда) | | Команды при загрузке |
| `onUnload` | [`Command[]`](#6-command-команда) | | Команды при выгрузке |
| `onError` | [`Command[]`](#6-command-команда) | | Команды при ошибке |

### PageMeta

| Параметр | Тип | Описание |
|----------|-----|----------|
| `title` | `string` | Заголовок страницы (`<title>`) |
| `description` | `string` | SEO-описание |
| `keywords` | `string[]` | Ключевые слова |
| `ogImage` | `string` | URL для Open Graph |
| `canonical` | `string` | Каноническая ссылка |
| `robots` | `string` | Директивы для роботов |

### AccessControl

| Параметр | Тип | Описание |
|----------|-----|----------|
| `roles` | `string[]` | Разрешённые роли |
| `permissions` | `string[]` | Требуемые права |
| `redirectTo` | `string` | Куда перенаправить при отказе |
| `customCheck` | `string` | Имя кастомной функции проверки |

---

## 3. Section (Секция)

Горизонтальная или вертикальная область на странице, группирующая блоки.

| Параметр | Тип | Обязательный | Описание |
|----------|-----|:------------:|----------|
| `id` | `string` | ✅ | Уникальный ID в рамках страницы |
| `type` | `"section"` | ✅ | Тип элемента |
| `state` | `object` | | Состояние секции |
| `blocks` | [`Block[]`](#4-block-блок) | ✅ | Блоки секции |
| `layout` | [`LayoutConfig`](#layoutconfig) | | Макет секции |
| `visibility` | [`VisibilityRule`](#visibilityrule) | | Правила видимости |
| `className` | `string` | | CSS-класс |
| `style` | `object` | | Inline-стили |
| `anchor` | `string` | | Якорь для навигации |

### VisibilityRule

| Параметр | Тип | Описание |
|----------|-----|----------|
| `conditions` | [`Condition[]`](#condition) | Условия видимости |
| `defaultVisible` | `boolean` | Видима по умолчанию |

### Condition

| Параметр | Тип | Описание |
|----------|-----|----------|
| `path` | `string` | Путь к проверяемому значению |
| `operator` | [`ConditionOperator`](#conditionoperator) | Оператор сравнения |
| `value` | `any` | Значение для сравнения |
| `logicalOp` | `"AND"\|"OR"` | Логическая операция с next |
| `next` | `Condition` | Следующее условие |

#### ConditionOperator

`"=="`, `"!="`, `">"`, `"<"`, `">="`, `"<="`, `"includes"`, `"notIncludes"`, `"exists"`, `"notExists"`, `"isEmpty"`, `"isNotEmpty"`, `"matches"`, `"startsWith"`, `"endsWith"`

---

## 4. Block (Блок)

Контейнер для компонентов внутри секции.

| Параметр | Тип | Обязательный | Описание |
|----------|-----|:------------:|----------|
| `id` | `string` | ✅ | Уникальный ID в рамках секции |
| `type` | `"block"` | ✅ | Тип элемента |
| `blockType` | [`BlockType`](#blocktype) | ✅ | Тип блока |
| `state` | `object` | | Состояние блока |
| `components` | [`Component[]`](#5-component-компонент) | ✅ | Компоненты блока |
| `layout` | [`LayoutConfig`](#layoutconfig) | | Макет блока |
| `className` | `string` | | CSS-класс |
| `style` | `object` | | Inline-стили |
| `wrapper` | [`WrapperConfig`](#wrapperconfig) | | Обёртка блока |

### BlockType

| Значение | Описание |
|----------|----------|
| `"header"` | Шапка с логотипом, меню |
| `"hero"` | Геройский блок с крупным контентом |
| `"stats"` | Статистические карточки |
| `"table"` | Таблица с данными |
| `"form"` | Форма ввода |
| `"card-grid"` | Сетка карточек |
| `"sidebar"` | Боковая панель |
| `"footer"` | Подвал |
| `"tabs"` | Вкладки |
| `"wizard"` | Пошаговая форма |
| `"kanban"` | Канбан-доска |
| `"timeline"` | Временная шкала |
| `"chat"` | Чат-интерфейс |
| `"dashboard-widget"` | Виджет дашборда |
| `"custom"` | Произвольный блок |

### WrapperConfig

| Параметр | Тип | Описание |
|----------|-----|----------|
| `component` | `"Card"\|"Panel"\|"Fieldset"\|"Toolbar"\|"div"` | Тип обёртки |
| `props` | `object` | Пропсы обёртки (напр. `{ "header": "Title" }`) |

---

## 5. Component (Компонент)

Атомарный элемент UI на базе PrimeReact.

| Параметр | Тип | Обязательный | Описание |
|----------|-----|:------------:|----------|
| `id` | `string` | ✅ | Уникальный ID в рамках блока |
| `type` | `"component"` | ✅ | Тип элемента |
| `componentType` | [`ComponentType`](#componenttype) | ✅ | Тип PrimeReact компонента |
| `state` | `object` | | Состояние компонента |
| `props` | `object` | | Пропсы компонента |
| `bindings` | [`DataBinding[]`](#databinding) | | Привязки данных |
| `validation` | [`ValidationRule[]`](#validationrule) | | Правила валидации |
| `events` | [`EventHandler[]`](#eventhandler) | | Обработчики событий |
| `className` | `string` | | CSS-класс |
| `style` | `object` | | Inline-стили |

### ComponentType

#### Формы
`InputText`, `InputNumber`, `InputTextarea`, `Password`, `Dropdown`, `MultiSelect`, `AutoComplete`, `Calendar`, `Checkbox`, `RadioButton`, `InputSwitch`, `Slider`, `Rating`, `ColorPicker`, `FileUpload`

#### Кнопки
`Button`, `SplitButton`, `SpeedDial`

#### Данные
`DataTable`, `TreeTable`, `DataView`, `PickList`, `OrderList`, `Tree`, `Timeline`

#### Панели
`Card`, `Panel`, `Fieldset`, `Toolbar`, `Accordion`, `TabView`, `ScrollPanel`, `Divider`

#### Оверлеи
`Dialog`, `Sidebar`, `OverlayPanel`, `ConfirmDialog`, `Toast`

#### Меню
`Menubar`, `Menu`, `TieredMenu`, `Breadcrumb`, `Steps`, `TabMenu`, `PanelMenu`

#### Графики
`Chart`

#### Медиа
`Image`, `Galleria`, `Carousel`

#### Сообщения
`Message`, `Messages`, `InlineMessage`

#### Разное
`ProgressBar`, `ProgressSpinner`, `Badge`, `Tag`, `Chip`, `Avatar`, `AvatarGroup`, `Skeleton`

#### Кастомные
`Text`, `HTML`, `Icon`, `Spacer`, `Container`

### DataBinding

| Параметр | Тип | Описание |
|----------|-----|----------|
| `source` | `string` | Путь к источнику данных (`pageId.sectionId.state.field`) |
| `target` | `string` | Куда записывать (`props.value`, `state.data`) |
| `transform` | [`TransformFunction`](#transformfunction) | Функция трансформации |
| `mode` | `"one-way"\|"two-way"` | Режим привязки |
| `debounce` | `number` | Задержка для two-way (мс) |

#### TransformFunction

`"identity"`, `"toString"`, `"toNumber"`, `"toBoolean"`, `"toDate"`, `"toArray"`, `"toObject"`, `"jsonParse"`, `"jsonStringify"`, `"uppercase"`, `"lowercase"`, `"trim"`, `"length"`, `"reverse"`, `"sort"`, `"filter"`, `"map"`, `"first"`, `"last"`, `"sum"`, `"average"`, `"min"`, `"max"`, `{ "custom": "functionName" }`

### ValidationRule

| Параметр | Тип | Описание |
|----------|-----|----------|
| `type` | [`ValidationType`](#validationtype) | Тип валидации |
| `message` | `string` | Сообщение об ошибке |
| `params` | `object` | Дополнительные параметры |

#### ValidationType

`"required"`, `"email"`, `"url"`, `"pattern"`, `"min"`, `"max"`, `"minLength"`, `"maxLength"`, `"custom"`

### EventHandler

| Параметр | Тип | Описание |
|----------|-----|----------|
| `event` | [`EventType`](#eventtype) | Тип события |
| `commands` | [`Command[]`](#6-command-команда) | Команды для выполнения |
| `preventDefault` | `boolean` | Отменить действие по умолчанию |
| `stopPropagation` | `boolean` | Остановить всплытие |

#### EventType

`onClick`, `onChange`, `onFocus`, `onBlur`, `onSubmit`, `onSelect`, `onUpload`, `onRowClick`, `onRowSelect`, `onPageChange`, `onSort`, `onFilter`, `onExpand`, `onCollapse`, `onHide`, `onShow`

---

## 6. Command (Команда)

Действие, выполняемое при событии или триггере.

| Параметр | Тип | Обязательный | Описание |
|----------|-----|:------------:|----------|
| `id` | `string` | ✅ | Уникальный ID команды |
| `type` | [`CommandType`](#commandtype) | ✅ | Тип команды |
| `params` | `object` | ✅ | Параметры команды |
| `description` | `string` | | Описание |
| `trigger` | [`CommandTrigger`](#commandtrigger) | | Триггер выполнения |
| `conditions` | [`Condition[]`](#condition) | | Условия выполнения |
| `onSuccess` | `Command[]` | | Команды при успехе |
| `onError` | `Command[]` | | Команды при ошибке |
| `timeout` | `number` | | Таймаут (мс) |
| `retry` | [`RetryConfig`](#retryconfig) | | Настройки повторов |

### CommandType

| Группа | Команды |
|--------|---------|
| Состояние | `setState`, `mergeState`, `clearState`, `toggleState` |
| Данные | `apiRequest`, `getData`, `setData`, `transformData`, `validateData` |
| Навигация | `navigate`, `goBack`, `goForward`, `scrollTo`, `openUrl` |
| UI | `showDialog`, `hideDialog`, `showToast`, `confirm` |
| Поток | `sequence`, `parallel`, `conditional`, `loop`, `delay`, `debounce`, `throttle` |
| Утилиты | `log`, `emit`, `custom` |

### CommandTrigger

| Параметр | Тип | Описание |
|----------|-----|----------|
| `type` | [`TriggerType`](#triggertype) | Тип триггера |
| `delay` | `number` | Задержка (мс) |
| `interval` | `number` | Интервал для периодического |
| `condition` | `Condition` | Условие срабатывания |

#### TriggerType

`onLoad`, `onUnload`, `onClick`, `onChange`, `onSubmit`, `onTimer`, `onCondition`, `manual`

### RetryConfig

| Параметр | Тип | Описание |
|----------|-----|----------|
| `attempts` | `number` | Количество попыток |
| `delay` | `number` | Задержка между попытками (мс) |
| `backoff` | `"linear"\|"exponential"` | Стратегия увеличения задержки |

---

## 7. Общие типы

### LayoutConfig

Конфигурация макета элемента.

| Параметр | Тип | Описание |
|----------|-----|----------|
| `type` | `"grid"\|"flex"\|"stack"\|"custom"` | Тип макета |
| `direction` | `"row"\|"column"` | Направление (flex) |
| `gap` | `number\|string` | Отступ между элементами |
| `padding` | `number\|string` | Внутренний отступ |
| `columns` | `number` | Количество колонок (grid) |
| `rows` | `number` | Количество рядов (grid) |
| `alignItems` | `"start"\|"center"\|"end"\|"stretch"` | Выравнивание по оси |
| `justifyContent` | `"start"\|"center"\|"end"\|"between"\|"around"` | Распределение |

#### Примеры LayoutConfig

**Grid 4 колонки:**
```json
{ "type": "grid", "columns": 4, "gap": "1rem" }
```

**Flex-строка с выравниванием:**
```json
{ "type": "flex", "direction": "row", "alignItems": "center", "justifyContent": "between" }
```

**Flex-колонка:**
```json
{ "type": "flex", "direction": "column", "gap": "16px" }
```

### ElementMeta

Метаданные любого элемента.

| Параметр | Тип | Описание |
|----------|-----|----------|
| `version` | `string` | Версия элемента |
| `createdAt` | `string` | Дата создания (ISO 8601) |
| `updatedAt` | `string` | Дата обновления |
| `author` | `string` | Автор |
| `description` | `string` | Описание |
| `tags` | `string[]` | Теги для поиска |

---

## Система адресации

Пути строятся от корня через точку:

| Паттерн | Пример | Описание |
|---------|--------|----------|
| Страница | `dashboard` | Страница dashboard |
| Секция | `dashboard.header` | Секция header на dashboard |
| Блок | `dashboard.header.logo` | Блок logo в секции header |
| Компонент | `dashboard.header.logo.image` | Компонент image |
| Состояние | `dashboard.header.state.visible` | Поле visible в state секции |
| Глобальное | `global.user.name` | Имя пользователя |

### Относительные пути

Из команды компонента:
- `"../state.data"` — состояние родительского блока
- `"../../state.users"` — состояние секции
- `"./state.value"` — собственное состояние

### Wildcard-селекторы

- `"*.section1.state.visible"` — visible всех section1
- `"dashboard.*.state.loading"` — loading всех секций на dashboard

---

## Минимальный пример

```json
{
  "id": "myapp",
  "type": "app",
  "navbar": {
    "id": "mainNav",
    "items": [
      { "label": "Home", "icon": "pi pi-home", "route": "/" }
    ]
  },
  "pages": [
    {
      "id": "home",
      "type": "page",
      "route": "/",
      "sections": [
        {
          "id": "main",
          "type": "section",
          "blocks": [
            {
              "id": "content",
              "type": "block",
              "blockType": "custom",
              "components": [
                {
                  "id": "title",
                  "type": "component",
                  "componentType": "Text",
                  "props": { "value": "Hello", "level": 1 }
                }
              ]
            }
          ]
        }
      ]
    }
  ],
  "globalState": {},
  "config": {
    "name": "My App",
    "version": "1.0.0",
    "api": { "baseURL": "http://localhost:3001/api" }
  }
}
```
