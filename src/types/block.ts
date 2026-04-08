import { BaseElement, LayoutConfig, VisibilityRule } from "./base";
import { Component } from "./component";

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
  blockType: BlockType;
  components: Component[];
  layout?: LayoutConfig;
  className?: string;
  style?: React.CSSProperties;
  wrapper?: WrapperConfig;
}

/** Конфигурация обертки блока */
export interface WrapperConfig {
  component: "Card" | "Panel" | "Fieldset" | "Toolbar" | "div";
  props?: Record<string, any>;
}

/** Состояние блока */
export interface BlockState {
  loading?: boolean;
  data?: any;
  [key: string]: any;
}
