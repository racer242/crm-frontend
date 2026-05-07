/**
 * StateManager - управление состояниями элементов CRM
 *
 * Обеспечивает:
 * - Доступ к состоянию любого элемента по пути
 * - Обновление состояния с триггером ре-рендера
 * - Глобальное состояние
 * - Поддержку относительных путей
 */

import { BaseElement, ElementPath, App, DataFeedResult } from "@/types";
import { PathResolver } from "./PathResolver";
import { ElementIndex } from "./ElementIndex";

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
  private elementIndex: ElementIndex;

  constructor(
    appConfig: App,
    elementIndex: ElementIndex,
    initialDataFeed?: DataFeedResult[],
    initialPageId?: string,
  ) {
    this.appConfig = appConfig;
    this.elementIndex = elementIndex;

    // Apply dataFeed results to state during initialization
    if (initialDataFeed) {
      for (const result of initialDataFeed) {
        if (result.success && result.target) {
          const { elementId, statePath } = PathResolver.parseTarget(
            result.target,
          );
          // If no elementId specified, use page context (state belongs to page)
          const targetId = elementId || initialPageId;
          if (!targetId) continue;

          if (statePath) {
            // Specific path: set field (e.g., "state.loadedText" → set state.loadedText)
            this.setStateField(targetId, statePath, result.data);
          } else {
            // No path: merge data into existing state (e.g., "state" → merge {loadedText: "..."})
            const element = this.getElement(targetId);
            if (element && typeof result.data === "object") {
              this.mergeState(targetId, result.data);
            } else {
              this.setStateField(targetId, statePath, result.data);
            }
          }
        }
      }
    }
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
   * Получить элемент по ID через индекс
   */
  private getElement(elementPath: ElementPath): BaseElement | null {
    const element = this.elementIndex.getElement(elementPath);
    if (!element) {
      console.warn(`Element not found: ${elementPath}`);
    }
    return element;
  }

  /**
   * Получение состояния элемента
   */
  getState(elementPath: ElementPath): Record<string, any> | null {
    const element = this.getElement(elementPath);
    if (!element) {
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
    const element = this.getElement(elementPath);
    if (!element) {
      return;
    }
    const oldState = element.state || {};
    element.state = newState;
    this.notifyListeners(elementPath, null, oldState, newState);
  }

  /**
   * Слияние с текущим состоянием (частичное обновление — верхнеуровневые ключи)
   */
  mergeState(elementPath: ElementPath, updates: Record<string, any>): void {
    const element = this.getElement(elementPath);
    if (!element) {
      return;
    }
    const oldState = { ...(element.state || {}) };
    element.state = { ...oldState, ...updates };
    // Notify with "state" as changedPath so bindings can match
    this.notifyListeners(elementPath, null, oldState, element.state);
  }

  /**
   * Установка значения поля в состоянии (поддержка вложенных путей через точку)
   */
  setStateField(elementPath: ElementPath, field: string, value: any): void {
    const element = this.getElement(elementPath);

    if (!element) {
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
   * Очистка состояния
   */
  clearState(elementPath: ElementPath): void {
    const element = this.getElement(elementPath);
    if (!element) {
      return;
    }
    const oldState = element.state || {};
    element.state = {};
    this.notifyListeners(elementPath, null, oldState, {});
  }

  /**
   * Переключение булевого поля в состоянии
   */
  toggleStateField(elementPath: ElementPath, field: string): void {
    const element = this.getElement(elementPath);
    if (!element) {
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
