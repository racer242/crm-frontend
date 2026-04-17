/**
 * CommandExecutor - выполнение команд
 */

import { StateManager } from "./StateManager";
import { LinkResolver, LinkContext } from "./LinkResolver";
import { BaseElement, App } from "@/types";

export interface CommandExecutionContext {
  pageId: string;
  triggerComponentId: string;
  appConfig: App;
  stateManager: StateManager;
}

export class CommandExecutor {
  private componentMap: Map<string, BaseElement> = new Map();

  constructor(private context: CommandExecutionContext) {
    this.buildComponentMap();
  }

  /**
   * Построить карту всех компонентов для быстрого доступа
   */
  private buildComponentMap() {
    for (const page of this.context.appConfig.pages) {
      this.findElementsInPage(page);
    }
  }

  private findElementsInPage(element: BaseElement) {
    if (element.id) {
      this.componentMap.set(element.id, element);
    }

    if ((element as any).components) {
      const components = (element as any).components as BaseElement[];
      for (const comp of components) {
        this.findElementsInPage(comp);
      }
    }

    if ((element as any).blocks) {
      const blocks = (element as any).blocks as BaseElement[];
      for (const block of blocks) {
        this.findElementsInPage(block);
      }
    }

    if ((element as any).sections) {
      const sections = (element as any).sections as BaseElement[];
      for (const section of sections) {
        this.findElementsInPage(section);
      }
    }
  }

  /**
   * Выполнить команду setProperty
   * Формат params: { source: "event.value.start" | "componentId.prop", target: "state.field" }
   */
  async executeSetProperty(
    params: Record<string, any>,
    eventData: any,
  ): Promise<void> {
    const { source, target } = params;

    if (!source || !target) {
      console.warn("setProperty: missing source or target");
      return;
    }

    // Получаем значение из источника
    const value = this.getSourceValue(source, eventData);

    // Определяем куда записывать (относительно текущего компонента или страницы)
    let targetElementPath: string;
    let targetField: string;

    if (target.startsWith("state.")) {
      // Запись в state страницы (относительно current page)
      targetElementPath = this.context.pageId;
      targetField = target.slice(6); // Убираем "state."
    } else if (target.startsWith("@")) {
      // Абсолютный путь @ELEMENT_ID.state.FIELD
      const path = target.slice(1);
      if (path.startsWith("state.")) {
        // Например @statistics.state.start
        const match = path.match(/^([^.]+)\.state\.(.+)$/);
        if (match) {
          targetElementPath = `${match[1]}`;
          targetField = match[2];
        } else {
          console.warn("setProperty: invalid target format:", target);
          return;
        }
      } else {
        // Компонентное свойство
        targetElementPath = path;
        targetField = "";
      }
    } else {
      // Относительно триггерующего компонента
      targetElementPath = this.context.triggerComponentId;
      targetField = target;
    }

    // Выполняем запись
    const fullTarget = targetField
      ? `${targetElementPath}.${targetField}`
      : targetElementPath;

    if (targetField) {
      // Частичное обновление состояния
      this.context.stateManager.mergeState(fullTarget, {
        [targetField]: value,
      });
    } else {
      // Полная замена состояния элемента
      this.context.stateManager.setState(targetElementPath, value);
    }
  }

  /**
   * Получить значение из источника
   */
  private getSourceValue(source: string, eventData: any): any {
    const linkContext: LinkContext = {
      pageId: this.context.pageId,
      appConfig: this.context.appConfig,
      componentMap: this.componentMap,
    };

    // Если начинается с event. - читаем из eventData
    if (source.startsWith("event.")) {
      const field = source.slice(6);
      return LinkResolver.resolve(eventData?.[field], linkContext);
    }

    // Иначе пытаемся разрешить как ссылку
    return LinkResolver.resolve(source, linkContext);
  }

  /**
   * Общая функция исполнения команд
   */
  async executeCommand(
    type: string,
    params: Record<string, any>,
    eventData: any,
  ): Promise<void> {
    switch (type) {
      case "setProperty":
        await this.executeSetProperty(params, eventData);
        break;

      default:
        console.warn(`Command type not implemented: ${type}`);
    }
  }
}
