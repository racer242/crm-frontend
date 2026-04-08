# Функциональные требования и техническое задание для ИИ-агента

## 1. ФУНКЦИОНАЛЬНЫЕ ТРЕБОВАНИЯ

### 1.1 Общие требования к платформе

**FR-1: Конфигурация через JSON**

- Система должна полностью конфигурироваться через JSON-файлы
- Поддержка hot-reload конфигурации в dev-режиме
- Валидация JSON-схемы при загрузке конфигурации
- Возможность импорта/экспорта конфигураций

**FR-2: Иерархическая структура**

- Приложение → Страницы → Секции → Блоки → Компоненты
- Каждый элемент имеет уникальный ID в рамках своего уровня
- Поддержка вложенности до 10 уровней

**FR-3: Система состояний**

- Каждый элемент имеет собственное состояние (state)
- Состояние может быть изменено командами
- Изменения состояния триггерят ре-рендер только затронутых элементов
- Поддержка глобального состояния приложения

**FR-4: Система адресации**

- Унифицированная адресация: `pageId.sectionId.blockId.componentId`
- Доступ к состоянию: `pageId.sectionId.state.fieldName`
- Поддержка относительных путей: `../state.data`
- Wildcard-селекто��ы: `*.section1.state.visible`

**FR-5: Команды и интерактивность**

- Набор базовых команд для управления состоянием и данными
- Цепочки команд (sequences)
- Условное выполнение команд
- Обработка ошибок и fallback-команды
- Триггеры: onClick, onChange, onLoad, onTimer, onCondition

**FR-6: Работа с данными**

- REST API интеграция
- Трансформация данных после получения
- Биндинг данных к компонентам
- Кэширование запросов
- Оптимистичные обновления UI

**FR-7: Навигация**

- Роутинг между страницами
- Переходы к секциям (якори)
- История навигации
- Программная навигация через команды

**FR-8: Визуальная система**

- Использование PrimeReact компонентов
- Адаптивная разметка
- Темизация
- Поддержка темной/светлой темы

**FR-9: Безопасность**

- Валидация пользовательского ввода
- Санитизация данных
- CORS конфигурация
- Авторизация и аутентификация (JWT)

**FR-10: Производительность**

- Ленивая загрузка страниц
- Виртуализация списков
- Дебаунсинг поисковых запросов
- Мемоизация компонентов

---

## 2. СТРУКТУРЫ ДАННЫХ

### 2.1 Базовые типы

```typescript
// types/base.ts

/**
 * Базовый элемент - родитель всех элементов системы
 */
export interface BaseElement {
  id: string; // Уникальный идентификатор
  type: ElementType; // Тип элемента
  state: Record<string, any>; // Состояние элемента
  params: Record<string, any>; // Статические параметры
  meta?: ElementMeta; // Метаданные
}

export type ElementType = "app" | "page" | "section" | "block" | "component";

export interface ElementMeta {
  version?: string; // Версия элемента
  createdAt?: string; // Дата создания
  updatedAt?: string; // Дата обновления
  author?: string; // Автор
  description?: string; // Описание
  tags?: string[]; // Теги для поиска
}

/**
 * Путь к элементу в иерархии
 * Примеры:
 * - "dashboard" (страница)
 * - "dashboard.mainSection" (секция)
 * - "dashboard.mainSection.tableBlock.userTable" (компонент)
 * - "dashboard.mainSection.state.users" (данные в состоянии)
 */
export type ElementPath = string;

/**
 * Правила видимости элемента
 */
export interface VisibilityRule {
  conditions: Condition[]; // Условия видимости
  defaultVisible?: boolean; // Видим по умолчанию
}

/**
 * Конфигурация макета
 */
export interface LayoutConfig {
  type: "grid" | "flex" | "stack" | "custom";
  direction?: "row" | "column";
  gap?: number | string;
  padding?: number | string;
  columns?: number | ResponsiveValue<number>;
  rows?: number | ResponsiveValue<number>;
  alignItems?: "start" | "center" | "end" | "stretch";
  justifyContent?: "start" | "center" | "end" | "between" | "around";
  responsive?: ResponsiveLayout;
}

export interface ResponsiveLayout {
  xs?: Partial<LayoutConfig>; // < 576px
  sm?: Partial<LayoutConfig>; // ≥ 576px
  md?: Partial<LayoutConfig>; // ≥ 768px
  lg?: Partial<LayoutConfig>; // ≥ 992px
  xl?: Partial<LayoutConfig>; // ≥ 1200px
}

export type ResponsiveValue<T> =
  | T
  | {
      xs?: T;
      sm?: T;
      md?: T;
      lg?: T;
      xl?: T;
    };
```

### 2.2 Приложение (App)

```typescript
// types/app.ts

export interface App extends BaseElement {
  type: "app";
  pages: Page[]; // Страницы приложения
  globalState: GlobalState; // Глобальное состояние
  config: AppConfig; // Конфигурация приложения
  theme?: ThemeConfig; // Тема оформления
}

export interface GlobalState {
  user?: UserData; // Данные пользователя
  auth?: AuthData; // Данные авторизации
  cache?: Record<string, any>; // Кэш данных
  [key: string]: any; // Произвольные данные
}

export interface AppConfig {
  name: string; // Название приложения
  version: string; // Версия
  api: ApiConfig; // Настройки API
  features?: FeatureFlags; // Флаги функциональности
  routes?: RouteConfig[]; // Конфигурация роутинга
}

export interface ApiConfig {
  baseURL: string; // Базовый URL API
  timeout?: number; // Таймаут запросов (мс)
  headers?: Record<string, string>; // Заголовки по умолчанию
  retryAttempts?: number; // Количество повторов
  retryDelay?: number; // Задержка между повторами
  endpoints?: Record<string, EndpointConfig>; // Именованные эндпоинты
}

export interface EndpointConfig {
  path: string; // Путь эндпоинта
  method: HttpMethod; // HTTP метод
  cache?: boolean; // Кэшировать ответ
  cacheTTL?: number; // Время жизни кэша (мс)
}

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export interface FeatureFlags {
  [key: string]: boolean;
}

export interface RouteConfig {
  path: string;
  pageId: string;
  exact?: boolean;
  middleware?: string[]; // Middleware для роута
}

export interface ThemeConfig {
  mode: "light" | "dark";
  primaryColor?: string;
  secondaryColor?: string;
  fontFamily?: string;
  customCSS?: string;
  primeReactTheme?: string; // Имя темы PrimeReact
}

export interface UserData {
  id: string;
  name: string;
  email: string;
  role: string;
  permissions: string[];
  avatar?: string;
}

export interface AuthData {
  token: string;
  refreshToken?: string;
  expiresAt: number;
  isAuthenticated: boolean;
}
```

### 2.3 Страница (Page)

