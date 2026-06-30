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

### InputMask (`"componentType": "InputMask"`)

Поле ввода с маской на основе `primereact/inputmask`. Используется для форматированного ввода данных (телефоны, даты, номера карт и т.д.).

| Пропс                | Тип       | По умолч. | Описание                               |
| -------------------- | --------- | --------- | -------------------------------------- |
| `mask`               | `string`  | —         | Маска ввода (напр. `"(999) 999-9999"`) |
| `slotChar`           | `string`  | `"_"`     | Символ заполнителя                     |
| `autoClear`          | `boolean` | `true`    | Автоочистка при потере фокуса          |
| `inline`             | `string`  | —         | `"true"` → убирает класс `field`       |
| Все пропсы InputMask | —         | —         | См. PrimeReact docs                    |

**События:** `onChange` → `{ value: e.value }`

**Примеры масок:**

| Формат         | Маска                 | Описание                   |
| -------------- | --------------------- | -------------------------- |
| Телефон        | `(999) 999-9999`      | Российский формат телефона |
| Дата           | `99/99/9999`          | ДД/ММ/ГГГГ                 |
| Время          | `99:99`               | ЧЧ:ММ                      |
| Карта          | `9999 9999 9999 9999` | Номер карты                |
| PIN            | `9999`                | Четыре цифры               |
| Серийный номер | `AAA-999-AAA`         | Буквы и цифры              |

**Пример:**

```json
{
  "id": "phoneInput",
  "componentType": "InputMask",
  "props": {
    "mask": "(999) 999-9999",
    "placeholder": "Введите телефон",
    "slotChar": "_",
    "inline": "true"
  },
  "events": [
    {
      "type": "onChange",
      "commands": [
        {
          "type": "setProperty",
          "params": { "source": "event.value", "target": "state.phone" }
        }
      ]
    }
  ]
}
```

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

### RadioButtonGroup (`"componentType": "RadioButtonGroup"`)

Группа радио-кнопок на основе `primereact/radiobutton`. Компонент-обёртка для удобного создания группы radio кнопок.

| Пропс                  | Тип      | По умолч.    | Описание                        |
| ---------------------- | -------- | ------------ | ------------------------------- |
| `options`              | `array`  | `[]`         | Массив опций `{ label, value }` |
| `name`                 | `string` | —            | Имя группы (атрибут name)       |
| `value`                | `any`    | —            | Текущее выбранное значение      |
| `orientation`          | `string` | `"vertical"` | `"vertical"` или `"horizontal"` |
| Все пропсы RadioButton | —        | —            | См. PrimeReact docs             |

**События:** `onChange` → `{ value: выбранное значение }`

**Пример:**

```json
{
  "id": "operationGroup",
  "componentType": "LabelledGroup",
  "props": {
    "label": "Операция",
    "components": [
      {
        "id": "operationRadioGroup",
        "componentType": "RadioButtonGroup",
        "props": {
          "name": "operation",
          "value": "@state.editForm.operation",
          "options": [
            { "label": "Добавить", "value": "add" },
            { "label": "Отнять", "value": "remove" }
          ],
          "orientation": "vertical"
        },
        "events": [
          {
            "type": "onChange",
            "commands": [
              {
                "type": "setProperty",
                "params": {
                  "source": "event.value",
                  "target": "state.editForm.operation"
                }
              }
            ]
          }
        ]
      }
    ]
  }
}
```

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

### Кастомные колонки (`customColumns`)

Позволяет добавлять в таблицу столбцы с произвольными компонентами в ячейках (кнопки, иконки, инпуты и т.д.).

| Пропс           | Тип     | По умолч. | Описание                                          |
| --------------- | ------- | --------- | ------------------------------------------------- |
| `customColumns` | `array` | —         | Массив конфигураций кастомных столбцов (см. ниже) |

**Правила:**

