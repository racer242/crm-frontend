/**
 * Утилиты применения серверных initial-результатов (dataInit / dataFeed)
 * к текущему значению состояния элемента.
 *
 * Используются в двух местах (общий хелпер — чтобы поведение совпадало):
 * - StateManager (конструктор) — первичное применение initialDataFeed;
 * - AppEngine (re-apply эффект) — повторное применение после router.refresh().
 *
 * method: "rewrite" (по умолчанию) — оверлей перезаписывает значение;
 *         "merge" — оверлей сливается с текущим значением через mergeById:
 *         объекты — рекурсивно по ключам, массивы — join по полю `id`,
 *         непарные записи оверлея игнорируются (протухший id из URL не создаст
 *         чип фильтра без имени/опций).
 */

import { DataInitApplyMethod } from "@/types";

/** Plain object: обычный объект, не массив и не null */
export function isPlainObject(value: unknown): value is Record<string, any> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Все элементы массива — объекты с непустым строковым полем id */
function allHaveId(arr: unknown[]): boolean {
  return (
    arr.length > 0 &&
    arr.every(
      (item) =>
        isPlainObject(item) && typeof (item as any).id === "string" && (item as any).id !== "",
    )
  );
}

/**
 * Слияние оверлея в базу (чистая функция).
 * - Объекты: рекурсивно по ключам оверлея; ключи, отсутствующие в базе,
 *   добавляются как есть.
 * - Массивы объектов с id: записи оверлея накладываются на записи базы с тем
 *   же id (рекурсивно); записи базы без пары сохраняются как есть; записи
 *   оверлея без пары отбрасываются; порядок базы сохраняется. Пустая база
 *   «поглощает» оверлей (нет метаданных — нечему накладываться).
 * - Прочие комбинации (массивы без id, скаляры, null): оверлей перезаписывает
 *   базу.
 */
export function mergeById(base: any, overlay: any): any {
  if (Array.isArray(base) && Array.isArray(overlay)) {
    // Пустые массивы считаются join-способными: пустая база «поглощает»
    // оверлей (нет метаданных — нечему накладываться, и чипы без имён
    // не создаются), пустой оверлей оставляет базу без изменений
    const baseJoinable = base.length === 0 || allHaveId(base);
    const overlayJoinable = overlay.length === 0 || allHaveId(overlay);
    if (baseJoinable && overlayJoinable) {
      const overlayById = new Map<string, any>(
        overlay.map((item) => [(item as any).id, item]),
      );
      return base.map((item) => {
        const over = overlayById.get((item as any).id);
        return over === undefined ? item : mergeById(item, over);
      });
    }
    return overlay;
  }

  if (isPlainObject(base) && isPlainObject(overlay)) {
    const result: Record<string, any> = { ...base };
    for (const [key, value] of Object.entries(overlay)) {
      result[key] = key in base ? mergeById(base[key], value) : value;
    }
    return result;
  }

  return overlay;
}

/**
 * Применение initial-результата к текущему значению состояния.
 * Возвращает ИТОГОВОЕ значение для записи (для merge — результат слияния),
 * поэтому сравнение «до/после» через JSON.stringify корректно определяет no-op.
 */
export function applyInitialResult(
  current: any,
  data: any,
  method?: DataInitApplyMethod,
): any {
  const container = (v: any) => isPlainObject(v) || Array.isArray(v);
  if (method === "merge" && container(current) && container(data)) {
    return mergeById(current, data);
  }
  return data;
}

/**
 * Партиция очереди initial-результатов по фазе применения:
 * - preFeed — записи без priority:"feed" (применяются ДО серверных фидов);
 * - postFeed — записи с priority:"feed" (применяются ПОСЛЕ фидов, поверх
 *   state, заполненного фидами: merge фильтров из URL в metadata
 *   state.report.filters, который metadata-адаптер пишет целиком).
 */
export function partitionInitialResults<T extends { priority?: string }>(
  results: T[],
): { preFeed: T[]; postFeed: T[] } {
  const preFeed: T[] = [];
  const postFeed: T[] = [];
  for (const result of results) {
    if (result.priority === "feed") postFeed.push(result);
    else preFeed.push(result);
  }
  return { preFeed, postFeed };
}