/**
 * Серверная сборка initialDataFeed (используется в page.tsx).
 *
 * Вся подготовка начальных данных происходит на сервере: значения dataInit
 * (с уже применённым parse) накладываются на результаты серверных фидов
 * согласно правилам priority/method из конфига, и в AppEngine уходит
 * «полностью готовая» очередь — записи только на перезапись, без серверных
 * маркеров method/priority. Клиент (StateManager/AppEngine) применяет её
 * как обычный фид и про серверную логику инициализации не знает.
 *
 * Правила dataInit:
 * - без method/priority — запись применяется ДО фидов;
 * - priority: "feed" — ПОСЛЕ фидов, перезаписью поверх их результата;
 * - method: "merge" — умный мердж: оверлей накладывается через mergeById
 *   на значение, которое фид записывает в базовый путь target'а записи
 *   ("state.report.filters" → результат фида с target "state.report",
 *   поле "filters"); сама запись из очереди исчезает. Если фида нет
 *   (не описан или упал) — мердж с дефолтом состояния страницы
 *   (pageState), иначе оверлей остаётся как есть (запись после фидов).
 *
 * mergeById: объекты — рекурсивно по ключам оверлея; массивы — join по
 * полю `id`, непарные записи оверлея отбрасываются (протухший id из URL
 * не создаст чип фильтра без имени/опций), порядок базы сохраняется.
 */

import { DataFeedResult, DataInitApplyMethod, DataInitPriority } from "@/types";

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

/** Запись результата dataInit (структурно совпадает с DataInitResult из DataInitServerService) */
export interface InitialResultEntry {
  success: boolean;
  target: string;
  data?: any;
  error?: string;
  /** Способ применения: "merge" — умный мердж в результат фида */
  method?: DataInitApplyMethod;
  /** Фаза применения: "feed" — после серверных фидов */
  priority?: DataInitPriority;
}

/** Значение по пути внутри объекта состояния ("report.filters" → obj.report.filters) */
function getValueByPath(obj: any, path: string): any {
  let current = obj;
  for (const part of path.split(".")) {
    if (!isPlainObject(current) || !(part in current)) return undefined;
    current = current[part];
  }
  return current;
}

/**
 * Серверная сборка итоговой очереди initialDataFeed (вызывается из page.tsx).
 *
 * @param initResults результаты executeDataInit (parse уже применён)
 * @param feedResults успешные результаты executeServerDataFeeds
 * @param pageState дефолтное состояние страницы из конфига — база для
 *   merge-записей, чей фид не найден или упал
 * @returns очередь: [dataInit до фидов] → фиды (с влитыми merge-значениями)
 *   → [dataInit после фидов]; все записи — чистая перезапись.
 */
export function buildInitialDataFeed(
  initResults: InitialResultEntry[],
  feedResults: DataFeedResult[],
  pageState?: Record<string, any>,
): DataFeedResult[] {
  const preFeed: DataFeedResult[] = [];
  const postFeed: DataFeedResult[] = [];
  // Рабочие копии записей фидов: merge-правила дополняют их data,
  // исходные результаты не мутируются
  const feeds: DataFeedResult[] = feedResults.map((result) => ({ ...result }));

  for (const init of initResults) {
    // Ошибочные dataInit-записи в очередь не попадают: клиент всё равно
    // пропускал их (!success), а писать undefined в state нельзя
    if (!init.success) continue;

    const entry: DataFeedResult = {
      success: init.success,
      target: init.target,
      data: init.data,
      error: init.error,
    };

    if (init.method === "merge") {
      // "state.report.filters" → база "state.report", поле "filters"
      const dot = init.target.lastIndexOf(".");
      const baseTarget = dot > 0 ? init.target.slice(0, dot) : "";
      const relPath = dot > 0 ? init.target.slice(dot + 1) : "";
      const feedResult =
        baseTarget && relPath
          ? feeds.find((r) => r.success && r.target === baseTarget)
          : undefined;

      if (feedResult && isPlainObject(feedResult.data)) {
        // Оверлей вливается в результат фида — отдельная запись не нужна
        feedResult.data = {
          ...feedResult.data,
          [relPath]: mergeById(feedResult.data[relPath], init.data),
        };
        continue;
      }

      // Фида нет: мердж с дефолтом состояния страницы — то же, что делал
      // клиент, сливая оверлей с текущим state (например, state.report
      // из конфига страницы, если metadata-фид упал)
      const statePath = init.target.startsWith("state.")
        ? init.target.slice("state.".length)
        : "";
      if (relPath && statePath && isPlainObject(pageState)) {
        entry.data = mergeById(
          getValueByPath(pageState, statePath),
          init.data,
        );
      }
      postFeed.push(entry);
      continue;
    }

    if (init.priority === "feed") postFeed.push(entry);
    else preFeed.push(entry);
  }

  return [...preFeed, ...feeds, ...postFeed];
}