1. Кастомный столбец добавляется только если его `field` **совпадает** с `field` одного из существующих столбцов в `columns`. Если совпадения нет — столбец игнорируется.
2. Если `field` совпадает — существующий столбец **заменяется** кастомным.
3. Параметр `order` определяет позицию:
   - `0` — самый первый (перед всеми)
   - `-1` или не указан — самый последний
   - `1, 2, 3...` — позиционируется по порядку между первыми и последними
4. Массив `body` содержит компоненты, которые рендерятся в каждой ячейке столбца (аналогично `components` в `LayoutGroup`).
5. В компонентах внутри `body` доступны макросы:
   - `"{#field}"` — значение поля текущего столбца для данной строки
   - `"{#row.путь}"` — значение по пути из объекта всей строки (например, `{#row.subject}`)

**Структура элемента `customColumns`:**

| Поле       | Тип       | Обязательное | Описание                                         |
| ---------- | --------- | ------------ | ------------------------------------------------ |
| `field`    | `string`  | да           | Имя поля (должно совпадать с полем из `columns`) |
| `header`   | `string`  | да           | Заголовок столбца                                |
| `sortable` | `boolean` | нет          | Возможность сортировки                           |
| `order`    | `number`  | нет          | Позиция (`0`, `-1`, `1...`)                      |
| `body`     | `array`   | нет          | Массив определений компонентов для ячейки        |

**Пример:**