```typescript
// types/page.ts

export interface Page extends BaseElement {
  type: "page";
  route: string; // Путь роута (/dashboard, /users/:id)
  sections: Section[]; // Секции страницы
  layout?: LayoutConfig; // Макет страницы
  meta?: PageMeta; // SEO метаданные
  access?: AccessControl; // Контроль доступа
  onLoad?: Command[]; // Команды при загрузке
  onUnload?: Command[]; // Команды при выгрузке
  onError?: Command[]; // Команды при ошибке
}

export interface PageMeta {
  title: string; // Заголовок страницы
  description?: string; // Описание для SEO
  keywords?: string[]; // Ключевые слова
  ogImage?: string; // Open Graph изображение
  canonical?: string; // Каноническая ссылка
  robots?: string; // Директивы для роботов
}

export interface AccessControl {
  roles?: string[]; // Разрешенные роли
  permissions?: string[]; // Требуемые права
  redirectTo?: string; // Куда перенаправить при отказе
  customCheck?: string; // Имя кастомной функции проверки
}

/**
 * Состояние страницы по умолчанию
 */
export interface PageState {
  loading?: boolean; // Флаг загрузки
  error?: string | null; // Ошибка
  initialized?: boolean; // Флаг инициализации
  [key: string]: any; // Произвольные данные
}
```

### 2.4 Секция (Section)

```typescript
// types/section.ts

export interface Section extends BaseElement {
  type: "section";
  blocks: Block[]; // Блоки секции
  layout?: LayoutConfig; // Макет секции
  visibility?: VisibilityRule; // Правила видимости
  className?: string; // CSS класс
  style?: React.CSSProperties; // Inline стили
  animation?: AnimationConfig; // Анимация появления
  anchor?: string; // Якорь для навигации
}

export interface AnimationConfig {
  type: "fade" | "slide" | "zoom" | "none";
  duration?: number; // Длительность (мс)
  delay?: number; // Задержка (мс)
  easing?: string; // Функция сглаживания
}

/**
 * Состояние секции по умолчанию
 */
export interface SectionState {
  visible?: boolean; // Видимость
  collapsed?: boolean; // Свернута ли секция
  [key: string]: any;
}
```

### 2.5 Блок (Block)

```typescript
// types/block.ts

export interface Block extends BaseElement {
  type: "block";
  blockType: BlockType; // Тип блока (определяет структуру)
  components: Component[]; // Компоненты блока
  layout?: LayoutConfig; // Макет блока
  className?: string;
  style?: React.CSSProperties;
  wrapper?: WrapperConfig; // Обертка блока
}

/**
 * Типы блоков - определяют преднастроенные структуры
 */
export type BlockType =
  | "header" // Шапка с логотипом, меню, действиями
  | "hero" // Геройский блок с крупным контентом
  | "stats" // Статистические карточки
  | "table" // Таблица с данными
  | "form" // Форма ввода
  | "card-grid" // Сетка карточек
  | "sidebar" // Боковая панель
  | "footer" // Подвал
  | "tabs" // Вкладки
  | "wizard" // Пошаговая форма
  | "kanban" // Канбан-доска
  | "timeline" // Временная шкала
  | "chat" // Чат-интерфейс
  | "dashboard-widget" // Виджет дашборда
  | "custom"; // Произвольный блок

export interface WrapperConfig {
  component: "Card" | "Panel" | "Fieldset" | "Toolbar" | "div";
  props?: Record<string, any>; // Пропсы обертки
}

/**
 * Состояние блока по умолчанию
 */
export interface BlockState {
  loading?: boolean;
  data?: any;
  [key: string]: any;
}
```

### 2.6 Компонент (Component)

```typescript
// types/component.ts

export interface Component extends BaseElement {
  type: "component";
  componentType: ComponentType; // Тип компонента
  props?: ComponentProps; // Пропсы компонента
  bindings?: DataBinding[]; // Привязки данных
  validation?: ValidationRule[]; // Правила валидации
  commands?: Command[]; // Команды компонента
  events?: EventHandler[]; // Обработчики событий
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Типы компонентов на базе PrimeReact
 */
export type ComponentType =
  // Формы
  | "InputText"
  | "InputNumber"
  | "InputTextarea"
  | "Password"
  | "Dropdown"
  | "MultiSelect"
  | "AutoComplete"
  | "Calendar"
  | "Checkbox"
  | "RadioButton"
  | "InputSwitch"
  | "Slider"
  | "Rating"
  | "ColorPicker"
  | "FileUpload"

  // Кнопки
  | "Button"
  | "SplitButton"
  | "SpeedDial"

  // Данные
  | "DataTable"
  | "TreeTable"
  | "DataView"
  | "PickList"
  | "OrderList"
  | "Tree"
  | "Timeline"

  // Панели
  | "Card"
  | "Panel"
  | "Fieldset"
  | "Toolbar"
  | "Accordion"
  | "TabView"
  | "ScrollPanel"
  | "Divider"

  // Оверлеи
  | "Dialog"
  | "Sidebar"
  | "OverlayPanel"
  | "ConfirmDialog"
  | "Toast"

  // Меню
  | "Menubar"
  | "Menu"
  | "TieredMenu"
  | "Breadcrumb"
  | "Steps"
  | "TabMenu"
  | "PanelMenu"

  // Графики
  | "Chart"

  // Медиа
  | "Image"
  | "Galleria"
  | "Carousel"

  // Сообщения
  | "Message"
  | "Messages"
  | "InlineMessage"

  // Разное
  | "ProgressBar"
  | "ProgressSpinner"
  | "Badge"
  | "Tag"
  | "Chip"
  | "Avatar"
  | "AvatarGroup"
  | "Skeleton"

  // Кастомные
  | "Text" // Простой текст
  | "HTML" // HTML контент
  | "Icon" // Иконка
  | "Spacer" // Распорка
  | "Container"; // Контейнер

export type ComponentProps = Record<string, any>;

/**
 * Привязка данных к компоненту
 */
export interface DataBinding {
  source: ElementPath; // Откуда брать данные
  target: string; // Куда записывать (путь в props/state)
  transform?: TransformFunction; // Функция трансформации
  mode?: "one-way" | "two-way"; // Режим привязки
  debounce?: number; // Задержка для two-way (мс)
}

export type TransformFunction =
  | "identity" // Без изменений
  | "toString" // К строке
  | "toNumber" // К числу
  | "toBoolean" // К булеву
  | "toDate" // К дате
  | "toArray" // К массиву
  | "toObject" // К объекту
  | "jsonParse" // JSON.parse
  | "jsonStringify" // JSON.stringify
  | "uppercase" // Верхний регистр
  | "lowercase" // Нижний регистр
  | "trim" // Удалить пробелы
  | "length" // Длина массива/строки
  | "reverse" // Реверс массива
  | "sort" // Сортировка массива
  | "filter" // Фильтрация массива
  | "map" // Преобразование массива
  | "first" // Первый элемент
  | "last" // Последний элемент
  | "sum" // Сумма чисел
  | "average" // Среднее значение
  | "min" // Минимум
  | "max" // Максимум
  | { custom: string }; // Кастомная функция

/**
 * Правило валидации
 */
export interface ValidationRule {
  type: ValidationType;
  message: string;
  params?: Record<string, any>;
}

export type ValidationType =
  | "required"
  | "email"
  | "url"
  | "pattern" // regex
  | "min" // минимальное значение
  | "max" // максимальное значение
  | "minLength"
  | "maxLength"
  | "custom"; // кастомная валидация

/**
 * Обработчик события
 */
export interface EventHandler {
  event: EventType; // Тип события
  commands: Command[]; // Команды для выполнения
  preventDefault?: boolean; // Отменить действие по умолчанию
  stopPropagation?: boolean; // Остановить всплытие
}

export type EventType =
  | "onClick"
  | "onChange"
  | "onFocus"
  | "onBlur"
  | "onSubmit"
  | "onSelect"
  | "onUpload"
  | "onRowClick"
  | "onRowSelect"
  | "onPageChange"
  | "onSort"
  | "onFilter"
  | "onExpand"
  | "onCollapse"
  | "onHide"
  | "onShow";

/**
 * Состояние компонента по умолчанию
 */
export interface ComponentState {
  value?: any; // Значение для форм
  data?: any; // Данные для отображения
  loading?: boolean;
  disabled?: boolean;
  visible?: boolean;
  error?: string | null;
  [key: string]: any;
}
```

