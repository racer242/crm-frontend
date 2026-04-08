# ПРИЛОЖЕНИЕ: Адаптер API

## A.1 КОНЦЕПЦИЯ АДАПТАЦИИ

### A.1.1 Проблема

```
API (внешний)                    Платформа CRM
─────────────                    ──────────────
{                                {
  "users": [                       "data": [
    {                                {
      "user_id": 1,        ──►         "id": "1",
      "full_name": "...",              "name": "...",
      "is_active": true                "active": true
    }                                }
  ],                               ],
  "total_count": 100,              "total": 100,
  "page_num": 1                    "page": 1
}                                }
```

**Задача**: Автоматически преобразовывать ответы API к единому формату Платформы.

### A.1.2 Решение: Система адаптеров

```
┌─────────────────────────────────────────────────────────┐
│                    API Response                          │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│              Response Interceptor                        │
│  • Определяет тип API (по endpoint/headers)             │
│  • Выбирает подходящий адаптер                          │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│                  API Adapter                             │
│  • Маппинг полей (user_id → id)                         │
│  • Трансформация структуры (users → data)               │
│  • Нормализация типов (string → number)                 │
│  • Обогащение данных                                    │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│              Normalized Response                         │
│  • Стандартная структура Platform                       │
│  • Типизированные данные                                │
│  • Готово к использованию в Components                  │
└─────────────────────────────────────────────────────────┘
```

---

## A.2 ТИПИЗАЦИЯ АДАПТЕРОВ

### A.2.1 Базовые типы

```typescript
// types/adapters.ts

/**
 * Конфигурация адаптера API
 */
export interface ApiAdapterConfig {
  id: string; // Уникальный ID адаптера
  name: string; // Название (для UI)
  description?: string; // Описание

  /** Правила определения API */
  detection: DetectionRule[];

  /** Схема маппинга */
  mapping: MappingSchema;

  /** Нормализация данных */
  normalization?: NormalizationRules;

  /** Дополнительные настройки */
  options?: AdapterOptions;
}

/**
 * Правило определения API
 */
export interface DetectionRule {
  type: "endpoint" | "header" | "responseShape" | "custom";

  /** Для type: 'endpoint' */
  pattern?: string | RegExp; // /api/v1/*, *.example.com/*

  /** Для type: 'header' */
  header?: {
    name: string; // X-API-Version
    value?: string | RegExp; // 2.0, /^2\..*/
  };

  /** Для type: 'responseShape' */
  shape?: {
    hasFields?: string[]; // ['data', 'meta', 'links']
    structure?: "jsonapi" | "odata" | "custom";
  };

  /** Для type: 'custom' */
  customCheck?: string; // Имя функции
}

/**
 * Схема маппинга полей
 */
export interface MappingSchema {
  /** Корневой маппинг */
  root?: FieldMapping;

  /** Маппинг полей данных */
  fields: Record<string, FieldMapping>;

  /** Маппинг метаданных */
  meta?: Record<string, FieldMapping>;

  /** Вложенные объекты */
  nested?: Record<string, MappingSchema>;

  /** Массивы */
  arrays?: Record<string, ArrayMapping>;
}

/**
 * Маппинг отдельного поля
 */
export interface FieldMapping {
  /** Путь в исходном объекте */
  source: string | string[]; // "user_id" или ["data", "userId"]

  /** Путь в целевом объекте */
  target?: string; // "id" (если не указан = source)

  /** Трансформация значения */
  transform?: TransformFunction | TransformPipeline;

  /** Значение по умолчанию */
  default?: any;

  /** Обязательное поле */
  required?: boolean;

  /** Условие применения */
  condition?: MappingCondition;
}

/**
 * Пайплайн трансформаций
 */
export interface TransformPipeline {
  steps: TransformStep[];
}

export interface TransformStep {
  function: TransformFunction;
  params?: Record<string, any>;
}

/**
 * Условие применения маппинга
 */
export interface MappingCondition {
  field: string; // Поле для проверки
  operator: ConditionOperator;
  value: any;
}

/**
 * Маппинг массивов
 */
export interface ArrayMapping {
  source: string; // Путь к массиву
  target: string; // Куда поместить
  itemMapping: MappingSchema; // Маппинг каждого элемента
  filter?: ArrayFilter; // Фильтрация элементов
  sort?: ArraySort; // Сортировка
}

export interface ArrayFilter {
  field: string;
  operator: ConditionOperator;
  value: any;
}

export interface ArraySort {
  field: string;
  order: "asc" | "desc";
}

/**
 * Правила нормализации
 */
export interface NormalizationRules {
  /** Преобразование типов */
  typeCoercion?: TypeCoercionRules;

  /** Нормализация строк */
  strings?: StringNormalization;

  /** Нормализация дат */
  dates?: DateNormalization;

  /** Удаление null/undefined */
  removeEmpty?: boolean;

  /** Плоская структура (flatten) */
  flatten?: FlattenConfig;
}

export interface TypeCoercionRules {
  /** Автоматическое определение чисел из строк */
  autoParseNumbers?: boolean;

  /** Автоматическое определение булевых значений */
  autoParseBooleans?: boolean | BooleanMapping;

  /** Автоматическое определение дат */
  autoParseDates?: boolean | DateFormat[];
}

export interface BooleanMapping {
  trueValues: any[]; // [1, "true", "yes", "Y"]
  falseValues: any[]; // [0, "false", "no", "N"]
}

export interface StringNormalization {
  trim?: boolean; // Удалить пробелы
  case?: "upper" | "lower" | "title"; // Изменить регистр
  removeSpecialChars?: boolean; // Удалить спецсимволы
}

export interface DateNormalization {
  inputFormat?: DateFormat | DateFormat[];
  outputFormat?: DateFormat;
  timezone?: string; // Europe/Moscow
}

export type DateFormat =
  | "iso8601" // 2024-01-15T10:30:00Z
  | "unix" // 1705318200
  | "unixms" // 1705318200000
  | string; // Кастомный формат

export interface FlattenConfig {
  enabled: boolean;
  separator?: string; // По умолчанию '.'
  maxDepth?: number; // Максимальная глубина
}

/**
 * Опции адаптера
 */
export interface AdapterOptions {
  /** Кэширование схемы маппинга */
  cacheMapping?: boolean;

  /** Строгий режим (ошибка если поле не найдено) */
  strict?: boolean;

  /** Логирование трансформаций */
  debug?: boolean;

  /** Валидация после адаптации */
  validate?: boolean;
  validationSchema?: any; // Zod schema
}
```

