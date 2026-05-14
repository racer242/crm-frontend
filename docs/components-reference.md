# Компоненты — Справочник

Документация по всем реализованным компонентам системы. Каждый компонент — это render-функция, вызываемая из `ComponentRenderer` по `componentType`.

---

## Структура

```
{
  "id": "string",
  "type": "component",
  "componentType": "ComponentType",
  "value": any,               // основное значение (может быть binding: "@state.field")
  "props": { ... },           // пропсы, специфичные для компонента + binding поддержка
  "className": "string",      // CSS классы PrimeFlex
  "style": { ... },           // inline-стили
  "events": [                 // обработчики событий
    {
      "type": "onChange",
      "commands": [ ... ]     // команды CommandExecutor
    }
  ],
  "state": { ... }            // начальное состояние элемента
}
```

### Общие пропсы для всех компонентов форм

| Пропс    | Тип      | По умолчанию  | Описание                              |
| -------- | -------- | ------------- | ------------------------------------- |
| `inline` | `string` | `undefined`   | Если `"true"` — убирает класс `field` |
| `value`  | `any`    | см. компонент | Текущее значение                      |

### Общие события

| Событие      | Значение `event.value` | Описание              |
| ------------ | ---------------------- | --------------------- |
| `onChange`   | новое значение         | Изменение значения    |
| `onClick`    | event-объект           | Клик                  |
| `onFocus`    | event-объект           | Фокус                 |
| `onBlur`     | event-объект           | Потеря фокуса         |
| `onHide`     | `false`                | Закрытие оверлея      |
| `onNavigate` | `{type, commands}`     | Навигация по меню     |
| `onPage`     | событие пагинации      | Смена страницы (lazy) |

---

## Текстовые компоненты

### Text (`"componentType": "Text"`)

Рендер заголовков h1-h3 или параграфа.

| Пропс   | Тип      | По умолч. | Описание               |
| ------- | -------- | --------- | ---------------------- |
| `value` | `string` | —         | Текст                  |
| `level` | `number` | (нет)     | 1 → h1, 2 → h2, 3 → h3 |

---

## Формы — Input

### InputText (`"componentType": "InputText"`)

Однострочное текстовое поле на основе `primereact/inputtext`.

| Пропс                | Тип      | По умолч. | Описание                         |
| -------------------- | -------- | --------- | -------------------------------- |
| `placeholder`        | `string` | —         | Плейсхолдер                      |
| `inline`             | `string` | —         | `"true"` → убирает класс `field` |
| Все пропсы InputText | —        | —         | См. PrimeReact docs              |

**События:** `onChange` → `{ value: e.target.value }`

---

### InputNumber (`"componentType": "InputNumber"`)

Числовое поле на основе `primereact/inputnumber`.

| Пропс                                     | Тип      | По умолч. | Описание                         |
| ----------------------------------------- | -------- | --------- | -------------------------------- |
| `min` / `max`                             | `number` | —         | Границы значения                 |
| `step`                                    | `number` | —         | Шаг                              |
| `minFractionDigits` / `maxFractionDigits` | `number` | —         | Количество знаков после запятой  |
| `mode`                                    | `string` | `decimal` | `"currency"`, `"decimal"`        |
| `currency`                                | `string` | —         | Валюта (`"RUB"`, `"USD"`)        |
| `inline`                                  | `string` | —         | `"true"` → убирает класс `field` |
| Все пропсы InputNumber                    | —        | —         | См. PrimeReact docs              |

**События:** `onChange` → `{ value: e.value }`

---

### InputTextarea (`"componentType": "InputTextarea"`)

Многострочное текстовое поле на основе `primereact/inputtextarea`.

| Пропс                    | Тип       | По умолч. | Описание                         |
| ------------------------ | --------- | --------- | -------------------------------- |
| `rows`                   | `number`  | —         | Количество строк                 |
| `autoResize`             | `boolean` | —         | Авто-расширение                  |
| `inline`                 | `string`  | —         | `"true"` → убирает класс `field` |
| Все пропсы InputTextarea | —         | —         | См. PrimeReact docs              |

**События:** `onChange` → `{ value: e.target.value }`

---

### Password (`"componentType": "Password"`)