---

## 3. КОМАНДЫ

### 3.1 Базовая структура команды

```typescript
// types/commands.ts

export interface Command {
  id: string; // Уникальный ID команды
  type: CommandType; // Тип команды
  params: Record<string, any>; // Параметры команды
  description?: string; // Описание для документации
  trigger?: CommandTrigger; // Триггер выполнения
  conditions?: Condition[]; // Условия выполнения
  onSuccess?: Command[]; // Команды при успехе
  onError?: Command[]; // Команды при ошибке
  timeout?: number; // Таймаут (мс)
  retry?: RetryConfig; // Настройки повторов
}

export interface CommandTrigger {
  type: TriggerType;
  delay?: number; // Задержка перед выполнением (мс)
  interval?: number; // Интервал для периодического выполнения
  condition?: Condition; // Условие для срабатывания
}

export type TriggerType =
  | "onLoad" // При загрузке страницы/компонента
  | "onUnload" // При выгрузке
  | "onClick" // По клику
  | "onChange" // При изменении значения
  | "onSubmit" // При отправке формы
  | "onTimer" // По таймеру
  | "onCondition" // При выполнении условия
  | "manual"; // Ручной вызов

export interface RetryConfig {
  attempts: number; // Количество попыток
  delay: number; // Задержка между попытками (мс)
  backoff?: "linear" | "exponential"; // Стратег��я увеличения задержки
}

/**
 * Условие выполнения
 */
export interface Condition {
  path: ElementPath; // Путь к проверяемому значению
  operator: ConditionOperator; // Оператор сравнения
  value?: any; // Значение для сравнения
  logicalOp?: "AND" | "OR"; // Логическая операция с next
  next?: Condition; // Следующее условие
}

export type ConditionOperator =
  | "==" // Равно
  | "!=" // Не равно
  | ">" // Больше
  | "<" // Меньше
  | ">=" // Больше или равно
  | "<=" // Меньше или равно
  | "includes" // Содержит (массив/строка)
  | "notIncludes" // Не содержит
  | "exists" // Существует
  | "notExists" // Не существует
  | "isEmpty" // Пустое значение
  | "isNotEmpty" // Не пустое значение
  | "matches" // Соответствует regex
  | "startsWith" // Начинается с
  | "endsWith"; // Заканчивается на
```

### 3.2 Типы команд

