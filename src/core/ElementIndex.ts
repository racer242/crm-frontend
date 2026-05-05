/**
 * ElementIndex - индекс элементов страницы
 *
 * Принимает готовый индекс (plain object) со сервера.
 * Позволяет находить элементы по уникальному ID за O(1).
 */

import { BaseElement } from "@/types";

export class ElementIndex {
  private index: Map<string, BaseElement>;

  /**
   * @param pageIndex - готовый индекс элементов страницы (plain object)
   */
  constructor(pageIndex: Record<string, BaseElement>) {
    this.index = new Map(Object.entries(pageIndex));
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
