/**
 * CommandExecutor - выполнение команд
 *
 * Доступные команды:
 * - setProperty: записывает значение из source в target (source может быть строкой или объектом)
 * - setState: полная замена состояния элемента (source может быть строкой или объектом)
 * - mergeState: слияние с текущим состоянием (source может быть строкой или объектом)
 * - clearState: очистка состояния элемента
 * - toggleProperty: инвертирует boolean значение
 * - sendRequest: HTTP-запрос к API
 * - showToast: показать Toast-уведомление
 * - navigate: переход по URL
 * - confirm: условное ветвление по подтверждению
 * - delay: пауза в последовательности команд
 * - log: логирование в консоль
 * - sequence: последовательное выполнение команд
 * - setUrlParams: заменяет все URL параметры { values: { key: value } }
 * - mergeUrlParams: обновляет/добавляет URL параметры { values: { key: value } }
 * - setUrlParam: изменяет один URL параметр { name: "key", value: "value" }
 * - removeUrlParam: удаляет URL параметр { name: "key" }
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
import { executeClientDataFeed } from "./DataFeedService";
import { MacroEngine } from "./MacroEngine";
import { getServerEnv } from "@/utils/env";
import { getClientLocation } from "@/utils/location";
import { FormatEngine, FormatRule } from "./FormatEngine";

export interface CommandExecutionContext {
  pageId: string;
  pageRoute?: string;
  triggerComponentId: string;
  appConfig: App;
  stateManager: StateManager;
  /** Callback для показа toast-уведомлений */
  showToast?: (
    message: string,
    severity?: "success" | "info" | "warn" | "error",
  ) => void;
  /** Callback для навигации */
  navigate?: (url: string) => void;
  /** Callback для подтверждения (вызывает callback с true/false) */
  confirm?: (message: string) => Promise<boolean>;
  /** Callback для обновления страницы без перезагрузки */
  refresh?: (mode: string) => void;
}

export class CommandExecutor {
  private macroEngine: MacroEngine;
  private formatEngine: FormatEngine;

  constructor(private context: CommandExecutionContext) {
    this.macroEngine = new MacroEngine(this.createMacroSources());
    // Get locale from config or default to ru-RU
    const locale = context.appConfig?.config?.locale?.default || "ru-RU";
    this.formatEngine = new FormatEngine(locale);
  }

  // ========== PRIVATE HELPERS ==========
  /**
   * Create MacroSources from command context
   */
  private createMacroSources(): MacroSources {
    return {
      stateManager: this.context.stateManager,
      pageId: this.context.pageId,
      config: this.context.appConfig,
      env: getServerEnv(),
    };
  }

  /**
   * Распарсить target и вернуть путь элемента + путь к полю
   */
  private parseTargetPath(target: string): {
    elementPath: string;
    fieldPath: string;
  } {
    const stateIndex = target.indexOf("state.");

    if (stateIndex === 0) {
      // "state.field" — state страницы с полем
      return { elementPath: this.context.pageId, fieldPath: target.slice(6) };
    } else if (target === "state") {
      // "state" — корневой state страницы
      return { elementPath: this.context.pageId, fieldPath: "" };
    } else if (stateIndex > 0) {
      // "elementId.state.field" — state элемента
      return {
        elementPath: target.slice(0, stateIndex - 1),
        fieldPath: target.slice(stateIndex + 6),
      };
    } else {
      // Просто "field" — state триггер-компонента
      return {
        elementPath: this.context.triggerComponentId,
        fieldPath: target,
      };
    }
  }

  /**
   * Apply formatting to a value if format rules are provided
   * Supports primitives, objects, and arrays
   */
  private applyFormatToValue(
    value: any,
    name: string,
    params: Record<string, any>,
  ): any {
    if (!params.format) {
      return value;
    }

    const formatRules: FormatRule[] = Array.isArray(params.format)
      ? params.format
      : [params.format];

    // Filter rules that match this name (either "name" or "name.subpath")
    let matchingRules = formatRules.filter(
      (r) => r.prop === name || r.prop.startsWith(name + "."),
    );

    // If value is an object and no prefix-matched rules, try direct property matching
    if (
      matchingRules.length === 0 &&
      typeof value === "object" &&
      value !== null &&
      !Array.isArray(value)
    ) {
      const props = Object.keys(value);
      matchingRules = formatRules.filter((r) =>
        props.some((p) => r.prop === p || r.prop.startsWith(p + ".")),
      );
    }

    if (matchingRules.length === 0) return value;

    // Primitive or Date - apply matching rule directly
    if (
      value === null ||
      value === undefined ||
      typeof value !== "object" ||
      value instanceof Date
    ) {
      const rule = matchingRules.find((r) => r.prop === name);
      if (rule) {
        return this.formatEngine.formatValue(value, { ...rule, prop: "" });
      }
      return value;
    }

    // Array - format each element
    if (Array.isArray(value)) {
      return value.map((item) => {
        const itemRules = matchingRules.map((r) => ({
          ...r,
          prop: r.prop.startsWith(name + ".")
            ? r.prop.slice(name.length + 1)
            : r.prop,
        }));
        return this.formatEngine.applyFormat(item, itemRules);
      });
    }

    // Object - format its properties
    const objectRules = matchingRules.map((r) => ({
      ...r,
      prop: r.prop.startsWith(name + ".")
        ? r.prop.slice(name.length + 1)
        : r.prop,
    }));
    return this.formatEngine.applyFormat(value, objectRules);
  }

