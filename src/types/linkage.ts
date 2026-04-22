/**
 * Linkage types — система линковки свойств элементов к state
 *
 * Формат binding-строки: "@ELEMENT_ID.source.PATH.TO.FIELD"
 * - "@" — обозначает, что значение линкуется
 * - "ELEMENT_ID" — элемент с state (если отсутствует = page context)
 * - "source" — источник данных ("state" или другие в будущем)
 * - "PATH.TO.FIELD" — путь к свойству
 *
 * Примеры:
 *   "@form.state.username" → elementId="form", source="state", fieldPath="username"
 *   "@settings.state.theme.colors.primary" → elementId="settings", source="state", fieldPath="theme.colors.primary"
 *   "@state.visible" → elementId=null (page context), source="state", fieldPath="visible"
 */

/** Разобранный binding */
export interface BindingRef {
  /** ID элемента, обладающего state. null = корень страницы */
  elementId: string | null;
  /** Источник данных (пока "state", в будущем возможны другие) */
  source: string;
  /** Путь к свойству внутри источника */
  fieldPath: string;
}

/** Результат проверки: является ли значение binding-строкой */
export function isBinding(value: unknown): value is string {
  return typeof value === "string" && value.startsWith("@");
}

/**
 * Парсит binding-строку в BindingRef
 * @param value строка вида "@ELEMENT_ID.source.PATH.TO.FIELD" или "@source.PATH.TO.FIELD"
 * @returns BindingRef или null если не binding
 */
export function parseBinding(value: string): BindingRef | null {
  if (!value.startsWith("@")) {
    return null;
  }

  const path = value.slice(1); // Убираем "@"
  const parts = path.split(".");

  if (parts.length === 0) {
    return null;
  }

  // Определяем source — это первое слово из известного набора источников
  // или первое слово если за ним следует известный источник
  const knownSources = ["state", "config", "props"];

  let sourceIndex = -1;
  let elementId: string | null = null;

  for (let i = 0; i < parts.length; i++) {
    if (knownSources.includes(parts[i])) {
      sourceIndex = i;
      if (i > 0) {
        elementId = parts.slice(0, i).join(".");
      }
      break;
    }
  }

  if (sourceIndex === -1) {
    // Не найден известный source — считаем что source="state"
    // а первая часть это elementId
    return {
      elementId: parts[0],
      source: "state",
      fieldPath: parts.slice(1).join("."),
    };
  }

  return {
    elementId,
    source: parts[sourceIndex],
    fieldPath: parts.slice(sourceIndex + 1).join("."),
  };
}
