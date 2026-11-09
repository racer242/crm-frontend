/**
 * Response-адаптер справочника кампании avito_to_the_top
 * (config/camps/avito_to_the_top/patch.json → apiRoutes: статические
 * маршруты ops/dictionaries/dict_categories и ops/dictionaries/dict_leagues;
 * общий ops/dictionaries/[name] остаётся на эталонном dictionaries.response —
 * остальные справочники кампании пункт «Не назначено» не получают).
 *
 * Отличие от эталона: первым пунктом списка добавляется «Не назначено» с
 * сентинел-кодом AVITO_UNASSIGNED_CODE (_shared.js) — выбор пункта фильтрует
 * участников без назначенной категории/лиги (SQL: col IS NULL OR col = '',
 * собирает stats.users.execute.request.avito.js).
 *
 * Конверт {status:"ok", data:{items, pagination}} → {options, totalRecords}
 * items[]: {code, name, is_active} — все записи, включая неактивные
 * (неактивные помечаются в label суффиксом «(неактивна)»).
 */
function transform(source) {
  const data = source && source.status === "ok" ? source.data : source;
  const items = Array.isArray(data && data.items) ? data.items : [];

  const options = items.map(function (item) {
    return {
      label: item.is_active === false ? item.name + " (неактивна)" : item.name,
      value: item.code,
    };
  });

  // «Не назначено» — первым пунктом, до записей справочника
  options.unshift({
    label: "Не назначено",
    value: AVITO_UNASSIGNED_CODE,
  });

  return {
    options: options,
    totalRecords:
      (data && data.pagination && data.pagination.total_items) ||
      // fallback без pagination: «Не назначено» — не запись справочника
      options.length - 1,
  };
}

return transform(data);