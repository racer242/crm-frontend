/**
 * Минимальная структурная модель элемента фильтра — структурно совместима
 * с FilterItem из "@/types" (его type: FilterType присваиваем string,
 * поэтому функция принимает FilterItem напрямую). Локальное объявление
 * позволяет компилировать файл автономно для стендов:
 * npx tsc <файл> --module commonjs --target es2020 --strict --skipLibCheck
 */
type FilterLike = {
  id: string;
  name: string;
  type: string;
  opts?: any;
  value?: any;
};

/**
 * Единая семантика «фильтр фактически выбран» — используется панелью
 * фильтров (FiltersPanel) и панелью чипов (ActiveFiltersBar).
 *
 * Особый случай — range с ограничением opts [min, max]: значение, покрывающее
 * весь диапазон (предвыбор «от min до max», приходящий с сервера, или
 * слайдер, возвращённый на полные границы), означает «фильтр не выбирали» —
 * он не считается активным: не показывается чипом и не уходит в запросы.
 */
export function isFilterActive(filter: FilterLike): boolean {
  const { type, value, opts } = filter;

  if (type === "checkbox" || type === "switch") return !!value;

  if (type === "options") {
    return Array.isArray(value) && value.some(Boolean);
  }

  if (type === "range") {
    if (!Array.isArray(value)) return false;
    const [begin, end] = value;
    // Свободный диапазон (без opts): не задана ни одна сторона — не выбран
    if (begin == null && end == null) return false;
    // Ограниченный диапазон: значение, покрывающее весь opts-диапазон,
    // трактуется как «не выбирали». Только когда ОБЕ стороны заданы —
    // «от null» / «до max» (Number(null) === 0!) не превращается в полный.
    if (
      Array.isArray(opts) &&
      opts.length >= 2 &&
      begin != null &&
      end != null
    ) {
      const min = Number(opts[0]);
      const max = Number(opts[1]);
      const from = Number(begin);
      const to = Number(end);
      if (
        !Number.isNaN(min) &&
        !Number.isNaN(max) &&
        !Number.isNaN(from) &&
        !Number.isNaN(to) &&
        from <= min &&
        to >= max
      ) {
        return false;
      }
    }
    return true;
  }

  if (type === "period") {
    return Array.isArray(value) && (value[0] != null || value[1] != null);
  }

  return value !== undefined && value !== null && value !== "";
}