```typescript
export type CommandType =
  // Управление состоянием
  | "setState" // Установить состояние
  | "mergeState" // Слить с состоянием
  | "clearState" // Очистить состояние
  | "toggleState" // Переключить булево значение

  // Работа с данными
  | "apiRequest" // HTTP запрос
  | "getData" // Получить данные из состояния
  | "setData" // Установить данные
  | "transformData" // Трансформировать данные
  | "validateData" // Валидировать данные

  // Навигация
  | "navigate" // Перейти на страницу
  | "goBack" // Назад в истории
  | "goForward" // Вперед в истории
  | "scrollTo" // Прокрутить к элементу
  | "openUrl" // Открыть URL

  // UI взаимодействие
  | "showDialog" // Показать диалог
  | "hideDialog" // Скрыть диалог
  | "showToast" // Показать уведомление
  | "confirm" // Запросить подтверждение

  // Управление потоком
  | "sequence" // Последовательность команд
  | "parallel" // Параллельное выполнение
  | "conditional" // Условное выполнение
  | "loop" // Цикл
  | "delay" // Задержка
  | "debounce" // Дебаунс
  | "throttle" // Троттлинг

  // Утилиты
  | "log" // Логирование
  | "emit" // Испустить событие
  | "custom"; // Кастомная команда

/**
 * CMD-1: Установка состояния
 */
export interface SetStateCommand extends Command {
  type: "setState";
  params: {
    target: ElementPath; // Целевой элемент
    updates: Record<string, any>; // Обновления
    merge?: boolean; // Слить или заменить (default: false)
  };
}

/**
 * CMD-2: HTTP запрос
 */
export interface ApiRequestCommand extends Command {
  type: "apiRequest";
  params: {
    endpoint: string; // URL или имя из config.endpoints
    method: HttpMethod; // HTTP метод
    body?: any; // Тело запроса
    headers?: Record<string, string>; // Заголовки
    params?: Record<string, any>; // Query параметры
    storeIn?: ElementPath; // Куда сохранить результат
    transform?: TransformConfig; // Трансформация результата
    optimistic?: OptimisticUpdate; // Оптимистичное обновление
  };
}

export interface TransformConfig {
  type: "jmespath" | "jsonpath" | "custom";
  expression: string; // Выражение трансформации
}

export interface OptimisticUpdate {
  target: ElementPath;
  updates: Record<string, any>;
  rollbackOnError?: boolean;
}

/**
 * CMD-3: Навигация
 */
export interface NavigateCommand extends Command {
  type: "navigate";
  params: {
    to: string; // ID страницы или URL
    section?: string; // ID секции (якорь)
    replace?: boolean; // Заменить в истории
    state?: Record<string, any>; // Состояние для передачи
  };
}

/**
 * CMD-4: Показать диалог
 */
export interface ShowDialogCommand extends Command {
  type: "showDialog";
  params: {
    dialogId?: string; // ID существующего диалога
    header?: string; // Заголовок
    content?: DialogContent; // Содержимое
    footer?: DialogFooter; // Футер с кнопками
    modal?: boolean; // Модальное окно
    closable?: boolean; // Можно закрыть
    width?: string; // Ширина
    position?: "center" | "top" | "bottom" | "left" | "right";
  };
}

export interface DialogContent {
  type: "text" | "component" | "block";
  data: any;
}

export interface DialogFooter {
  buttons: DialogButton[];
}

export interface DialogButton {
  label: string;
  icon?: string;
  severity?: "success" | "info" | "warning" | "danger" | "secondary";
  commands?: Command[];
  closeOnClick?: boolean;
}

/**
 * CMD-5: Уведомление
 */
export interface ShowToastCommand extends Command {
  type: "showToast";
  params: {
    severity: "success" | "info" | "warn" | "error";
    summary: string;
    detail?: string;
    life?: number; // Время показа (мс)
    sticky?: boolean; // Не исчезает автоматически
  };
}

/**
 * CMD-6: Последовательность команд
 */
export interface SequenceCommand extends Command {
  type: "sequence";
  params: {
    commands: Command[]; // Команды для выполнения
    stopOnError?: boolean; // Остановить при ошибке
  };
}

/**
 * CMD-7: Параллельное выполнение
 */
export interface ParallelCommand extends Command {
  type: "parallel";
  params: {
    commands: Command[];
    waitAll?: boolean; // Ждать всех или первого
  };
}

/**
 * CMD-8: Условное выполнение
 */
export interface ConditionalCommand extends Command {
  type: "conditional";
  params: {
    condition: Condition;
    then?: Command | Command[]; // Если true
    else?: Command | Command[]; // Если false
  };
}

/**
 * CMD-9: Цикл
 */
export interface LoopCommand extends Command {
  type: "loop";
  params: {
    source: ElementPath; // Путь к массиву
    itemVar?: string; // Имя переменной элемента (default: 'item')
    indexVar?: string; // Имя переменной индекса (default: 'index')
    commands: Command[]; // Команды для каждого элемента
  };
}

/**
 * CMD-10: Трансформация данных
 */
export interface TransformDataCommand extends Command {
  type: "transformData";
  params: {
    source: ElementPath; // Откуда брать
    target: ElementPath; // Куда писать
    transform: TransformFunction | TransformConfig;
  };
}

/**
 * CMD-11: Валидация
 */
export interface ValidateDataCommand extends Command {
  type: "validateData";
  params: {
    target: ElementPath; // Что валидировать
    rules: ValidationRule[]; // Правила
    storeErrorsIn?: ElementPath; // Куда сохранить ошибки
  };
}

/**
 * CMD-12: Подтверждение
 */
export interface ConfirmCommand extends Command {
  type: "confirm";
  params: {
    message: string;
    header?: string;
    icon?: string;
    acceptLabel?: string;
    rejectLabel?: string;
    accept?: Command[]; // Команды при подтверждении
    reject?: Command[]; // Команды при отказе
  };
}

/**
 * CMD-13: Логирование
 */
export interface LogCommand extends Command {
  type: "log";
  params: {
    level: "debug" | "info" | "warn" | "error";
    message: string;
    data?: any;
  };
}

/**
 * CMD-14: Испустить событие
 */
export interface EmitCommand extends Command {
  type: "emit";
  params: {
    event: string; // Название события
    data?: any; // Данные события
    target?: "global" | ElementPath; // Куда испустить
  };
}

/**
 * CMD-15: Задержка
 */
export interface DelayCommand extends Command {
  type: "delay";
  params: {
    duration: number; // Длительность (мс)
  };
}

/**
 * CMD-16: Скроллинг
 */
export interface ScrollToCommand extends Command {
  type: "scrollTo";
  params: {
    target: ElementPath | "top" | "bottom";
    behavior?: "smooth" | "auto";
    block?: "start" | "center" | "end" | "nearest";
  };
}
```

---

## 4. ПРИНЦИПЫ ВЗАИМОДЕЙСТВИЯ ЭЛЕМЕНТОВ

### 4.1 Система адресации

```typescript
/**
 * ПРИНЦИП 1: Иерархическая адресация
 *
 * Путь строится от корня к целевому элементу через точку:
 * appId.pageId.sectionId.blockId.componentId
 *
 * Примеры:
 * - "dashboard" → страница dashboard
 * - "dashboard.header" → секция header на странице dashboard
 * - "dashboard.header.logo" → блок logo в секции header
 * - "dashboard.header.logo.image" → компонент image в блоке logo
 */

/**
 * ПРИНЦИП 2: Доступ к состоянию
 *
 * Для доступа к state добавляется .state. после ID элемента:
 * elementPath.state.fieldName.nestedField
 *
 * Примеры:
 * - "dashboard.state.loading" → поле loading в state страницы
 * - "users.table.state.data" → данные таблицы
 * - "form.input1.state.value" → значение инпута
 */

/**
 * ПРИНЦИП 3: Относительные пути
 *
 * Из команды компонента можно обращаться относительно:
 * - "../state.data" → состояние родительского блока
 * - "../../state.users" → состояние секции
 * - "./state.value" → собственное состояние
 */

/**
 * ПРИНЦИП 4: Wildcard селекторы
 *
 * Для массовых операций:
 * - "*.section1.state.visible" → visible всех section1 на всех страницах
 * - "dashboard.*.state.loading" → loading всех секций на dashboard
 */

/**
 * ПРИНЦИП 5: Глобальное состояние
 *
 * Доступно через префикс global:
 * - "global.user.name" → имя пользователя
 * - "global.auth.token" → токен авторизации
 * - "global.cache.users" → закэшированные пользователи
 */
```

### 4.2 Привязка данных (Data Binding)

```typescript
/**
 * ПРИНЦИП 6: One-way binding (односторонняя)
 *
 * Данные текут от источника к компоненту.
 * При изменении источника обновляется компонент.
 * Изменения в компоненте НЕ влияют на источник.
 */
const oneWayBinding: DataBinding = {
  source: "users.table.state.data",
  target: "state.data",
  mode: "one-way",
};

/**
 * ПРИНЦИП 7: Two-way binding (двусторонняя)
 *
 * Синхронизация в обе стороны.
 * Используется для форм.
 */
const twoWayBinding: DataBinding = {
  source: "form.state.username",
  target: "state.value",
  mode: "two-way",
  debounce: 300, // Задерж��а перед обновлением источника
};

/**
 * ПРИНЦИП 8: Трансформация при привязке
 *
 * Данные могут быть преобразованы при передаче
 */
const transformedBinding: DataBinding = {
  source: "api.state.users",
  target: "state.options",
  transform: "map", // Преобразовать массив
  mode: "one-way",
};
```

### 4.3 Выполнение команд

