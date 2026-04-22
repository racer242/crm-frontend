/**
 * MacroEngine — система подстановки макросов
 *
 * Формат макроса: {$PREFIX.PATH.TO.FIELD}
 * Поддерживает рекурсивную подстановку (максимум N уровней).
 *
 * Примеры:
 *   {$config.baseURL} → "http://localhost:3000"
 *   {$form.state.username} → "John"
 *   {$now.DD.MM.YYYY} → "22.04.2026"
 *   {$location.query.id} → "123"
 *   {$math.uuid} → "550e8400-..."
 *   {$env.NEXT_PUBLIC_API_URL} → "https://api.example.com"
 */

import { MacroSources } from "@/types";

/** Pattern для поиска макросов */
const MACRO_PATTERN = /\{\$([^}]+)\}/g;

/** Проверяет, содержит ли строка макросы */
export function hasMacro(value: string): boolean {
  return MACRO_PATTERN.test(value);
}

/** Проверка: клиентская среда */
function isClient(): boolean {
  return typeof window !== "undefined";
}

/**
 * Получить вложенное значение объекта по пути через точку
 */
function getNestedValue(obj: Record<string, any> | null, path: string): any {
  if (!obj) return undefined;
  const parts = path.split(".").filter(Boolean);
  let current: any = obj;
  for (const part of parts) {
    if (current === null || current === undefined) return undefined;
    current = current[part];
  }
  return current;
}

/**
 * Получить cookie по имени
 */
function getCookie(name: string): string | undefined {
  if (!isClient()) return undefined;
  const cookies = document.cookie.split(";");
  for (const cookie of cookies) {
    const [key, ...rest] = cookie.trim().split("=");
    if (key === name) return decodeURIComponent(rest.join("="));
  }
  return undefined;
}

/**
 * Распарсить cookie строку в объект
 */
function parseCookies(): Record<string, string> {
  if (!isClient()) return {};
  const result: Record<string, string> = {};
  document.cookie.split(";").forEach((cookie) => {
    const [key, ...rest] = cookie.trim().split("=");
    if (key) result[key] = decodeURIComponent(rest.join("="));
  });
  return result;
}

/**
 * UUID v4
 */
