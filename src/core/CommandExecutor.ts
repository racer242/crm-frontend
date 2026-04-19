/**
 * CommandExecutor - выполнение команд
 */

import { StateManager } from "./StateManager";
import { LinkResolver, LinkContext } from "./LinkResolver";
import { PathResolver } from "./PathResolver";
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
   * Формат params: { source: "event.value.start" | "this.value", target: "state.field" | "elementId.state.field", value: any }
   *
   * Форматы target:
   * - "state.field" — запись в state страницы (pageId)
   * - "elementId.state.field" — запись в state указанного элемента
   * - "field" — запись в state триггер-компонента (legacy)
   */
  async executeSetProperty(
    params: Record<string, any>,
    eventData: any,
  ): Promise<void> {
    const { source, target, value: directValue } = params;

    if (!target) {
      console.warn("setProperty: missing target");
      return;
    }

    // Получаем значение: приоритет у прямого value, затем из source
    const value =
      directValue !== undefined
        ? directValue
        : source
          ? this.getSourceValue(source, eventData)
          : undefined;

    // Определяем куда записывать
    let targetElementPath: string;
    let targetField: string;

    // Находим позицию ".state." в target
    const stateIndex = target.indexOf(".state.");

    if (stateIndex === 0) {
      // "state.field" — запись в state страницы
      targetElementPath = this.context.pageId;
      targetField = target.slice(7); // Убираем "state."
    } else if (stateIndex > 0) {
      // "elementId.state.field" — запись в state указанного элемента
      targetElementPath = target.slice(0, stateIndex);
      targetField = target.slice(stateIndex + 7); // Убираем ".state."
    } else {
      // Просто "field" — запись в state триггер-компонента (legacy)
      targetElementPath = this.context.triggerComponentId;
      targetField = target;
    }

    // Выполняем запись
    if (targetField) {
      // Обновление состояния — setStateField поддерживает вложенные пути (textData.input)
      this.context.stateManager.setStateField(
        targetElementPath,
        targetField,
        value,
      );
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
      return PathResolver.getValue(eventData, field);
    }

    // Если начинается с this. - читаем из eventData (this = триггер-компонент)
    if (source.startsWith("this.")) {
      const field = source.slice(5);
      return PathResolver.getValue(eventData, field);
    }

    // Иначе пытаемся разрешить как ссылку (@ELEMENT_ID...)
    return LinkResolver.resolve(source, linkContext);
  }

  /**
   * Выполнить команду log
   */
  executeLog(params: Record<string, any>): void {
    const { level = "info", message } = params;
    const levels: Record<string, (...args: any[]) => void> = {
      info: console.info,
      warn: console.warn,
      error: console.error,
      debug: console.debug,
      log: console.log,
    };
    const logFn = levels[level] || console.log;
    logFn(`[${level.toUpperCase()}] ${message}`);
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

      case "log":
        this.executeLog(params);
        break;

      default:
        console.warn(`Command type not implemented: ${type}`);
    }
  }
}
