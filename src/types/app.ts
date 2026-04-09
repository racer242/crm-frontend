import { BaseElement } from "./base";

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
  label: string;
  icon: string;
  route: string;
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
  globalState: GlobalState;
  config: AppConfig;
}

/** Пункт меню пользователя */
export interface UserMenuItem {
  label: string;
  icon: string;
  route: string;
}

/** Конфигурация меню пользователя */
export interface UserMenuConfig {
  loginLabel: string;
  profileLabel: string;
  logoutLabel: string;
  items: UserMenuItem[];
}

/** Глобальное состояние */
export interface GlobalState {
  user?: UserData;
  auth?: AuthData;
  cache?: Record<string, any>;
  [key: string]: any;
}

/** Конфигурация приложения */
export interface AppConfig {
  name: string;
  version: string;
  api: ApiConfig;
  features?: FeatureFlags;
  routes?: RouteConfig[];
}

/** Конфигурация API */
export interface ApiConfig {
  baseURL: string;
  timeout?: number;
  headers?: Record<string, string>;
  retryAttempts?: number;
  retryDelay?: number;
  endpoints?: Record<string, EndpointConfig>;
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

/** Данные пользователя */
export interface UserData {
  id: string;
  name: string;
  email: string;
  role: string;
  permissions: string[];
  avatar?: string;
}

/** Данные авторизации */
export interface AuthData {
  token: string;
  refreshToken?: string;
  expiresAt: number;
  isAuthenticated: boolean;
}