### A.2.2 Стандартный формат Platform

```typescript
// types/platform-response.ts

/**
 * Стандартный формат ответа Platform
 */
export interface PlatformResponse<T = any> {
  /** Данные */
  data: T;

  /** Метаданные */
  meta?: PlatformMeta;

  /** Ошибки */
  errors?: PlatformError[];

  /** Ссылки (для пагинации, HATEOAS) */
  links?: PlatformLinks;
}

export interface PlatformMeta {
  /** Пагинация */
  pagination?: {
    page: number; // Текущая страница
    pageSize: number; // Размер страницы
    total: number; // Всего элементов
    totalPages: number; // Всего страниц
  };

  /** Информация о запросе */
  request?: {
    duration: number; // Время выполнения (мс)
    timestamp: string; // Время запроса
  };

  /** Версия API */
  version?: string;

  /** Произвольные метаданные */
  [key: string]: any;
}

export interface PlatformError {
  code: string; // ERROR_CODE
  message: string; // Человеко-читаемое сообщение
  field?: string; // Поле с ошибкой
  details?: any; // Дополнительные детали
}

export interface PlatformLinks {
  self?: string; // Текущий ресурс
  first?: string; // Первая страница
  prev?: string; // Предыдущая страница
  next?: string; // Следующая страница
  last?: string; // Последняя страница
  [key: string]: string | undefined; // Произвольные ссылки
}

/**
 * Формат для списков
 */
export type PlatformListResponse<T> = PlatformResponse<T[]>;

/**
 * Формат для единичного объекта
 */
export type PlatformItemResponse<T> = PlatformResponse<T>;
```

---

## A.3 РЕАЛИЗАЦИЯ АДАПТЕРА

### A.3.1 Базовый класс адаптера