Поле ввода пароля с переключателем видимости на основе `primereact/password`.

| Пропс               | Тип       | По умолч. | Описание                         |
| ------------------- | --------- | --------- | -------------------------------- |
| `toggleMask`        | `boolean` | —         | Показать кнопку переключения     |
| `feedback`          | `boolean` | —         | Индикатор сложности              |
| `inline`            | `string`  | —         | `"true"` → убирает класс `field` |
| Все пропсы Password | —         | —         | См. PrimeReact docs              |

**События:** `onChange` → `{ value: e.target.value }`

---

### InputTextWithThrottle (`"componentType": "InputTextWithThrottle"`)

InputText с **задержкой вызова `onChange`**. Полезно для поиска с автопоиском — событие генерируется не на каждый символ, а после паузы в наборе.

| Пропс           | Тип      | По умолч. | Описание                         |
| --------------- | -------- | --------- | -------------------------------- |
| `throttleDelay` | `number` | `300`     | Задержка в мс                    |
| `placeholder`   | `string` | —         | Плейсхолдер                      |
| `inline`        | `string` | —         | `"true"` → убирает класс `field` |

**События:** `onChange` → `{ value: текст }` (через `throttleDelay` мс после последнего ввода)

**Особенности:**

- Локальное состояние обновляется мгновенно
- Внешний `value` синхронизируется при изменении
- Таймер очищается при размонтировании

**Пример:**

```json
{
  "id": "searchInput",
  "componentType": "InputTextWithThrottle",
  "props": {
    "throttleDelay": 500,
    "placeholder": "Поиск...",
    "inline": "true"
  },
  "events": [
    {
      "type": "onChange",
      "commands": [
        {
          "type": "sendRequest",
          "params": {
            "url": "/api/search",
            "data": { "q": "{$event.value}" },
            "target": "state.searchResults"
          }
        }
      ]
    }
  ]
}
```

---

### InputTextWithButton (`"componentType": "InputTextWithButton"`)

InputText с прикреплённой кнопкой справа, объединённые в группу (стиль PrimeReact `p-inputgroup`).

| Пропс    | Тип      | По умолч. | Описание                         |
| -------- | -------- | --------- | -------------------------------- |
| `button` | `object` | —         | Конфигурация кнопки (см. ниже)   |
| `inline` | `string` | —         | `"true"` → убирает класс `field` |

**Поля `button`:**

| Поле              | Тип       | По умолч.      | Описание                                                               |
| ----------------- | --------- | -------------- | ---------------------------------------------------------------------- |
| `icon`            | `string`  | `pi pi-search` | Иконка кнопки                                                          |
| `label`           | `string`  | —              | Текст кнопки                                                           |
| `severity`        | `string`  | `"primary"`    | `"success"`, `"info"`, `"warning"`, `"danger"`, `"help"`, `"contrast"` |
| `outlined`        | `boolean` | `true`         | Контурный стиль                                                        |
| `size`            | `string`  | —              | `"small"`, `"large"`                                                   |
| `className`       | `string`  | —              | Дополнительный CSS класс                                               |
| Все пропсы Button | —         | —              | См. PrimeReact docs                                                    |

**События:**

- `onChange` (поле ввода) → `{ value: e.target.value }`
- `onClick` (кнопка) → `{ value: текущее значение поля }`

**Пример:**

```json
{
  "id": "searchInput",
  "componentType": "InputTextWithButton",
  "props": {
    "placeholder": "Быстрый поиск...",
    "inline": "true",
    "button": {
      "icon": "pi pi-search",
      "size": "small",
      "outlined": true
    }
  },
  "events": [
    {
      "type": "onChange",
      "commands": [
        {
          "type": "log",
          "params": { "message": "{$event.value}" }
        }
      ]
    },
    {
      "type": "onClick",
      "commands": [
        {
          "type": "sendRequest",
          "params": {
            "url": "/api/search?q={$event.value}",
            "target": "state.searchResults"
          }
        }
      ]
    }
  ]
}
```

---

## Формы — Select

### Dropdown (`"componentType": "Dropdown"`)

Выпадающий список на основе `primereact/dropdown`.