```typescript
/**
 * ПРИНЦИП 9: Цепочки команд
 *
 * Команды выполняются последовательно.
 * Результат предыдущей доступен в следующей через context.previousResult
 */
const commandChain: SequenceCommand = {
  id: "loadUserData",
  type: "sequence",
  params: {
    commands: [
      {
        id: "setLoading",
        type: "setState",
        params: {
          target: "dashboard.state.loading",
          updates: { loading: true },
        },
      },
      {
        id: "fetchUsers",
        type: "apiRequest",
        params: {
          endpoint: "/users",
          method: "GET",
          storeIn: "dashboard.state.users",
        },
      },
      {
        id: "unsetLoading",
        type: "setState",
        params: {
          target: "dashboard.state.loading",
          updates: { loading: false },
        },
      },
    ],
  },
};

/**
 * ПРИНЦИП 10: Условное выполнение
 *
 * Команды выполняются только при соблюдении условий
 */
const conditionalExecution: ConditionalCommand = {
  id: "saveIfValid",
  type: "conditional",
  params: {
    condition: {
      path: "form.state.valid",
      operator: "==",
      value: true,
    },
    then: {
      id: "save",
      type: "apiRequest",
      params: {
        endpoint: "/users",
        method: "POST",
        body: { source: "form.state.data" },
      },
    },
    else: {
      id: "showError",
      type: "showToast",
      params: {
        severity: "error",
        summary: "Форма содержит ошибки",
      },
    },
  },
};

/**
 * ПРИНЦИП 11: Обработка ошибок
 *
 * Каждая команда может иметь обработчики успеха и ошибки
 */
const commandWithHandlers: ApiRequestCommand = {
  id: "deleteUser",
  type: "apiRequest",
  params: {
    endpoint: "/users/:id",
    method: "DELETE",
  },
  onSuccess: [
    {
      id: "showSuccess",
      type: "showToast",
      params: {
        severity: "success",
        summary: "Пользователь удален",
      },
    },
    {
      id: "refreshList",
      type: "apiRequest",
      params: {
        endpoint: "/users",
        method: "GET",
        storeIn: "users.state.data",
      },
    },
  ],
  onError: [
    {
      id: "showError",
      type: "showToast",
      params: {
        severity: "error",
        summary: "Ошибка удаления",
      },
    },
  ],
};
```

### 4.4 Реактивность

```typescript
/**
 * ПРИНЦИП 12: Автоматический ре-рендер
 *
 * При изменении state элемента:
 * 1. Обновляется сам элемент
 * 2. Обновляются все элементы с bindings на этот state
 * 3. Проверяются и обновляются visibility rules
 * 4. Выполняются команды с trigger: onCondition
 */

/**
 * ПРИНЦИП 13: Оптимизация рендеринга
 *
 * - Используется React.memo для компонентов
 * - Shallow comparison для props и state
 * - Виртуализация для больших списков
 * - Debounce для частых обновлений
 */

/**
 * ПРИНЦИП 14: Изоляция состояний
 *
 * - Каждый элемент имеет собственное состояние
 * - Состояния не влияют друг на друга напрямую
 * - Взаимодействие только через команды и bindings
 * - Глобальное состояние для общих данных
 */
```

---

## 5. УКАЗАНИЯ АГЕНТУ ПО РАЗРАБОТКЕ

### 5.1 Последовательность разработки

```
ЭТАП 1: Настройка проекта (1 день)
├─ 1.1. Инициализация Next.js проекта с TypeScript
├─ 1.2. Установка зависимостей: PrimeReact, axios, zod
├─ 1.3. Настройка ESLint, Prettier
├─ 1.4. Настройка Docker-окружения
└─ 1.5. Создание базовой структуры папок

ЭТАП 2: Типизация (2 дня)
├─ 2.1. Создание всех TypeScript типов из раздела 2
├─ 2.2. Создание Zod схем для валидации JSON
├─ 2.3. Написание утилит для type guards
└─ 2.4. Документация типов с JSDoc

ЭТАП 3: Ядро системы (5 дней)
├─ 3.1. PathResolver - система адресации
│   ├─ resolve(path) - получение элемента
│   ├─ resolveValue(path) - получение значения из state
│   ├─ setValue(path, value) - установка значения
│   └─ Тесты для PathResolver
├─ 3.2. EventBus - шина событий
│   ├─ on/off/emit методы
│   ├─ Типизированные события
│   └─ Тесты для EventBus
├─ 3.3. StateManager - управление состоянием
│   ├─ Подписка на изменения
│   ├─ Batching обновлений
│   ├─ История изменений для отладки
│   └─ Тесты для StateManager
└─ 3.4. CommandExecutor - выполнение команд
    ├─ Реализация всех типов команд
    ├─ Обработка условий и триггеров
    ├─ Error handling и retry logic
    └─ Тесты для CommandExecutor

ЭТАП 4: API и данные (3 дня)
├─ 4.1. ApiClient - HTTP клиент
│   ├─ Axios wrapper с retry
│   ├─ Interceptors для auth
│   ├─ Кэширование запросов
│   └─ Тесты с mock server
├─ 4.2. DataTransformer - трансформации
│   ├─ Встроенные функции трансформации
│   ├─ JMESPath/JSONPath поддержка
│   └─ Тесты трансформаций
└─ 4.3. ValidationEngine - валидация
    ├─ Реализация правил валидации
    ├─ Интеграция с Zod
    └─ Тесты валидации

ЭТАП 5: React компоненты (7 дней)
├─ 5.1. CRMRenderer - главный рендерер
├─ 5.2. PageRenderer - рендер страниц
├─ 5.3. SectionRenderer - рендер секций
├─ 5.4. BlockRenderer - рендер блоков
├─ 5.5. ComponentRenderer - фабрика компонентов
├─ 5.6. Обертки для PrimeReact компонентов (30+ штук)
│   ├─ InputText, InputNumber, Dropdown...
│   ├─ DataTable с поддержкой всех фич
│   ├─ Dialog, Toast, Confirm...
│   └─ Каждый компонент с bindings и commands
└─ 5.7. Тесты компонентов с React Testing Library

ЭТАП 6: Роутинг и навигация (2 дня)
├─ 6.1. Next.js App Router интеграция
├─ 6.2. Динамические роуты из конфигурации
├─ 6.3. Middleware для access control
└─ 6.4. Навигационные команды

ЭТАП 7: Загрузка конфигурации (3 дня)
├─ 7.1. ConfigLoader - загрузка JSON
├─ 7.2. Валидация конфигурации
├─ 7.3. Hot-reload в dev режиме
├─ 7.4. ConfigBuilder - программное создание конфига
└─ 7.5. Миграции конфигураций

ЭТАП 8: UI и стилизация (3 дня)
├─ 8.1. Настройка PrimeReact темы
├─ 8.2. Светлая/темная тема
├─ 8.3. Адаптивные стили
├─ 8.4. Анимации и transitions
└─ 8.5. Accessibility (a11y)

ЭТАП 9: Оптимизация (2 дня)
├─ 9.1. Ленивая загрузка страниц
├─ 9.2. Code splitting
├─ 9.3. Виртуализация списков
├─ 9.4. Мемоизация компонентов
└─ 9.5. Bundle size анализ

ЭТАП 10: Документация и примеры (3 дня)
├─ 10.1. README с quick start
├─ 10.2. API документация
├─ 10.3. Примеры конфигураций
│   ├─ Простая CRUD страница
│   ├─ Dashboard с графиками
│   ├─ Форма с валидацией
│   ├─ Мастер-детальный вид
│   └─ Kanban доска
└─ 10.4. Storybook для компонентов

ЭТАП 11: Тестирование (3 дня)
├─ 11.1. Unit тесты (coverage > 80%)
├─ 11.2. Integration тесты
├─ 11.3. E2E тесты с Playwright
└─ 11.4. Performance тесты

ЭТАП 12: DevOps (2 дня)
├─ 12.1. Dockerfile и docker-compose
├─ 12.2. CI/CD pipeline
├─ 12.3. Мониторинг и логирование
└─ 12.4. Deployment инструкции

Итого: ~37 дней разработки
```