```typescript
// core/ApiAdapter.ts

import { get, set } from "lodash";

export class ApiAdapter {
  constructor(private config: ApiAdapterConfig) {}

  /**
   * Проверка, подходит ли адаптер для данного запроса/ответа
   */
  canHandle(context: AdapterContext): boolean {
    return this.config.detection.some((rule) =>
      this.checkDetectionRule(rule, context),
    );
  }

  /**
   * Адаптация ответа API
   */
  adapt<T = any>(response: any, context?: AdapterContext): PlatformResponse<T> {
    const startTime = Date.now();

    try {
      // 1. Маппинг полей
      let adapted = this.applyMapping(response, this.config.mapping);

      // 2. Нормализация
      if (this.config.normalization) {
        adapted = this.normalize(adapted, this.config.normalization);
      }

      // 3. Валидация
      if (
        this.config.options?.validate &&
        this.config.options.validationSchema
      ) {
        this.validate(adapted, this.config.options.validationSchema);
      }

      // 4. Логирование
      if (this.config.options?.debug) {
        this.logTransformation(response, adapted, Date.now() - startTime);
      }

      return adapted;
    } catch (error) {
      throw new AdapterError(
        `Failed to adapt response with adapter "${this.config.id}"`,
        { cause: error, response, config: this.config },
      );
    }
  }

  /**
   * Обратная адаптация (Platform → API)
   * Для запросов POST/PUT
   */
  adaptRequest(data: any): any {
    // Реверсивный маппинг
    const reverseMapping = this.reverseMapping(this.config.mapping);
    return this.applyMapping(data, reverseMapping);
  }

  /**
   * Применение схемы маппинга
   */
  private applyMapping(source: any, schema: MappingSchema): any {
    const result: any = {};

    // Корневой маппинг
    if (schema.root) {
      Object.assign(result, this.mapField(source, schema.root));
    }

    // Маппинг полей
    for (const [targetField, mapping] of Object.entries(schema.fields)) {
      const value = this.mapField(source, mapping);

      if (value !== undefined || mapping.default !== undefined) {
        set(result, mapping.target || targetField, value ?? mapping.default);
      } else if (mapping.required && this.config.options?.strict) {
        throw new AdapterError(
          `Required field "${targetField}" not found in source`,
        );
      }
    }

    // Маппинг вложенных объектов
    if (schema.nested) {
      for (const [targetField, nestedSchema] of Object.entries(schema.nested)) {
        const sourceData = get(source, targetField);
        if (sourceData) {
          result[targetField] = this.applyMapping(sourceData, nestedSchema);
        }
      }
    }

    // Маппинг массивов
    if (schema.arrays) {
      for (const [targetField, arrayMapping] of Object.entries(schema.arrays)) {
        const sourceArray = get(source, arrayMapping.source);
        if (Array.isArray(sourceArray)) {
          let items = sourceArray.map((item) =>
            this.applyMapping(item, arrayMapping.itemMapping),
          );

          // Фильтрация
          if (arrayMapping.filter) {
            items = items.filter((item) =>
              this.checkCondition(
                item,
                arrayMapping.filter!.field,
                arrayMapping.filter!.operator,
                arrayMapping.filter!.value,
              ),
            );
          }

          // Сортировка
          if (arrayMapping.sort) {
            items = this.sortArray(
              items,
              arrayMapping.sort.field,
              arrayMapping.sort.order,
            );
          }

          result[arrayMapping.target] = items;
        }
      }
    }

    // Маппинг метаданных
    if (schema.meta) {
      result.meta = {};
      for (const [targetField, mapping] of Object.entries(schema.meta)) {
        const value = this.mapField(source, mapping);
        if (value !== undefined) {
          result.meta[targetField] = value;
        }
      }
    }

    return result;
  }

  /**
   * Маппинг одного поля
   */
  private mapField(source: any, mapping: FieldMapping): any {
    // Проверка условия
    if (mapping.condition) {
      const conditionMet = this.checkCondition(
        source,
        mapping.condition.field,
        mapping.condition.operator,
        mapping.condition.value,
      );
      if (!conditionMet) {
        return undefined;
      }
    }

    // Получение значения из source
    let value: any;
    if (Array.isArray(mapping.source)) {
      value = get(source, mapping.source);
    } else {
      value = get(source, mapping.source);
    }

    // Трансформация
    if (value !== undefined && mapping.transform) {
      value = this.applyTransform(value, mapping.transform, source);
    }

    return value;
  }

  /**
   * Применение трансформации
   */
  private applyTransform(
    value: any,
    transform: TransformFunction | TransformPipeline,
    sourceContext: any,
  ): any {
    if (typeof transform === "string") {
      // Встроенная функция
      return this.applyBuiltInTransform(value, transform);
    } else if ("steps" in transform) {
      // Пайплайн
      return transform.steps.reduce(
        (acc, step) => this.applyTransform(acc, step.function, sourceContext),
        value,
      );
    } else if ("custom" in transform) {
      // Кастомная функция
      return this.applyCustomTransform(value, transform.custom, sourceContext);
    }

    return value;
  }

  /**
   * Встроенные трансформации
   */
  private applyBuiltInTransform(value: any, fn: string): any {
    const transforms: Record<string, (v: any) => any> = {
      // Базовые
      identity: (v) => v,
      toString: (v) => String(v),
      toNumber: (v) => Number(v),
      toBoolean: (v) => Boolean(v),

      // Строки
      uppercase: (v) => String(v).toUpperCase(),
      lowercase: (v) => String(v).toLowerCase(),
      trim: (v) => String(v).trim(),
      capitalize: (v) => {
        const s = String(v);
        return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
      },

      // Массивы
      length: (v) => (Array.isArray(v) ? v.length : 0),
      first: (v) => (Array.isArray(v) ? v[0] : undefined),
      last: (v) => (Array.isArray(v) ? v[v.length - 1] : undefined),
      reverse: (v) => (Array.isArray(v) ? [...v].reverse() : v),
      sort: (v) => (Array.isArray(v) ? [...v].sort() : v),

      // Числа
      abs: (v) => Math.abs(Number(v)),
      round: (v) => Math.round(Number(v)),
      floor: (v) => Math.floor(Number(v)),
      ceil: (v) => Math.ceil(Number(v)),

      // Даты
      toDate: (v) => new Date(v),
      toISOString: (v) => new Date(v).toISOString(),
      toUnixTimestamp: (v) => Math.floor(new Date(v).getTime() / 1000),

      // JSON
      jsonParse: (v) => JSON.parse(v),
      jsonStringify: (v) => JSON.stringify(v),

      // Объекты
      keys: (v) => Object.keys(v),
      values: (v) => Object.values(v),
      entries: (v) => Object.entries(v),
    };

    const transformFn = transforms[fn];
    if (!transformFn) {
      throw new AdapterError(`Unknown transform function: ${fn}`);
    }

    return transformFn(value);
  }

  /**
   * Нормализация данных
   */
  private normalize(data: any, rules: NormalizationRules): any {
    let normalized = { ...data };

    // Type coercion
    if (rules.typeCoercion) {
      normalized = this.applyTypeCoercion(normalized, rules.typeCoercion);
    }

    // String normalization
    if (rules.strings) {
      normalized = this.normalizeStrings(normalized, rules.strings);
    }

    // Date normalization
    if (rules.dates) {
      normalized = this.normalizeDates(normalized, rules.dates);
    }

    // Remove empty values
    if (rules.removeEmpty) {
      normalized = this.removeEmptyValues(normalized);
    }

    // Flatten
    if (rules.flatten?.enabled) {
      normalized = this.flatten(normalized, rules.flatten);
    }

    return normalized;
  }

  /**
   * Приведение типов
   */
  private applyTypeCoercion(data: any, rules: TypeCoercionRules): any {
    const coerce = (value: any): any => {
      if (value === null || value === undefined) {
        return value;
      }

      if (typeof value === "object") {
        if (Array.isArray(value)) {
          return value.map(coerce);
        }
        return Object.fromEntries(
          Object.entries(value).map(([k, v]) => [k, coerce(v)]),
        );
      }

      // Auto-parse numbers
      if (rules.autoParseNumbers && typeof value === "string") {
        const num = Number(value);
        if (!isNaN(num) && value.trim() !== "") {
          return num;
        }
      }

      // Auto-parse booleans
      if (rules.autoParseBooleans) {
        const boolMapping =
          typeof rules.autoParseBooleans === "object"
            ? rules.autoParseBooleans
            : {
                trueValues: [true, "true", "1", 1, "yes", "y"],
                falseValues: [false, "false", "0", 0, "no", "n"],
              };

        const lowerValue =
          typeof value === "string" ? value.toLowerCase() : value;
        if (boolMapping.trueValues.includes(lowerValue)) return true;
        if (boolMapping.falseValues.includes(lowerValue)) return false;
      }

      // Auto-parse dates
      if (rules.autoParseDates && typeof value === "string") {
        const timestamp = Date.parse(value);
        if (!isNaN(timestamp)) {
          return new Date(timestamp).toISOString();
        }
      }

      return value;
    };

    return coerce(data);
  }

  /**
   * Удаление пустых значений
   */
  private removeEmptyValues(data: any): any {
    const clean = (value: any): any => {
      if (value === null || value === undefined || value === "") {
        return undefined;
      }

      if (Array.isArray(value)) {
        return value.map(clean).filter((v) => v !== undefined);
      }

      if (typeof value === "object") {
        return Object.fromEntries(
          Object.entries(value)
            .map(([k, v]) => [k, clean(v)])
            .filter(([_, v]) => v !== undefined),
        );
      }

      return value;
    };

    return clean(data);
  }

  /**
   * Проверка правила определения
   */
  private checkDetectionRule(
    rule: DetectionRule,
    context: AdapterContext,
  ): boolean {
    switch (rule.type) {
      case "endpoint":
        if (!rule.pattern) return false;
        const pattern =
          typeof rule.pattern === "string"
            ? new RegExp(rule.pattern.replace(/\*/g, ".*"))
            : rule.pattern;
        return pattern.test(context.endpoint || "");

      case "header":
        if (!rule.header) return false;
        const headerValue = context.headers?.[rule.header.name];
        if (!headerValue) return false;
        if (!rule.header.value) return true;
        const headerPattern =
          typeof rule.header.value === "string"
            ? new RegExp(rule.header.value)
            : rule.header.value;
        return headerPattern.test(headerValue);

      case "responseShape":
        if (!rule.shape) return false;
        if (rule.shape.hasFields) {
          return rule.shape.hasFields.every(
            (field) => field in (context.response || {}),
          );
        }
        return false;

      default:
        return false;
    }
  }

  /**
   * Проверка условия
   */
  private checkCondition(
    obj: any,
    field: string,
    operator: ConditionOperator,
    value: any,
  ): boolean {
    const fieldValue = get(obj, field);

    switch (operator) {
      case "==":
        return fieldValue === value;
      case "!=":
        return fieldValue !== value;
      case ">":
        return fieldValue > value;
      case "<":
        return fieldValue < value;
      case ">=":
        return fieldValue >= value;
      case "<=":
        return fieldValue <= value;
      case "includes":
        return Array.isArray(fieldValue) && fieldValue.includes(value);
      case "exists":
        return fieldValue !== undefined && fieldValue !== null;
      default:
        return false;
    }
  }

  /**
   * Логирование трансформации
   */
  private logTransformation(
    original: any,
    adapted: any,
    duration: number,
  ): void {
    console.group(`[ApiAdapter:${this.config.id}] Transformation`);
    console.log("Original:", original);
    console.log("Adapted:", adapted);
    console.log(`Duration: ${duration}ms`);
    console.groupEnd();
  }

  /**
   * Реверсивный маппинг
   */
  private reverseMapping(schema: MappingSchema): MappingSchema {
    // Меняем source и target местами
    const reversedFields: Record<string, FieldMapping> = {};

    for (const [field, mapping] of Object.entries(schema.fields)) {
      reversedFields[field] = {
        source: mapping.target || field,
        target: Array.isArray(mapping.source)
          ? mapping.source.join(".")
          : mapping.source,
        // Инвертированная трансформация (если возможно)
        transform: this.inverseTransform(mapping.transform),
      };
    }

    return {
      ...schema,
      fields: reversedFields,
    };
  }

  /**
   * Инверсия трансформации (для обратного маппинга)
   */
  private inverseTransform(
    transform?: TransformFunction | TransformPipeline,
  ): TransformFunction | undefined {
    if (!transform || typeof transform === "object") {
      return undefined; // Сложные пайплайны не инвертируем
    }

    const inverseMap: Record<string, TransformFunction> = {
      uppercase: "lowercase",
      lowercase: "uppercase",
      toString: "identity",
      toNumber: "identity",
      // ... другие инверсии
    };

    return inverseMap[transform];
  }

  private sortArray(items: any[], field: string, order: "asc" | "desc"): any[] {
    return [...items].sort((a, b) => {
      const aVal = get(a, field);
      const bVal = get(b, field);
      const comparison = aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
      return order === "asc" ? comparison : -comparison;
    });
  }

  private normalizeStrings(data: any, rules: StringNormalization): any {
    // Реализация нормализации строк
    return data;
  }

  private normalizeDates(data: any, rules: DateNormalization): any {
    // Реализация нормализации дат
    return data;
  }

  private flatten(data: any, config: FlattenConfig): any {
    // Реализация flatten
    return data;
  }

  private validate(data: any, schema: any): void {
    // Валидация с помощью Zod или другой библиотеки
  }

  private applyCustomTransform(value: any, fnName: string, context: any): any {
    // Вызов кастомной функции трансформации
    return value;
  }
}

export interface AdapterContext {
  endpoint?: string;
  headers?: Record<string, string>;
  response?: any;
  request?: any;
}

export class AdapterError extends Error {
  constructor(
    message: string,
    public context?: any,
  ) {
    super(message);
    this.name = "AdapterError";
  }
}
```

