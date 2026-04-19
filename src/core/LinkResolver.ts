/**
 * LinkResolver - разрешение ссылок на данные
 *
 * Поддерживаемые форматы:
 * - @state.FIELD -> значение из page state
 * - @ELEMENT_ID.property.subproperty -> значение из компонента по ID
 */

import { BaseElement, App } from "@/types";
import { PathResolver } from "./PathResolver";
import { ElementIndex } from "./ElementIndex";

export type SourceType = "state" | "component";

export interface LinkContext {
  pageId: string;
  appConfig: App;
  elementIndex: ElementIndex;
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

    // Ищем компонент по ID через индекс
    const targetComponent = context.elementIndex.getElement(componentId);

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
