/**
 * LinkResolver - разрешение ссылок на данные
 *
 * Поддерживаемые форматы:
 * - @state.FIELD -> значение из page state
 * - @ELEMENT_ID.property.subproperty -> значение из компонента по ID
 */

import { BaseElement, App } from "@/types";
import { PathResolver } from "./PathResolver";

export type SourceType = "state" | "component";

export interface LinkContext {
  pageId: string;
  appConfig: App;
  componentMap: Map<string, BaseElement>; // Для быстрого доступа к компонентам
}

export class LinkResolver {
  /**
   * Разрешить ссылку на значение
   * @param link ссылка вида "@state.field" или "@pageId.state.field" или "@componentId.prop.subprop"
   * @param context контекст поиска
   * @returns найденное значение или undefined
   */
  static resolve(link: string | undefined, context: LinkContext): any {
    if (!link || !link.startsWith("@")) {
      return link; // Не ссылка - возвращаем как есть
    }

    const path = link.slice(1); // Убираем "@"

    if (path.startsWith("state.") || path === "state") {
      // Формат: @state.field (из current page state) или @state
      const field = path.length > 6 ? path.slice(6) : "";
      return this.resolveStateField(link, field, context);
    } else {
      // Формат: @componentId.property.subproperty
      return this.resolveComponentLink(path, context);
    }
  }

  /**
   * Разрешить ссылку на состояние страницы
   */
  private static resolveStateField(
    fullLink: string,
    field: string,
    context: LinkContext,
  ): any {
    let targetPageId = context.pageId;

    // Если ссылка содержит явное указание страницы (@pageId.state.field)
    if (fullLink.match(/^@[^.]+\.state\./)) {
      // Извлекаем ID страницы из ссылки
      const match = fullLink.match(/^@([^.]*)\.state\./);
      if (match && match[1] && match[1] !== "") {
        targetPageId = match[1];
      }
    }

    const page = context.appConfig.pages.find((p) => p.id === targetPageId);
    if (!page || !page.state) {
      return undefined;
    }

    return PathResolver.getValue(page.state, field);
  }

  /**
   * Разрешить ссылку на компонент
   * Формат: @componentId.property.subproperty
   */
  private static resolveComponentLink(path: string, context: LinkContext): any {
    const parts = path.split(".");
    if (parts.length === 0) return undefined;

    const componentId = parts[0];
    const propPath = parts.slice(1).join(".");

    // Ищем компонент по ID во всём приложении
    let targetComponent: BaseElement | null = null;

    // Сначала проверяем кэш
    if (context.componentMap.has(componentId)) {
      targetComponent = context.componentMap.get(componentId)!;
    } else {
      // Рекурсивный поиск
      for (const page of context.appConfig.pages) {
        targetComponent = this.findElementById(page, componentId);
        if (targetComponent) {
          context.componentMap.set(componentId, targetComponent);
          break;
        }
      }
    }

    if (!targetComponent) {
      console.warn(`Component not found: ${componentId}`);
      return undefined;
    }

    // Возвращаем значение поля компонента
    if (!propPath) {
      return targetComponent; // Возвращаем весь объект компонента
    }

    return PathResolver.getValue(targetComponent, propPath);
  }

  /**
   * Рекурсивный поиск элемента по ID
   */
  private static findElementById(
    element: BaseElement,
    id: string,
  ): BaseElement | null {
    if (element.id === id) {
      return element;
    }

    // Рекурсивный поиск в дочерних элементах
    if ((element as any).components) {
      const components = (element as any).components as BaseElement[];
      for (const comp of components) {
        const found = this.findElementById(comp, id);
        if (found) return found;
      }
    }

    if ((element as any).blocks) {
      const blocks = (element as any).blocks as BaseElement[];
      for (const block of blocks) {
        const found = this.findElementById(block, id);
        if (found) return found;
      }
    }

    if ((element as any).sections) {
      const sections = (element as any).sections as BaseElement[];
      for (const section of sections) {
        const found = this.findElementById(section, id);
        if (found) return found;
      }
    }

    return null;
  }

  /**
   * Получить значение из eventData или из указанного компонента
   * @param source источник вида "event.value.start" или "componentId.prop"
   * @param eventData данные события
   * @param context контекст поиска
   */
  static getSourceValue(
    source: string,
    eventData: any,
    context: LinkContext,
  ): any {
    if (source.startsWith("event.")) {
      // Читаем из eventData
      const field = source.slice(6);
      return PathResolver.getValue(eventData, field);
    }

    // Иначе читаем из компонента
    return this.resolveComponentLink(source, context);
  }
}