### A.3.2 Менеджер адаптеров

```typescript
// core/AdapterManager.ts

export class AdapterManager {
  private adapters: Map<string, ApiAdapter> = new Map();
  private cache: Map<string, ApiAdapter> = new Map();

  /**
   * Регистрация адаптера
   */
  register(config: ApiAdapterConfig): void {
    const adapter = new ApiAdapter(config);
    this.adapters.set(config.id, adapter);
  }

  /**
   * Регистрация нескольких адаптеров
   */
  registerMany(configs: ApiAdapterConfig[]): void {
    configs.forEach((config) => this.register(config));
  }

  /**
   * Получение подходящего адаптера
   */
  getAdapter(context: AdapterContext): ApiAdapter | null {
    // Проверка кэша
    const cacheKey = this.getCacheKey(context);
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    // Поиск подходящего адаптера
    for (const adapter of this.adapters.values()) {
      if (adapter.canHandle(context)) {
        this.cache.set(cacheKey, adapter);
        return adapter;
      }
    }

    return null;
  }

  /**
   * Адаптация ответа
   */
  adapt<T = any>(response: any, context: AdapterContext): PlatformResponse<T> {
    const adapter = this.getAdapter(context);

    if (!adapter) {
      // Если адаптер не найден, возвращаем как есть
      // или используем дефолтный адаптер
      return this.defaultAdapt(response);
    }

    return adapter.adapt<T>(response, context);
  }

  /**
   * Дефолтная адаптация (если адаптер не найден)
   */
  private defaultAdapt<T>(response: any): PlatformResponse<T> {
    // Попытка автоматического определения структуры

    // Если уже в формате Platform
    if (this.isPlatformFormat(response)) {
      return response;
    }

    // Если простой массив
    if (Array.isArray(response)) {
      return {
        data: response as T,
        meta: {
          pagination: {
            page: 1,
            pageSize: response.length,
            total: response.length,
            totalPages: 1,
          },
        },
      };
    }

    // Если объект с data
    if (response && typeof response === "object" && "data" in response) {
      return {
        data: response.data,
        meta: response.meta || response.metadata,
        errors: response.errors,
        links: response.links,
      };
    }

    // В остальных случаях оборачиваем в data
    return {
      data: response as T,
    };
  }

  /**
   * Проверка, является ли ответ в формате Platform
   */
  private isPlatformFormat(response: any): boolean {
    return (
      response &&
      typeof response === "object" &&
      "data" in response &&
      (!("meta" in response) || typeof response.meta === "object")
    );
  }

  /**
   * Генерация ключа для кэша
   */
  private getCacheKey(context: AdapterContext): string {
    return `${context.endpoint || "unknown"}:${JSON.stringify(
      context.headers || {},
    )}`;
  }

  /**
   * Очистка кэша
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Получение всех зарегистрированных адаптеров
   */
  getAll(): ApiAdapterConfig[] {
    return Array.from(this.adapters.values()).map((a) => a["config"]);
  }
}
```