```json
{
  "id": "usersTable",
  "componentType": "DataTable",
  "props": {
    "value": "@state.users.value",
    "columns": "@state.users.columns",
    "customColumns": [
      {
        "field": "email",
        "header": "Email",
        "sortable": true,
        "order": 0,
        "body": [
          {
            "id": "sendButton",
            "componentType": "Button",
            "className": "min-w-max flex-grow-0 px-3",
            "props": {
              "icon": "pi pi-envelope",
              "severity": "primary",
              "outlined": true,
              "size": "small",
              "label": "Отправить"
            },
            "events": [
              {
                "type": "onClick",
                "commands": [
                  {
                    "type": "sendRequest",
                    "params": {
                      "data": {
                        "email": "{#field}",
                        "subject": "{#row.subject}"
                      }
                    }
                  }
                ]
              }
            ]
          }
        ]
      }
    ]
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

### Panel (`"componentType": "Panel"`)

Сворачиваемая панель на основе `primereact/panel`. Компонент-контейнер, который может содержать дочерние компоненты и имеет заголовок.

| Пропс                | Тип      | По умолч.                  | Описание                                          |
| -------------------- | -------- | -------------------------- | ------------------------------------------------- |
| `header`             | `string` | —                          | Заголовок панели (если не задан — скрывается)     |
| `components`         | `array`  | `[]`                       | Массив дочерних компонентов                       |
| `containerClassName` | `string` | `"flex flex-column gap-2"` | CSS-класс для контейнера с дочерними компонентами |
| `grid`               | `object` | —                          | PrimeFlex grid-раскладка (как в LayoutGroup)      |
| Все пропсы Panel     | —        | —                          | См. PrimeReact docs                               |

**Поля `grid`:**

| Поле      | Тип        | По умолч. | Описание                                                                         |
| --------- | ---------- | --------- | -------------------------------------------------------------------------------- |
| `cols`    | `string[]` | —         | Массив PrimeFlex col-классов для каждого компонента (напр. `["col-6", "col-6"]`) |
| `padding` | `string`   | —         | Дополнительный padding-класс для всех обёрток (напр. `"p-1"`)                    |

**Особенности:**

- Если `header` не задан, применяется специальный класс `no-header-panel-content` к содержимому
- Дочерние компоненты рендерятся внутри `<Panel>` из PrimeReact
- Поддерживает grid-раскладку как в `LayoutGroup`
- При пустом `components` возвращается `null`

**Пример (простая панель):**

```json
{
  "id": "groupsPanel",
  "type": "component",
  "componentType": "Panel",
  "className": "mb-4",
  "props": {
    "header": "Группы",
    "containerClassName": "",
    "components": [
      {
        "id": "groupsTable",
        "type": "component",
        "componentType": "DataTable",
        "className": "no-bottom-border",
        "props": {
          "emptyMessage": "В группах не состоит",
          "showHeaders": false,
          "value": "@state.userData.groupList",
          "columns": [{ "field": "name" }]
        }
      }
    ]
  }
}
```

**Пример (панель без заголовка):**

```json
{
  "id": "contentPanel",
  "type": "component",
  "componentType": "Panel",
  "props": {
    "components": [
      {
        "id": "textContent",
        "type": "component",
        "componentType": "Text",
        "props": { "value": "Содержимое без заголовка" }
      }
    ]
  }
}
```

### Dialog (`"componentType": "Dialog"`)

Модальное диалоговое окно на основе `primereact/dialog`. Компонент-контейнер, который отображается поверх основного контента и содержит дочерние компоненты.

| Пропс                | Тип       | По умолч.                  | Описание                                |
| -------------------- | --------- | -------------------------- | --------------------------------------- |
| `header`             | `string`  | —                          | Заголовок диалога                       |
| `visible`            | `boolean` | —                          | Видимость диалога (линкуется с state)   |
| `modal`              | `boolean` | `true`                     | Затемнять фон                           |
| `closable`           | `boolean` | `true`                     | Показывать кнопку закрытия              |
| `draggable`          | `boolean` | `false`                    | Перетаскивание диалога                  |
| `resizable`          | `boolean` | `false`                    | Изменение размера                       |
| `containerClassName` | `string`  | `"flex flex-column gap-3"` | CSS-класс для контейнера с компонентами |
| `components`         | `array`   | `[]`                       | Массив дочерних компонентов             |
| Все пропсы Dialog    | —         | —                          | См. PrimeReact docs                     |

**События:** `onHide` → закрывает диалог (установить `visible` в `false`)

**Особенности:**

- Дочерние компоненты рендерятся внутри `<Dialog>` из PrimeReact
- Управление видимостью через линковку `visible` с state (`"@state.dialogVisible"`)
- При закрытии (клик по крестику или фону) вызывается событие `onHide`
- Рекомендуется использовать совместно с shortcut'ами для сохранения данных

**Пример (диалог редактирования):**

```json
{
  "id": "editDialog",
  "type": "section",
  "blocks": [
    {
      "id": "editDialogBlock",
      "type": "block",
      "components": [
        {
          "id": "editDialog",
          "type": "component",
          "componentType": "Dialog",
          "props": {
            "header": "Редактирование",
            "visible": "@state.dialogVisible",
            "modal": true,
            "closable": true,
            "draggable": false,
            "resizable": false,
            "style": { "width": "450px" },
            "containerClassName": "flex flex-column gap-3",
            "components": [
              {
                "id": "nameInput",
                "type": "component",
                "componentType": "InputText",
                "props": {
                  "value": "@state.editForm.name",
                  "placeholder": "Введите название"
                },
                "events": [
                  {
                    "type": "onChange",
                    "commands": [
                      {
                        "type": "setProperty",
                        "params": {
                          "source": "event.value",
                          "target": "state.editForm.name"
                        }
                      }
                    ]
                  }
                ]
              },
              {
                "id": "dialogButtons",
                "type": "component",
                "componentType": "LayoutGroup",
                "className": "flex justify-content-end gap-2 mt-3",
                "props": {
                  "spacing": "gap-2",
                  "components": [
                    {
                      "id": "btnCancel",
                      "type": "component",
                      "componentType": "Button",
                      "props": {
                        "label": "Отмена",
                        "icon": "pi pi-times",
                        "severity": "secondary",
                        "outlined": true
                      },
                      "events": [
                        {
                          "type": "onClick",
                          "commands": [
                            {
                              "type": "setProperty",
                              "params": {
                                "target": "state.dialogVisible",
                                "value": false
                              }
                            }
                          ]
                        }
                      ]
                    },
                    {
                      "id": "btnSave",
                      "type": "component",
                      "componentType": "Button",
                      "props": {
                        "label": "Сохранить",
                        "icon": "pi pi-check",
                        "severity": "success"
                      },
                      "events": [
                        {
                          "type": "onClick",
                          "commands": ["saveShortcut"]
                        }
                      ]
                    }
                  ]
                }
              }
            ]
          },
          "events": [
            {
              "type": "onHide",
              "commands": [
                {
                  "type": "setProperty",
                  "params": {
                    "target": "state.dialogVisible",
                    "value": false
                  }
                }
              ]
            }
          ]
        }
      ]
    }
  ]
}
```

---

## Меню/Навигация

### Menubar (`"componentType": "Menubar"`)

Панель меню на основе `primereact/menubar`.

| Пропс          | Тип       | По умолч. | Описание                                                                                                       |
| -------------- | --------- | --------- | -------------------------------------------------------------------------------------------------------------- |
| `model`        | `array`   | —         | Массив пунктов меню                                                                                            |
| `allowMobile`  | `boolean` | —         | `true` → убирает CSS-фиксацию                                                                                  |
| `activeItemId` | `string`  | —         | ID активного пункта меню. Добавляет класс `p-focus` соответствующему элементу. **Только для верхнего уровня.** |

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

## Layout — группировка и лэйаут

### LayoutGroup (`"componentType": "LayoutGroup"`)

Контейнер-группировщик дочерних компонентов.

| Пропс        | Тип      | По умолч. | Описание                                |
| ------------ | -------- | --------- | --------------------------------------- |
| `components` | `array`  | `[]`      | Массив дочерних компонентов             |
| `grid`       | `object` | —         | PrimeFlex grid-раскладка (см. ниже)     |
| `className`  | `string` | —         | CSS-класс для контейнера с компонентами |
| `style`      | `object` | —         | Inline-стили контейнера                 |

**Поля `grid`:**

| Поле      | Тип        | По умолч. | Описание                                                                         |
| --------- | ---------- | --------- | -------------------------------------------------------------------------------- |
| `cols`    | `string[]` | —         | Массив PrimeFlex col-классов для каждого компонента (напр. `["col-6", "col-6"]`) |
| `padding` | `string`   | —         | Дополнительный padding-класс для всех обёрток (напр. `"p-1"`)                    |

**Особенности:**

- `className` и `style` применяются к контейнеру с дочерними компонентами
- Если задан `grid`, к `className` добавляется класс `grid`, каждый дочерний компонент оборачивается в `<div>` с `col-*` классом из `grid.cols` (по индексу)
- Если `grid` не задан — компоненты рендерятся напрямую в flex-контейнере с `className`
- При пустом `components` возвращается `null`

**Пример (grid):**

```json
{
  "id": "btnGroup",
  "componentType": "LayoutGroup",
  "props": {
    "grid": {
      "cols": ["col-6", "col-6"],
      "padding": "p-1"
    }
  },
  "className": "mb-3",
  "components": [
    { "id": "btn1", "componentType": "Button", "props": { "label": "Save" } },
    { "id": "btn2", "componentType": "Button", "props": { "label": "Cancel" } }
  ]
}
```

**Пример (flex, без grid):**

```json
{
  "id": "infoGroup",
  "componentType": "LayoutGroup",
  "className": "flex flex-row gap-2 align-items-center",
  "props": {
    "components": [
      {
        "id": "avatar",
        "componentType": "Avatar",
        "props": { "label": "JD", "size": "large" }
      },
      {
        "id": "name",
        "componentType": "Text",
        "props": { "value": "John Doe", "level": 3 }
      }
    ]
  }
}
```

---

### LabelledGroup (`"componentType": "LabelledGroup"`)

Контейнер с настраиваемой меткой. Внешний вид и расположение метки управляются через `className`/`style` и `containerClassName`.

| Пропс                | Тип      | По умолч.                  | Описание                                          |
| -------------------- | -------- | -------------------------- | ------------------------------------------------- |
| `label`              | `string` | —                          | Текст метки                                       |
| `labelClassName`     | `string` | `"font-semibold"`          | CSS-класс для метки                               |
| `labelStyle`         | `object` | —                          | Inline-стили для метки                            |
| `components`         | `array`  | `[]`                       | Массив дочерних компонентов                       |
| `grid`               | `object` | —                          | PrimeFlex grid-раскладка (как в LayoutGroup)      |
| `className`          | `string` | —                          | CSS-класс **внешнего оборачивающего `<div>`**     |
| `style`              | `object` | —                          | Inline-стили внешнего `<div>`                     |
| `containerClassName` | `string` | `"flex flex-column gap-2"` | CSS-класс для контейнера с дочерними компонентами |

**Поведение:**

- `className` и `style` применяются к **внешнему `<div>`**, который содержит `<label>` + контейнер с компонентами
- Положение метки задаётся через `className` внешнего дива:
  - `"flex flex-column gap-1"` — метка сверху, компоненты снизу (по умолчанию)
  - `"flex align-items-start gap-3"` — метка слева, компоненты справа
- `labelClassName` управляет размером, цветом, выравниванием метки (напр. `"text-lg font-bold text-primary"`)
- Если `label` не задана или пуста — рендерится только контейнер с компонентами

**Пример (label слева):**

```json
{
  "id": "addressGroup",
  "componentType": "LabelledGroup",
  "className": "flex align-items-start gap-3",
  "props": {
    "label": "Адрес",
    "labelClassName": "font-bold text-lg",
    "containerClassName": "flex-1",
    "components": [
      {
        "id": "city",
        "componentType": "InputText",
        "props": { "placeholder": "Город" }
      },
      {
        "id": "street",
        "componentType": "InputText",
        "props": { "placeholder": "Улица" }
      }
    ]
  }
}
```

**Пример (label сверху с grid):**

```json
{
  "id": "contactsGroup",
  "componentType": "LabelledGroup",
  "className": "flex flex-column gap-1",
  "props": {
    "label": "Контакты",
    "labelClassName": "font-semibold text-md",
    "grid": {
      "cols": ["col-6", "col-6"]
    },
    "components": [
      {
        "id": "phone",
        "componentType": "InputText",
        "props": { "placeholder": "Телефон" }
      },
      {
        "id": "email",
        "componentType": "InputText",
        "props": { "placeholder": "Email" }
      }
    ]
  }
}
```

---

## Контейнеры

### TabView (`"componentType": "TabView"`)

Вкладки на основе `primereact/tabview`.

### Accordion (`"componentType": "Accordion"`)

Аккордеон на основе `primereact/accordion`.

### Carousel (`"componentType": "Carousel"`)

Карусель на основе `primereact/carousel`.

---

## Изображения

### Image (`"componentType": "Image"`)

Отображение изображения на основе `primereact/image`. Поддерживает превью (зум) при клике.

| Пропс            | Тип       | По умолч. | Описание                           |
| ---------------- | --------- | --------- | ---------------------------------- |
| `src`            | `string`  | —         | URL изображения                    |
| `alt`            | `string`  | `""`      | Альтернативный текст               |
| `width`          | `string`  | —         | Ширина изображения                 |
| `height`         | `string`  | —         | Высота изображения                 |
| `preview`        | `boolean` | —         | Включить режим предпросмотра (зум) |
| Все пропсы Image | —         | —         | См. PrimeReact docs                |

**Пример:**

```json
{
  "id": "passportPhoto",
  "componentType": "Image",
  "props": {
    "src": "https://storage.example.com/docs/passport.jpg",
    "alt": "Фото паспорта",
    "preview": true,
    "width": "250"
  }
}
```

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
