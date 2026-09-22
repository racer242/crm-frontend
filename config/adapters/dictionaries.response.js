/**
 * Response-адаптер справочника (ops/dictionaries/[name], §3.6.3)
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

  return {
    options: options,
    totalRecords:
      (data && data.pagination && data.pagination.total_items) ||
      options.length,
  };
}

return transform(data);
