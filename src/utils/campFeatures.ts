/**
 * Фичи кампании — управление видимостью UI-элементов.
 *
 * Источник — карта `features` в записи кампании (config/system/camps.json):
 * ключ фичи → включена? Отсутствующий ключ считается ВКЛЮЧЁННЫМ
 * (неразмеченные элементы видны всегда), скрытие — явным `false`.
 * Контроль только визуальный: маршруты не блокируются, авторизация
 * остаётся ответственностью внешнего API.
 *
 * Файл намеренно без импортов — чистые функции, пригодные для node-тестов.
 */

/** Карта фич текущей кампании: ключ → включена? */
export type CampFeatures = Record<string, boolean>;

/** Фича-гейт элемента: одна фича или список «хотя бы одна включена» */
export type FeatureGate = string | string[] | undefined | null;

/**
 * Фича включена? Отсутствие ключа (или карты целиком) → true.
 * Проверяются только собственные свойства карты (ключ «constructor»
 * не может попасть через прототип).
 */
export function isFeatureEnabled(
  features: CampFeatures | undefined | null,
  feature: string,
): boolean {
  if (!features || typeof features !== "object") return true;
  if (!Object.prototype.hasOwnProperty.call(features, feature)) return true;
  return Boolean((features as Record<string, unknown>)[feature]);
}

/**
 * Проходит ли элемент свой фича-гейт.
 * gate отсутствует → всегда да; строка — одна фича; массив — хотя бы одна.
 */
export function matchesFeatureGate(
  features: CampFeatures | undefined | null,
  gate: FeatureGate,
): boolean {
  if (gate === undefined || gate === null) return true;
  if (Array.isArray(gate)) {
    if (gate.length === 0) return true;
    return gate.some((f) => isFeatureEnabled(features, f));
  }
  if (typeof gate !== "string") return true;
  return isFeatureEnabled(features, gate);
}

/**
 * Фильтр пунктов бокового меню (navbar): пункт скрывается, если его
 * фича-гейт не пройден; header-подзаголовок схлопывается, если все
 * пункты его секции скрыты. Сепараторы и пункты без фичи проходят как есть.
 */
export function filterNavItems<
  T extends { header?: string; separator?: boolean; feature?: FeatureGate },
>(items: T[], features: CampFeatures | undefined | null): T[] {
  const result: T[] = [];
  let pendingHeader: T | null = null;
  const flushHeader = (hasItems: boolean) => {
    if (pendingHeader && hasItems) result.push(pendingHeader);
    pendingHeader = null;
  };
  for (const item of items) {
    if (typeof item.header === "string") {
      flushHeader(false);
      pendingHeader = item;
      continue;
    }
    if (!matchesFeatureGate(features, item.feature)) continue;
    if (pendingHeader) {
      result.push(pendingHeader);
      pendingHeader = null;
    }
    result.push(item);
  }
  // Хвостовой заголовок без пунктов после него — отбрасывается
  // (пункты после заголовка сами сбрасывают pendingHeader при добавлении).
  flushHeader(false);
  return result;
}

/**
 * Рекурсивный фильтр модели меню (Menu/Menubar/Breadcrumb items):
 * пункт скрывается по фича-гейту; группа (`items`) без уцелевших детей
 * скрывается целиком. Возвращает новые объекты для групп с изменённым
 * списком детей, остальные проходят по ссылке.
 */
export function filterMenuModel<
  T extends { feature?: FeatureGate; items?: T[] },
>(items: T[], features: CampFeatures | undefined | null): T[] {
  const result: T[] = [];
  for (const item of items) {
    if (!matchesFeatureGate(features, item.feature)) continue;
    if (Array.isArray(item.items)) {
      const children = filterMenuModel(item.items, features);
      if (children.length === 0) continue;
      result.push({ ...item, items: children });
    } else {
      result.push(item);
    }
  }
  return result;
}
