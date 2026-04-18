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
   * Формат params: { source: "event.value.start" | "componentId.prop", target: "state.field", value: any }
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
