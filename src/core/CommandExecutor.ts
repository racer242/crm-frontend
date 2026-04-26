/**
 * CommandExecutor - выполнение команд
 *
 * Доступные команды:
 * - setProperty: записывает значение из source в target
 * - setState: полная замена состояния элемента
 * - mergeState: слияние с текущим состоянием
 * - clearState: очистка состояния элемента
 * - toggleProperty: инвертирует boolean значение
 * - sendRequest: HTTP-запрос к API
 * - showToast: показать Toast-уведомление
 * - navigate: переход по URL
 * - confirm: условное ветвление по подтверждению
 * - delay: пауза в последовательности команд
 * - log: логирование в консоль
 * - sequence: последовательное выполнение команд
 */

import { StateManager } from "./StateManager";
import { PathResolver } from "./PathResolver";
import {
  BaseElement,
  App,
  SendRequestParams,
  MacroSources,
  Command,
} from "@/types";
import { ElementIndex } from "./ElementIndex";
import { executeClientDataFeed } from "./DataFeedService";
import { MacroEngine } from "./MacroEngine";
import { getServerEnv } from "@/utils/env";

export interface CommandExecutionContext {
  pageId: string;
  triggerComponentId: string;
  appConfig: App;
  stateManager: StateManager;
  elementIndex: ElementIndex;
  /** Callback для показа toast-уведомлений */
  showToast?: (
    message: string,
    severity?: "success" | "info" | "warn" | "error",
  ) => void;
  /** Callback для навигации */
  navigate?: (url: string) => void;
  /** Callback для подтверждения (вызывает callback с true/false) */
  confirm?: (message: string) => Promise<boolean>;
}

/**
 * Create MacroSources from command context
 */
function createMacroSources(context: CommandExecutionContext): MacroSources {
  return {
    stateManager: context.stateManager,
    pageId: context.pageId,
    config: context.appConfig,
    env: getServerEnv(),
  };
}

/**
 * Распарсить target и вернуть путь элемента + путь к полю
 */
function parseTargetPath(
  target: string,
  defaultPageId: string,
  triggerComponentId: string,
): { elementPath: string; fieldPath: string } {
  const stateIndex = target.indexOf("state.");

  if (stateIndex === 0) {
    // "state.field" — state страницы
    return { elementPath: defaultPageId, fieldPath: target.slice(6) };
  } else if (stateIndex > 0) {
    // "elementId.state.field" — state элемента
    return {
      elementPath: target.slice(0, stateIndex - 1),
      fieldPath: target.slice(stateIndex + 6),
    };
  } else {
    // Просто "field" — state триггер-компонента
    return { elementPath: triggerComponentId, fieldPath: target };
  }
}

export class CommandExecutor {
  private macroEngine: MacroEngine;

  constructor(private context: CommandExecutionContext) {
    this.macroEngine = new MacroEngine(createMacroSources(context));
  }

  // ========== SET PROPERTY ==========
  /**
   * setProperty: записывает значение из source в target
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

    let rawValue =
      directValue !== undefined
        ? directValue
        : source
          ? this.getSourceValue(source, eventData)
          : undefined;

    const value = this.macroEngine.apply(rawValue);
    const { elementPath, fieldPath } = parseTargetPath(
      target,
      this.context.pageId,
      this.context.triggerComponentId,
    );

    if (fieldPath) {
      this.context.stateManager.setStateField(elementPath, fieldPath, value);
    } else {
      this.context.stateManager.setState(elementPath, value);
    }
  }

  // ========== SET STATE ==========
  /**
   * setState: полная замена состояния элемента
   * source: откуда взять значение (state другого элемента или event data)
   * target: куда записать (state элемента)
   */
  async executeSetState(
    params: Record<string, any>,
    eventData: any,
  ): Promise<void> {
    const { source, target } = params;
    if (!target) {
      console.warn("setState: missing target");
      return;
    }

    const rawValue = source
      ? this.getSourceValue(source, eventData)
      : undefined;
    const value = this.macroEngine.apply(rawValue);

    const { elementPath } = parseTargetPath(
      target,
      this.context.pageId,
      this.context.triggerComponentId,
    );

    this.context.stateManager.setState(elementPath, value);
  }