function generateUUID(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * GUID (обёртка над UUID для обратной совместимости)
 */
function generateGUID(): string {
  return generateUUID();
}

/**
 * Форматировать дату
 */
function formatDate(date: Date, format: string): string {
  const pad = (n: number, len = 2) => n.toString().padStart(len, "0");

  return format
    .replace(/YYYY/g, date.getFullYear().toString())
    .replace(/YY/g, date.getFullYear().toString().slice(-2))
    .replace(/MM/g, pad(date.getMonth() + 1))
    .replace(/DD/g, pad(date.getDate()))
    .replace(/HH/g, pad(date.getHours()))
    .replace(/mm/g, pad(date.getMinutes()))
    .replace(/ss/g, pad(date.getSeconds()))
    .replace(/SSS/g, pad(date.getMilliseconds(), 3));
}

/**
 * Распарсить макрос
 */
function parseMacro(content: string): {
  prefix: string;
  parts: string[];
} {
  const parts = content.split(".");
  return {
    prefix: parts[0],
    parts: parts.slice(1),
  };
}

/**
 * Разрешить один макрос
 */
function resolveSingleMacro(macroContent: string, sources: MacroSources): any {
  const { prefix, parts } = parseMacro(macroContent);
  const fullPath = parts.join(".");

  switch (prefix) {
    // === State ===
    case "state": {
      if (!sources.stateManager || !sources.pageId) return undefined;
      return sources.stateManager.getStateField(sources.pageId, fullPath);
    }

    // === Config ===
    case "config": {
      if (!sources.config) return undefined;
      return getNestedValue(sources.config, fullPath);
    }

    // === Location ===
    case "location": {
      if (!sources.location || !isClient()) return undefined;
      if (parts[0] === "query") {
        const params = new URLSearchParams(sources.location.search);
        return params.get(parts[1]) ?? undefined;
      }
      if (parts[0] === "slug") {
        const pathParts = sources.location.pathname.split("/").filter(Boolean);
        const idx = parseInt(parts[1], 10);
        return pathParts[idx] ?? undefined;
      }
      return getNestedValue(
        {
          href: sources.location.href,
          protocol: sources.location.protocol,
          host: sources.location.host,
          hostname: sources.location.hostname,
          port: sources.location.port,
          pathname: sources.location.pathname,
          search: sources.location.search,
          hash: sources.location.hash,
          origin: sources.location.origin,
        },
        fullPath,
      );
    }

    // === Now (date/time) ===
    case "now": {
      const now = new Date();
      if (!fullPath || fullPath === "iso") return now.toISOString();
      if (fullPath === "timestamp") return now.getTime();
      return formatDate(now, fullPath);
    }

    // === Session ===
    case "session": {
      if (!isClient()) return undefined;
      const prop = parts[0];
      return sessionStorage.getItem(prop) ?? undefined;
    }

    // === localStorage ===
    case "localStorage": {
      if (!isClient()) return undefined;
      const prop = parts[0];
      const val = localStorage.getItem(prop);
      if (val === null) return undefined;
      // Попробуем распарсить JSON
      try {
        return JSON.parse(val);
      } catch {
        return val;
      }
    }

    // === Cookie ===
    case "cookie": {
      if (!isClient()) return undefined;
      if (!fullPath) return parseCookies();
      return getCookie(fullPath);
    }

    // === Window ===
    case "window": {
      if (!sources.window || !isClient()) return undefined;
      return getNestedValue(sources.window as any, fullPath);
    }

    // === User (stub) ===
    case "user": {
      return undefined;
    }

    // === Auth (stub) ===
    case "auth": {
      return undefined;
    }

    // === Math ===
    case "math": {
      if (parts[0] === "random") {
        if (parts[1] === "Int" && parts.length >= 4) {
          const min = parseInt(parts[2], 10);
          const max = parseInt(parts[3], 10);
          return Math.floor(Math.random() * (max - min + 1)) + min;
        }
        return Math.random();
      }
      if (parts[0] === "randomInt" && parts.length >= 2) {
        const min = parseInt(parts[0], 10);
        const max = parseInt(parts[1], 10);
        return Math.floor(Math.random() * (max - min + 1)) + min;
      }
      if (parts[0] === "uuid") return generateUUID();
      if (parts[0] === "guid") return generateGUID();
      return undefined;
    }

    // === Device ===
    case "device": {
      if (parts[0] === "platform") {
        return isClient() ? navigator.platform : "unknown";
      }
      if (parts[0] === "mobile") {
        if (!isClient()) return false;
        return /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(
          navigator.userAgent,
        );
      }
      return undefined;
    }

    // === Browser ===
    case "browser": {
      if (parts[0] === "userAgent") {
        return isClient() ? navigator.userAgent : "server";
      }
      return undefined;
    }

    // === Environment ===
    case "env": {
      if (!sources.env) return undefined;
      return sources.env[fullPath] ?? undefined;
    }

    // === Unknown: try as element ID with state ===
    default: {
      // Проверяем, есть ли "state" в parts — это ELEMENT_ID.state.PATH
      const stateIndex = parts.indexOf("state");
      if (stateIndex >= 0 && sources.stateManager) {
        const elemId = prefix;
        const statePath = parts.slice(stateIndex + 1).join(".");
        return sources.stateManager.getStateField(elemId, statePath);
      }
      // Неизвестный макрос — вернуть как есть
      return `{$${macroContent}}`;
    }
  }
}

/**
 * MacroEngine — singleton для подстановки макросов
 */
export class MacroEngine {
  private sources: MacroSources;
  private maxRecursion: number;

  constructor(sources: MacroSources, options?: { maxRecursion?: number }) {
    this.sources = sources;
    this.maxRecursion = options?.maxRecursion ?? 3;
  }

  /**
   * Применить макросы к значению (рекурсивно)
   */
  apply(value: any, depth: number = 0): any {
    if (depth > this.maxRecursion) return value;

    if (value === null || value === undefined) return value;

    if (typeof value === "string") {
      return this.resolveString(value, depth);
    }

    if (Array.isArray(value)) {
      return value.map((item) => this.apply(item, depth + 1));
    }

    if (typeof value === "object") {
      const result: Record<string, any> = {};
      for (const [key, val] of Object.entries(value)) {
        result[key] = this.apply(val, depth + 1);
      }
      return result;
    }

    return value;
  }

  /**
   * Разрешить макросы в строке
   */
  resolveString(str: string, depth: number = 0): any {
    if (depth > this.maxRecursion) return str;

    // Проверяем: вся строка — один макрос?
    const singleMatch = str.match(/^\{\$([^}]+)\}$/);
    if (singleMatch) {
      const resolved = resolveSingleMacro(singleMatch[1], this.sources);
      // Рекурсивно обрабатываем если результат — строка с макросами
      if (typeof resolved === "string" && hasMacro(resolved)) {
        return this.resolveString(resolved, depth + 1);
      }
      return resolved;
    }

    // Несколько макросов или текст + макросы — заменяем в строке
    return str.replace(MACRO_PATTERN, (match, content) => {
      const resolved = resolveSingleMacro(content, this.sources);
      // Рекурсия
      if (typeof resolved === "string" && hasMacro(resolved)) {
        return this.resolveString(resolved, depth + 1) ?? match;
      }
      return resolved !== undefined ? String(resolved) : match;
    });
  }
}