| Пропс               | Тип       | По умолч. | Описание                         |
| ------------------- | --------- | --------- | -------------------------------- |
| `options`           | `array`   | `[]`      | Массив `{ label, value }`        |
| `placeholder`       | `string`  | —         | Текст-подсказка                  |
| `showClear`         | `boolean` | —         | Показать кнопку очистки          |
| `inline`            | `string`  | —         | `"true"` → убирает класс `field` |
| Все пропсы Dropdown | —         | —         | См. PrimeReact docs              |

**События:** `onChange` → `{ value: e.value }`

**Особенности:** Авто-резолвинг значения: если `value` — примитив, а `options[0].value` — объект с полем `id`, компонент автоматически найдёт соответствующий объект.

---

### MultiSelect (`"componentType": "MultiSelect"`)

Множественный выбор на основе `primereact/multiselect`.

| Пропс                  | Тип       | По умолч. | Описание                         |
| ---------------------- | --------- | --------- | -------------------------------- |
| `options`              | `array`   | `[]`      | Массив `{ label, value }`        |
| `placeholder`          | `string`  | —         | Текст-подсказка                  |
| `showClear`            | `boolean` | —         | Показать кнопку очистки          |
| `maxSelectedLabels`    | `number`  | —         | Макс. количество выбранных       |
| `inline`               | `string`  | —         | `"true"` → убирает класс `field` |
| Все пропсы MultiSelect | —         | —         | См. PrimeReact docs              |

**События:** `onChange` → `{ value: e.value }`

---

### AutoComplete (`"componentType": "AutoComplete"`)

Поле с автодополнением на основе `primereact/autocomplete`.

| Пропс                   | Тип      | По умолч. | Описание                         |
| ----------------------- | -------- | --------- | -------------------------------- |
| `suggestions`           | `array`  | `[]`      | Массив подсказок (строки)        |
| `placeholder`           | `string` | —         | Плейсхолдер                      |
| `inline`                | `string` | —         | `"true"` → убирает класс `field` |
| Все пропсы AutoComplete | —        | —         | См. PrimeReact docs              |

**События:** `onChange` → `{ value: e.value }`

---

### Calendar (`"componentType": "Calendar"`)

Выбор даты/времени на основе `primereact/calendar`.

| Пропс               | Тип       | По умолч.  | Описание                            |
| ------------------- | --------- | ---------- | ----------------------------------- |
| `dateFormat`        | `string`  | `dd.mm.yy` | Формат отображения                  |
| `showIcon`          | `boolean` | —          | Иконка календаря                    |
| `showTime`          | `boolean` | —          | Показывать время                    |
| `inline`            | `string`  | —          | `"true"` → убирает класс `field`    |
| `selectionMode`     | `string`  | `"single"` | `"single"`, `"range"`, `"multiple"` |
| Все пропсы Calendar | —         | —          | См. PrimeReact docs                 |

**События:** `onChange` → `{ value: Date | Date[] | null }`

**Особенности:** Авто-парсинг строковых дат: ISO-строки и строки в формате `dd.MM.yy HH:mm` преобразуются в Date-объекты.

---

## Формы — Toggle

### Checkbox (`"componentType": "Checkbox"`)

Чекбокс на основе `primereact/checkbox`. Значение через `value` → `checked`.

| Пропс    | Тип      | По умолч. | Описание                         |
| -------- | -------- | --------- | -------------------------------- |
| `label`  | `string` | —         | Текст справа от чекбокса         |
| `inline` | `string` | —         | `"true"` → убирает класс `field` |

**События:** `onChange` → `{ value: boolean }`

---

### RadioButton (`"componentType": "RadioButton"`)

Радио-кнопка на основе `primereact/radiobutton`.

| Пропс    | Тип      | По умолч. | Описание                         |
| -------- | -------- | --------- | -------------------------------- |
| `label`  | `string` | —         | Текст справа от кнопки           |
| `value`  | `any`    | —         | Значение для сравнения           |
| `inline` | `string` | —         | `"true"` → убирает класс `field` |

**События:** `onChange` → `{ value: e.value }`

---

### InputSwitch (`"componentType": "InputSwitch"`)

Переключатель на основе `primereact/inputswitch`. Значение через `value` → `checked`.