  /**
   * Create extra sources for macro resolution with current client location
   * Вычисляется каждый раз перед применением макросов, чтобы использовать актуальный URL
   */
  private createExtraSources(eventData: any): Record<string, any> {
    const extra: Record<string, any> = { event: eventData };
    if (typeof window !== "undefined" && this.context.pageRoute) {
      extra.location = getClientLocation(this.context.pageRoute);
    }
    return extra;
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

    let value = this.macroEngine.apply(
      rawValue,
      0,
      this.createExtraSources(eventData),
    );
    value = this.applyFormatToValue(value, "value", params);

    const { elementPath, fieldPath } = this.parseTargetPath(target);

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
    let value = this.macroEngine.apply(
      rawValue,
      0,
      this.createExtraSources(eventData),
    );
    value = this.applyFormatToValue(value, "data", params);

    const { elementPath } = this.parseTargetPath(target);

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
    let value = this.macroEngine.apply(
      rawValue,
      0,
      this.createExtraSources(eventData),
    );
    value = this.applyFormatToValue(value, "data", params);

    if (typeof value !== "object" || value === null) {
      console.warn("mergeState: value must be an object");
      return;
    }

    const { elementPath } = this.parseTargetPath(target);

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

    const { elementPath } = this.parseTargetPath(target);

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

    const { elementPath, fieldPath } = this.parseTargetPath(target);

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

    const resolvedUrl = this.macroEngine.apply(
      url,
      0,
      this.createExtraSources(eventData),
    ) as string;
    let resolvedData = data
      ? (this.macroEngine.apply(
          data,
          0,
          this.createExtraSources(eventData),
        ) as Record<string, any>)
      : undefined;
    resolvedData = this.applyFormatToValue(resolvedData, "data", params);

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
    eventData: any,
  ): Promise<void> {
    const rawMessage = params.message || "";
    let message = this.macroEngine.apply(
      rawMessage,
      0,
      this.createExtraSources(eventData),
    ) as string;
    message = this.applyFormatToValue(message, "message", params);
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
    eventData: any,
  ): Promise<void> {
    const rawUrl = params.url || "";
    let url = this.macroEngine.apply(
      rawUrl,
      0,
      this.createExtraSources(eventData),
    ) as string;
    url = this.applyFormatToValue(url, "url", params);

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
    let message = this.macroEngine.apply(
      rawMessage,
      0,
      this.createExtraSources(eventData),
    ) as string;
    message = this.applyFormatToValue(message, "message", params);
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

  // ========== SET URL PARAMS ==========
  /**
   * setUrlParams: заменяет все URL параметры
   * params: { values: { key: value, ... } }
   */
  async executeSetUrlParams(
    params: Record<string, any>,
    eventData: any,
  ): Promise<void> {
    if (typeof window === "undefined") return;

    const rawValues = params.values || {};
    let resolvedValues = this.macroEngine.apply(
      rawValues,
      0,
      this.createExtraSources(eventData),
    ) as Record<string, any>;
    resolvedValues = this.applyFormatToValue(resolvedValues, "values", params);

    const searchParams = new URLSearchParams();
    for (const [key, value] of Object.entries(resolvedValues)) {
      if (value !== undefined && value !== null) {
        searchParams.set(key, String(value));
      }
    }

    const queryString = searchParams.toString();
    const newUrl = queryString
      ? `${window.location.pathname}?${queryString}`
      : window.location.pathname;

    window.history.pushState({}, "", newUrl);
  }

  // ========== MERGE URL PARAMS ==========
  /**
   * mergeUrlParams: обновляет/добавляет URL параметры (сохраняет существующие)
   * params: { values: { key: value, ... } }
   */
  async executeMergeUrlParams(
    params: Record<string, any>,
    eventData: any,
  ): Promise<void> {
    if (typeof window === "undefined") return;

    const rawValues = params.values || {};
    let resolvedValues = this.macroEngine.apply(
      rawValues,
      0,
      this.createExtraSources(eventData),
    ) as Record<string, any>;
    resolvedValues = this.applyFormatToValue(resolvedValues, "values", params);

    // Берём ТЕКУЩИЕ параметры и добавляем/обновляем новые
    const searchParams = new URLSearchParams(window.location.search);
    for (const [key, value] of Object.entries(resolvedValues)) {
      if (value !== undefined && value !== null) {
        searchParams.set(key, String(value));
      } else {
        searchParams.delete(key);
      }
    }

    const queryString = searchParams.toString();
    const newUrl = queryString
      ? `${window.location.pathname}?${queryString}`
      : window.location.pathname;

    window.history.pushState({}, "", newUrl);
  }

  // ========== SET URL PARAM ==========
  /**
   * setUrlParam: изменяет один URL параметр
   * params: { name: "key", value: "value" }
   */
  async executeSetUrlParam(
    params: Record<string, any>,
    eventData: any,
  ): Promise<void> {
    if (typeof window === "undefined") return;

    const rawName = params.name || "";
    let rawValue = params.value;

    const name = this.macroEngine.apply(
      rawName,
      0,
      this.createExtraSources(eventData),
    ) as string;
    let value = this.macroEngine.apply(
      rawValue,
      0,
      this.createExtraSources(eventData),
    );
    value = this.applyFormatToValue(value, "value", params);

    if (!name) return;

    const searchParams = new URLSearchParams(window.location.search);
    if (value !== undefined && value !== null) {
      searchParams.set(name, String(value));
    } else {
      searchParams.delete(name);
    }

    const queryString = searchParams.toString();
    const newUrl = queryString
      ? `${window.location.pathname}?${queryString}`
      : window.location.pathname;

    window.history.pushState({}, "", newUrl);
  }

  // ========== REMOVE URL PARAM ==========
  /**
   * removeUrlParam: удаляет URL параметр
   * params: { name: "key" }
   */
  async executeRemoveUrlParam(
    params: Record<string, any>,
    eventData: any,
  ): Promise<void> {
    if (typeof window === "undefined") return;

    const rawName = params.name || "";
    const name = this.macroEngine.apply(
      rawName,
      0,
      this.createExtraSources(eventData),
    ) as string;

    if (!name) return;

    const searchParams = new URLSearchParams(window.location.search);
    searchParams.delete(name);

    const queryString = searchParams.toString();
    const newUrl = queryString
      ? `${window.location.pathname}?${queryString}`
      : window.location.pathname;

    window.history.pushState({}, "", newUrl);
  }

  // ========== LOG ==========
  /**
   * log: логирование в консоль
   */
  executeLog(params: Record<string, any>, eventData: any): void {
    const { level = "info", message } = params;
    const resolvedMessage = this.macroEngine.apply(
      message,
      0,
      this.createExtraSources(eventData),
    );
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
   * source может быть строкой (путь) или объектом с парами "prop":"value"
   */
  private getSourceValue(source: string | object, eventData: any): any {
    // Если source уже объект — возвращаем как есть (макросы и формат применяются позже)
    if (typeof source === "object" && source !== null) {
      return source;
    }

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

  // ========== REFRESH ==========
  /**
   * refresh: обновление страницы без перезагрузки
   * params: { mode?: "refresh" | "replace" | "reload" } (по умолчанию "refresh")
   */
  async executeRefresh(
    params: Record<string, any>,
    _eventData: any,
  ): Promise<void> {
    const mode = params?.mode || "refresh";

    if (this.context.refresh) {
      this.context.refresh(mode);
    } else if (typeof window !== "undefined") {
      // Fallback
      window.location.reload();
    }
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

      case "setUrlParams":
        await this.executeSetUrlParams(params, eventData);
        break;

      case "mergeUrlParams":
        await this.executeMergeUrlParams(params, eventData);
        break;

      case "setUrlParam":
        await this.executeSetUrlParam(params, eventData);
        break;

      case "removeUrlParam":
        await this.executeRemoveUrlParam(params, eventData);
        break;

      case "refresh":
        await this.executeRefresh(params, eventData);
        break;

      default:
        console.warn(`Command type not implemented: ${type}`);
    }
  }
}
