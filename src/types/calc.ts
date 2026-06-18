/**
 * Calc Engine — утилита трансформации и вычисления данных
 *
 * Позволяет описывать вычисляемые значения в конфигурации страниц.
 * Выполняется после разрешения макросов и линковки, но может ссылаться на них внутри params.
 *
 * Примеры:
 *   { "calc": "join",   "params": { "separator": "/", "items": ["/users", "@state.userData.id"] } }
 *   { "calc": "concat", "params": { "items": ["@state.firstName", " ", "@state.lastName"] } }
 *   { "calc": "if",     "params": { "condition": "@state.isAdmin", "then": "admin", "else": "user" } }
 *   { "calc": "default","params": { "value": "@state.avatar", "defaultValue": "/assets/default-avatar.png" } }
 *   { "calc": "format", "params": { "template": "{0} — {1}", "args": ["@state.name", "@state.role"] } }
 */

/** Распознанная calc-операция */
export interface CalcOperation {
  /** Имя операции */
  calc: string;
  /** Параметры операции */
  params: Record<string, any>;
}

/** Проверка: является ли значение calc-выражением */
export function isCalcOperation(value: unknown): value is CalcOperation {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    "calc" in value &&
    typeof (value as CalcOperation).calc === "string" &&
    "params" in value &&
    typeof (value as CalcOperation).params === "object"
  );
}

/** Тип функции-обработчика calc-операции */
export type CalcHandler = (params: Record<string, any>) => any;

/** Реестр операций */
export type CalcRegistry = Record<string, CalcHandler>;
