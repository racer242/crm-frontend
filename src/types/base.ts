/**
 * Базовые типы для CRM платформы
 */

/** Тип элемента в иерархии */
export type ElementType = "app" | "page" | "section" | "block" | "component";

/** Путь к элементу в иерархии */
export type ElementPath = string;

/** Базовый элемент - родитель всех элементов системы */
export interface BaseElement {
  id: string;
  type: ElementType;
  state?: Record<string, any>;
  params?: Record<string, any>;
  meta?: ElementMeta;
}

/** Метаданные элемента */
export interface ElementMeta {
  version?: string;
  createdAt?: string;
  updatedAt?: string;
  author?: string;
  description?: string;
  tags?: string[];
}

/** Правила видимости элемента */
export interface VisibilityRule {
  conditions: Condition[];
  defaultVisible?: boolean;
}

/** Конфигурация макета */
export interface LayoutConfig {
  type: "grid" | "flex" | "stack" | "custom";
  direction?: "row" | "column";
  gap?: number | string;
  padding?: number | string;
  columns?: number;
  rows?: number;
  alignItems?: "start" | "center" | "end" | "stretch";
  justifyContent?: "start" | "center" | "end" | "between" | "around";
}

/** Условие выполнения */
export interface Condition {
  path: ElementPath;
  operator: ConditionOperator;
  value?: any;
  logicalOp?: "AND" | "OR";
  next?: Condition;
}

/** Оператор сравнения */
export type ConditionOperator =
  | "=="
  | "!="
  | ">"
  | "<"
  | ">="
  | "<="
  | "includes"
  | "notIncludes"
  | "exists"
  | "notExists"
  | "isEmpty"
  | "isNotEmpty"
  | "matches"
  | "startsWith"
  | "endsWith";