### A.3.3 Интеграция с ApiClient

```typescript
// core/ApiClient.ts (обновление)

import axios, { AxiosInstance, AxiosRequestConfig } from "axios";
import { AdapterManager } from "./AdapterManager";

export class ApiClient {
  private client: AxiosInstance;
  private adapterManager: AdapterManager;

  constructor(baseURL: string, adapterManager: AdapterManager) {
    this.adapterManager = adapterManager;

    this.client = axios.create({
      baseURL,
      headers: {
        "Content-Type": "application/json",
      },
    });

    // Response interceptor для адаптации
    this.client.interceptors.response.use(
      (response) => {
        // Адаптация успешного ответа
        const context: AdapterContext = {
          endpoint: response.config.url,
          headers: response.headers as Record<string, string>,
          response: response.data,
          request: response.config.data,
        };

        const adapted = this.adapterManager.adapt(response.data, context);

        return {
          ...response,
          data: adapted,
        };
      },
      (error) => {
        // Адаптация ответа с ошибкой
        if (error.response) {
          const context: AdapterContext = {
            endpoint: error.response.config.url,
            headers: error.response.headers,
            response: error.response.data,
          };

          const adapted = this.adapterManager.adapt(
            error.response.data,
            context,
          );

          error.response.data = adapted;
        }

        return Promise.reject(error);
      },
    );

    // Request interceptor для обратной адаптации
    this.client.interceptors.request.use((config) => {
      if (
        config.data &&
        (config.method === "post" ||
          config.method === "put" ||
          config.method === "patch")
      ) {
        const context: AdapterContext = {
          endpoint: config.url,
          headers: config.headers as Record<string, string>,
        };

        const adapter = this.adapterManager.getAdapter(context);
        if (adapter) {
          config.data = adapter.adaptRequest(config.data);
        }
      }

      return config;
    });
  }

  async request<T = any>(
    config: AxiosRequestConfig,
  ): Promise<PlatformResponse<T>> {
    const response = await this.client.request<PlatformResponse<T>>(config);
    return response.data;
  }
}
```

---

## A.4 ПРИМЕРЫ КОНФИГУРАЦИЙ АДАПТЕРОВ

### A.4.1 REST API (стандартный)

```json
{
  "id": "rest-standard",
  "name": "Standard REST API",
  "description": "Адаптер для стандартных REST API с простой структурой",

  "detection": [
    {
      "type": "endpoint",
      "pattern": "/api/*"
    }
  ],

  "mapping": {
    "fields": {
      "data": {
        "source": "items",
        "target": "data"
      }
    },
    "meta": {
      "pagination.total": {
        "source": "total",
        "default": 0
      },
      "pagination.page": {
        "source": "page",
        "default": 1
      },
      "pagination.pageSize": {
        "source": "pageSize",
        "default": 10
      },
      "pagination.totalPages": {
        "source": "totalPages",
        "transform": {
          "custom": "calculateTotalPages"
        }
      }
    }
  },

  "normalization": {
    "typeCoercion": {
      "autoParseNumbers": true,
      "autoParseBooleans": true
    },
    "removeEmpty": false
  }
}
```