  // ========== MERGE STATE ==========
  /**
   * mergeState: слияние с текущим состоянием элемента
   * source: откуда взять данные для слияния
   * target: куда сливать (state элемента)
   */
  async executeMergeState(
    params: Record<string, any>,
    eventData: any,
  ): Promise<void> {
    const { source, target } = params;
    if (!target) {
      console.warn("mergeState: missing target");
      return;
    }

    const rawValue = source
      ? this.getSourceValue(source, eventData)
      : undefined;
    const value = this.macroEngine.apply(rawValue);

    if (typeof value !== "object" || value === null) {
      console.warn("mergeState: value must be an object");
      return;
    }

    const { elementPath } = parseTargetPath(
      target,
      this.context.pageId,
      this.context.triggerComponentId,
    );

    this.context.stateManager.mergeState(elementPath, value);
  }

  // ========== CLEAR STATE ==========
  /**
   * clearState: очистка состояния элемента
   * target: какой state очиститьать (state элемента)
   */
  async executeClearState(
    params: Record<string, any>,
    _eventData: any,
  ): Promise<void> {
    const { target } = params;
    if (!target) {
      console.warn("clearState: missing target");
      return;
    }

    const { elementPath } = parseTargetPath(
      target,
      this.context.pageId,
      this.context.triggerComponentId,
    );

    this.context.stateManager.clearState(elementPath);
  }

  // ========== TOGGLE PROPERTY ==========
  /**
   * toggleProperty: инвертирует boolean значение поля
   * Если значение не boolean — приводит к boolean и инвертирует
   */
  async executeToggleProperty(
    params: Record<string, any>,
    _eventData: any,
  ): Promise<void> {
    const { target } = params;
    if (!target) {
      console.warn("toggleProperty: missing target");
      return;
    }

    const { elementPath, fieldPath } = parseTargetPath(
      target,
      this.context.pageId,
      this.context.triggerComponentId,
    );

    if (!fieldPath) {
      console.warn("toggleProperty: field path required");
      return;
    }

    const currentValue = this.context.stateManager.getStateField(
      elementPath,
      fieldPath,
    );

    // Инвертируем: !Boolean(value)
    const toggledValue = !Boolean(currentValue);
    this.context.stateManager.setStateField(
      elementPath,
      fieldPath,
      toggledValue,
    );
  }

  // ========== SEND REQUEST ==========
  /**
   * sendRequest: HTTP-запрос к API с записью результата в state
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

    try {
      const result = await executeClientDataFeed(
        requestParams,
        this.context.stateManager,
        this.context.pageId,
        undefined,
        this.context.appConfig.config,
      );

      if (!result.success && result.error) {
        console.error(`sendRequest error: ${result.error}`);
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

  // ========== SHOW TOAST ==========
  /**
   * showToast: показать toast-уведомление
   * params: { message, severity?, summary?, life? }
   */
  async executeShowToast(
    params: Record<string, any>,
    _eventData: any,
  ): Promise<void> {
    const rawMessage = params.message || "";
    const message = this.macroEngine.apply(rawMessage) as string;
    const severity = params.severity || "info";

    if (this.context.showToast) {
      this.context.showToast(message, severity);
    } else {
      console.log(`[Toast ${severity}] ${message}`);
    }
  }

  // ========== NAVIGATE ==========
  /**
   * navigate: переход по URL
   * params: { url }
   */
  async executeNavigate(
    params: Record<string, any>,
    _eventData: any,
  ): Promise<void> {
    const rawUrl = params.url || "";
    const url = this.macroEngine.apply(rawUrl) as string;

    if (this.context.navigate) {
      this.context.navigate(url);
    } else {
      // Fallback: использу window.location
      if (typeof window !== "undefined") {
        window.location.href = url;
      }
    }
  }

