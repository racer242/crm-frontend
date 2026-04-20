/**
 * PathResolver - система адресации элементов
 *
 * Примеры путей:
 * - "dashboard" → страница
 * - "dashboard.header" → секция
 * - "dashboard.header.logo" → блок
 * - "dashboard.header.logo.title" → компонент
 * - "dashboard.header.state.visible" → состояние секции
 * - "dashboard.mainContent.statsCard.state.data" → данные в состоянии блока
 */

import { BaseElement, ElementPath } from "@/types";

export class PathResolver {
  /**
   * Разбирает путь на части
   */
  static parse(path: ElementPath): string[] {
    return path.split(".").filter(Boolean);
  }

  // /**
  //  * Находит элемент по пути в иерархии
  //  */
  // static resolveElement(
  //   path: ElementPath,
  //   root: BaseElement,
  // ): BaseElement | null {
  //   const parts = this.parse(path);
  //   // Если путь пустой, возвращаем корень
  //   if (parts.length === 0) {
  //     return root;
  //   }

  //   // Начинаем поиск с корня
  //   let current: BaseElement | null = root;

  //   // Первый элемент должен быть ID страницы
  //   if (root.type === "app") {
  //     const app = root as any;
  //     const pageId = parts[0];
  //     current = app.pages?.find((p: any) => p.id === pageId) || null;

  //     if (!current || parts.length === 1) {
  //       return current;
  //     }

  //     // Продолжаем с остальными частями пути
  //     return this.resolveInHierarchy(current, parts.slice(1));
  //   }

  //   // Если root — страница, сначала ищем элемент по ID в иерархии
  //   if (root.type === "page") {
  //     return this.resolveInHierarchy(current, parts);
  //   }

  //   // Для других типов — ищем рекурсивно
  //   return this.resolveInHierarchy(current, parts);
  // }

  // /**
  //  * Рекурсивный поиск элемента в иерархии
  //  */
  // private static resolveInHierarchy(
  //   element: BaseElement,
  //   pathParts: string[],
  // ): BaseElement | null {
  //   if (pathParts.length === 0) {
  //     return element;
  //   }

  //   const [currentId, ...restParts] = pathParts;

  //   // Проверяем, является ли текущий элемент ископаемым
  //   if (element.id === currentId && restParts.length === 0) {
  //     return element;
  //   }

  //   // Проверяем состояние (специальный ключ "state")
  //   if (currentId === "state") {
  //     return element; // Возвращаем сам элемент для доступа к state
  //   }

  //   // Ищем в дочерних элементах
  //   const children = this.getChildren(element);
  //   const child = children.find((c) => c.id === currentId);

  //   if (child) {
  //     if (restParts.length === 0) {
  //       return child;
  //     }
  //     return this.resolveInHierarchy(child, restParts);
  //   }

  //   return null;
  // }

  /**
   * Получает дочерние элементы элемента
   */
  // private static getChildren(element: BaseElement): BaseElement[] {
  //   const elementAny = element as any;

  //   switch (element.type) {
  //     case "app":
  //       return elementAny.pages || [];
  //     case "page":
  //       return elementAny.sections || [];
  //     case "section":
  //       return elementAny.blocks || [];
  //     case "block":
  //       return elementAny.components || [];
  //     case "component":
  //       return [];
  //     default:
  //       return [];
  //   }
  // }

  /**
   * Получает значение по пути в объекте
   */
  static getValue(obj: any, path: ElementPath): any {
    const parts = this.parse(path);
    let current = obj;

    for (const part of parts) {
      if (current === null || current === undefined) {
        return undefined;
      }
      current = current[part];
    }

    return current;
  }

  /**
   * Устанавливает значение по пути в объекте
   */
  static setValue(obj: any, path: ElementPath, value: any): void {
    const parts = this.parse(path);
    let current = obj;

    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (!(part in current)) {
        current[part] = {};
      }
      current = current[part];
    }

    current[parts[parts.length - 1]] = value;
  }

  /**
   * Проверяет существование пути в объекте
   */
  static hasPath(obj: any, path: ElementPath): boolean {
    const parts = this.parse(path);
    let current = obj;

    for (const part of parts) {
      if (current === null || current === undefined || !(part in current)) {
        return false;
      }
      current = current[part];
    }

    return true;
  }

  /**
   * Parses a target address in the format "[ELEMENT_ID.]state[.PATH.TO.FIELD]"
   *
   * Examples:
   * - "ordersTable.state.data" → { elementId: "ordersTable", statePath: "data" }
   * - "state.feed.orders" → { elementId: null, statePath: "feed.orders" }
   * - "state.loading" → { elementId: null, statePath: "loading" }
   */
  static parseTarget(target: string): {
    elementId: string | null;
    statePath: string;
  } {
    const parts = target.split(".");

    // Check if first part is "state"
    if (parts[0] === "state") {
      return {
        elementId: null,
        statePath: parts.slice(1).join("."),
      };
    }

    // First part is element ID
    // Find "state" in the path
    const stateIndex = parts.indexOf("state");
    if (stateIndex === -1) {
      // No "state" found - treat entire string as element ID
      return {
        elementId: target,
        statePath: "",
      };
    }

    return {
      elementId: parts.slice(0, stateIndex).join("."),
      statePath: parts.slice(stateIndex + 1).join("."),
    };
  }
}