### A.4.2 JSON:API спецификация

```json
{
  "id": "jsonapi",
  "name": "JSON:API",
  "description": "Адаптер для JSON:API спецификации",

  "detection": [
    {
      "type": "header",
      "header": {
        "name": "Content-Type",
        "value": "application/vnd.api+json"
      }
    },
    {
      "type": "responseShape",
      "shape": {
        "hasFields": ["data", "included", "links", "meta"]
      }
    }
  ],

  "mapping": {
    "fields": {
      "data": {
        "source": "data",
        "transform": {
          "steps": [
            {
              "function": "map",
              "params": {
                "mapper": "jsonApiResourceToPlain"
              }
            }
          ]
        }
      }
    },
    "meta": {
      "pagination": {
        "source": ["meta", "page"]
      }
    },
    "arrays": {
      "included": {
        "source": "included",
        "target": "meta.included",
        "itemMapping": {
          "fields": {
            "id": { "source": "id" },
            "type": { "source": "type" },
            "attributes": { "source": "attributes" }
          }
        }
      }
    }
  },

  "options": {
    "strict": true,
    "debug": false
  }
}
```

### A.4.3 OData v4

```json
{
  "id": "odata-v4",
  "name": "OData v4",
  "description": "Адаптер для OData v4 API",

  "detection": [
    {
      "type": "header",
      "header": {
        "name": "OData-Version",
        "value": "4.0"
      }
    },
    {
      "type": "responseShape",
      "shape": {
        "hasFields": ["@odata.context", "value"]
      }
    }
  ],

  "mapping": {
    "fields": {
      "data": {
        "source": "value"
      }
    },
    "meta": {
      "pagination.total": {
        "source": "@odata.count"
      },
      "pagination.page": {
        "source": "$skip",
        "transform": {
          "steps": [
            { "function": "toNumber" },
            { "function": "custom", "params": { "fn": "skipToPage" } }
          ]
        }
      },
      "pagination.pageSize": {
        "source": "$top",
        "transform": "toNumber"
      }
    },
    "links": {
      "next": {
        "source": "@odata.nextLink"
      }
    }
  },

  "normalization": {
    "typeCoercion": {
      "autoParseNumbers": true,
      "autoParseDates": ["iso8601"]
    }
  }
}
```

### A.4.4 Legacy API с нестандартными полями

```json
{
  "id": "legacy-api",
  "name": "Legacy Corporate API",
  "description": "Адаптер для старого корпоративного API",

  "detection": [
    {
      "type": "endpoint",
      "pattern": "*/legacy/v1/*"
    }
  ],

  "mapping": {
    "fields": {
      "data": {
        "source": ["response", "result", "records"]
      }
    },
    "meta": {
      "pagination.total": {
        "source": ["response", "total_records"],
        "transform": "toNumber"
      },
      "pagination.page": {
        "source": ["response", "current_page"],
        "transform": "toNumber"
      },
      "pagination.pageSize": {
        "source": ["response", "records_per_page"],
        "transform": "toNumber",
        "default": 20
      }
    },
    "errors": {
      "source": ["response", "errors"],
      "transform": {
        "custom": "mapLegacyErrors"
      }
    }
  },

  "arrays": {
    "data": {
      "source": ["response", "result", "records"],
      "target": "data",
      "itemMapping": {
        "fields": {
          "id": {
            "source": "record_id",
            "transform": "toString"
          },
          "name": {
            "source": "full_name"
          },
          "email": {
            "source": "email_address",
            "transform": "lowercase"
          },
          "active": {
            "source": "is_active",
            "transform": "toBoolean"
          },
          "createdAt": {
            "source": "created_date",
            "transform": "toISOString"
          }
        }
      }
    }
  },

  "normalization": {
    "typeCoercion": {
      "autoParseNumbers": true,
      "autoParseBooleans": {
        "trueValues": [1, "1", "Y", "yes", "true", "Active"],
        "falseValues": [0, "0", "N", "no", "false", "Inactive"]
      }
    },
    "strings": {
      "trim": true
    },
    "removeEmpty": true
  },

  "options": {
    "strict": false,
    "debug": true
  }
}
```

### A.4.5 GraphQL (если нужно)

```json
{
  "id": "graphql",
  "name": "GraphQL API",
  "description": "Адаптер для GraphQL",

  "detection": [
    {
      "type": "endpoint",
      "pattern": "*/graphql"
    },
    {
      "type": "responseShape",
      "shape": {
        "hasFields": ["data"]
      }
    }
  ],

  "mapping": {
    "fields": {
      "data": {
        "source": ["data", "*"],
        "transform": {
          "custom": "extractGraphQLData"
        }
      }
    },
    "errors": {
      "source": "errors",
      "transform": {
        "custom": "mapGraphQLErrors"
      }
    }
  }
}
```

---

## A.5 КОНФИГУРАЦИЯ В APP

### A.5.1 Добавление в App конфигурацию

```typescript
// types/app.ts (дополнение)

export interface AppConfig {
  name: string;
  version: string;
  api: ApiConfig;

  /** Адаптеры API */
  adapters?: ApiAdapterConfig[];

  features?: FeatureFlags;
  routes?: RouteConfig[];
}
```

### A.5.2 Пример в JSON конфигурации

