import { BaseElement, ElementPath, LayoutConfig, VisibilityRule } from "./base";
import { Block } from "./block";

/** Конфигурация грид-раскладки секции */
export interface GridConfig {
  /** Массив col-классов для каждого блока (например ["col-12 md:col-10", "col-12 md:col-2"]) */
  cols: string[];
  /** PrimeFlex padding-класс для wrapper-ов блоков (например "px-1") */
  padding?: string;
}

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
