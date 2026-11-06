/**
 * configMerge — наложение per-camp дельт на эталонный конфиг.
 *
 * Дельта (camps.json → config_patch кампании) описывает отличия кампании от
 * эталона. Правила наложения (docs/config-reference.md → «Конфигурации
 * кампаний»):
 *
 *  - Объекты: слияние ВГЛУБЬ по цепочке ключей — заменяется именно тот
 *    вложенный объект, что указан в дельте (например,
 *    adapters["user.get.request"]), соседние поля не затрагиваются.
 *  - Массивы: элемент дельты ищется в базовом массиве по идентифицирующему
 *    полю — первое найденное из id / route / path / key / name / field;
 *    найденный — обновляется по тем же правилам вглубь, ненайденный —
 *    добавляется в конец массива.
 *  - Удаление: поле объекта — значение null; элемент массива —
 *    идентифицирующее поле + need_to_remove: true.
 *  - Примитивы и несовпадающие типы: полная замена; вставляемые значения
 *    клонируются — профили кампаний не делят ссылки с объектом дельты.
 *
 * Базовый объект МУТИРУЕТСЯ (на вход подаётся клон эталона кампании) —
 * эталон и конфигурации других кампаний не затрагиваются.
 */

/** Порядок поиска идентифицирующего поля в элементе массива */
const ARRAY_MATCH_KEYS = ["id", "route", "path", "key", "name", "field"] as const;

/** Служебный маркер удаления элемента массива (в конфиг не копируется) */
export const NEED_TO_REMOVE = "need_to_remove";

/** Plain object: не null, не массив */
export function isPlainObject(value: any): boolean {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

/**
 * Идентификатор элемента массива: "id:users", "path:ops/users" или null,
 * если ни одно из идентифицирующих полей не задано.
 */
function getMatchKey(item: any): string | null {
  if (!isPlainObject(item)) return null;
  for (const key of ARRAY_MATCH_KEYS) {
    const value = item[key];
    if (value !== undefined && value !== null) {
      return `${key}:${String(value)}`;
    }
  }
  return null;
}

/**
 * Наложить дельту на базовый конфиг (базовый мутируется и возвращается).
 *
 * @param base  конфиг кампании (клон эталона)
 * @param delta config_patch кампании
 */
export function applyConfigDelta<T = any>(base: T, delta: any): T {
  if (!isPlainObject(base) || !isPlainObject(delta)) return base;
  mergeObject(base as Record<string, any>, delta);
  return base;
}

/** Рекурсивное слияние delta → base (оба — plain objects) */
function mergeObject(
  base: Record<string, any>,
  delta: Record<string, any>,
): void {
  for (const key of Object.keys(delta)) {
    const deltaValue = delta[key];

    // Служебный маркер — не данные, в конфиг не копируется
    if (key === NEED_TO_REMOVE) continue;
    // undefined — «не трогать»
    if (deltaValue === undefined) continue;
    // null — удалить поле
    if (deltaValue === null) {
      delete base[key];
      continue;
    }

    const baseValue = base[key];

    // Массивы: слить по идентифицирующим полям
    if (Array.isArray(deltaValue)) {
      if (Array.isArray(baseValue)) {
        mergeArray(baseValue, deltaValue);
      } else {
        base[key] = cloneValue(deltaValue);
      }
      continue;
    }

    // Объекты: уйти вглубь
    if (isPlainObject(deltaValue)) {
      if (isPlainObject(baseValue)) {
        mergeObject(baseValue, deltaValue);
      } else {
        base[key] = cloneValue(deltaValue);
      }
      continue;
    }

    // Примитив — заменить
    base[key] = cloneValue(deltaValue);
  }
}

/** Слияние массивов: матчинг по идентифицирующему полю, новое — в конец */
function mergeArray(base: any[], delta: any[]): void {
  for (const deltaItem of delta) {
    const matchKey = getMatchKey(deltaItem);

    // Удаление: идентифицирующее поле + need_to_remove: true
    if (isPlainObject(deltaItem) && deltaItem[NEED_TO_REMOVE] === true) {
      if (matchKey) {
        const index = base.findIndex((item) => getMatchKey(item) === matchKey);
        if (index !== -1) base.splice(index, 1);
      }
      continue;
    }

    // Элемент без идентификатора
    if (!matchKey) {
      // Примитив — добавить, если такого ещё нет (без дублей)
      if (!isPlainObject(deltaItem) && !Array.isArray(deltaItem)) {
        if (!base.some((item) => item === deltaItem)) base.push(deltaItem);
      } else {
        base.push(cloneValue(deltaItem));
      }
      continue;
    }

    // Найден в базе — глубоко обновить; иначе добавить в конец
    const baseItem = base.find((item) => getMatchKey(item) === matchKey);
    if (
      baseItem !== undefined &&
      isPlainObject(baseItem) &&
      isPlainObject(deltaItem)
    ) {
      mergeObject(baseItem, deltaItem);
    } else if (baseItem !== undefined) {
      base[base.indexOf(baseItem)] = cloneValue(deltaItem);
    } else {
      base.push(cloneValue(deltaItem));
    }
  }
}

/** Глубокое клонирование вставляемых значений (конфиг — чистый JSON) */
function cloneValue(value: any): any {
  if (value !== null && typeof value === "object") {
    return JSON.parse(JSON.stringify(value));
  }
  return value;
}
