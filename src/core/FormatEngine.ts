/**
 * FormatEngine - форматирование данных с использованием Intl API
 *
 * Поддерживаемые типы форматирования:
 * - Date: форматирование даты/времени
 * - Number: форматирование чисел
 * - Currency: форматирование валюты
 * - Time: форматирование времени
 * - RelativeTime: относительное время (вчера, завтра, etc.)
 * - List: форматирование списков
 * - Plural: правила множественных чисел
 */

import { PathResolver } from "./PathResolver";

export type FormatType =
  | "Date"
  | "Number"
  | "Currency"
  | "Time"
  | "RelativeTime"
  | "List"
  | "Plural";

export type FormatFunc =
  | "DateTimeFormat"
  | "NumberFormat"
  | "RelativeTimeFormat"
  | "ListFormat"
  | "PluralRules";

export interface FormatRule {
  /** Путь к свойству (может быть вложенным, например "data.amount") */
  prop: string;
  /** Тип данных для форматирования */
  type: FormatType;
  /** Функция Intl для форматирования */
  func: FormatFunc;
  /** Опции форматирования */
  params?:
    | Intl.DateTimeFormatOptions
    | Intl.NumberFormatOptions
    | Intl.RelativeTimeFormatOptions
    | Intl.ListFormatOptions
    | Intl.PluralRulesOptions;
}

export interface LocaleConfig {
  default: string;
  fallback?: string;
  options?: {
    numberingSystem?: string;
    calendar?: string;
  };
}

/**
 * Создать Intl.DateTimeFormat с fallback
 */
function createDateTimeFormat(
  locale: string,
  options?: Intl.DateTimeFormatOptions,
): Intl.DateTimeFormat {
  try {
    return new Intl.DateTimeFormat(locale, options);
  } catch {
    return new Intl.DateTimeFormat("en-US", options);
  }
}

/**
 * Создать Intl.NumberFormat с fallback
 */
function createNumberFormat(
  locale: string,
  options?: Intl.NumberFormatOptions,
): Intl.NumberFormat {
  try {
    return new Intl.NumberFormat(locale, options);
  } catch {
    return new Intl.NumberFormat("en-US", options);
  }
}

/**
 * Создать Intl.RelativeTimeFormat с fallback
 */
function createRelativeTimeFormat(
  locale: string,
  options?: Intl.RelativeTimeFormatOptions,
): Intl.RelativeTimeFormat {
  try {
    return new Intl.RelativeTimeFormat(locale, options);
  } catch {
    return new Intl.RelativeTimeFormat("en-US", options);
  }
}

/**
 * Создать Intl.ListFormat с fallback
 */
function createListFormat(
  locale: string,
  options?: Intl.ListFormatOptions,
): Intl.ListFormat {
  try {
    return new Intl.ListFormat(locale, options);
  } catch {
    return new Intl.ListFormat("en-US", options);
  }
}

/**
 * Создать Intl.PluralRules с fallback
 */
function createPluralRules(
  locale: string,
  options?: Intl.PluralRulesOptions,
): Intl.PluralRules {
  try {
    return new Intl.PluralRules(locale, options);
  } catch {
    return new Intl.PluralRules("en-US", options);
  }
}

export class FormatEngine {
  private locale: string;

  constructor(locale: string = "ru-RU") {
    this.locale = locale;
  }

  /**
   * Получить текущую локаль
   */
  getLocale(): string {
    return this.locale;
  }

  /**
   * Установить локаль
   */
  setLocale(locale: string): void {
    this.locale = locale;
  }

  /**
   * Форматирование даты/времени
   */
  formatDateTime(
    value: Date | string | number,
    options?: Intl.DateTimeFormatOptions,
  ): string {
    const date = value instanceof Date ? value : new Date(value);
    return createDateTimeFormat(this.locale, options).format(date);
  }

  /**
   * Форматирование числа
   */
  formatNumber(value: number, options?: Intl.NumberFormatOptions): string {
    return createNumberFormat(this.locale, options).format(value);
  }

  /**
   * Форматирование валюты
   */
  formatCurrency(
    value: number,
    currency: string = "RUB",
    options?: Intl.NumberFormatOptions,
  ): string {
    return createNumberFormat(this.locale, {
      style: "currency",
      currency,
      ...options,
    }).format(value);
  }

  /**
   * Форматирование относительного времени
   */
  formatRelativeTime(
    value: number,
    unit: Intl.RelativeTimeFormatUnit,
    options?: Intl.RelativeTimeFormatOptions,
  ): string {
    return createRelativeTimeFormat(this.locale, options).format(value, unit);
  }

  /**
   * Форматирование списка
   */
  formatList(values: string[], options?: Intl.ListFormatOptions): string {
    return createListFormat(this.locale, options).format(values);
  }

  /**
   * Определение множественного числа
   */
  selectPlural(value: number, options?: Intl.PluralRulesOptions): string {
    return createPluralRules(this.locale, options).select(value);
  }

  /**
   * Применить правила форматирования к объекту
   * Поддерживает вложенные свойства через PathResolver
   */
  applyFormat(
    data: Record<string, any>,
    rules: FormatRule[],
  ): Record<string, any> {
    const result = structuredClone(data);

    for (const rule of rules) {
      const value = PathResolver.getValue(result, rule.prop);
      if (value !== undefined) {
        const formatted = this.formatValue(value, rule);
        PathResolver.setValue(result, rule.prop, formatted);
      }
    }

    return result;
  }

  /**
   * Применить форматирование к одному значению
   */
  formatValue(value: any, rule: FormatRule): string {
    switch (rule.type) {
      case "Date":
      case "Time":
        return this.formatDateTime(
          value,
          rule.params as Intl.DateTimeFormatOptions,
        );

      case "Number":
        return this.formatNumber(
          value,
          rule.params as Intl.NumberFormatOptions,
        );

      case "Currency": {
        const params = rule.params as Intl.NumberFormatOptions & {
          currency?: string;
        };
        return this.formatCurrency(value, params?.currency, params);
      }

      case "RelativeTime": {
        const params = rule.params as Intl.RelativeTimeFormatOptions & {
          unit?: Intl.RelativeTimeFormatUnit;
        };
        const unit = params?.unit || "day";
        return this.formatRelativeTime(value, unit, params);
      }

      case "List":
        if (Array.isArray(value)) {
          return this.formatList(value, rule.params as Intl.ListFormatOptions);
        }
        return String(value);

      case "Plural":
        return this.selectPlural(value, rule.params as Intl.PluralRulesOptions);

      default:
        return String(value);
    }
  }
}