| Пропс    | Тип      | По умолч. | Описание                         |
| -------- | -------- | --------- | -------------------------------- |
| `label`  | `string` | —         | Текст справа от переключателя    |
| `inline` | `string` | —         | `"true"` → убирает класс `field` |

**События:** `onChange` → `{ value: boolean }`

---

### Slider (`"componentType": "Slider"`)

Слайдер для выбора числа на основе `primereact/slider`.

| Пропс   | Тип       | По умолч. | Описание                               |
| ------- | --------- | --------- | -------------------------------------- |
| `min`   | `number`  | `0`       | Минимальное значение                   |
| `max`   | `number`  | `100`     | Максимальное значение                  |
| `step`  | `number`  | `1`       | Шаг                                    |
| `range` | `boolean` | `false`   | Режим диапазона (value → `[min, max]`) |

**События:** `onChange` → `{ value: number | [number, number] }`

---

### Rating (`"componentType": "Rating"`)

Рейтинг (звёзды) на основе `primereact/rating`.

| Пропс    | Тип       | По умолч. | Описание                 |
| -------- | --------- | --------- | ------------------------ |
| `stars`  | `number`  | `5`       | Количество звёзд         |
| `cancel` | `boolean` | `true`    | Возможность снять оценку |

**События:** `onChange` → `{ value: number }`

---

## Кнопки

### Button (`"componentType": "Button"`)

Кнопка на основе `primereact/button`.

| Пропс             | Тип       | По умолч. | Описание                                                                                           |
| ----------------- | --------- | --------- | -------------------------------------------------------------------------------------------------- |
| `label`           | `string`  | —         | Текст кнопки                                                                                       |
| `icon`            | `string`  | —         | Иконка (`pi pi-*`)                                                                                 |
| `severity`        | `string`  | —         | `"primary"`, `"secondary"`, `"success"`, `"info"`, `"warning"`, `"danger"`, `"help"`, `"contrast"` |
| `outlined`        | `boolean` | —         | Контурный стиль                                                                                    |
| `size`            | `string`  | —         | `"small"`, `"large"`                                                                               |
| Все пропсы Button | —         | —         | См. PrimeReact docs                                                                                |

**События:** `onClick` → `{ value: event }`

---

## Данные

### DataTable (`"componentType": "DataTable"`)

Таблица данных на основе `primereact/datatable`.

| Пропс                | Тип       | По умолч. | Описание                                             |
| -------------------- | --------- | --------- | ---------------------------------------------------- |
| `value`              | `array`   | `[]`      | Данные таблицы                                       |
| `columns`            | `array`   | —         | Массив конфигураций колонок `{ field, header, ... }` |
| `paginator`          | `boolean` | —         | Включить пагинацию                                   |
| `rows`               | `number`  | —         | Количество строк на странице                         |
| `lazy`               | `boolean` | —         | Ленивая загрузка (с сервера)                         |
| `totalRecords`       | `number`  | —         | Общее количество записей (lazy)                      |
| `sortField`          | `string`  | —         | Поле сортировки (lazy)                               |
| `sortOrder`          | `number`  | —         | `1` — ASC, `-1` — DESC (lazy)                        |
| `first`              | `number`  | —         | Индекс первой записи (lazy)                          |
| `selectionMode`      | `string`  | —         | `"single"`, `"multiple"`                             |
| `dataKey`            | `string`  | —         | Уникальный ключ записи                               |
| Все пропсы DataTable | —         | —         | См. PrimeReact docs                                  |

**События:** `onPage` → `{ first, rows, ... }` (только при `lazy: true`)

**Колонки (`columns`):**

```json
[
  { "field": "name", "header": "Имя" },
  { "field": "email", "header": "Email", "sortable": true }
]
```

Все пропсы `Column` из PrimeReact передаются через спред `{...col}`.

**Важно:** Если `columns` отсутствует (`null`/`undefined`), компонент возвращает `null`.

**Пример (lazy):**