```json
{
  "id": "myApp",
  "type": "app",
  "config": {
    "name": "My CRM",
    "version": "1.0.0",
    "api": {
      "baseURL": "https://api.example.com",
      "timeout": 30000
    },
    "adapters": [
      {
        "id": "main-api",
        "name": "Main API Adapter",
        "detection": [
          {
            "type": "endpoint",
            "pattern": "/api/v2/*"
          }
        ],
        "mapping": {
          "fields": {
            "data": {
              "source": "results"
            }
          },
          "meta": {
            "pagination.total": {
              "source": "count"
            }
          }
        }
      },
      {
        "id": "legacy-users",
        "name": "Legacy Users API",
        "detection": [
          {
            "type": "endpoint",
            "pattern": "/api/v1/users*"
          }
        ],
        "mapping": {
          "arrays": {
            "data": {
              "source": "users",
              "target": "data",
              "itemMapping": {
                "fields": {
                  "id": { "source": "user_id", "transform": "toString" },
                  "name": { "source": "full_name" },
                  "email": { "source": "email", "transform": "lowercase" }
                }
              }
            }
          }
        }
      }
    ]
  },
  "pages": [...]
}
```

---

## A.6 ИНИЦИАЛИЗАЦИЯ АДАПТЕРОВ

### A.6.1 При старте приложения

```typescript
// app/layout.tsx

import { AdapterManager } from '@/core/AdapterManager';
import { ApiClient } from '@/core/ApiClient';
import { CRMProvider } from '@/contexts/CRMContext';

export default function RootLayout({ children }: Props) {
  // Загрузка конфигурации
  const appConfig = loadAppConfig();

  // Создание AdapterManager
  const adapterManager = new AdapterManager();

  // Регистрация адаптеров из конфигурации
  if (appConfig.config.adapters) {
    adapterManager.registerMany(appConfig.config.adapters);
  }

  // Регистрация встроенных адаптеров
  adapterManager.registerMany([
    jsonApiAdapter,
    odataAdapter,
    restStandardAdapter,
  ]);

  // Создание ApiClient с адаптерами
  const apiClient = new ApiClient(
    appConfig.config.api.baseURL,
    adapterManager
  );

  return (
    <CRMProvider
      config={appConfig}
      apiClient={apiClient}
      adapterManager={adapterManager}
    >
      {children}
    </CRMProvider>
  );
}
```

---

## A.7 ТЕСТИРОВАНИЕ АДАПТЕРОВ

### A.7.1 Unit тесты

```typescript
// tests/unit/adapters/ApiAdapter.test.ts

describe("ApiAdapter", () => {
  describe("REST Standard Adapter", () => {
    let adapter: ApiAdapter;

    beforeEach(() => {
      adapter = new ApiAdapter(restStandardConfig);
    });

    it("should adapt simple list response", () => {
      const apiResponse = {
        items: [
          { id: 1, name: "John" },
          { id: 2, name: "Jane" },
        ],
        total: 2,
        page: 1,
        pageSize: 10,
      };

      const result = adapter.adapt(apiResponse);

      expect(result).toEqual({
        data: [
          { id: 1, name: "John" },
          { id: 2, name: "Jane" },
        ],
        meta: {
          pagination: {
            total: 2,
            page: 1,
            pageSize: 10,
            totalPages: 1,
          },
        },
      });
    });

    it("should apply field transformations", () => {
      const apiResponse = {
        items: [
          {
            user_id: "123",
            full_name: "John Doe",
            is_active: 1,
          },
        ],
      };

      const config: ApiAdapterConfig = {
        id: "test",
        name: "Test",
        detection: [],
        mapping: {
          arrays: {
            data: {
              source: "items",
              target: "data",
              itemMapping: {
                fields: {
                  id: {
                    source: "user_id",
                    transform: "toString",
                  },
                  name: {
                    source: "full_name",
                  },
                  active: {
                    source: "is_active",
                    transform: "toBoolean",
                  },
                },
              },
            },
          },
        },
      };

      const testAdapter = new ApiAdapter(config);
      const result = testAdapter.adapt(apiResponse);

      expect(result.data[0]).toEqual({
        id: "123",
        name: "John Doe",
        active: true,
      });
    });
  });

  describe("JSON:API Adapter", () => {
    it("should adapt JSON:API response", () => {
      const apiResponse = {
        data: [
          {
            type: "users",
            id: "1",
            attributes: {
              name: "John",
              email: "john@example.com",
            },
          },
        ],
        meta: {
          page: {
            number: 1,
            size: 10,
            total: 100,
          },
        },
      };

      const adapter = new ApiAdapter(jsonApiConfig);
      const result = adapter.adapt(apiResponse);

      expect(result.data).toHaveLength(1);
      expect(result.data[0]).toHaveProperty("name", "John");
      expect(result.meta?.pagination?.total).toBe(100);
    });
  });
});
```

### A.7.2 Integration тесты

```typescript
// tests/integration/adapters.test.ts

describe("Adapter Integration", () => {
  it("should automatically select correct adapter", async () => {
    const adapterManager = new AdapterManager();
    adapterManager.registerMany([
      restStandardConfig,
      jsonApiConfig,
      odataConfig,
    ]);

    const apiClient = new ApiClient("https://api.example.com", adapterManager);

    // Запрос к JSON:API endpoint
    const response = await apiClient.request({
      url: "/api/users",
      method: "GET",
      headers: {
        "Content-Type": "application/vnd.api+json",
      },
    });

    expect(response).toHaveProperty("data");
    expect(response).toHaveProperty("meta");
  });
});
```

---

## A.8 УКАЗАНИЯ АГЕНТУ

### A.8.1 Последовательность разработки адаптеров

