/**
 * CommandExecutor - выполнение команд
 */

import { StateManager } from "./StateManager";
import { LinkResolver, LinkContext } from "./LinkResolver";
import { PathResolver } from "./PathResolver";
import { BaseElement, App, SendRequestParams } from "@/types";
import { ElementIndex } from "./ElementIndex";
import { executeClientDataFeed } from "./DataFeedService";

export interface CommandExecutionContext {
  pageId: string;
  triggerComponentId: string;
  appConfig: App;
  stateManager: StateManager;
  elementIndex: ElementIndex;
}

export class CommandExecutor {
  constructor(private context: CommandExecutionContext) {}

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
    const stateIndex = target.indexOf("state.");

    if (stateIndex === 0) {
      // "state.field" — запись в state страницы
      targetElementPath = this.context.pageId;
      targetField = target.slice(6); // Убираем "state."
    } else if (stateIndex > 0) {
      // "elementId.state.field" — запись в state указанного элемента
      targetElementPath = target.slice(0, stateIndex - 1);
      targetField = target.slice(stateIndex + 6); // Убираем ".state."
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
      elementIndex: this.context.elementIndex,
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
   * Выполнить команду sendRequest
   * Отправляет запрос к API и записывает результат в state
   */
  async executeSendRequest(
    params: Record<string, any>,
    eventData: any,
  ): Promise<void> {
    const { url, method, data, target } = params;

    if (!url || !target) {
      console.warn("sendRequest: missing url or target");
      return;
    }

    const requestParams: SendRequestParams = {
      url,
      method: method || "GET",
      data,
      target,
    };

    // Get auth token from global state
    const authToken = this.context.appConfig.globalState?.auth?.token;

    try {
      const result = await executeClientDataFeed(
        requestParams,
        this.context.stateManager,
        this.context.pageId,
        authToken,
        this.context.appConfig.config,
      );

      if (!result.success && result.error) {
        console.error(`sendRequest error: ${result.error}`);
        // Store error in page state for Toast display
        this.context.stateManager.setStateField(
          this.context.pageId,
          "dataFeedErrors",
          [result.error],
        );
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error(`sendRequest error: ${errorMessage}`);
      this.context.stateManager.setStateField(
        this.context.pageId,
        "dataFeedErrors",
        [errorMessage],
      );
    }
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

      case "sendRequest":
        await this.executeSendRequest(params, eventData);
        break;

      default:
        console.warn(`Command type not implemented: ${type}`);
    }
  }
}