  // ========== CONFIRM ==========
  /**
   * confirm: условное ветвление по подтверждению
   * params: { message, onConfirm: Command[], onCancel: Command[] }
   * Если confirm callback не задан — считается подтверждённым
   */
  async executeConfirm(
    params: Record<string, any>,
    eventData: any,
  ): Promise<void> {
    const rawMessage = params.message || "Подтвердите действие";
    const message = this.macroEngine.apply(rawMessage) as string;
    const onConfirm: Command[] = params.onConfirm || [];
    const onCancel: Command[] = params.onCancel || [];

    let confirmed = true;

    if (this.context.confirm) {
      confirmed = await this.context.confirm(message);
    }

    const commands = confirmed ? onConfirm : onCancel;

    for (const cmd of commands) {
      await this.executeCommand(cmd.type, cmd.params, eventData);
    }
  }

  // ========== DELAY ==========
  /**
   * delay: пауза в последовательности команд (мс)
   * params: { duration }
   */
  async executeDelay(
    params: Record<string, any>,
    _eventData: any,
  ): Promise<void> {
    const duration = params.duration || 1000;

    return new Promise((resolve) => setTimeout(resolve, duration));
  }

  // ========== SEQUENCE ==========
  /**
   * sequence: последовательное выполнение команд
   * params: { commands: Command[] }
   */
  async executeSequence(
    params: Record<string, any>,
    eventData: any,
  ): Promise<void> {
    const commands: Command[] = params.commands || [];

    for (const cmd of commands) {
      await this.executeCommand(cmd.type, cmd.params, eventData);
    }
  }

  // ========== LOG ==========
  /**
   * log: логирование в консоль
   */
  executeLog(params: Record<string, any>, eventData: any): void {
    const { level = "info", message } = params;
    const resolvedMessage = this.macroEngine.apply(message);
    const levels: Record<string, (...args: any[]) => void> = {
      info: console.info,
      warn: console.warn,
      error: console.error,
      debug: console.debug,
      log: console.log,
    };
    const logFn = levels[level] || console.log;

    if (typeof resolvedMessage === "string") {
      logFn(`[${level.toUpperCase()}] ${resolvedMessage}`);
    } else if (
      typeof resolvedMessage === "object" &&
      resolvedMessage !== null
    ) {
      logFn(`[${level.toUpperCase()}]`);
      logFn(resolvedMessage);
    } else {
      logFn(`[${level.toUpperCase()}] ${resolvedMessage}`);
    }
    if (params.showExtra && eventData != null) {
      logFn(eventData);
    }
  }

  // ========== SOURCE VALUE ==========
  /**
   * Получить значение из источника
   */
  private getSourceValue(source: string, eventData: any): any {
    // Если начинается с "event." - читаем из eventData
    if (source.startsWith("event.")) {
      const field = source.slice(6);
      return PathResolver.getValue(eventData, field);
    }

    // Иначе разбираем как ELEMENT_ID.state.field или state.field
    const { elementId, statePath } = PathResolver.parseTarget(source);
    const targetId = elementId || this.context.pageId;
    return this.context.stateManager.getStateField(targetId, statePath);
  }

  // ========== EXECUTE COMMAND ==========
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

      case "setState":
        await this.executeSetState(params, eventData);
        break;

      case "mergeState":
        await this.executeMergeState(params, eventData);
        break;

      case "clearState":
        await this.executeClearState(params, eventData);
        break;

      case "toggleProperty":
        await this.executeToggleProperty(params, eventData);
        break;

      case "sendRequest":
        await this.executeSendRequest(params, eventData);
        break;

      case "showToast":
        await this.executeShowToast(params, eventData);
        break;

      case "navigate":
        await this.executeNavigate(params, eventData);
        break;

      case "confirm":
        await this.executeConfirm(params, eventData);
        break;

      case "delay":
        await this.executeDelay(params, eventData);
        break;

      case "sequence":
        await this.executeSequence(params, eventData);
        break;

      case "log":
        this.executeLog(params, eventData);
        break;

      default:
        console.warn(`Command type not implemented: ${type}`);
    }
  }
}