### 5.2 Правила написания кода

````typescript
/**
 * ПРАВИЛО 1: Строгая типизация
 * ❌ ПЛОХО
 */
function processData(data: any) {
  return data.items.map((item: any) => item.name);
}

/**
 * ✅ ХОРОШО
 */
interface DataResponse {
  items: Array<{ id: string; name: string }>;
}

function processData(data: DataResponse): string[] {
  return data.items.map(item => item.name);
}

/**
 * ПРАВИЛО 2: Никогда не использовать any
 * Используй unknown если тип действительно неизвестен
 */
// ❌ ПЛОХО
function parseJson(json: string): any {
  return JSON.parse(json);
}

// ✅ ХОРОШО
function parseJson<T>(json: string, validator: (data: unknown) => data is T): T {
  const parsed: unknown = JSON.parse(json);
  if (!validator(parsed)) {
    throw new Error('Invalid JSON structure');
  }
  return parsed;
}

/**
 * ПРАВИЛО 3: Обязательная обработка ошибок
 */
// ❌ ПЛОХО
async function fetchData(url: string) {
  const response = await fetch(url);
  return response.json();
}

// ✅ ХОРОШО
async function fetchData<T>(url: string): Promise<Result<T, Error>> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      return {
        ok: false,
        error: new Error(`HTTP ${response.status}: ${response.statusText}`)
      };
    }
    const data = await response.json();
    return { ok: true, value: data };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error : new Error(String(error))
    };
  }
}

type Result<T, E> =
  | { ok: true; value: T }
  | { ok: false; error: E };

/**
 * ПРАВИЛО 4: Функциональный стиль
 * Предпочитай immutable операции
 */
// ❌ ПЛОХО
function updateUser(users: User[], id: string, updates: Partial<User>) {
  const user = users.find(u => u.id === id);
  if (user) {
    Object.assign(user, updates);
  }
  return users;
}

// ✅ ХОРОШО
function updateUser(users: User[], id: string, updates: Partial<User>): User[] {
  return users.map(user =>
    user.id === id
      ? { ...user, ...updates }
      : user
  );
}

/**
 * ПРАВИЛО 5: JSDoc для всех публичных API
 */
/**
 * Resolves an element by its hierarchical path
 *
 * @param path - Dot-separated path to the element (e.g., "page1.section2.block3")
 * @returns The resolved element or null if not found
 *
 * @example
 * ```ts
 * const element = resolver.resolve("dashboard.header.logo");
 * if (element) {
 *   console.log(element.state);
 * }
 * ```
 */
resolve(path: ElementPath): BaseElement | null {
  // implementation
}

/**
 * ПРАВИЛО 6: Константы вместо magic values
 */
// ❌ ПЛОХО
if (status === 200) {
  // ...
}

// ✅ ХОРОШО
const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  NOT_FOUND: 404,
  INTERNAL_ERROR: 500,
} as const;

if (status === HTTP_STATUS.OK) {
  // ...
}

/**
 * ПРАВИЛО 7: Разделение ответственности
 * Одна функция = одна задача
 */
// ❌ ПЛОХО
function handleFormSubmit(formData: FormData) {
  // Валидация
  if (!formData.email.includes('@')) {
    throw new Error('Invalid email');
  }

  // Трансформация
  const payload = {
    email: formData.email.toLowerCase(),
    name: formData.name.trim()
  };

  // HTTP запрос
  fetch('/api/users', {
    method: 'POST',
    body: JSON.stringify(payload)
  });

  // UI обновление
  showToast('User created');
}

// ✅ ХОРОШО
function validateEmail(email: string): boolean {
  return email.includes('@');
}

function transformFormData(formData: FormData): UserPayload {
  return {
    email: formData.email.toLowerCase(),
    name: formData.name.trim()
  };
}

async function createUser(payload: UserPayload): Promise<Result<User, Error>> {
  // implementation
}

function showSuccessToast(message: string): void {
  // implementation
}

async function handleFormSubmit(formData: FormData): Promise<void> {
  if (!validateEmail(formData.email)) {
    throw new ValidationError('Invalid email');
  }

  const payload = transformFormData(formData);
  const result = await createUser(payload);

  if (result.ok) {
    showSuccessToast('User created');
  } else {
    handleError(result.error);
  }
}

/**
 * ПРАВИЛО 8: Именование переменных
 * - Переменные: camelCase (userData, isLoading)
 * - Константы: UPPER_SNAKE_CASE (MAX_RETRY_ATTEMPTS)
 * - Типы/Интерфейсы: PascalCase (UserData, ApiResponse)
 * - Приватные поля: _camelCase (_internalState)
 * - Булевы: is/has/can префикс (isVisible, hasData, canEdit)
 */

/**
 * ПРАВИЛО 9: Комментарии только для "почему", не "что"
 */
// ❌ ПЛОХО
// Increment counter by 1
counter++;

// ✅ ХОРОШО
// Increment to match server-side pagination offset
counter++;

/**
 * ПРАВИЛО 10: Обязательные линтеры
 * - ESLint с strict конфигурацией
 * - TypeScript strict mode
 * - Prettier для форматирования
 * - No warnings в production build
 */
````

### 5.3 Структура проекта