```json
{
  "id": "usersTable",
  "componentType": "DataTable",
  "props": {
    "value": "@state.users.value",
    "columns": "@state.users.columns",
    "lazy": true,
    "paginator": true,
    "rows": "@state.users.rows",
    "totalRecords": "@state.users.totalRecords",
    "first": "@state.users.first",
    "sortField": "@state.users.sortField",
    "sortOrder": "@state.users.sortOrder"
  }
}
```

---

## Панели

### Card (`"componentType": "Card"`)

Карточка на основе `primereact/card`.

| Пропс           | Тип      | По умолч. | Описание            |
| --------------- | -------- | --------- | ------------------- |
| `header`        | `string` | —         | Заголовок карточки  |
| `subHeader`     | `string` | —         | Подзаголовок        |
| Все пропсы Card | —        | —         | См. PrimeReact docs |

---

## Меню/Навигация

### Menubar (`"componentType": "Menubar"`)

Панель меню на основе `primereact/menubar`.

| Пропс         | Тип       | По умолч. | Описание                      |
| ------------- | --------- | --------- | ----------------------------- |
| `model`       | `array`   | —         | Массив пунктов меню           |
| `allowMobile` | `boolean` | —         | `true` → убирает CSS-фиксацию |

**Пункты меню (`model`):**

```json
[
  {
    "label": "Пункт",
    "icon": "pi pi-home",
    "route": "/",
    "items": [ ... ]    // вложенные подменю
  }
]
```

**События:**

- `onNavigate` → `{ type: "onNavigate", commands: [...] }` для пунктов с `commands`

---

### Breadcrumb (`"componentType": "Breadcrumb"`)

Хлебные крошки на основе `primereact/breadcrumb`.

| Пропс   | Тип     | По умолч. | Описание                          |
| ------- | ------- | --------- | --------------------------------- |
| `model` | `array` | —         | Массив пунктов `{ label, route }` |

---

### Steps (`"componentType": "Steps"`)

Пошаговый индикатор на основе `primereact/steps`.

| Пропс         | Тип       | По умолч. | Описание                        |
| ------------- | --------- | --------- | ------------------------------- |
| `model`       | `array`   | —         | Массив шагов `{ label, route }` |
| `activeIndex` | `number`  | `0`       | Текущий шаг                     |
| `readOnly`    | `boolean` | `true`    | Запретить переход по клику      |

---

## Контейнеры

### TabView (`"componentType": "TabView"`)

Вкладки на основе `primereact/tabview`.

### Accordion (`"componentType": "Accordion"`)

Аккордеон на основе `primereact/accordion`.

### Carousel (`"componentType": "Carousel"`)

Карусель на основе `primereact/carousel`.

---

## Отображение

### Skeleton (`"componentType": "Skeleton"`)

Скелетон-заглушка на основе `primereact/skeleton`.

### Chip (`"componentType": "Chip"`)

Чип на основе `primereact/chip`.

### Avatar (`"componentType": "Avatar"`)

Аватар на основе `primereact/avatar`.

### Badge (`"componentType": "Badge"`)

Бейдж на основе `primereact/badge`.

### Tag (`"componentType": "Tag"`)

Тег на основе `primereact/tag`.

---

## Графики

### Chart (`"componentType": "Chart"`)

График на основе chart.js.

---

## Прогресс

### ProgressBar (`"componentType": "ProgressBar"`)

Прогресс-бар на основе `primereact/progressbar`.

### ProgressSpinner (`"componentType": "ProgressSpinner"`)

Спиннер на основе `primereact/progressspinner`.

---

## Сообщения

### Message (`"componentType": "Message"`)

Сообщение на основе `primereact/message`.

### Divider (`"componentType": "Divider"`)

Разделитель на основе `primereact/divider`.

### Toast (`"componentType": "Toast"`)

Toast-уведомление на основе `primereact/toast`.

---

## Фильтры

### FiltersPanel (`"componentType": "FiltersPanel"`)

**Выездная панель фильтров** на основе PrimeReact Sidebar (Drawer).

| Пропс      | Тип       | По умолч.   | Описание                            |
| ---------- | --------- | ----------- | ----------------------------------- |
| `value`    | `array`   | `[]`        | Модель фильтров (массив FilterItem) |
| `visible`  | `boolean` | `false`     | Видимость панели                    |
| `position` | `string`  | `"right"`   | Сторона выезда                      |
| `header`   | `string`  | `"Фильтры"` | Заголовок панели                    |

