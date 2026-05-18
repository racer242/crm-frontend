/**
 * RulesEngine
 *
 * Применяет правила трансформации (rules) к данным.
 * Используется на клиенте для преобразования параметров запроса
 * перед отправкой HTTP-запроса (команда sendRequest).
 *
 * Правила:
 * - name: новое имя свойства
 * - value: новое значение (с поддержкой $value$ макроса)
 *
 * Если value не указан — рекурсивный обход вглубь значения.
 * Если value указан — замена с подстановкой $value$.
 */

import { ReplaceRule } from "@/types/adapter";

/**
 * Применить правила трансформации к данным
 * Рекурсивно обходит данные, заменяя ключи и значения на основе правил
 */
export function applyRules(data: any, rules: Record<string, ReplaceRule>): any {
  if (data === null || data === undefined) {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map((item) => applyRules(item, rules));
  }

  if (typeof data !== "object") {
    return data;
  }

  const result: Record<string, any> = {};

  for (const [key, value] of Object.entries(data)) {
    const rule = rules[key];

    if (rule) {
      // Правило найдено
      const targetKey = rule.name !== undefined ? rule.name : key;

      if (rule.value !== undefined) {
        // Value указан: применяем $value$ макрос, НЕ рекурсия
        result[targetKey] = replaceValueMacro(rule.value, value);
      } else {
        // Value не указан: рекурсия в исходное значение
        result[targetKey] = applyRules(value, rules);
      }
    } else {
      // Правила нет: сохраняем оригинальный ключ, рекурсия если объект/массив
      result[key] = applyRules(value, rules);
    }
  }

  return result;
}

/**
 * Сериализовать значение для подстановки вместо $value$ в строке
 * - null/undefined → пустая строка
 * - объект/массив → JSON.stringify
 * - всё остальное → String()
 */
function serializeValue(value: any): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

/**
 * Заменить макрос $value$ в шаблоне на исходное значение
 *
 * Правила:
 * - Если template — чистый "$value$", возвращается originalValue как есть
 *   (объекты, массивы, примитивы — без преобразования)
 * - Если template — строка, содержащая $value$ внутри других символов,
 *   макрос заменяется на строковое представление originalValue
 *   (объекты сериализуются через JSON.stringify)
 * - Если template — объект, $value$ рекурсивно заменяется в его строках
 */
function replaceValueMacro(template: any, originalValue: any): any {
  // Чистый макрос "$value$" — возвращаем originalValue как есть
  if (template === "$value$") {
    return originalValue;
  }

  if (typeof template === "string" && template.includes("$value$")) {
    return template.replace(/\$value\$/g, serializeValue(originalValue));
  }

  // Если template — объект, рекурсивно заменяем $value$ макросы в его строках
  if (typeof template === "object" && template !== null) {
    return replaceMacroInObject(template, originalValue);
  }

  return template;
}

/**
 * Рекурсивно заменить $value$ макрос в объекте
 * Строки, содержащие только "$value$", заменяются на originalValue целиком
 * Строки с $value$ внутри заменяются с сериализацией
 */
function replaceMacroInObject(obj: any, originalValue: any): any {
  if (Array.isArray(obj)) {
    return obj.map((item) =>
      typeof item === "object" && item !== null
        ? replaceMacroInObject(item, originalValue)
        : typeof item === "string" && item.includes("$value$")
          ? item === "$value$"
            ? originalValue
            : item.replace(/\$value\$/g, serializeValue(originalValue))
          : item,
    );
  }

  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === "string" && value.includes("$value$")) {
      result[key] =
        value === "$value$"
          ? originalValue
          : value.replace(/\$value\$/g, serializeValue(originalValue));
    } else if (typeof value === "object" && value !== null) {
      result[key] = replaceMacroInObject(value, originalValue);
    } else {
      result[key] = value;
    }
  }
  return result;
}