```
crm-platform/
├── src/
│   ├── app/                      # Next.js App Router
│   │   ├── [pageId]/            # Динамические страницы
│   │   │   └── page.tsx
│   │   ├── layout.tsx
│   │   ├── globals.css
│   │   └── api/                 # API routes
│   │       └── config/
│   │           └── route.ts
│   │
│   ├── components/              # React компоненты
│   │   ├── core/                # Основные рендереры
│   │   │   ├── CRMRenderer.tsx
│   │   │   ├── PageRenderer.tsx
│   │   │   ├── SectionRenderer.tsx
│   │   │   ├── BlockRenderer.tsx
│   │   │   └── ComponentRenderer.tsx
│   │   │
│   │   ├── ui/                  # Обертки над PrimeReact
│   │   │   ├── forms/
│   │   │   │   ├── InputTextComponent.tsx
│   │   │   │   ├── DropdownComponent.tsx
│   │   │   │   └── ...
│   │   │   ├── data/
│   │   │   │   ├── DataTableComponent.tsx
│   │   │   │   ├── TreeTableComponent.tsx
│   │   │   │   └── ...
│   │   │   ├── panels/
│   │   │   │   ├── CardComponent.tsx
│   │   │   │   ├── DialogComponent.tsx
│   │   │   │   └── ...
│   │   │   └── index.ts
│   │   │
│   │   └── blocks/              # Предопределенные блоки
│   │       ├── HeaderBlock.tsx
│   │       ├── StatsBlock.tsx
│   │       └── ...
│   │
│   ├── core/                    # Ядро системы
│   │   ├── PathResolver.ts
│   │   ├── StateManager.ts
│   │   ├── CommandExecutor.ts
│   │   ├── EventBus.ts
│   │   ├── ApiClient.ts
│   │   ├── DataTransformer.ts
│   │   ├── ValidationEngine.ts
│   │   └── ConfigLoader.ts
│   │
│   ├── types/                   # TypeScript типы
│   │   ├── base.ts
│   │   ├── app.ts
│   │   ├── page.ts
│   │   ├── section.ts
│   │   ├── block.ts
│   │   ├── component.ts
│   │   ├── commands.ts
│   │   └── index.ts
│   │
│   ├── schemas/                 # Zod схемы валидации
│   │   ├── app.schema.ts
│   │   ├── page.schema.ts
│   │   └── ...
│   │
│   ├── hooks/                   # React hooks
│   │   ├── useCommandExecutor.ts
│   │   ├── usePathResolver.ts
│   │   ├── useStateManager.ts
│   │   ├── useDataBinding.ts
│   │   └── useVisibility.ts
│   │
│   ├── contexts/                # React contexts
│   │   ├── CRMContext.tsx
│   │   └── ThemeContext.tsx
│   │
│   ├── utils/                   # Утилиты
│   │   ├── type-guards.ts
│   │   ├── formatters.ts
│   │   ├── validators.ts
│   │   └── helpers.ts
│   │
│   ├── constants/               # Константы
│   │   ├── commands.ts
│   │   ├── components.ts
│   │   └── http.ts
│   │
│   └── lib/                     # Внешние библиотеки
│       └── jmespath.ts
│
├── public/                      # Статика
│   └── configs/                 # JSON конфигурации
│       ├── example-crud.json
│       ├── example-dashboard.json
│       └── schema.json
│
├── tests/                       # Тесты
│   ├── unit/
│   │   ├── core/
│   │   └── utils/
│   ├── integration/
│   └── e2e/
│
├── docs/                        # Документация
│   ├── api/
│   ├── guides/
│   └── examples/
│
├── docker/
│   ├── Dockerfile
│   └── docker-compose.yml
│
├── .eslintrc.json
├── .prettierrc
├── tsconfig.json
├── next.config.js
├── package.json
└── README.md
```

### 5.4 Требования к тестам

```typescript
/**
 * TEST-1: Unit тесты для всех core модулей
 * Coverage >= 80%
 */

// Пример теста PathResolver
describe("PathResolver", () => {
  let app: App;
  let resolver: PathResolver;

  beforeEach(() => {
    app = createMockApp();
    resolver = new PathResolver(app);
  });

  describe("resolve", () => {
    it("should resolve page by id", () => {
      const page = resolver.resolve("dashboard");
      expect(page).toBeDefined();
      expect(page?.type).toBe("page");
      expect(page?.id).toBe("dashboard");
    });

    it("should resolve nested component", () => {
      const component = resolver.resolve("dashboard.header.logo.image");
      expect(component).toBeDefined();
      expect(component?.type).toBe("component");
    });

    it("should return null for invalid path", () => {
      const result = resolver.resolve("nonexistent.path");
      expect(result).toBeNull();
    });
  });

  describe("resolveValue", () => {
    it("should resolve state value", () => {
      const value = resolver.resolveValue("dashboard.state.loading");
      expect(value).toBe(false);
    });

    it("should resolve nested state value", () => {
      const value = resolver.resolveValue("dashboard.header.state.user.name");
      expect(value).toBe("John Doe");
    });
  });

  describe("setValue", () => {
    it("should set state value", () => {
      resolver.setValue("dashboard.state.loading", true);
      const value = resolver.resolveValue("dashboard.state.loading");
      expect(value).toBe(true);
    });

    it("should create nested path if not exists", () => {
      resolver.setValue("dashboard.state.newField.nested", "value");
      const value = resolver.resolveValue("dashboard.state.newField.nested");
      expect(value).toBe("value");
    });
  });
});

/**
 * TEST-2: Integration тесты для команд
 */
describe("CommandExecutor Integration", () => {
  it("should execute sequence of commands", async () => {
    const executor = setupExecutor();

    const sequence: SequenceCommand = {
      id: "test-sequence",
      type: "sequence",
      params: {
        commands: [
          {
            id: "set1",
            type: "setState",
            params: {
              target: "test.state.step",
              updates: { step: 1 },
            },
          },
          {
            id: "set2",
            type: "setState",
            params: {
              target: "test.state.step",
              updates: { step: 2 },
            },
          },
        ],
      },
    };

    await executor.execute(sequence);

    const value = resolver.resolveValue("test.state.step");
    expect(value.step).toBe(2);
  });
});

/**
 * TEST-3: E2E тесты с Playwright
 */
test("should load page from config and render components", async ({ page }) => {
  await page.goto("/dashboard");

  // Проверка загрузки страницы
  await expect(page.locator('[data-page-id="dashboard"]')).toBeVisible();

  // Проверка рендера компонентов
  await expect(page.locator('[data-component-type="DataTable"]')).toBeVisible();

  // Проверка интерактивности
  await page.click('button:has-text("Refresh")');
  await expect(page.locator(".p-datatable-loading")).toBeVisible();
  await expect(page.locator(".p-datatable-loading")).not.toBeVisible();
});
```

### 5.5 Чек-лист перед коммитом

