import { BaseElement, ElementPath, LayoutConfig, VisibilityRule } from "./base";
import { Block } from "./block";

/** Секция - контейнер для блоков */
export interface Section extends BaseElement {
  type: "section";
  blocks: Block[];
  layout?: LayoutConfig;
  visibility?: VisibilityRule;
  className?: string;
  style?: React.CSSProperties;
  anchor?: string;
}

/** Состояние секции */
export interface SectionState {
  visible?: boolean;
  collapsed?: boolean;
  [key: string]: any;
}
