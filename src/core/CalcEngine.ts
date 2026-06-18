/**
 * CalcEngine — утилита трансформации и вычисления данных
 *
 * Выполняет calc-операции, определённые в конфигурации страниц.
 * Каждая операция — это функция, принимающая params и возвращающая результат.
 *
 * Поддерживаемые операции:
 *   join    — склеивает массив строк с разделителем
 *   concat  — конкатенация строк/значений
 *   if      — условный выбор (тернарный оператор)
 *   default — значение по умолчанию
 *   format  — форматирование строки с плейсхолдерами {0}, {1}, ...
 */

import type { Linkage } from "./Linkage";

/** Реестр операций */
type CalcHandler = (params: Record<string, any>) => any;

export class CalcEngine {
  private linkage: Linkage;
  private operations: Map<string, CalcHandler>;

  constructor(linkage: Linkage) {
    this.linkage = linkage;
    this.operations = new Map();
    this.registerDefaults();
  }

  /**
   * Зарегистрировать пользовательскую операцию
   */
  register(name: string, handler: CalcHandler): void {
    this.operations.set(name, handler);
  }

  /**
   * Выполнить calc-операцию
   * @param name имя операции
   * @param params параметры (уже с разрешёнными bindings)
   */
  execute(name: string, params: Record<string, any>): any {
    const handler = this.operations.get(name);
    if (!handler) {
      console.warn(`CalcEngine: unknown operation "${name}"`);
      return undefined;
    }
    return handler(params);
  }

  /**
   * Получить доступ к Linkage для вложенных calc-операций
   */
  getLinkage(): Linkage {
    return this.linkage;
  }

  /**
   * Зарегистрировать встроенные операции
   */
  private registerDefaults(): void {
    // join — склеивает массив строк с разделителем
    // params: { separator: string, items: any[] }
    this.operations.set("join", (params) => {
      const separator = String(params.separator ?? "");
      const items = Array.isArray(params.items) ? params.items : [];
      return items.map((item: any) => String(item ?? "")).join(separator);
    });

    // concat — конкатенация значений
    // params: { items: any[] }
    this.operations.set("concat", (params) => {
      const items = Array.isArray(params.items) ? params.items : [];
      return items.map((item: any) => String(item ?? "")).join("");
    });

    // if — условный выбор
    // params: { condition: boolean, then: any, else: any }
    this.operations.set("if", (params) => {
      return Boolean(params.condition) ? params.then : params.else;
    });

    // default — значение по умолчанию
    // params: { value: any, defaultValue: any }
    this.operations.set("default", (params) => {
      return params.value !== null && params.value !== undefined
        ? params.value
        : params.defaultValue;
    });

    // format — форматирование строки
    // params: { template: string, args: any[] }
    // template: "Привет, {0}! Твой статус: {1}"
    // args: ["Иван", "активен"]
    this.operations.set("format", (params) => {
      const template = String(params.template ?? "");
      const args = Array.isArray(params.args) ? params.args : [];
      return template.replace(/\{(\d+)\}/g, (_match, index: string) => {
        const idx = parseInt(index, 10);
        return idx < args.length ? String(args[idx] ?? "") : _match;
      });
    });
  }
}
