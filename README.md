# CRM Platform — Metadata-Driven UI

Универсальная CRM-платформа с архитектурой **Metadata-Driven UI**, где вся структура, внешний вид и поведение приложения описываются в JSON-конфигурации, а не жёстко кодируются.

## Архитектура

Система состоит из трёх частей:

| Компонент                     | Описание                                                                    |
| ----------------------------- | --------------------------------------------------------------------------- |
| **Чертеж (Blueprint)**        | JSON-конфигурация (`config/crm-config.json`), описывающая всю структуру CRM |
| **Движок (Engine)**           | Next.js-приложение, читающее конфигурацию и строящее интерфейс              |
| **Источник данных (Backend)** | API-слой с адаптером для преобразования ответов к формату платформы         |

## Иерархия элементов

```
App (приложение)
 └── Page (страница)
      └── Section (секция)
           └── Block (блок)
                └── Component (компонент PrimeReact)
```

Каждый элемент имеет уникальный ID, состояние (state) и специфичные параметры.

## Технологический стек

- **Next.js 16** — App Router, динамический роутинг `[[...slug]]`
- **TypeScript** — полная типизация
- **PrimeReact** — UI-компоненты (40+ типов)
- **PrimeFlex** — CSS-утилиты
- **PrimeIcons** — иконки
- **chart.js** — графики и диаграммы
- Тёмная тема **lara-dark-blue**

## Структура проекта

```
├── config/
│   └── crm-config.json          # JSON-конфигурация CRM (Blueprint)
├── src/
│   ├── types/                   # Система типов
│   │   ├── base.ts              # Базовые типы (BaseElement, Condition, LayoutConfig)
│   │   ├── app.ts               # App, NavbarConfig, AppConfig
│   │   ├── page.ts              # Page, PageMeta, AccessControl
│   │   ├── section.ts           # Section, SectionState
│   │   ├── block.ts             # Block, BlockType, WrapperConfig
│   │   ├── component.ts         # Component, ComponentType, DataBinding
│   │   ├── commands.ts          # Command, CommandType, Condition
│   │   └── index.ts
│   ├── core/                    # Ядро платформы
│   │   ├── StateManager.ts      # Управление состояниями элементов
│   │   ├── PathResolver.ts      # Система адресации (path-based lookup)
│   │   └── index.ts
│   ├── engine/                  # Рендер-движок
│   │   ├── AppEngine.tsx        # Главный компонент, роутинг, sidebar
│   │   ├── PageRenderer.tsx     # Рендер страницы с секциями
│   │   ├── SectionRenderer.tsx  # Рендер секции с layout
│   │   ├── BlockRenderer.tsx    # Рендер блока с обёрткой (Card, Panel, Toolbar)
│   │   ├── ComponentRenderer.tsx# Рендер PrimeReact компонентов
│   │   ├── DashboardSidebar.tsx # Боковая панель навигации
│   │   └── index.ts
│   └── app/
│       ├── layout.tsx           # Корневой layout с PrimeReactProvider
│       ├── globals.css          # Минимальные CSS-reset
│       └── [[...slug]]/page.tsx # Динамический роутер
└── docs/                        # Документация и ТЗ
```

## Ключевые возможности

### Система состояний

- Каждый элемент имеет собственное состояние (`state`)
- Доступ по пути: `dashboard.mainContent.statsCard.state.data`
- Частичное обновление (`mergeState`), полная замена (`setState`), очистка (`clearState`)
- Глобальное состояние приложения (`global.user`, `global.auth`)
- Подписка на изменения с автоматическим ре-рендером

### Система адресации

- Иерархические пути: `appId.pageId.sectionId.blockId.componentId`
- Доступ к состоянию: `pageId.sectionId.state.fieldName`
- Относительные пути: `../state.data`
- Wildcard-селекторы: `*.section1.state.visible`

### Навигация

- Боковая панель (sidebar) на уровне приложения, НЕ перезагружается при переходах
- Desktop: сворачивается до иконок кнопкой внизу
- Mobile: полноэкранное меню из кнопки «бургер»
- Активный раздел подсвечивается
- Поддержка кнопок «Назад/Вперёд» браузера

### Система команд

- Базовые команды: `setState`, `mergeState`, `showToast`, `navigate`, `log`, `confirm`, `delay`
- Триггеры: `onClick`, `onChange`, `onLoad`, `onTimer`, `onCondition`
- Цепочки команд (sequences)

### Система состояний компонентов

- Глобальное хранилище состояний всех компонентов по `componentId`
- Доступ к значениям свойств через явное указание пути
- Синхронизация значений между компонентами через команды

## Страницы

| Страница       | Маршрут       | Описание                                                                    |
| -------------- | ------------- | --------------------------------------------------------------------------- |
| **Dashboard**  | `/`           | Карточки статистики, быстрые действия, таблица заказов, timeline активности |
| **Statistics** | `/statistics` | Фильтры по дате (неделя, диапазон), скачивание данных в табах               |
| **Users**      | `/users`      | Фильтры, таблица пользователей, профиль, прогресс, аватары                  |
| **Orders**     | `/orders`     | Вкладки (TabView), форма заказа, сообщения                                  |
| **Products**   | `/products`   | Поиск/фильтры, карточки товаров, таблица, форма редактирования              |
| **Reports**    | `/reports`    | Фильтры дат, графики (line/pie), carousel, skeleton-заглушки                |
| **Settings**   | `/settings`   | Steps, профиль, уведомления, безопасность, интеграции, FAQ (Accordion)      |

## Компоненты PrimeReact

### Формы

InputText, InputNumber, InputTextarea, Password, Dropdown, MultiSelect, AutoComplete, Calendar, Checkbox, RadioButton, InputSwitch, Slider, Rating, ColorPicker, FileUpload

### Кнопки

Button, SplitButton

### Данные

DataTable

### Панели

Card, Panel, Fieldset, Toolbar, TabView, Accordion

### Меню

Menubar, Breadcrumb, Steps

### Графики и медиа

Chart (line/pie), Carousel

### Отображение

Avatar, Badge, Tag, Chip, Skeleton, ProgressBar, ProgressSpinner, Message, Divider, Timeline, Text, HTML

## Запуск

```bash
npm install
npm run dev       # Dev-сервер
npm run build     # Production-билд
```

## Конфигурация

Все настройки в `config/crm-config.json`:

- `navbar` — пункты навигации (label, icon, route)
- `pages` — массив страниц с секциями, блоками и компонентами
- `globalState` — глобальное состояние (user, auth, cache)
- `config.api` — настройки API (baseURL, endpoints)
- `config.features` — флаги функциональности

## Справочник конфигурации

Полное описание всех параметров элементов конфигурации с примерами:
→ [docs/config-reference.md](docs/config-reference.md)

Разделы справочника:

1. [App](docs/config-reference.md#1-app-приложение) — корневой элемент, навбар, глобальное состояние
2. [Page](docs/config-reference.md#2-page-страница) — страницы, мета-данные, контроль доступа
3. [Section](docs/config-reference.md#3-section-секция) — секции, макет, видимость
4. [Block](docs/config-reference.md#4-block-блок) — блоки, типы, обёртки
5. [Component](docs/config-reference.md#5-component-компонент) — компоненты, привязки, события
6. [Command](docs/config-reference.md#6-command-команда) — команды, триггеры, условия
7. [Общие типы](docs/config-reference.md#7-общие-типы) — LayoutConfig, ElementMeta, адресация