```
ЭТАП A: Адаптеры API (5 дней)

├─ A.1. Базовые типы и интерфейсы (1 день)
│   ├─ ApiAdapterConfig
│   ├─ MappingSchema
│   ├─ PlatformResponse
│   └─ Тесты типов
│
├─ A.2. ApiAdapter класс (2 дня)
│   ├─ Маппинг полей
│   ├─ Трансформации (все встроенные функции)
│   ├─ Нормализация
│   ├─ Валидация
│   └─ Unit тесты (coverage > 90%)
│
├─ A.3. AdapterManager (1 день)
│   ├─ Регистрация адаптеров
│   ├─ Автоопределение адаптера
│   ├─ Кэширование
│   └─ Дефолтная адаптация
│
├─ A.4. Интеграция с ApiClient (0.5 дня)
│   ├─ Response interceptor
│   ├─ Request interceptor
│   └─ Обработка ошибок
│
└─ A.5. Предустановленные адаптеры (0.5 дня)
    ├─ REST Standard
    ├─ JSON:API
    ├─ OData v4
    └─ Integration тесты
```

### A.8.2 Требования к коду адаптеров

```typescript
/**
 * ADAPTER-RULE-1: Иммутабельность
 * Никогда не мутировать исходные данные
 */
// ❌ ПЛОХО
function mapData(source: any) {
  source.newField = 'value';
  return source;
}

// ✅ ХОРОШО
function mapData(source: any) {
  return {
    ...source,
    newField: 'value'
  };
}

/**
 * ADAPTER-RULE-2: Безопасный доступ к полям
 * Всегда проверять существование полей
 */
// ❌ ПЛОХО
const value = response.data.items[0].name;

// ✅ ХОРОШО
import { get } from 'lodash';
const value = get(response, 'data.items[0].name', defaultValue);

/**
 * ADAPTER-RULE-3: Логирование трансформаций
 * В debug режиме логировать все изменения
 */
if (this.config.options?.debug) {
  console.log('Before:', original);
  console.log('After:', transformed);
  console.log('Mapping:', this.config.mapping);
}

/**
 * ADAPTER-RULE-4: Graceful degradation
 * Если поле не найдено - использовать default или пропускать
 */
const value = this.mapField(source, mapping);
if (value === undefined && !mapping.required) {
  return; // Пропускаем необязательное поле
}

/**
 * ADAPTER-RULE-5: Производительность
 * Кэшировать скомпилированные трансформации
 */
private transformCache = new Map<string, Function>();

getTransformFunction(name: string): Function {
  if (!this.transformCache.has(name)) {
    this.transformCache.set(name, this.compileTransform(name));
  }
  return this.transformCache.get(name)!;
}
```

### A.8.3 Документация адаптеров

````markdown
# API Adapters Documentation

## Создание кастомного адаптера

### 1. Определите структуру API

```json
// Исходный ответ API
{
  "users_list": [...],
  "total_count": 100,
  "current_page": 1
}
```
````

### 2. Создайте конфигурацию

```json
{
  "id": "my-api",
  "detection": [{ "type": "endpoint", "pattern": "/my-api/*" }],
  "mapping": {
    "fields": {
      "data": { "source": "users_list" }
    },
    "meta": {
      "pagination.total": { "source": "total_count" },
      "pagination.page": { "source": "current_page" }
    }
  }
}
```

### 3. Зарегистрируйте адаптер

```typescript
adapterManager.register(myApiConfig);
```

## Встроенные трансформации

| Функция       | Описание                | Пример                      |
| ------------- | ----------------------- | --------------------------- |
| `toString`    | Преобразование в строку | `123` → `"123"`             |
| `toNumber`    | Преобразование в число  | `"123"` → `123`             |
| `uppercase`   | Верхний регистр         | `"test"` → `"TEST"`         |
| `trim`        | Удаление пробелов       | `" test "` → `"test"`       |
| `toISOString` | Дата в ISO              | `Date` → `"2024-01-15T..."` |

... (полный список)

````

---

## A.9 ЧЕКЛИСТ РАЗРАБОТКИ АДАПТЕРОВ

```markdown
## Checklist: API Adapters

### Типизация
- [ ] Все типы определены в types/adapters.ts
- [ ] PlatformResponse типизирован
- [ ] Zod схемы для валидации конфигураций
- [ ] JSDoc для всех публичных типов

### Функциональность
- [ ] ApiAdapter класс реализован
- [ ] Все встроенные трансформации работают
- [ ] Маппинг полей (простых, вложенных, массивов)
- [ ] Нормализация (типы, строки, даты)
- [ ] Валидация результата
- [ ] Обратный маппинг для запросов
- [ ] AdapterManager с автоопределением
- [ ] Кэширование адаптеров
- [ ] Дефолтная адаптация

### Интеграция
- [ ] Response interceptor в ApiClient
- [ ] Request interceptor в ApiClient
- [ ] Обработка ошибок
- [ ] Загрузка адаптеров из конфигурации

### Предустановленные адаптеры
- [ ] REST Standard
- [ ] JSON:API
- [ ] OData v4
- [ ] Generic (fallback)

### Тестирование
- [ ] Unit тесты ApiAdapter (coverage > 90%)
- [ ] Unit тесты AdapterManager
- [ ] Unit тесты трансформаций
- [ ] Integration тесты с ApiClient
- [ ] Тесты всех предустановленных адаптеров

### Производительность
- [ ] Кэширование маппингов
- [ ] Кэширование трансформаций
- [ ] Отсутствие memory leaks
- [ ] Benchmark для больших данных (>1000 записей)

### Документация
- [ ] README с примерами
- [ ] API документация
- [ ] Примеры конфигураций (5+)
- [ ] Troubleshooting guide
- [ ] Migration guide для разных API

### Безопасность
- [ ] Валидация конфигураций
- [ ] Sanitization данных
- [ ] Защита от prototype pollution
- [ ] Защита от circular references
````

---

**Начни разработку адаптеров после завершения ЭТАПА 4 (API и данные) из основного плана. Адаптеры должны быть полностью протестированы перед переходом к следующему этапу.**