**Модель фильтра (`FilterItem`):**

```json
{
  "id": "f-name",
  "name": "Название фильтра",
  "type": "text",
  "opts": [ ... ],
  "value": ...
}
```

**Типы фильтров (`type`):**

| type       | Отображение                  | `opts`          | `value`             |
| ---------- | ---------------------------- | --------------- | ------------------- |
| `checkbox` | Один Checkbox                | —               | `true/false`        |
| `switch`   | Один InputSwitch             | —               | `true/false`        |
| `range`    | Slider (мульти)              | `[min, max]`    | `[number, number]`  |
| `slider`   | Slider (одинарный)           | `[min, max]`    | `number`            |
| `text`     | InputText                    | —               | `string`            |
| `number`   | InputNumber                  | —               | `number`            |
| `date`     | Calendar (один)              | —               | `Date/ISO string`   |
| `period`   | Calendar (два: начало/конец) | —               | `[Date, Date]`      |
| `options`  | Группа Checkbox              | `["opt1", ...]` | `[bool, bool, ...]` |
| `radio`    | Группа RadioButton           | `["opt1", ...]` | `string`            |

**События:**

- `onChange` → `{ value: FilterModel }` при нажатии «Применить» или «Очистить»
- `onHide` → `{ value: false }` при закрытии панели

**Особенности:**

- Локальная копия: изменения не применяются до нажатия «Применить»
- «Применить» → `onChange` с текущей моделью
- «Очистить» → сброс всех значений + `onChange` с пустой моделью
- Даты корректно восстанавливаются из ISO-строк при повторном открытии
- Кнопки в фиксированном нижнем блоке

**Пример:**

```json
{
  "id": "filterDrawer",
  "componentType": "FiltersPanel",
  "props": {
    "value": "@state.filters",
    "visible": "@state.filtersVisible",
    "position": "right",
    "header": "Фильтры"
  },
  "events": [
    {
      "type": "onChange",
      "commands": [
        {
          "type": "setProperty",
          "params": { "source": "event.value", "target": "state.filters" }
        },
        {
          "type": "toggleProperty",
          "params": { "target": "state.filtersVisible" }
        }
      ]
    },
    {
      "type": "onHide",
      "commands": [
        {
          "type": "toggleProperty",
          "params": { "target": "state.filtersVisible" }
        }
      ]
    }
  ]
}
```

---

### ActiveFiltersBar (`"componentType": "ActiveFiltersBar"`)

**Горизонтальная панель активных фильтров** в виде чипов.

| Пропс   | Тип     | По умолч. | Описание                            |
| ------- | ------- | --------- | ----------------------------------- |
| `value` | `array` | `[]`      | Модель фильтров (массив FilterItem) |

**События:**

- `onChange` → `{ value: FilterModel }` при удалении чипа или очистке всех

**Особенности:**

- Отображается **только если есть активные фильтры** (иначе `return null`)
- Чипы формируются по правилам:
  - `checkbox`/`switch` → только название
  - `text`/`number`/`slider`/`radio` → `"Название: значение"`
  - `date` → `"Название: 15.06.2026"`
  - `period` → `"Название: 01.06.2026 – 10.06.2026"`, или `"Название: от 01.06.2026"`, или `"Название: до 10.06.2026"`
  - `range` → `"Название: 50000 – 150000"`, или `"Название: от 50000"`, или `"Название: до 150000"`
  - `options` → отдельный чип для каждой выбранной опции
- Слева — кнопка «Очистить все» (иконка `pi pi-filter-slash`)
- Удаление опции в `options` — сбрасывается только конкретная опция

**Пример:**

```json
{
  "id": "activeFilterChips",
  "componentType": "ActiveFiltersBar",
  "props": {
    "value": "@state.filters"
  },
  "events": [
    {
      "type": "onChange",
      "commands": [
        {
          "type": "setProperty",
          "params": { "source": "event.value", "target": "state.filters" }
        }
      ]
    }
  ]
}
```

---

## Разное

### ColorPicker, FileUpload

Пропсы и события соответствуют PrimeReact документации.
