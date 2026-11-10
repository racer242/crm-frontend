/**
 * Response-адаптер справочника кампании avito_to_the_top
 * (config/camps/avito_to_the_top/patch.json → apiRoutes: статические
 * маршруты ops/dictionaries/dict_categories и ops/dictionaries/dict_leagues;
 * общий ops/dictionaries/[name] остаётся на эталонном dictionaries.response —
 * остальные справочники кампании пункт «Не назначено» не получают).
 *
 * Отличия от эталона:
 *  - первым пунктом списка добавляется «Не назначено» с сентинел-кодом
 *    AVITO_UNASSIGNED_CODE (_shared.js) — выбор пункта фильтрует участников
 *    без назначенной категории/лиги (SQL: col IS NULL OR col = '', собирает
 *    stats.users.execute.request.avito.js);
 *  - для пар лиг «*ML / *ML_big» (общая агрегация рейтинга на бэкенде —
 *    11.11.26) после каждого «_big» вставляется обобщённый пункт с лейблом
 *    «<имя base> (все)» и псевдо-кодом pair:<base>
 *    (AVITO_ML_PAIR_PREFIX / AVITO_ML_PAIR_SUFFIX в _shared.js); в запросе
 *    участников он разворачивается в IN ('base', 'base_big'). Правило
 *    привязано к суффиксам кодов — в справочниках без таких пар (категории)
 *    инъекций не бывает, адаптер общий для обоих маршрутов и не знает, какой
 *    справочник обслуживает.
 *
 * Конверт {status:"ok", data:{items, pagination}} → {options, totalRecords}
 * items[]: {code, name, is_active} — все записи, включая неактивные
 * (неактивные помечаются в label суффиксом «(неактивна)»; в лейбл пары
 * исходное имя попадает без суффикса).
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

  // Обобщённые пункты пар «*ML / *ML_big»: база — код, заканчивающийся на
  // _ML, у которого в этом же справочнике есть сиблинг _big; пункт вставляется
  // сразу после «_big», чтобы пара соседствовала. Лейбл — имя базовой лиги
  // («без _big») + « (все)», исходное имя — без суффикса неактивности.
  let pairsInjected = 0;
  const itemByCode = Object.create(null);
  items.forEach(function (item) {
    if (item && typeof item.code === "string" && item.code) {
      itemByCode[item.code] = item;
    }
  });
  for (let i = options.length - 1; i >= 0; i--) {
    const code = String(options[i].value || "");
    if (!code || code.indexOf(AVITO_ML_PAIR_PREFIX) === 0) continue;
    if (code.slice(-3) !== "_ML") continue;
    const bigCode = code + AVITO_ML_PAIR_SUFFIX;
    if (!itemByCode[bigCode]) continue;
    const bigIndex = options.findIndex(function (o) {
      return o.value === bigCode;
    });
    options.splice(bigIndex + 1, 0, {
      label: String(itemByCode[code].name || code) + " (все)",
      value: AVITO_ML_PAIR_PREFIX + code,
    });
    pairsInjected++;
  }

  // «Не назначено» — первым пунктом, до записей справочника
  options.unshift({
    label: "Не назначено",
    value: AVITO_UNASSIGNED_CODE,
  });

  return {
    options: options,
    totalRecords:
      (data && data.pagination && data.pagination.total_items) ||
      // fallback без pagination: «Не назначено» и обобщённые пункты пар —
      // не записи справочника
      options.length - 1 - pairsInjected,
  };
}

return transform(data);