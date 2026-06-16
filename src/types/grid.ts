/** Конфигурация грид-раскладки */
export interface GridConfig {
  /** Массив col-классов для каждого дочернего элемента (например ["col-12 md:col-10", "col-12 md:col-2"]) */
  cols: string[];
  /** PrimeFlex padding-класс для wrapper-ов элементов (например "px-1") */
  padding?: string;
}
