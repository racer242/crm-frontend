import { BaseElement, ElementPath, LayoutConfig } from "./base";
import { Command } from "./commands";
import { Section } from "./section";
import { DataFeedConfig } from "./datafeed";

/** Событие страницы */
export interface PageEvent {
  type: "onLoad" | "onUnload" | "onReady" | "onError";
  commands: Command[];
}

/** Страница - основной элемент навигации */
export interface Page extends BaseElement {
  type: "page";
  route: string;
  sections: Section[];
  layout?: LayoutConfig;
  meta?: PageMeta;
  access?: AccessControl;
  events?: PageEvent[];
  /** Data feed configurations for loading external API data on page load */
  dataFeed?: DataFeedConfig[];
  /** @deprecated Use events array instead */
  onLoad?: Command[];
  /** @deprecated Use events array instead */
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