```markdown
## Pre-commit Checklist

### Код

- [ ] Все типы определены, any не используется
- [ ] Все функции имеют JSDoc комментарии
- [ ] Обработка всех возможных ошибок
- [ ] Нет console.log (только logger)
- [ ] Нет закомментированного кода
- [ ] Именование соответствует convention

### Тесты

- [ ] Написаны unit тесты для новой логики
- [ ] Все тесты проходят (npm test)
- [ ] Coverage не уменьшился
- [ ] E2E тесты для новых фич

### Типизация

- [ ] TypeScript компилируется без ошибок
- [ ] Strict mode включен
- [ ] Нет ts-ignore комментариев (или обоснованы)

### Стиль

- [ ] ESLint: 0 errors, 0 warnings
- [ ] Prettier применен
- [ ] Нет дублирующегося кода

### Производительность

- [ ] Нет блокирующих операций в render
- [ ] Используется мемоизация где нужно
- [ ] Большие списки виртуализированы

### Безопасность

- [ ] Пользовательский ввод валидируется
- [ ] Нет SQL/XSS уязвимостей
- [ ] Секреты не в коде

### Документация

- [ ] README обновлен если нужно
- [ ] API docs актуальны
- [ ] Changelog обновлен
```

---

## 6. ДОПОЛНИТЕЛЬНЫЕ УКАЗАНИЯ

### 6.1 Работа с PrimeReact

```typescript
/**
 * Каждый wrapper компонент должен:
 * 1. Поддерживать bindings
 * 2. Обрабатывать commands
 * 3. Проксировать все PrimeReact props
 * 4. Иметь типизированный state
 */

// Пример обертки DataTable
export function DataTableComponent({
  component
}: {
  component: Component
}) {
  const [state, setState] = useState<DataTableState>(component.state);
  const executor = useCommandExecutor();
  const bindings = useDataBinding(component.bindings);

  // Применение bindings
  useEffect(() => {
    if (bindings.data) {
      setState(prev => ({ ...prev, data: bindings.data }));
    }
  }, [bindings.data]);

  // Обработка событий
  const handleRowClick = async (e: DataTableRowClickEvent) => {
    const commands = component.events?.find(
      ev => ev.event === 'onRowClick'
    )?.commands;

    if (commands) {
      for (const cmd of commands) {
        await executor.execute(cmd, { row: e.data });
      }
    }
  };

  return (
    <DataTable
      value={state.data}
      loading={state.loading}
      onRowClick={handleRowClick}
      {...component.props}
    />
  );
}
```

### 6.2 Обработка асинхронности

```typescript
/**
 * Все асинхронные операции должны:
 * 1. Использовать async/await
 * 2. Иметь try/catch
 * 3. Показывать loading state
 * 4. Обрабатывать отмену (AbortController)
 */

async function executeApiRequest(
  command: ApiRequestCommand,
  abortSignal?: AbortSignal,
): Promise<ApiResponse> {
  const targetPath = command.params.storeIn;

  // Установка loading
  if (targetPath) {
    pathResolver.setValue(`${targetPath}.loading`, true);
  }

  try {
    const response = await apiClient.request({
      ...command.params,
      signal: abortSignal,
    });

    // Сохранение результата
    if (targetPath) {
      pathResolver.setValue(targetPath, response.data);
    }

    return response;
  } catch (error) {
    if (error instanceof CanceledError) {
      // Запрос отменен - не ошибка
      return;
    }

    // Обработка ошибки
    if (targetPath) {
      pathResolver.setValue(`${targetPath}.error`, error.message);
    }

    throw error;
  } finally {
    // Снятие loading
    if (targetPath) {
      pathResolver.setValue(`${targetPath}.loading`, false);
    }
  }
}
```

### 6.3 Оптимизация производительности

```typescript
/**
 * 1. Мемоизация компонентов
 */
export const ComponentRenderer = memo(({ component }: Props) => {
  // ...
}, (prevProps, nextProps) => {
  // Кастомное сравнение
  return (
    prevProps.component.id === nextProps.component.id &&
    shallowEqual(prevProps.component.state, nextProps.component.state)
  );
});

/**
 * 2. Виртуализация больших списков
 */
import { VirtualScroller } from 'primereact/virtualscroller';

export function VirtualDataTable({ items }: Props) {
  return (
    <VirtualScroller
      items={items}
      itemSize={50}
      itemTemplate={(item) => <TableRow data={item} />}
    />
  );
}

/**
 * 3. Ленивая загрузка
 */
const HeavyComponent = lazy(() => import('./HeavyComponent'));

function ConditionalRender() {
  return (
    <Suspense fallback={<Skeleton />}>
      {condition && <HeavyComponent />}
    </Suspense>
  );
}

/**
 * 4. Debounce для поисков
 */
const debouncedSearch = useMemo(
  () => debounce((value: string) => {
    executeSearch(value);
  }, 300),
  []
);
```

### 6.4 Безопасность

```typescript
/**
 * 1. Санитизация HTML
 */
import DOMPurify from 'dompurify';

function HTMLComponent({ content }: Props) {
  const sanitized = DOMPurify.sanitize(content);
  return <div dangerouslySetInnerHTML={{ __html: sanitized }} />;
}

/**
 * 2. Валидация путей
 */
function validatePath(path: string): boolean {
  // Только буквы, цифры, точки, подчеркивания
  return /^[a-zA-Z0-9._]+$/.test(path);
}

/**
 * 3. CSRF токены для API
 */
apiClient.interceptors.request.use((config) => {
  const csrfToken = getCookie('csrf-token');
  if (csrfToken) {
    config.headers['X-CSRF-Token'] = csrfToken;
  }
  return config;
});

/**
 * 4. Content Security Policy
 */
// next.config.js
const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: "default-src 'self'; script-src 'self' 'unsafe-eval';"
  }
];
```

---

## 7. КРИТЕРИИ ПРИЕМКИ

### 7.1 Функциональные

- ✅ Загрузка и валидация JSON конфигурации
- ✅ Рендер всех типов компонентов PrimeReact
- ✅ Выполнение всех типов команд
- ✅ Работа системы адресации и bindings
- ✅ Корректная обработка ошибок
- ✅ Роутинг между страницами
- ✅ REST API интеграция
- ✅ Валидация форм
- ✅ Респонсивная верстка

### 7.2 Нефункциональные

- ✅ TypeScript strict mode без ошибок
- ✅ Test coverage >= 80%
- ✅ Lighthouse score >= 90
- ✅ Bundle size < 500KB (gzipped)
- ✅ First Contentful Paint < 1.5s
- ✅ Time to Interactive < 3s
- ✅ Нет memory leaks
- ✅ Accessibility score >= 95

### 7.3 Документация

- ✅ README с примерами
- ✅ API документация
- ✅ JSDoc для всех публичных API
- ✅ 5+ примеров конфигураций
- ✅ Deployment guide
- ✅ Troubleshooting guide

---

Начинай разработку с **ЭТАПА 1**. После завершения каждого этапа делай коммит с осмысленным сообщением. При возникновении вопросов - запрашивай уточнения.
