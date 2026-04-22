import { BaseElement } from "./base";
import { ApiRouteConfig } from "./datafeed";

// Определяем типы локально чтобы избежать циклических импортов
// Page и Command импортируются через barrel exports в index.ts
interface PageStub {
  id: string;
  type: "page";
  route: string;
  [key: string]: any;
}

interface CommandStub {
  id: string;
  type: string;
  [key: string]: any;
}

/** Элемент навигации */
export interface NavItem {
  label?: string;
  icon?: string;
  route?: string;
  separator?: boolean;
}

/** Конфигурация навбара */
export interface NavbarConfig {
  id: string;
  items: NavItem[];
}

/** Приложение - корневой элемент */
export interface App extends BaseElement {
  type: "app";
  title?: string;
  pages: PageStub[];
  navbar?: NavbarConfig;
  userMenu?: UserMenuConfig;
  config: AppConfig;
}

/** Пункт меню пользователя */
export interface UserMenuItem {
  label?: string;
  icon?: string;
  route?: string;
  separator?: boolean;
}

/** Конфигурация меню пользователя */
export interface UserMenuConfig {
  loginLabel: string;
  profileLabel: string;
  items: UserMenuItem[];
  userName?: string;
  userRole?: string;
}

/** Конфигурация приложения */
export interface AppConfig {
  name: string;
  version: string;
  api: ApiConfig;
  features?: FeatureFlags;
  routes?: RouteConfig[];
  /** API router configurations: maps short route names to external API URLs */
  apiRoutes?: ApiRouteConfig[];
}

/** Конфигурация API */
export interface ApiConfig {
  baseURL: string;
  timeout?: number;
  headers?: Record<string, string>;
  retryAttempts?: number;
  retryDelay?: number;
}

/** Эндпоинт API */
export interface EndpointConfig {
  path: string;
  method: HttpMethod;
  cache?: boolean;
  cacheTTL?: number;
}

/** HTTP метод */
export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

/** Флаги функциональности */
export interface FeatureFlags {
  [key: string]: boolean;
}

/** Конфигурация роута */
export interface RouteConfig {
  path: string;
  pageId: string;
  exact?: boolean;
  middleware?: string[];
}
