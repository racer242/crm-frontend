import { BaseElement, LayoutConfig, VisibilityRule } from "./base";
import { Component } from "./component";
import { GridConfig } from "./grid";

/** Типы блоков */
export type BlockType =
  | "header"
  | "hero"
  | "stats"
  | "table"
  | "form"
  | "card-grid"
  | "sidebar"
  | "footer"
  | "tabs"
  | "wizard"
  | "kanban"
  | "timeline"
  | "chat"
  | "dashboard-widget"
  | "custom";

/** Блок - контейнер для компонентов */
export interface Block extends BaseElement {
  type: "block";
  components: Component[];
  layout?: LayoutConfig;
  className?: string;
  style?: React.CSSProperties;
  wrapper?: WrapperConfig;
  /** Настройка грид-раскладки. Если указана, компоненты оборачиваются в div с классами из grid.cols */
  grid?: GridConfig;
}

/** Конфигурация обертки блока */
export interface WrapperConfig {
  component: "Card" | "Panel" | "Fieldset" | "Toolbar" | "div";
  props?: Record<string, any>;
  className?: string;
  style?: React.CSSProperties;
}

/** Состояние блока */
export interface BlockState {
  loading?: boolean;
  data?: any;
  [key: string]: any;
}
