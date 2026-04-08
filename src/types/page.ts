import { BaseElement, ElementPath, LayoutConfig } from "./base";
import { Command } from "./commands";
import { Section } from "./section";

/** Страница - основной элемент навигации */
export interface Page extends BaseElement {
  type: "page";
  route: string;
  sections: Section[];
  layout?: LayoutConfig;
  meta?: PageMeta;
  access?: AccessControl;
  onLoad?: Command[];
  onUnload?: Command[];
  onError?: Command[];
}

/** SEO метаданные */
export interface PageMeta {
  title: string;
  description?: string;
  keywords?: string[];
  ogImage?: string;
  canonical?: string;
  robots?: string;
}

/** Контроль доступа */
export interface AccessControl {
  roles?: string[];
  permissions?: string[];
  redirectTo?: string;
  customCheck?: string;
}

/** Состояние страницы */
export interface PageState {
  loading?: boolean;
  error?: string | null;
  initialized?: boolean;
  [key: string]: any;
}
