/**
 * StateManager - управление состояниями элементов CRM
 *
 * Обеспечивает:
 * - Доступ к состоянию любого элемента по пути
 * - Обновление состояния с триггером ре-рендера
 * - Глобальное состояние
 * - Поддержку относительных путей
 */

import { BaseElement, ElementPath, App } from "@/types";
import { PathResolver } from "./PathResolver";

/** Callback для уведомлений об изменениях */
export type StateChangeListener = (
  elementPath: ElementPath,
  changedPath: string | null,
  oldState: Record<string, any>,
  newState: Record<string, any>,
) => void;

export class StateManager {
  private appConfig: App;
  private listeners: Set<StateChangeListener> = new Set();

  constructor(appConfig: App) {
    this.appConfig = appConfig;
  }

  /**
   * Подписка на изменения состояния
   */
  subscribe(listener: StateChangeListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Уведомление слушателей об изменении
   */
  private notifyListeners(
    elementPath: ElementPath,
    changedPath: string | null,
    oldState: Record<string, any>,
    newState: Record<string, any>,
  ): void {
    this.listeners.forEach((listener) => {
      try {
        listener(elementPath, changedPath, oldState, newState);
      } catch (error) {
        console.error("Error in state change listener:", error);
      }
    });
  }

  /**
   * Получение состояния элемента
   */
  getState(elementPath: ElementPath): Record<string, any> | null {
    const element = PathResolver.resolveElement(elementPath, this.appConfig);

    if (!element) {
      console.warn(`Element not found: ${elementPath}`);
      return null;
    }

    return element.state || null;
  }

  /**
   * Получение конкретного поля из состояния
   */
  getStateField(elementPath: ElementPath, field: string): any {
    const state = this.getState(elementPath);

    if (!state) {
      return undefined;
    }

    // Поддержка вложенных полей через точку
    return PathResolver.getValue(state, field);
  }

  /**
   * Обновление состояния элемента (полная замена)
   */
  setState(elementPath: ElementPath, newState: Record<string, any>): void {
    const element = PathResolver.resolveElement(elementPath, this.appConfig);

    if (!element) {
      console.warn(`Element not found: ${elementPath}`);
      return;
    }

    const oldState = element.state || {};
    element.state = newState;
    this.notifyListeners(elementPath, null, oldState, newState);
  }

  /**
   * Установка значения поля в состоянии (поддержка вложенных путей через точку)
   */
  setStateField(elementPath: ElementPath, field: string, value: any): void {
    const element = PathResolver.resolveElement(elementPath, this.appConfig);

    if (!element) {
      console.warn(`Element not found: ${elementPath}`);
      return;
    }

    if (!element.state) {
      element.state = {};
    }
    const oldState = { ...element.state };
    PathResolver.setValue(element.state, field, value);
    this.notifyListeners(
      elementPath,
      `${elementPath}.${field}`,
      oldState,
      element.state,
    );
  }

  /**
   * Слияние с текущим состоянием (частичное обновление — верхнеуровневые ключи)
   */
  mergeState(elementPath: ElementPath, updates: Record<string, any>): void {
    const element = PathResolver.resolveElement(elementPath, this.appConfig);
    if (!element) {
      console.warn(`Element not found: ${elementPath}`);
      return;
    }
    const oldState = element.state || {};
    element.state = { ...oldState, ...updates };
    this.notifyListeners(elementPath, elementPath, oldState, element.state);
  }

  /**
   * Очистка состояния
   */
  clearState(elementPath: ElementPath): void {
    const element = PathResolver.resolveElement(elementPath, this.appConfig);

    if (!element) {
      console.warn(`Element not found: ${elementPath}`);
      return;
    }

    const oldState = element.state || {};
    element.state = {};

    this.notifyListeners(elementPath, elementPath, oldState, {});
  }

  /**
   * Переключение булевого поля в состоянии
   */
  toggleStateField(elementPath: ElementPath, field: string): void {
    const element = PathResolver.resolveElement(elementPath, this.appConfig);

    if (!element) {
      console.warn(`Element not found: ${elementPath}`);
      return;
    }

    if (!element.state) {
      element.state = {};
    }

    const oldValue = element.state[field];
    element.state[field] = !oldValue;

    this.notifyListeners(
      elementPath,
      `${elementPath}.${field}`,
      { [field]: oldValue },
      { [field]: !oldValue },
    );
  }

  /**
   * Получение глобального состояния
   */
  getGlobalState(): Record<string, any> {
    return this.appConfig.globalState || {};
  }

  /**
   * Получение поля из глобального состояния
   */
  getGlobalStateField(field: string): any {
    return PathResolver.getValue(this.appConfig.globalState, field);
  }

  /**
   * Обновление глобального состояния
   */
  setGlobalStateField(field: string, value: any): void {
    const oldState = { ...this.appConfig.globalState };

    if (!this.appConfig.globalState) {
      this.appConfig.globalState = {};
    }

    PathResolver.setValue(this.appConfig.globalState, field, value);

    this.notifyListeners(
      `global.${field}`,
      `global.${field}`,
      PathResolver.getValue(oldState, field),
      value,
    );
  }

  /**
   * Получение страницы по ID
   */
  getPage(pageId: string): any | null {
    return this.appConfig.pages.find((p) => p.id === pageId) || null;
  }

  /**
   * Получение страницы по route
   */
  getPageByRoute(route: string): any | null {
    return this.appConfig.pages.find((p) => p.route === route) || null;
  }

  /**
   * Получение всей конфигурации приложения
   */
  getAppConfig(): App {
    return this.appConfig;
  }
}
