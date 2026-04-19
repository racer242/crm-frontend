/**
 * ElementIndex - индекс всех элементов приложения
 *
 * Строится один раз при загрузке приложения.
 * Позволяет находить элементы по уникальному ID за O(1).
 * Все элементы в иерархии имеют уникальные ID.
 */

import { BaseElement, App } from "@/types";

export class ElementIndex {
  private index: Map<string, BaseElement> = new Map();

  constructor(appConfig: App) {
    this.buildIndex(appConfig);
  }

  /**
   * Построить индекс всех элементов в приложении
   */
  private buildIndex(appConfig: App) {
    for (const page of appConfig.pages) {
      this.addSubtree(page);
    }
  }

  /**
   * Рекурсивно добавить все элементы поддерева в индекс
   */
  private addSubtree(element: BaseElement) {
    if (element.id) {
      this.index.set(element.id, element);
    }

    // Обходим всех потомков
    const children = this.getChildren(element);
    for (const child of children) {
      this.addSubtree(child);
    }
  }

  /**
   * Получает дочерние элементы
   */
  private getChildren(element: BaseElement): BaseElement[] {
    const el = element as any;
    const children: BaseElement[] = [];

    // Секции (в page)
    if (Array.isArray(el.sections)) children.push(...el.sections);
    // Блоки (в section)
    if (Array.isArray(el.blocks)) children.push(...el.blocks);
    // Компоненты (в block)
    if (Array.isArray(el.components)) children.push(...el.components);
    // Страницы (в app)
    if (Array.isArray(el.pages)) children.push(...el.pages);

    return children;
  }

  /**
   * Получить элемент по ID
   */
  getElement(id: string): BaseElement | null {
    return this.index.get(id) || null;
  }

  /**
   * Проверить существование элемента
   */
  hasElement(id: string): boolean {
    return this.index.has(id);
  }

  /**
   * Получить все ID элементов
   */
  getAllIds(): string[] {
    return Array.from(this.index.keys());
  }

  /**
   * Получить размер индекса
   */
  get size(): number {
    return this.index.size;
  }
}
