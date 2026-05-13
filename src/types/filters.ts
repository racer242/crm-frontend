/**
 * Модель данных для системы фильтрации
 *
 * Фильтры хранятся в state как массив FilterItem[]
 */

/** Типы фильтров */
export type FilterType =
  | "checkbox"
  | "switch"
  | "range"
  | "slider"
  | "text"
  | "number"
  | "date"
  | "period"
  | "options"
  | "radio";

/** Элемент модели фильтра */
export interface FilterItem {
  /** Идентификатор фильтра */
  id: string;
  /** Название фильтра (отображается пользователю) */
  name: string;
  /** Тип фильтра */
  type: FilterType;
  /** Опции/варианты выбора (для options, radio, range, slider) */
  opts?: any;
  /** Текущее выбранное значение */
  value?: any;
}

/** Модель фильтров — массив FilterItem */
export type FilterModel = FilterItem[];
