/**
 * Linkage — система линковки свойств элементов к state
 *
 * Singleton-класс, который:
 * 1. Разрешает binding-строки (@ELEMENT_ID.state.field) в значения
 * 2. Рекурсивно проходит объекты/массивы и разрешает все bindings
 * 3. Подписывается на изменения state и уведомляет при изменении зависимых данных
 *
 * Примеры bindings:
 *   "@form.state.username" → значение из form.state.username
 *   "@state.visible" → значение из state.current_page.visible (page context)
 *   "@config.theme" → значение из config.state.theme (если config - элемент)
 */

import { StateManager } from "./StateManager";
import { BindingRef, parseBinding, isBinding } from "@/types";

/** Callback для уведомлений об изменениях bindings */
export type LinkageChangeListener = () => void;

export class Linkage {
  private stateManager: StateManager;
  private pageId: string;

  constructor(stateManager: StateManager, pageId: string) {
    this.stateManager = stateManager;
    this.pageId = pageId;
  }

  /**
   * Разрешить binding-строку в значение
   * @param binding строка вида "@ELEMENT_ID.state.field" или просто значение
   * @returns разрешённое значение или исходная строка если это не binding
   */
  resolve(binding: string | undefined): any {
    if (!binding || !isBinding(binding)) {
      return binding;
    }

    const parsed = parseBinding(binding);
    if (!parsed) {
      return binding;
    }

    return this.resolveBindingRef(parsed);
  }

  /**
   * Рекурсивно разрешить bindings в любом значении
   * - Строка с @ → разрешает binding
   * - Объект → рекурсивно проходит все поля
   * - Массив → рекурсивно проходит элементы
   * - Примитив → возвращает как есть
   */
  resolveDeep(value: any): any {
    if (value === null || value === undefined) {
      return value;
    }

    if (typeof value === "string") {
      return this.resolve(value);
    }

    if (Array.isArray(value)) {
      return value.map((item) => this.resolveDeep(item));
    }

    if (typeof value === "object") {
      const result: Record<string, any> = {};
      for (const [key, val] of Object.entries(value)) {
        result[key] = this.resolveDeep(val);
      }
      return result;
    }

    // Примитивы (number, boolean, etc.)
    return value;
  }

  /**
   * Подписаться на изменения specific bindings
   * @param bindings массив binding-строк для отслеживания
   * @param callback вызывается при изменении любого из bindings
   */
  subscribe(
    bindings: (string | undefined)[],
    callback: LinkageChangeListener,
  ): () => void {
    // Парсим все bindings
    const parsedBindings: BindingRef[] = [];
    for (const b of bindings) {
      if (b && isBinding(b)) {
        const parsed = parseBinding(b);
        if (parsed) {
          parsedBindings.push(parsed);
        }
      }
    }

    if (parsedBindings.length === 0) {
      return () => {};
    }

    // Подписываемся на StateManager
    const unsubscribe = this.stateManager.subscribe(
      (elementPath, changedPath) => {
        // Проверяем, изменилось ли что-то из наших bindings
        let shouldNotify = false;

        for (const parsed of parsedBindings) {
          const resolvedElementId = parsed.elementId || this.pageId;

          // changedPath имеет формат "elementId.fieldPath" или "elementId" (полная замена)
          if (!changedPath) {
            // Полная замена state — уведомляем всех
            shouldNotify = true;
            break;
          }

          // Разбираем changedPath: "elementId.fieldPath"
          const dotIndex = changedPath.indexOf(".");
          if (dotIndex === -1) {
            // Только elementId — весь state изменён
            if (changedPath === resolvedElementId) {
              shouldNotify = true;
              break;
            }
            continue;
          }

          const changedElementId = changedPath.slice(0, dotIndex);
          const changedFieldPath = changedPath.slice(dotIndex + 1);

          if (changedElementId !== resolvedElementId) {
            continue;
          }

          // Проверяем, относится ли changedFieldPath к нашему binding
          // binding: "theme.colors.primary"
          // changed: "theme" → да (родитель изменился)
          // changed: "theme.colors" → да
          // changed: "theme.colors.primary" → да (точное совпадение)
          // changed: "theme.colors.primary.bg" → да (дочернее свойство)
          if (
            changedFieldPath === parsed.fieldPath ||
            changedFieldPath.startsWith(parsed.fieldPath + ".") ||
            parsed.fieldPath.startsWith(changedFieldPath + ".") ||
            parsed.fieldPath === changedFieldPath
          ) {
            shouldNotify = true;
            break;
          }
        }

        if (shouldNotify) {
          callback();
        }
      },
    );

    return unsubscribe;
  }

  /**
   * Разрешить BindingRef в значение
   */
  private resolveBindingRef(parsed: BindingRef): any {
    const elementId = parsed.elementId || this.pageId;

    if (!elementId) {
      return undefined;
    }

    // Пока поддерживаем только "state" как источник
    if (parsed.source === "state") {
      return this.stateManager.getStateField(elementId, parsed.fieldPath);
    }

    // Для других источников — пока undefined
    return undefined;
  }
}
