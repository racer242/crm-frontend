/**
 * CommandExecutor - выполнение команд
 */

import { StateManager } from "./StateManager";
import { PathResolver } from "./PathResolver";
import { BaseElement, App, SendRequestParams, MacroSources } from "@/types";
import { ElementIndex } from "./ElementIndex";
import { executeClientDataFeed } from "./DataFeedService";
import { MacroEngine } from "./MacroEngine";

export interface CommandExecutionContext {
  pageId: string;
  triggerComponentId: string;
  appConfig: App;
  stateManager: StateManager;
  elementIndex: ElementIndex;
}

/**
 * Create MacroSources from command context
 */
function createMacroSources(context: CommandExecutionContext): MacroSources {
  return {
    stateManager: context.stateManager,
    pageId: context.pageId,
    config: context.appConfig,
    env:
      typeof process !== "undefined"
        ? Object.fromEntries(
            Object.entries(process.env)
              .filter(
                ([key, val]) =>
                  key.startsWith("NEXT_PUBLIC_") && val !== undefined,
              )
              .map(([key, val]) => [key, val as string]),
          )
        : undefined,
  };
}

export class CommandExecutor {
  private macroEngine: MacroEngine;

  constructor(private context: CommandExecutionContext) {
    this.macroEngine = new MacroEngine(createMacroSources(context));
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
    let rawValue =
      directValue !== undefined
        ? directValue
        : source
          ? this.getSourceValue(source, eventData)
          : undefined;

    // Применяем макросы к значению
    const value = this.macroEngine.apply(rawValue);

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
   *
   * Форматы source:
   * - "event.value.start" — из eventData
   * - "this.value" — из eventData (триггер-компонент)
   * - "elementId.state.field" — из state элемента
   * - "state.field" — из state текущей страницы
   */
  private getSourceValue(source: string, eventData: any): any {
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

    // Иначе разбираем как ELEMENT_ID.state.field или state.field
    const { elementId, statePath } = PathResolver.parseTarget(source);
    const targetId = elementId || this.context.pageId;
    return this.context.stateManager.getStateField(targetId, statePath);
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

    // Применяем макросы к url и data
    const resolvedUrl = this.macroEngine.apply(url) as string;
    const resolvedData = data
      ? (this.macroEngine.apply(data) as Record<string, any>)
      : undefined;

    const requestParams: SendRequestParams = {
      url: resolvedUrl,
      method: method || "GET",
      data: resolvedData,
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
