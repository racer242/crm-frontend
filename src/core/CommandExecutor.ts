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
 * - setPathParams: заменяет все path-параметры { values: ["val1", "val2"] }
 * - mergePathParams: обновляет отдельные path-параметры { values: { "2": "val2", "4": "val4", "5": null } }
 * - setPathParam: изменяет один path-параметр { index: 1, value: "val2" }
 * - removePathParam: удаляет path-параметр { index: 0 }
 * - downloadFile: скачивание файла через API { url, method?, data?, filename?, onError? }
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
import { buildUrlWithParams } from "@/utils/http";
import { getPublicEnv } from "@/utils/env";
import { getClientLocation } from "@/utils/location";
import { FormatEngine, FormatRule } from "./FormatEngine";
import { applyRules } from "./RulesEngine";
import { ApiError } from "@/utils/parseApiError";

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
      config: this.context.appConfig?.config,
      env: getPublicEnv(),
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
   * Serialize a value for URL query parameters.
   * - null/undefined → null (skip the param)
   * - Date → String (readable date string, e.g. "2026-06-11T14:00:00.000Z")
   * - object/array → JSON.stringify
   * - primitives → String
   */
  private serializeUrlValue(value: unknown): string | null {
    if (value === null || value === undefined) return null;
    if (value instanceof Date) return String(value);
    if (typeof value === "object") return JSON.stringify(value);
    return String(value);
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
    extraSources: any,
  ): Promise<void> {
    const { source, target, value: directValue } = params;
    if (!target) {
      console.warn("setProperty: missing target");
      return;
    }

    const eventData = extraSources?.event;
    let rawValue =
      directValue !== undefined
        ? directValue
        : source
          ? this.getSourceValue(source, eventData)
          : undefined;

    let value = this.macroEngine.apply(rawValue, 0, extraSources);
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
    extraSources: any,
  ): Promise<void> {
    const { source, target } = params;
    if (!target) {
      console.warn("setState: missing target");
      return;
    }

    const eventData = extraSources?.event;
    const rawValue = source
      ? this.getSourceValue(source, eventData)
      : undefined;
    let value = this.macroEngine.apply(rawValue, 0, extraSources);
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
    extraSources: any,
  ): Promise<void> {
    const { source, target } = params;
    if (!target) {
      console.warn("mergeState: missing target");
      return;
    }

    const eventData = extraSources?.event;
    const rawValue = source
      ? this.getSourceValue(source, eventData)
      : undefined;
    let value = this.macroEngine.apply(rawValue, 0, extraSources);
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
    _extraSources: any,
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
    _extraSources: any,
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

  // ========== DOWNLOAD FILE ==========
  /**
   * downloadFile: скачивание файла через API
   *
   * params:
   *   url      - URL запроса (обязательно, с поддержкой макросов)
   *   method   - HTTP метод (опционально, по умолчанию GET)
   *   data     - тело запроса для POST/PUT (опционально)
   *   filename - имя файла для сохранения (опционально, с макросами)
   *   onError  - команды при ошибке (опционально)
   *
   * Определение имени файла (приоритет):
   *   1. Параметр filename
   *   2. Content-Disposition из ответа
   *   3. Из URL (последний сегмент)
   */
  async executeDownloadFile(
    params: Record<string, any>,
    extraSources: any,
  ): Promise<void> {
    const { url, method, data, filename, onError } = params;
    if (!url) {
      console.warn("downloadFile: missing url");
      return;
    }

    let resolvedUrl = this.macroEngine.apply(url, 0, extraSources) as string;
    let resolvedData = data
      ? (this.macroEngine.apply(data, 0, extraSources) as Record<string, any>)
      : undefined;
    let resolvedFilename = filename
      ? (this.macroEngine.apply(filename, 0, extraSources) as string)
      : undefined;

    try {
      const fetchOptions: RequestInit = {
        method: method || "GET",
        headers: {
          Accept: "*/*",
        },
      };

      if (resolvedData) {
        if (
          ["POST", "PUT", "PATCH"].includes((method || "GET").toUpperCase())
        ) {
          fetchOptions.body = JSON.stringify(resolvedData);
        } else {
          resolvedUrl = buildUrlWithParams(resolvedUrl, resolvedData);
        }
      }

      const response = await fetch(resolvedUrl, fetchOptions);

      if (!response.ok) {
        throw new Error(
          `HTTP ${response.status}: ${response.statusText || "Request failed"}`,
        );
      }

      // Determine filename
      if (!resolvedFilename) {
        const disposition = response.headers.get("Content-Disposition");
        if (disposition) {
          const match = disposition.match(/filename="?(.+?)"?$/);
          if (match) {
            resolvedFilename = match[1];
          }
        }
      }
      if (!resolvedFilename) {
        const urlParts = resolvedUrl.split("/");
        resolvedFilename =
          urlParts[urlParts.length - 1].split("?")[0] || "download";
      }

      // Determine MIME type
      const contentType =
        response.headers.get("Content-Type") || "application/octet-stream";

      // Get blob from response
      const blob = await response.blob();

      // Create download link and click it
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = resolvedFilename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Revoke blob URL after a delay
      setTimeout(() => {
        URL.revokeObjectURL(blobUrl);
      }, 100);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error(`downloadFile error: ${errorMessage}`);

      if (onError) {
        for (const cmd of onError) {
          await this.executeCommand(cmd.type, cmd.params, {
            ...extraSources,
            error: errorMessage,
          });
        }
      }
    }
  }

  // ========== SEND REQUEST ==========
  /**
   * sendRequest: HTTP-запрос к API с записью результата в state
   */
  async executeSendRequest(
    params: Record<string, any>,
    extraSources: any,
  ): Promise<void> {
    const { url, method, data, target } = params;
    if (!url || !target) {
      console.warn("sendRequest: missing url or target");
      return;
    }

    const resolvedUrl = this.macroEngine.apply(url, 0, extraSources) as string;
    let resolvedData = data
      ? (this.macroEngine.apply(data, 0, extraSources) as Record<string, any>)
      : undefined;

    // Применение правил трансформации (rules) к данным после макро-резолвинга
    if (params.rules && resolvedData) {
      resolvedData = applyRules(resolvedData, params.rules);
    }

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

      if (result.success && params.onSuccess) {
        for (const cmd of params.onSuccess) {
          await this.executeCommand(cmd.type, cmd.params, {
            ...extraSources,
            result: result.data,
          });
        }
      }

      if (!result.success) {
        // result.error теперь ApiError объект или string
        const errorObj: ApiError | string = result.error || {
          rawText: "Unknown error",
        };
        const errorMessage =
          typeof errorObj === "string"
            ? errorObj
            : errorObj.message || errorObj.rawText || "Unknown error";

        console.error(`sendRequest error: ${errorMessage}`);

        // Сохраняем полный объект ошибки в requestErrors
        this.context.stateManager.setStateField(
          this.context.pageId,
          "requestErrors",
          [errorObj as any],
        );

        if (params.onError) {
          for (const cmd of params.onError) {
            await this.executeCommand(cmd.type, cmd.params, {
              ...extraSources,
              error: errorObj,
            });
          }
        }
      }
    } catch (error: any) {
      const errorObj: ApiError = error?.apiError || {
        message: error instanceof Error ? error.message : String(error),
        rawText: String(error),
      };
      console.error(
        `sendRequest error: ${errorObj.message || errorObj.rawText}`,
      );

      // Сохраняем полный объект ошибки в dataFeedErrors
      this.context.stateManager.setStateField(
        this.context.pageId,
        "dataFeedErrors",
        [errorObj as any],
      );

      if (params.onError) {
        for (const cmd of params.onError) {
          await this.executeCommand(cmd.type, cmd.params, {
            ...extraSources,
            error: errorObj,
          });
        }
      }
    }
  }

  // ========== SHOW TOAST ==========
  /**
   * showToast: показать toast-уведомление
   * params: { message, severity?, summary?, life? }
   */
  async executeShowToast(
    params: Record<string, any>,
    extraSources: any,
  ): Promise<void> {
    const rawMessage = params.message || "";
    let message = this.macroEngine.apply(rawMessage, 0, extraSources) as string;
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
    extraSources: any,
  ): Promise<void> {
    const rawUrl = params.url || "";
    let url = this.macroEngine.apply(rawUrl, 0, extraSources) as string;

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
    extraSources: any,
  ): Promise<void> {
    const rawMessage = params.message || "Подтвердите действие";
    let message = this.macroEngine.apply(rawMessage, 0, extraSources) as string;
    message = this.applyFormatToValue(message, "message", params);
    const onConfirm: Command[] = params.onConfirm || [];
    const onCancel: Command[] = params.onCancel || [];

    let confirmed = true;

    if (this.context.confirm) {
      confirmed = await this.context.confirm(message);
    }

    const commands = confirmed ? onConfirm : onCancel;

    for (const cmd of commands) {
      await this.executeCommand(cmd.type, cmd.params, extraSources);
    }
  }

  // ========== DELAY ==========
  /**
   * delay: пауза в последовательности команд (мс)
   * params: { duration }
   */
  async executeDelay(
    params: Record<string, any>,
    _extraSources: any,
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
    extraSources: any,
  ): Promise<void> {
    const commands: Command[] = params.commands || [];

    for (const cmd of commands) {
      await this.executeCommand(cmd.type, cmd.params, extraSources);
    }
  }

  // ========== SET URL PARAMS ==========
  /**
   * setUrlParams: заменяет все URL параметры
   * params: { values: { key: value, ... } }
   */
  async executeSetUrlParams(
    params: Record<string, any>,
    extraSources: any,
  ): Promise<void> {
    if (typeof window === "undefined") return;

    const rawValues = params.values || {};
    let resolvedValues = this.macroEngine.apply(
      rawValues,
      0,
      extraSources,
    ) as Record<string, any>;
    resolvedValues = this.applyFormatToValue(resolvedValues, "values", params);

    const searchParams = new URLSearchParams();
    for (const [key, value] of Object.entries(resolvedValues)) {
      const serialized = this.serializeUrlValue(value);
      if (serialized !== null) {
        searchParams.set(key, serialized);
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
    extraSources: any,
  ): Promise<void> {
    if (typeof window === "undefined") return;

    const rawValues = params.values || {};
    let resolvedValues = this.macroEngine.apply(
      rawValues,
      0,
      extraSources,
    ) as Record<string, any>;
    resolvedValues = this.applyFormatToValue(resolvedValues, "values", params);

    // Берём ТЕКУЩИЕ параметры и добавляем/обновляем новые
    const searchParams = new URLSearchParams(window.location.search);
    for (const [key, value] of Object.entries(resolvedValues)) {
      const serialized = this.serializeUrlValue(value);
      if (serialized !== null) {
        searchParams.set(key, serialized);
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
    extraSources: any,
  ): Promise<void> {
    if (typeof window === "undefined") return;

    const rawName = params.name || "";
    let rawValue = params.value;

    const name = this.macroEngine.apply(rawName, 0, extraSources) as string;
    let value = this.macroEngine.apply(rawValue, 0, extraSources);
    value = this.applyFormatToValue(value, "value", params);

    if (!name) return;

    const searchParams = new URLSearchParams(window.location.search);
    const serialized = this.serializeUrlValue(value);
    if (serialized !== null) {
      searchParams.set(name, serialized);
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
    extraSources: any,
  ): Promise<void> {
    if (typeof window === "undefined") return;

    const rawName = params.name || "";
    const name = this.macroEngine.apply(rawName, 0, extraSources) as string;

    if (!name) return;

    const searchParams = new URLSearchParams(window.location.search);
    searchParams.delete(name);

    const queryString = searchParams.toString();
    const newUrl = queryString
      ? `${window.location.pathname}?${queryString}`
      : window.location.pathname;

    window.history.pushState({}, "", newUrl);
  }

  // ========== HELPERS FOR PATH PARAMS ==========
  /**
   * Получить текущий pathname с применёнными pathParams
   * Формирует URL: /{route}/{pathParams.join("/")}?{search}
   */
  private buildPathParamsUrl(pathParams: string[]): string {
    const route = this.context.pageRoute || "";
    const newPathname =
      pathParams.length > 0 ? `${route}/${pathParams.join("/")}` : route;
    const search = window.location.search;
    return `${newPathname}${search}`;
  }

  /**
   * Получить текущие pathParams из URL на основе pageRoute
   */
  private getCurrentPathParams(): string[] {
    if (!this.context.pageRoute || typeof window === "undefined") return [];
    const pathParts = window.location.pathname.split("/").filter(Boolean);
    const routeSegments = this.context.pageRoute.split("/").filter(Boolean);
    return pathParts.slice(routeSegments.length);
  }

  // ========== SET PATH PARAMS ==========
  /**
   * setPathParams: заменяет все path-параметры
   * params: { values: ["val1", "val2"] }
   */
  async executeSetPathParams(
    params: Record<string, any>,
    extraSources: any,
  ): Promise<void> {
    if (typeof window === "undefined") return;

    const rawValues = params.values || [];
    let resolvedValues = this.macroEngine.apply(
      rawValues,
      0,
      extraSources,
    ) as any[];

    const pathParams = resolvedValues
      .filter((v: any) => v !== null && v !== undefined)
      .map((v: any) => String(v));

    const newUrl = this.buildPathParamsUrl(pathParams);
    window.history.pushState({}, "", newUrl);
  }

  // ========== MERGE PATH PARAMS ==========
  /**
   * mergePathParams: обновляет отдельные path-параметры по индексу
   * params: { values: { "2": "val2", "4": "val4", "5": null } }
   * null/undefined — удаляет элемент по индексу
   */
  async executeMergePathParams(
    params: Record<string, any>,
    extraSources: any,
  ): Promise<void> {
    if (typeof window === "undefined") return;

    const rawValues = params.values || {};
    let resolvedValues = this.macroEngine.apply(
      rawValues,
      0,
      extraSources,
    ) as Record<string, any>;

    let pathParams = this.getCurrentPathParams();

    // Сортируем индексы по возрастанию для корректного удаления
    const indices = Object.keys(resolvedValues)
      .map(Number)
      .sort((a, b) => a - b);

    for (const idx of indices) {
      const val = resolvedValues[String(idx)];
      if (val === null || val === undefined) {
        // Удалить элемент по индексу
        if (idx < pathParams.length) {
          pathParams.splice(idx, 1);
        }
      } else {
        // Установить значение по индексу
        if (idx < pathParams.length) {
          pathParams[idx] = String(val);
        } else {
          // Добавить новые элементы, если индекс выходит за границы
          while (pathParams.length < idx) {
            pathParams.push("");
          }
          pathParams.push(String(val));
        }
      }
    }

    const newUrl = this.buildPathParamsUrl(pathParams);
    window.history.pushState({}, "", newUrl);
  }

  // ========== SET PATH PARAM ==========
  /**
   * setPathParam: изменяет один path-параметр по индексу
   * params: { index: 1, value: "val2" }
   * Если value === null/undefined — удаляет элемент
   */
  async executeSetPathParam(
    params: Record<string, any>,
    extraSources: any,
  ): Promise<void> {
    if (typeof window === "undefined") return;

    const rawIndex = params.index;
    let rawValue = params.value;

    const index = this.macroEngine.apply(rawIndex, 0, extraSources) as number;
    let value = this.macroEngine.apply(rawValue, 0, extraSources);
    value = this.applyFormatToValue(value, "value", params);

    if (index === undefined || index === null || isNaN(Number(index))) return;

    const idx = Number(index);
    let pathParams = this.getCurrentPathParams();

    if (value === null || value === undefined) {
      // Удалить
      if (idx < pathParams.length) {
        pathParams.splice(idx, 1);
      }
    } else {
      // Установить
      if (idx < pathParams.length) {
        pathParams[idx] = String(value);
      } else {
        // Добавить новые элементы, если индекс выходит за границы
        while (pathParams.length < idx) {
          pathParams.push("");
        }
        pathParams.push(String(value));
      }
    }

    const newUrl = this.buildPathParamsUrl(pathParams);
    window.history.pushState({}, "", newUrl);
  }

  // ========== REMOVE PATH PARAM ==========
  /**
   * removePathParam: удаляет path-параметр по индексу
   * params: { index: 0 }
   */
  async executeRemovePathParam(
    params: Record<string, any>,
    extraSources: any,
  ): Promise<void> {
    if (typeof window === "undefined") return;

    const rawIndex = params.index;
    const index = this.macroEngine.apply(rawIndex, 0, extraSources) as number;

    if (index === undefined || index === null || isNaN(Number(index))) return;

    const idx = Number(index);
    let pathParams = this.getCurrentPathParams();

    if (idx < pathParams.length) {
      pathParams.splice(idx, 1);
    }

    const newUrl = this.buildPathParamsUrl(pathParams);
    window.history.pushState({}, "", newUrl);
  }

  // ========== LOG ==========
  /**
   * log: логирование в консоль
   */
  executeLog(params: Record<string, any>, extraSources: any): void {
    const { level = "info", message } = params;
    const resolvedMessage = this.macroEngine.apply(message, 0, extraSources);
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
    const eventData = extraSources?.event;
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
    _extraSources: any,
  ): Promise<void> {
    const mode = params?.mode || "refresh";

    if (this.context.refresh) {
      this.context.refresh(mode);
    } else if (typeof window !== "undefined") {
      // Fallback
      window.location.reload();
    }
  }

  // ========== COPY TO CLIPBOARD ==========
  /**
   * copyToClipboard: копирует данные из params в буфер обмена
   *
   * params:
   *   value    - что копировать (строка, объект, макрос {$...})
   *   message  - опциональное toast-сообщение при успехе (с макросами)
   *   severity - уровень toast (success/info/warn/error), по умолчанию "info"
   *
   * Если value — объект, он преобразуется в JSON (pretty-printed).
   * Использует navigator.clipboard.writeText() с fallback на document.execCommand('copy').
   */
  async executeCopyToClipboard(
    params: Record<string, any>,
    extraSources: any,
  ): Promise<void> {
    const rawValue = params.value;
    if (rawValue === undefined || rawValue === null) {
      console.warn("copyToClipboard: missing value");
      return;
    }

    let resolvedValue = this.macroEngine.apply(rawValue, 0, extraSources);

    // Если в итоге получился объект — сериализуем в JSON
    const text =
      typeof resolvedValue === "object" && resolvedValue !== null
        ? JSON.stringify(resolvedValue, null, 2)
        : String(resolvedValue);

    try {
      // Основной API: navigator.clipboard
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        // Fallback: document.execCommand('copy')
        const textarea = document.createElement("textarea");
        textarea.value = text;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
    } catch (error) {
      console.error("copyToClipboard error:", error);
      return;
    }

    // Показать toast, если указан message
    const rawMessage = params.message;
    if (rawMessage) {
      let message = this.macroEngine.apply(
        rawMessage,
        0,
        extraSources,
      ) as string;
      const severity = params.severity || "info";
      if (this.context.showToast) {
        this.context.showToast(message, severity);
      } else {
        console.log(`[Toast ${severity}] ${message}`);
      }
    }
  }

  // ========== EXECUTE COMMAND ==========
  /**
   * Общая функция исполнения команд
   * Поддерживает параметр condition для условного выполнения любой команды
   */
  async executeCommand(
    type: string,
    params: Record<string, any>,
    commandExtraSources: any,
  ): Promise<void> {
    // Проверяем условие перед выполнением любой команды
    if (params?.condition) {
      const extraSources = this.createExtraSources(commandExtraSources);
      const conditionValue = this.macroEngine.apply(
        params.condition,
        0,
        extraSources,
      );
      console.log("???", conditionValue);

      if (!conditionValue) {
        return; // Условие не выполнено — пропускаем команду
      }
    }

    const extraSources = this.createExtraSources(commandExtraSources);

    switch (type) {
      case "setProperty":
        await this.executeSetProperty(params, extraSources);
        break;

      case "setState":
        await this.executeSetState(params, extraSources);
        break;

      case "mergeState":
        await this.executeMergeState(params, extraSources);
        break;

      case "clearState":
        await this.executeClearState(params, extraSources);
        break;

      case "toggleProperty":
        await this.executeToggleProperty(params, extraSources);
        break;

      case "sendRequest":
        await this.executeSendRequest(params, extraSources);
        break;

      case "showToast":
        await this.executeShowToast(params, extraSources);
        break;

      case "navigate":
        await this.executeNavigate(params, extraSources);
        break;

      case "confirm":
        await this.executeConfirm(params, extraSources);
        break;

      case "delay":
        await this.executeDelay(params, extraSources);
        break;

      case "sequence":
        await this.executeSequence(params, commandExtraSources);
        break;

      case "log":
        this.executeLog(params, extraSources);
        break;

      case "setUrlParams":
        await this.executeSetUrlParams(params, extraSources);
        break;

      case "mergeUrlParams":
        await this.executeMergeUrlParams(params, extraSources);
        break;

      case "setUrlParam":
        await this.executeSetUrlParam(params, extraSources);
        break;

      case "removeUrlParam":
        await this.executeRemoveUrlParam(params, extraSources);
        break;

      case "setPathParams":
        await this.executeSetPathParams(params, extraSources);
        break;

      case "mergePathParams":
        await this.executeMergePathParams(params, extraSources);
        break;

      case "setPathParam":
        await this.executeSetPathParam(params, extraSources);
        break;

      case "removePathParam":
        await this.executeRemovePathParam(params, extraSources);
        break;

      case "downloadFile":
        await this.executeDownloadFile(params, extraSources);
        break;

      case "copyToClipboard":
        await this.executeCopyToClipboard(params, extraSources);
        break;

      case "refresh":
        await this.executeRefresh(params, extraSources);
        break;

      default:
        console.warn(`Command type not implemented: ${type}`);
    }
  }
}
