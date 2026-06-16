import { BaseElement, ElementPath, LayoutConfig, VisibilityRule } from "./base";
import { Block } from "./block";
import { GridConfig } from "./grid";

export type { GridConfig };

/** Секция - контейнер для блоков */
export interface Section extends BaseElement {
  type: "section";
  blocks: Block[];
  layout?: LayoutConfig;
  visibility?: VisibilityRule;
  className?: string;
  style?: React.CSSProperties;
  anchor?: string;
  /** Настройка грид-раскладки. Если указана, блоки оборачиваются в div с классами из grid.cols */
  grid?: GridConfig;
}

/** Состояние секции */
export interface SectionState {
  visible?: boolean;
  collapsed?: boolean;
  [key: string]: any;
}
