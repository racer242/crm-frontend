import { BaseElement, ElementPath } from "./base";
import { Command } from "./commands";

/** Типы компонентов PrimeReact */
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
  | "Text"
  | "HTML"
  | "Icon"
  | "Spacer"
  | "Container";

/** Привязка данных */
export interface DataBinding {
  source: ElementPath;
  target: string;
  transform?: TransformFunction;
  mode?: "one-way" | "two-way";
  debounce?: number;
}

/** Функция трансформации */
export type TransformFunction =
  | "identity"
  | "toString"
  | "toNumber"
  | "toBoolean"
  | "toDate"
  | "toArray"
  | "jsonParse"
  | "jsonStringify"
  | "uppercase"
  | "lowercase"
  | "trim"
  | "length"
  | "reverse"
  | "sort"
  | "filter"
  | "map"
  | "first"
  | "last"
  | "sum"
  | "average"
  | "min"
  | "max"
  | { custom: string };

/** Правило валидации */
export interface ValidationRule {
  type: ValidationType;
  message: string;
  params?: Record<string, any>;
}

/** Тип валидации */
export type ValidationType =
  | "required"
  | "email"
  | "url"
  | "pattern"
  | "min"
  | "max"
  | "minLength"
  | "maxLength"
  | "custom";

/** Обработчик события */
export interface EventHandler {
  type: EventType;
  commands: Command[];
  preventDefault?: boolean;
  stopPropagation?: boolean;
}

/** Тип события */
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

/** Компонент с поддержкой динамических привязок */
export interface Component extends BaseElement {
  type: "component";
  componentType: ComponentType;

  /** Основное значение компонента (может быть binding: "@form.state.username") */
  value?: any;

  /** Пропсы PrimeReact (любое поле может быть binding: "@config.theme") */
  props?: Record<string, any>;

  /** Привязки данных */
  bindings?: DataBinding[];

  /** Правила валидации */
  validation?: ValidationRule[];

  /** Команды (альтернатива events) */
  commands?: Command[];

  /** Обработчики событий */
  events?: EventHandler[];

  className?: string;
  style?: React.CSSProperties;
}

/** Состояние компонента */
export interface ComponentState {
  value?: any;
  data?: any;
  loading?: boolean;
  disabled?: boolean;
  visible?: boolean;
  error?: string | null;
  [key: string]: any;
}
